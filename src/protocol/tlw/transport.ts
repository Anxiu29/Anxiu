import { DATA_SIZE, REPORT_SIZE, unsigned } from '@/domain/mouse/codec'

// Confirmed from the connected device's HID descriptor and the user's capture.
export const CB75_HID = { usagePage: 0xff1c, usage: 0x92, reportId: 4 } as const
export interface TLWTransportOptions {
  reportId: number
  dataSize: number
}

/** Logical command IDs from the September 10/13 captures; mapped at the wire boundary. */
export enum ReadCommand {
  BasicInfo = 0x03,
  Functions = 0x05,
  DefaultKeys = 0x07,
  Keys = 0x08,
  Battery = 0x1a,
}

export enum WriteCommand {
  Begin = 1,
  End = 2,
  Functions = 6,
  Keys = 9,
  FactoryReset = 0x0d,
  Macros = 0x15,
}
type WireCommand = ReadCommand | WriteCommand

export function encodeWrite(command: WriteCommand, address: number, data: Uint8Array): Uint8Array {
  if (![1, 2, 6, 9, 0x0d, 0x15].includes(command)) throw new Error('Unverified CB75 write command')
  unsigned(address, 0xffff, 'Write address')
  unsigned(data.length, DATA_SIZE, 'Write length')
  if (!data.length || address + data.length > 0x10000)
    throw new RangeError('Invalid CB75 write range')
  const packet = new Uint8Array(REPORT_SIZE - 1)
  packet[2] = command
  packet[3] = data.length
  packet[4] = address & 0xff
  packet[5] = address >>> 8
  packet.set(data, 7)
  return packet
}

export function encodeRead(command: ReadCommand, address: number, length: number): Uint8Array {
  if (![3, 5, 7, 8, 0x1a].includes(command)) throw new Error('Unverified CB75 command')
  unsigned(address, 0xffff, 'Read address')
  unsigned(length, DATA_SIZE, 'Read length')
  if (!length || address + length > 0x10000) throw new RangeError('Invalid CB75 read range')
  const payload = new Uint8Array(REPORT_SIZE - 1)
  // Both captured command families leave checksum bytes zero.
  payload[2] = command
  payload[3] = length
  payload[4] = address & 0xff
  payload[5] = address >>> 8
  return payload
}

interface Pending {
  command: number
  address: number
  length: number
  resolve: (data: Uint8Array) => void
  reject: (error: Error) => void
  timer: ReturnType<typeof setTimeout>
}

/** One outstanding request, matching by report, command, offset and length.
 * A timeout makes this transport unusable: the wire has no transaction ID, so
 * retrying could accidentally accept a delayed response from an older request.
 */
export class CB75Transport {
  private pending?: Pending
  private queue: Promise<unknown> = Promise.resolve()
  private stopped?: Error

  readonly dataSize: number

  constructor(
    private readonly device: HIDDevice,
    private readonly timeoutMs = 2000,
    private readonly mode: 'wired' | 'wireless' = 'wired',
    private readonly commandFamily: 'current' | 'legacy' = 'current',
    private readonly options?: TLWTransportOptions,
  ) {
    // September 16 wired capture uses A1..BA. Wireless uses the same command
    // family with its existing 24-byte payload and mouse route; hardware QA pending.
    this.dataSize = options?.dataSize ?? (mode === 'wireless' ? 24 : 56)
    device.addEventListener('inputreport', this.onReport)
  }

  private onReport = (event: HIDInputReportEvent) => {
    const pending = this.pending
    if (!pending || event.reportId !== (this.options?.reportId ?? CB75_HID.reportId)) return
    const view = event.data
    if (view.byteLength !== REPORT_SIZE - 1) return
    const data = new Uint8Array(view.buffer, view.byteOffset, view.byteLength)
    if (this.mode === 'wireless' && data[31] !== 2) return
    const address = data[4] | (data[5] << 8)
    if (data[2] === 0xff && data[3] === pending.length && address === pending.address) {
      this.stop(new Error('CB75 receiver rejected the request (FF); check the mouse connection'))
      return
    }
    if (data[2] !== pending.command || data[3] !== pending.length || address !== pending.address)
      return
    if (data[6] !== 0) {
      this.stop(
        new Error(
          `CB75 rejected command 0x${pending.command.toString(16)} (ACK 0x${data[6].toString(16)})`,
        ),
      )
      return
    }
    clearTimeout(pending.timer)
    this.pending = undefined
    pending.resolve(data.slice(7, 7 + pending.length))
  }

