import type { KeyboardProtocol } from '@/application/ports'
import type { KeyAssignment, KeyPosition, KeyboardProfile } from '@/domain/keyboard'
import { cloneAssignments } from '@/domain/keyboard'
import { keyDefinition } from '@/domain/keycodes'

const rows: Array<Array<[string, number, number?]>> = [
  [['Esc',0x29],['F1',0x3a],['F2',0x3b],['F3',0x3c],['F4',0x3d],['F5',0x3e],['F6',0x3f],['F7',0x40],['F8',0x41],['F9',0x42],['F10',0x43],['F11',0x44],['F12',0x45],['Del',0x4c]],
  [['`',0x35],['1',0x1e],['2',0x1f],['3',0x20],['4',0x21],['5',0x22],['6',0x23],['7',0x24],['8',0x25],['9',0x26],['0',0x27],['-',0x2d],['=',0x2e],['Backspace',0x2a,2],['Home',0x4a]],
  [['Tab',0x2b,1.5],...['Q','W','E','R','T','Y','U','I','O','P'].map((x,i)=>[x,0x14+i] as [string,number]),['[',0x2f],[']',0x30],['\\',0x31,1.5],['PgUp',0x4b]],
  [['Caps',0x39,1.8],...['A','S','D','F','G','H','J','K','L'].map((x,i)=>[x,0x04+i] as [string,number]),[';',0x33],["'",0x34],['Enter',0x28,2.2],['PgDn',0x4e]],
  [['Shift',0xe1,2.2],...['Z','X','C','V','B','N','M'].map((x,i)=>[x,0x1d+i] as [string,number]),[',',0x36],['.',0x37],['/',0x38],['Shift',0xe5,2.5],['↑',0x52]],
  [['Ctrl',0xe0,1.4],['Win',0xe3,1.4],['Alt',0xe2,1.4],['Space',0x2c,6],['Alt',0xe6,1.4],['Fn',0xf001,1.4],['Ctrl',0xe4,1.4],['←',0x50],['↓',0x51],['→',0x4f]],
]

const positions: KeyPosition[] = rows.flatMap((row, rowIndex) => row.map(([label, sourceCode, width], column) => ({ id: `${rowIndex}-${column}`, sourceCode, label, row: rowIndex, column, width })))
const initial = Array.from({ length: 4 }, (_, layer) => positions.map((position) => ({ positionId: position.id, sourceCode: position.sourceCode, layer, keyCode: layer === 0 ? position.sourceCode : 0, category: keyDefinition(position.sourceCode).category }))).flat()

export class DemoKeyboardProtocol implements KeyboardProtocol {
  private stored = cloneAssignments(initial)
  private working = cloneAssignments(initial)
  private wait = () => new Promise((resolve) => setTimeout(resolve, 260))
  async getProfile(): Promise<KeyboardProfile> {
    await this.wait()
    return { device: { productName: 'RK-C98 Demo', vendorId: 0x1ca2, productId: 0x1604, firmwareVersion: '1.0.1-demo', protocolVersion: '1.0.7', runMode: 'app', boardId: 'DEMO98' }, capabilities: { layers: 4, remap: true, restoreFactory: true, layoutRows: 6, layoutColumns: 21 }, positions, assignments: cloneAssignments(this.working) }
  }
  async writeAssignments(assignments: KeyAssignment[]) { await this.wait(); this.working = cloneAssignments(assignments) }
  async save() { await this.wait(); this.stored = cloneAssignments(this.working) }
  async reload() { await this.wait(); this.working = cloneAssignments(this.stored) }
  async restoreFactory() { await this.wait(); this.working = cloneAssignments(initial); this.stored = cloneAssignments(initial) }
  close() {}
}
