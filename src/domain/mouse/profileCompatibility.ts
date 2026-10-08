/** Validate against the connected device before the first write, not just the file format. */
export function validateProfileCompatibility(
  profile: { functions: readonly number[]; keys: readonly number[] },
  device: {
    basic: { dpiStageCount: number; dpiRank: number }
    keysRaw: Uint8Array
    defaultKeys: readonly (readonly number[])[]
  },
  features = { lighting: true },
) {
  const count = device.basic.dpiStageCount
  const selected = profile.functions[12]
  if (!Number.isInteger(count) || count < 1 || 14 + count * 9 > profile.functions.length ||
      !Number.isInteger(selected) || selected < 0 || selected >= count)
    throw new Error('Invalid DPI stage')
  if (!profile.functions[14 + selected * 9])
    throw new Error('Profile selects a disabled DPI stage')

  const inRange = (value: number, max: number, name: string) => {
    if (!Number.isInteger(value) || value < 0 || value > max)
      throw new Error(`Unsupported ${name}`)
  }
  inRange(profile.functions[11], 3, 'report rate')
  if (features.lighting) {
    inRange(profile.functions[1], 6, 'light mode')
    inRange(profile.functions[2], 4, 'brightness level')
    inRange(profile.functions[3], 3, 'light speed')
  }
  for (let stage = 0; stage < count; stage++) {
    const offset = 14 + stage * 9
    inRange(profile.functions[offset], 1, 'DPI stage enable flag')
    inRange(profile.functions[offset + 1], 1, 'DPI independent XY flag')
    for (let byte = 2; byte < 6; byte++)
      inRange(profile.functions[offset + byte], Math.min(device.basic.dpiRank, 255), 'DPI rank')
  }

  let hasLeft = false
  for (let index = 0; index < device.defaultKeys.length; index++) {
    const offset = index * 3
    const active = device.defaultKeys[index].some((byte) => byte !== 0)
    if (!active && profile.keys.slice(offset, offset + 3).some((byte, i) => byte !== device.keysRaw[offset + i]))
      throw new Error('Profile modifies an empty key slot')
    if (active && profile.keys[offset] === 0x10 && profile.keys[offset + 1] === 1) hasLeft = true
  }
  if (!hasLeft) throw new Error('Keep at least one left mouse button on a physical key')
  // Unused matrix bytes may contain firmware data; never overwrite them from an import.
  if (profile.keys.slice(device.defaultKeys.length * 3).some((byte, i) =>
    byte !== device.keysRaw[device.defaultKeys.length * 3 + i]))
    throw new Error('Profile modifies bytes outside the device key matrix')
}