  read(command: ReadCommand, address: number, length: number): Promise<Uint8Array> {
    if (length > this.dataSize) throw new RangeError('CB75 read exceeds connection packet size')
    const payload = encodeRead(command, address, length)
    return this.exchange(command, address, length, payload)
  }

  async write(command: WriteCommand, address: number, data: Uint8Array): Promise<void> {
    if (data.length > this.dataSize)
      throw new RangeError('CB75 write exceeds connection packet size')
    const payload = encodeWrite(command, address, data)
    const echoed = await this.exchange(command, address, data.length, payload)
    if (echoed.some((byte, index) => byte !== payload[7 + index])) {
      const error = new Error('CB75 write acknowledgement does not match the request')
      this.stop(error)
      throw error
    }
  }

  private exchange(
    command: WireCommand,
    address: number,
    length: number,
    payload: Uint8Array,
  ): Promise<Uint8Array> {
    const wireCommand = command + (this.commandFamily === 'current' ? 0xa0 : 0)
    payload[2] = wireCommand
    // Vendor receiver filter identifies the mouse as nested device type 2.
    // This route byte follows the 24-byte data area (WebHID excludes report ID).
    if (this.mode === 'wireless') payload[31] = 2
    const run = this.queue.then(
      () =>
        new Promise<Uint8Array>((resolve, reject) => {
          if (this.stopped) {
            reject(this.stopped)
            return
          }
          if (!this.device.opened) {
            reject(new Error('CB75 is disconnected'))
            return
          }
          const timer = setTimeout(
            () => this.stop(new Error('CB75 response timeout; reconnect the device')),
            command === WriteCommand.FactoryReset ? Math.max(this.timeoutMs, 5000) : this.timeoutMs,
          )
          this.pending = { command: wireCommand, address, length, resolve, reject, timer }
          // Install the pending receiver before sending; some devices reply immediately.
          this.device
            .sendReport(this.options?.reportId ?? CB75_HID.reportId, payload)
            .catch((error) => {
              this.stop(error instanceof Error ? error : new Error(String(error)))
            })
        }),
    )
    this.queue = run.catch(() => undefined)
    return run
  }

  async readRange(command: ReadCommand, address: number, length: number): Promise<Uint8Array> {
    unsigned(address, 0xffff, 'Read address')
    unsigned(length, 0x10000 - address, 'Read size')
    const data = new Uint8Array(length)
    for (let offset = 0; offset < length; offset += this.dataSize) {
      data.set(
        await this.read(command, address + offset, Math.min(this.dataSize, length - offset)),
        offset,
      )
    }
    return data
  }

  async readSession<T>(read: () => Promise<T>): Promise<T> {
    if (this.mode === 'wired') return read()
    // The receiver can return FF between isolated reads. Keep the mouse in
    // communication mode for the complete read, as verified on hardware.
    await this.write(WriteCommand.Begin, 0, new Uint8Array(24))
    try {
      const result = await read()
      await this.write(WriteCommand.End, 0, new Uint8Array(24))
      return result
    } catch (error) {
      // Preserve the original read error if the channel has already stopped.
      try {
        await this.write(WriteCommand.End, 0, new Uint8Array(24))
      } catch {
        /* channel stopped */
      }
      throw error
    }
  }

  stop(error = new Error('CB75 transport closed')) {
    if (this.stopped) return
    this.stopped = error
    this.device.removeEventListener('inputreport', this.onReport)
    if (this.pending) {
      clearTimeout(this.pending.timer)
      const pending = this.pending
      this.pending = undefined
      pending.reject(error)
    }
  }
}
