import type { KeyDefinition } from './keyboard'

export interface KeyCatalog {
  list(): readonly KeyDefinition[]
  get(code: number): KeyDefinition
}

export class StaticKeyCatalog implements KeyCatalog {
  private readonly index: ReadonlyMap<number, KeyDefinition>

  constructor(private readonly definitions: readonly KeyDefinition[]) {
    this.index = new Map(definitions.map((definition) => [definition.code, definition]))
  }

  list() { return this.definitions }

  get(code: number): KeyDefinition {
    // 固件可能返回文档之外的新键码；保留数值比抛错更利于诊断和后续补表。
    return this.index.get(code) ?? unknownKey(code)
  }
}

/** 后注册的目录覆盖同键码定义，适合“标准 HID + 厂商扩展”。 */
export class CompositeKeyCatalog implements KeyCatalog {
  private readonly catalog: StaticKeyCatalog

  constructor(...catalogs: KeyCatalog[]) {
    const merged = new Map<number, KeyDefinition>()
    catalogs.forEach((catalog) => catalog.list().forEach((item) => merged.set(item.code, item)))
    this.catalog = new StaticKeyCatalog([...merged.values()])
  }

  list() { return this.catalog.list() }
  get(code: number) { return this.catalog.get(code) }
}

export const unknownKey = (code: number): KeyDefinition => ({
  code,
  label: `0x${code.toString(16).padStart(4, '0').toUpperCase()}`,
  category: 'special',
})

export const EMPTY_KEY_CATALOG: KeyCatalog = new StaticKeyCatalog([])
