/** USB OTA, verified against the 2026-09-22 capture (7011 data packets).
 * WebHID excludes report ID 5: output is 63 bytes, input is 32 bytes.
 */
export const FIRMWARE_REPORT_ID = 5
export function crc16(bytes: Uint8Array): number {
    let crc = 0xffff
    for (const byte of bytes) {
        crc ^= byte
        for (let bit = 0; bit < 8; bit++) crc = crc & 1 ? (crc >>> 1) ^ 0xa001 : crc >>> 1
    }
    return crc
}
function put16(bytes: Uint8Array, offset: number, value: number) {
    bytes[offset] = value & 0xff
    bytes[offset + 1] = value >>> 8
}
function envelope(length: number) {
    const packet = new Uint8Array(63)
    packet.set([length + 6, 1, length + 4, length, 4, 0x52, 0x28, 0])
    return packet
}
export function firmwareStart() {
    const packet = envelope(5)
    packet.set([1, 0xff], 8)
    return packet
}
export function firmwareData(index: number, data: Uint8Array) {
    if (!Number.isInteger(index) || index < 0 || index >= 0xff00 || data.length !== 16)
        throw new Error('Invalid firmware packet')
    const packet = envelope(23)
    put16(packet, 8, index)
    packet.set(data, 10)
    put16(packet, 26, crc16(packet.subarray(8, 26)))
    return packet
}
export function firmwareEnd(lastIndex: number) {
    if (!Number.isInteger(lastIndex) || lastIndex < 0 || lastIndex >= 0xff00)
        throw new Error('Invalid firmware packet index')
    const packet = envelope(9)
    packet.set([2, 0xff], 8)
    put16(packet, 10, lastIndex)
    put16(packet, 12, lastIndex ^ 0xffff)
    return packet
}

/** Only the captured CB75 image family is accepted. Header compatibility is
 * not a signature/authenticity check; use firmware supplied for this mouse.
 */
export function validateFirmware(input: Uint8Array): Uint8Array {
    const bytes = input.slice()
    const signature = [0x4b, 0x4e, 0x4c, 0x54, 0x0d, 0, 0x88, 0]
    if (bytes.length < 32 || signature.some((b, i) => bytes[8 + i] !== b))
        throw new Error('Invalid CB75 firmware header')
    const size = new DataView(bytes.buffer).getUint32(24, true)
    // The capture contains 112164 image bytes, padded to 112176 with FF.
    if (size < 32 || size > 0xff00 * 16 ||
        (bytes.length !== size && bytes.length !== Math.ceil(size / 16) * 16) ||
        bytes.subarray(size).some((b) => b !== 0xff))
        throw new Error('Invalid CB75 firmware size')
    const padded = new Uint8Array(Math.ceil(size / 16) * 16).fill(0xff)
    padded.set(bytes)
    return padded
}

export function isFirmwareDevice(device: HIDDevice): boolean {
    const hasReport = (collections: readonly HIDCollectionInfo[]): boolean =>
        collections.some((c) => c.outputReports?.some((r) => r.reportId === FIRMWARE_REPORT_ID) ||
            hasReport(c.children ?? []))
    return device.vendorId === 0x320f && device.productId === 0x22f2 && hasReport(device.collections)
}

export class CB75FirmwareUpdater {
    private pending?: { accept: (data: Uint8Array) => boolean; resolve: () => void; reject: (e: Error) => void }
    private active = false
    constructor(private readonly device: HIDDevice, private readonly timeoutMs = 5000) {}
    private onReport = (event: HIDInputReportEvent) => {
        if (event.reportId !== FIRMWARE_REPORT_ID || event.data.byteLength !== 32) return
        const bytes = new Uint8Array(event.data.buffer, event.data.byteOffset, event.data.byteLength)
        if (this.pending?.accept(bytes)) this.pending.resolve()
    }
    private exchange(packet: Uint8Array, start = false): Promise<void> {
        return new Promise((resolve, reject) => {
            let settled = false
            const timer = setTimeout(() => finish(new Error('Firmware response timeout; reconnect before retrying')), this.timeoutMs)
            const finish = (error?: Error) => {
                if (settled) return
                settled = true
                clearTimeout(timer)
                this.pending = undefined
                if (error) reject(error)
                else resolve()
            }
            this.pending = {
                accept: (bytes) => {
                    if (packet.subarray(0, 8).some((b, i) => bytes[i] !== b)) return false
                    if (start) return bytes[8] === 0 && bytes[9] === 0
                    const next = (packet[8] | packet[9] << 8) + 1
                    return (bytes[8] | bytes[9] << 8) === next &&
                        packet.subarray(10, 28).every((b, i) => bytes[10 + i] === b)
                },
                resolve: () => finish(), reject: (error) => finish(error),
            }
            this.device.sendReport(FIRMWARE_REPORT_ID, packet).catch((error) =>
                finish(error instanceof Error ? error : new Error(String(error))))
        })
    }
    async update(input: Uint8Array, progress: (percent: number) => void) {
        if (this.active) throw new Error('Firmware update already running')
        const firmware = validateFirmware(input)
        if (!this.device.opened || !isFirmwareDevice(this.device)) throw new Error('Select the CB75 USB firmware interface')
        this.active = true
        this.device.addEventListener('inputreport', this.onReport)
        const onDisconnect = (event: HIDConnectionEvent) => {
            if (event.device === this.device) this.pending?.reject(new Error('Firmware device disconnected'))
        }
        navigator.hid.addEventListener('disconnect', onDisconnect)
        try {
            progress(0)
            await this.exchange(firmwareStart(), true)
            const count = firmware.length / 16
            for (let index = 0; index < count; index++) {
                await this.exchange(firmwareData(index, firmware.subarray(index * 16, index * 16 + 16)))
                progress(Math.floor((index + 1) * 99 / count))
            }
            // No final input report exists in the capture. Completion means sent,
            // not a verified reboot or installed version.
            await this.device.sendReport(FIRMWARE_REPORT_ID, firmwareEnd(count - 1))
            progress(100)
        } finally {
            this.active = false
            this.device.removeEventListener('inputreport', this.onReport)
            navigator.hid.removeEventListener('disconnect', onDisconnect)
        }
    }
}
