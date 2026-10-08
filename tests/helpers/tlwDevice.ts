import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { vi } from 'vitest'

/** 回放抓包中的读取区；仅测试使用，不注册为可连接的演示设备。 */
export class CapturedMouse extends EventTarget {
  vendorId = 0x320f
  productId: number
  collections = [{ usagePage: 0xff1c, usage: 0x92 }]
  opened = false
  blocks = new Map<number, Uint8Array>()
  sent: Uint8Array[] = []
  open = vi.fn(async () => {
    this.opened = true
  })
  close = vi.fn(async () => {
    this.opened = false
  })

  constructor(wireless = false) {
    super()
    this.productId = wireless ? 0x22f3 : 0x22f2
    const fixture = JSON.parse(readFileSync(resolve('tests/tlw/capture.json'), 'utf8'))
    for (const line of fixture.packets as string[]) {
      const match = line.match(/IN ID:4 (.*)$/)
      if (!match) continue
      const bytes = Uint8Array.from(match[1]!.split(' ').map((value) => parseInt(value, 16)))
      const command = bytes[2]!
      if (![3, 5, 7, 8, 0x1a].includes(command)) continue
      const block = this.blocks.get(command) ?? new Uint8Array(256)
      block.set(bytes.slice(7, 7 + bytes[3]!), bytes[4]! | (bytes[5]! << 8))
      this.blocks.set(command, block)
    }
  }

  sendReport = vi.fn(async (reportId: number, payload: Uint8Array) => {
    const request = new Uint8Array(payload)
    this.sent.push(request)
    const command = request[2]! - 0xa0
    const block = this.blocks.get(command)
    if (!block && ![1, 2].includes(command))
      throw new Error('Unexpected write during read-only integration test')
    const offset = request[4]! | (request[5]! << 8)
    const reply = request.slice()
    if (block) reply.set(block.slice(offset, offset + request[3]!), 7)
    if (this.productId === 0x22f3) reply[31] = 2
    const event = new Event('inputreport')
    Object.assign(event, { reportId, data: new DataView(reply.buffer) })
    this.dispatchEvent(event)
  })

  asHid() {
    return this as unknown as HIDDevice
  }
}

export class MouseHid extends EventTarget {
  requestDevice = vi.fn<() => Promise<HIDDevice[]>>().mockResolvedValue([])
  asHid() {
    return this as unknown as HID
  }
  disconnect(device: HIDDevice) {
    const event = new Event('disconnect')
    Object.assign(event, { device })
    this.dispatchEvent(event)
  }
}
