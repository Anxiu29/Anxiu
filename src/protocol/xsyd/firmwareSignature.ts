/** 移植自官方 MIT SDK 1.0.24 的 Bootloader 签名算法；来源见 doc/firmware-upgrade.md。 */
export function firmwareSignature(seed: Uint8Array, unlock: number): number[] {
  if (seed.length !== 16) throw new Error('升级签名必须使用完整的 16 字节种子')
  const key = [1732584193, 4023233417, 2562383102, 271733878]
  const salt = [1696822273, 1930445398, 4020996557, 3130580222]
  const view = new DataView(seed.buffer, seed.byteOffset, seed.byteLength)
  const words = Array.from({ length: 4 }, (_, i) => view.getUint32(i * 4, true))
  const mix = () => {
    words[4] = words[0]!
    for (let i = 0; i < 4; i++) {
      // 最后一对必须使用前三轮计算后的 words[0]。
      if (i === 3) words[4] = words[0]!
      let a = words[i]!, b = words[i + 1]!, sum = 0
      for (let round = 0; round < 16; round++) {
        sum = (sum + 2654435769) >>> 0
        a = (a + (((b << 4) + key[0]!) ^ (b + sum) ^ ((b >>> 5) + key[1]!))) >>> 0
        b = (b + (((a << 4) + key[2]!) ^ (a + sum) ^ ((a >>> 5) + key[3]!))) >>> 0
      }
      words[i] = a; words[i + 1] = b
    }
    words[0] = words[4]!
  }
  mix()
  key[0] = (((key[0]! & words[0]!) | (~key[0]! & salt[0]!)) >>> 0) + unlock
  key[1] = (((key[1]! & salt[1]!) | (-1930445399 & words[1]!)) >>> 0) + unlock
  key[2] = ((key[2]! ^ words[2]! ^ salt[2]!) >>> 0) + unlock
  key[3] = ((words[3]! ^ (1164387073 | key[3]!)) >>> 0) + unlock
  mix()
  return words.slice(0, 4).flatMap((word) => [word & 255, (word >>> 8) & 255, (word >>> 16) & 255, word >>> 24])
}

/** SDK 使用初值 0、反射多项式 0x8408，无最终异或；不是报告头的 8 位校验。 */
export function firmwareCrc(bytes: Uint8Array): number {
  let crc = 0
  for (const byte of bytes) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit++) crc = (crc & 1) ? (crc >>> 1) ^ 0x8408 : crc >>> 1
  }
  return crc
}
