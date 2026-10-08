/**
 * RK CB75 固件版本 JSON 配置
 * 新增型号：在下方 map 增加 productId -> json 路径即可
 */
export const RK_CB75_FIRMWARE_JSON: Record<number, string> = {
    0x02F1: '/down/work/RKWEB/firmware/CB75-keyborad(863)/3_mode/CB75-keyborad(863)_firmware_3_US.json',
}

export function getFirmwareJsonUrl(productId?: number): string | undefined {
    if (productId == null) return undefined
    return RK_CB75_FIRMWARE_JSON[productId]
}
