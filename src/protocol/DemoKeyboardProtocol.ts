import type { KeyboardDevice } from '@/application/ports'
import type { DeviceCapabilities, KeyboardConfiguration, KeyboardMode, KeyAssignment, KeyPosition, KeyboardProfile } from '@/domain/keyboard'
import { cloneAssignments } from '@/domain/keyboard'
import type { KeyCatalog } from '@/domain/KeyCatalog'
import type { MatrixKeyInput } from '@/domain/layout'
import type { CapabilityDescriptor } from '@/domain/capabilities'
import type { DefaultKeymapResolver } from './DefaultKeymapResolver'
export class DemoKeyboardProtocol implements KeyboardDevice {
  private readonly positions: KeyPosition[]
  private readonly initial: KeyAssignment[]
  private stored: KeyAssignment[]
  private working: KeyAssignment[]
  private wait = () => new Promise((resolve) => setTimeout(resolve, 260))
  readonly profile = { getProfile: () => this.getProfile() }
  readonly keymap = { writeAssignments: (assignments: KeyAssignment[]) => this.writeAssignments(assignments) }
  readonly configuration = { save: () => this.save(), reload: () => this.reload() }
  readonly factoryReset = { restoreFactory: () => this.restoreFactory() }
  readonly systemMode = { switchMode: (mode: KeyboardMode) => this.switchMode(mode) }
  readonly configurationSwitch = { switchConfiguration: (configuration: KeyboardConfiguration) => this.switchConfiguration(configuration) }
  private readonly capabilities: DeviceCapabilities
  private currentMode: KeyboardMode = 'win'
  constructor(
    private readonly keyCatalog: KeyCatalog,
    demoKeys: readonly MatrixKeyInput[],
    capabilityDescriptor: CapabilityDescriptor,
    private readonly resolveDefaultKeymap: DefaultKeymapResolver,
  ) {
    this.positions = demoKeys.map((key) => ({ ...key, label: this.keyCatalog.get(key.sourceCode).label }))
    const device = { productName: 'RK-C98 Demo', vendorId: 0x1ca2, productId: 0x1604, firmwareVersion: '1.0.1-demo', protocolVersion: '1.0.7', runMode: 'app' as const, boardId: 'DEMO98' }
    this.capabilities = capabilityDescriptor.resolve({ device, protocolVersion: device.protocolVersion })
    this.initial = this.defaultsFor('win')
    this.stored = cloneAssignments(this.initial)
    this.working = cloneAssignments(this.initial)
  }
  async getProfile(): Promise<KeyboardProfile> {
    await this.wait()
    return { device: { productName: 'RK-C98 Demo', vendorId: 0x1ca2, productId: 0x1604, firmwareVersion: '1.0.1-demo', protocolVersion: '1.0.7', runMode: 'app', boardId: 'DEMO98' }, capabilities: this.capabilities, positions: this.positions, defaultAssignments: cloneAssignments(this.defaultsFor(this.currentMode)), assignments: cloneAssignments(this.working) }
  }
  async writeAssignments(assignments: KeyAssignment[]) {
    await this.wait()
    const changes = new Map(assignments.map((item) => [`${item.layer}:${item.positionId}`, item]))
    this.working = this.working.map((item) => ({ ...(changes.get(`${item.layer}:${item.positionId}`) ?? item) }))
  }
  async save() { await this.wait(); this.stored = cloneAssignments(this.working) }
  async reload() { await this.wait(); this.working = cloneAssignments(this.stored) }
  async restoreFactory() { await this.wait(); const defaults = this.defaultsFor(this.currentMode); this.working = cloneAssignments(defaults); this.stored = cloneAssignments(defaults) }
  async switchMode(mode: KeyboardMode) {
    await this.wait()
    this.currentMode = mode
    const defaults = this.defaultsFor(mode)
    this.working = cloneAssignments(defaults)
    this.stored = cloneAssignments(defaults)
  }
  async switchConfiguration(_configuration: KeyboardConfiguration) { await this.wait() }
  close() {}

  private defaultsFor(mode: KeyboardMode) {
    return this.resolveDefaultKeymap({ mode, positions: this.positions, layers: this.capabilities.layers, keyCatalog: this.keyCatalog })
  }
}
