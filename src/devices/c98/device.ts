export const C98_DEVICE = {
  name: 'RK-C98',
  vendorId: 0x1ca2,
  productId: 0x1604,
  usagePage: 0xffa0,
  usage: 0x0001,
  reportId: 0,
  reportSize: 64,
  layers: 4,
  matrixRows: 6,
  matrixColumns: 21,
} as const

/** 演示协议的设备身份也由设备层提供，通用演示实现不硬编码任何型号。 */
export const C98_DEMO_DEVICE = {
  productName: 'RK-C98 Demo',
  vendorId: C98_DEVICE.vendorId,
  productId: C98_DEVICE.productId,
  firmwareVersion: '1.0.1-demo',
  protocolVersion: '1.0.7',
  runMode: 'app' as const,
  boardId: 'DEMO98',
}
