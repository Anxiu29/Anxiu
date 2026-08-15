import type { DeviceCapabilities, DeviceInfo } from './keyboard'

export interface CapabilityContext {
  readonly device: DeviceInfo
  readonly protocolVersion: string
}

export interface CapabilityDescriptor {
  readonly id: string
  resolve(context: CapabilityContext): DeviceCapabilities
}

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

export class VariantCapabilityDescriptor implements CapabilityDescriptor {
  constructor(readonly id: string, private readonly fallback: DeviceCapabilities, private readonly variants: readonly CapabilityVariant[]) {}

  resolve(context: CapabilityContext): DeviceCapabilities {
    const selected = this.variants.find((variant) => variant.matches(context))?.capabilities ?? this.fallback
    return { ...selected }
  }
}
