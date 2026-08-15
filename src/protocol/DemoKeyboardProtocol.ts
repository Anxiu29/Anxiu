import type { KeyboardDevice } from '@/application/ports'
import type { KeyAssignment, KeyPosition, KeyboardProfile } from '@/domain/keyboard'
import { cloneAssignments } from '@/domain/keyboard'
import type { KeyCatalog } from '@/domain/KeyCatalog'
import type { LayoutDescriptor, MatrixKeyInput } from '@/domain/layout'
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
  constructor(private readonly keyCatalog: KeyCatalog, layout: LayoutDescriptor, demoKeys: readonly MatrixKeyInput[]) {
    this.positions = layout.describe(demoKeys.map((key) => ({ ...key, label: this.keyCatalog.get(key.sourceCode).label })))
    this.initial = Array.from({ length: 4 }, (_, layer) => this.positions.map((position) => ({ positionId: position.id, sourceCode: position.sourceCode, layer, keyCode: layer === 0 ? position.sourceCode : 0, category: this.keyCatalog.get(position.sourceCode).category }))).flat()
    this.stored = cloneAssignments(this.initial)
    this.working = cloneAssignments(this.initial)
  }
  async getProfile(): Promise<KeyboardProfile> {
    await this.wait()
    return { device: { productName: 'RK-C98 Demo', vendorId: 0x1ca2, productId: 0x1604, firmwareVersion: '1.0.1-demo', protocolVersion: '1.0.7', runMode: 'app', boardId: 'DEMO98' }, capabilities: { layers: 4, remap: true, restoreFactory: true, layoutRows: 6, layoutColumns: 21 }, positions: this.positions, assignments: cloneAssignments(this.working) }
  }
  async writeAssignments(assignments: KeyAssignment[]) { await this.wait(); this.working = cloneAssignments(assignments) }
  async save() { await this.wait(); this.stored = cloneAssignments(this.working) }
  async reload() { await this.wait(); this.working = cloneAssignments(this.stored) }
  async restoreFactory() { await this.wait(); this.working = cloneAssignments(this.initial); this.stored = cloneAssignments(this.initial) }
  close() {}
}
