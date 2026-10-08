// Coordinates refer to the 217 × 420 product image inside a 600 × 500 drawing.
// 按键4（矩阵索引3）暂不开放，保留坐标方便后续恢复。
export const buttonLayout = [
  {
    index: 0,
    path: 'M5 30 L85 5 L85 180 L5 172 Z',
    line: 'M240 100 L185 90 L148 90',
    x: 20,
    y: 68,
  },
  {
    index: 2,
    path: 'M132 5 L209 30 L211 175 L132 184 Z',
    line: 'M355 105 L415 120 L440 120',
    x: 440,
    y: 98,
  },
  { index: 1, path: 'M94 41 H122 V99 H94 Z', line: 'M298 95 L345 46 L440 46', x: 440, y: 24 },
  // { index: 3, path: 'M-4 94 H8 V119 H-4 Z', line: 'M192 136 L170 165 L148 165', x: 20, y: 143 },
  { index: 7, path: 'M-4 124 H8 V172 H-4 Z', line: 'M192 177 L170 177 L148 177', x: 20, y: 155 },
  { index: 6, path: 'M-4 195 H8 V251 H-4 Z', line: 'M192 253 L170 264 L148 264', x: 20, y: 242 },
  {
    index: 8,
    path: 'M97 125 H119 V153 H97 Z',
    line: 'M298 169 L365 195 L440 195',
    x: 440,
    y: 173,
  },
  {
    index: 9,
    path: 'M97 164 H119 V192 H97 Z',
    line: 'M298 207 L365 270 L440 270',
    x: 440,
    y: 248,
  },
] as const
