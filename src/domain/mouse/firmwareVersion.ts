/** Four hexadecimal digits are shared by the device (V0111) and a declared package (V0110). */
export function parseFirmwareVersion(value: unknown): number | undefined {
  if (typeof value !== 'string' || !/^(?:V)?[0-9A-F]{4}$/i.test(value)) return undefined
  return Number.parseInt(value.replace(/^V/i, ''), 16)
}

export function formatFirmwareVersion(value: unknown): string | undefined {
  const version = parseFirmwareVersion(value)
  return version === undefined ? undefined : `V${version.toString(16).toUpperCase().padStart(4, '0')}`
}
