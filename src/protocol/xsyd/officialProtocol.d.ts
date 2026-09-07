// 1.0.7 的 package.json types 路径缺失；只声明本项目实际使用的官方 API。
declare module '@sparklinkplayjoy/protocol-keyboard' {
  const protocol: { systemProtocol: {
    blSIGN(unlock: number, data: number[], sn: number[]): Uint8Array
    blERASE(size: number): Uint8Array
    blREBOOT(): Uint8Array
    blTOAPP(size: number, crc: number): Uint8Array
    blWRITE(param: { addr: number; size: number; codes: number[] }): Uint8Array[]
    blRCRC(size: number): Uint8Array
  } }
  export default protocol
}
