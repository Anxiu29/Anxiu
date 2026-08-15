import { describe, expect, it } from 'vitest'
import { StaticCapabilityDescriptor, VariantCapabilityDescriptor, type CapabilityContext } from '@/domain/capabilities'

const context = (firmwareVersion: string): CapabilityContext => ({
  device: { productName: 'test', vendorId: 1, productId: 2, firmwareVersion, protocolVersion: '1.0.7', runMode: 'app' },
  protocolVersion: '1.0.7',
})

const full = { layers: 4, remap: true, restoreFactory: true, layoutRows: 6, layoutColumns: 21 }

describe('capability descriptors', () => {
  it('returns an isolated copy of static model capabilities', () => {
    const descriptor = new StaticCapabilityDescriptor('full', full)
    const first = descriptor.resolve(context('1.0.1'))
    first.layers = 1

    expect(descriptor.resolve(context('1.0.1')).layers).toBe(4)
  })

  it('selects capabilities by firmware without changing protocol code', () => {
    const descriptor = new VariantCapabilityDescriptor('versioned', full, [{
      matches: ({ device }) => device.firmwareVersion.startsWith('0.'),
      capabilities: { ...full, layers: 1, remap: false, restoreFactory: false },
    }])

    expect(descriptor.resolve(context('0.9.0'))).toMatchObject({ layers: 1, remap: false })
    expect(descriptor.resolve(context('1.0.1'))).toMatchObject({ layers: 4, remap: true })
  })
})
