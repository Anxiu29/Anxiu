/** RK 网页AP通讯协议-20260910, sections 1 and 3.
 * Report IDs and reply transport must be supplied by the device integration.
 */
export const REPORT_SIZE = 64
export const DATA_SIZE = 56

export enum Command {
  StartFastCommunication = 0xa1,
  EndFastCommunication = 0xa2,
  GetBasicInfo = 0xa3,
  GetFunctions = 0xa5,
  SetFunctions = 0xa6,
  GetDefaultKeys = 0xa7,
  GetKeys = 0xa8,
  SetKeys = 0xa9,
  RestoreFactory = 0xad,
  GetMacros = 0xb4,
  SetMacros = 0xb5,
  GetBattery = 0xba,
  GetWirelessStatus = 0xc2,
}

export function unsigned(value: number, maximum: number, name: string): number {
  if (!Number.isInteger(value) || value < 0 || value > maximum) {
    throw new RangeError(`${name} must be an integer in 0..${maximum}`)
  }
  return value
}

export function readU16(bytes: Uint8Array, offset: number): number {
  if (!Number.isInteger(offset) || offset < 0 || offset + 2 > bytes.length) {
    throw new RangeError('Truncated uint16')
  }
  return bytes[offset] | (bytes[offset + 1] << 8)
}

export interface Packet {
  reportId: number
  command: Command
  address: number
  /** Reads request this many bytes; writes must provide exactly this many. */
  length: number
  data?: Uint8Array
}

/** 64 bytes including Report ID. ACK and unused data are zero-filled. */
export function encodePacket(packet: Packet): Uint8Array {
  const frame = new Uint8Array(REPORT_SIZE)
  frame[0] = unsigned(packet.reportId, 0xff, 'Report ID')
  frame[3] = unsigned(packet.command, 0xff, 'Command')
  frame[4] = unsigned(packet.length, DATA_SIZE, 'Data length')
  const address = unsigned(packet.address, 0xffff, 'Address')
  frame[5] = address & 0xff
  frame[6] = address >>> 8
  if (packet.data) {
    if (packet.data.length !== packet.length) throw new RangeError('Data length mismatch')
    frame.set(packet.data, 8)
  }
  const sum = frame.subarray(3).reduce((total, byte) => total + byte, 0)
  frame[1] = sum & 0xff
  frame[2] = sum >>> 8
  return frame
}

/** WebHID sendReport takes the Report ID separately from its 63-byte payload. */
export function toOutputReport(packet: Packet): { reportId: number; data: Uint8Array } {
  const frame = encodePacket(packet)
  return { reportId: frame[0], data: frame.slice(1) }
}

/** Decodes this documented envelope only; does not assume device reply framing. */
export function decodePacket(frame: Uint8Array): Packet & { ack: number; data: Uint8Array } {
  if (frame.length !== REPORT_SIZE) throw new RangeError('Expected a 64-byte AP report')
  const length = unsigned(frame[4], DATA_SIZE, 'Data length')
  const sum = frame.subarray(3).reduce((total, byte) => total + byte, 0)
  if (readU16(frame, 1) !== sum) throw new Error('AP checksum mismatch')
  return {
    reportId: frame[0],
    command: frame[3],
    address: readU16(frame, 5),
    ack: frame[7],
    length,
    data: frame.slice(8, 8 + length),
  }
}

/** Split addressable data into packets, including structures spanning reports. */
export function writePackets(
  reportId: number,
  command: Command,
  address: number,
  data: Uint8Array,
): Packet[] {
  unsigned(address, 0xffff, 'Address')
  if (address + data.length > 0x10000) throw new RangeError('Write exceeds address space')
  const packets: Packet[] = []
  for (let offset = 0; offset < data.length; offset += DATA_SIZE) {
    const chunk = data.slice(offset, offset + DATA_SIZE)
    packets.push({
      reportId,
      command,
      address: address + offset,
      length: chunk.length,
      data: chunk,
    })
  }
  return packets
}

export function parseBasicInfo(data: Uint8Array) {
  if (data.length < 25) throw new RangeError('Truncated basic information')
  if (data[0] !== 0xaa || data[1] !== 0x55) throw new Error('Invalid basic information signature')
  const firmwareVersion = readU16(data, 18)
  return {
    keyCount: data[5],
    keyBytes: data[5] * 3,
    macroBytes: data[6] * 128,
    dpiStep: data[11],
    dpiRank: readU16(data, 12),
    dpiStart: readU16(data, 14),
    independentXY: data[16] !== 0,
    dpiStageCount: data[17],
    // CB75 V0111 readback: offsets 18–19 are 11 01 (little-endian).
    // Older firmware leaves these bytes zero; it has no reported version.
    firmwareVersion:
      firmwareVersion === 0
        ? undefined
        : `V${firmwareVersion.toString(16).toUpperCase().padStart(4, '0')}`,
    vendorId: readU16(data, 21),
    productId: readU16(data, 23),
  }
}

export function parseBattery(data: Uint8Array) {
  if (data.length < 2) throw new RangeError('Truncated battery status')
  return {
    percent: unsigned(data[0], 100, 'Battery percent'),
    charging: unsigned(data[1], 2, 'Charging state'),
  }
}

export function parseWirelessStatus(data: Uint8Array): boolean {
  if (data.length < 1 || (data[0] !== 0 && data[0] !== 0xff))
    throw new Error('Invalid wireless status')
  return data[0] === 0xff
}
