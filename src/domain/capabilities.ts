import type { DeviceCapabilities, DeviceInfo } from './keyboard'

export interface CapabilityContext {
  readonly device: DeviceInfo
  readonly protocolVersion: string
}

export interface CapabilityDescriptor {
  readonly id: string
  resolve(context: CapabilityContext): DeviceCapabilities
}

/** 固定能力适用于所有已知固件行为一致的设备型号。 */
export class StaticCapabilityDescriptor implements CapabilityDescriptor {
  constructor(readonly id: string, private readonly capabilities: DeviceCapabilities) {}

  resolve(_context: CapabilityContext): DeviceCapabilities {
    return { ...this.capabilities }
  }
}

export interface CapabilityVariant {
  readonly matches: (context: CapabilityContext) => boolean
  readonly capabilities: DeviceCapabilities
}

/**
 * 变体描述器把“某固件支持什么”留在设备描述中，避免版本判断散落到协议和 UI。
 * variants 按声明顺序匹配，全部不匹配时使用 fallback。
 */
export class VariantCapabilityDescriptor implements CapabilityDescriptor {
  constructor(readonly id: string, private readonly fallback: DeviceCapabilities, private readonly variants: readonly CapabilityVariant[]) {}

  resolve(context: CapabilityContext): DeviceCapabilities {
    const selected = this.variants.find((variant) => variant.matches(context))?.capabilities ?? this.fallback
    return { ...selected }
  }
}
