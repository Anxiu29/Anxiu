import type { ControlGeometry, MatrixAddress } from './layout'

export type SessionStatus =
  | 'unsupported'
  | 'idle'
  | 'connecting'
  | 'reading'
  | 'ready'
  | 'writing'
  | 'disconnected'
  | 'error'

export type KeyCategory = 'basic' | 'modifier' | 'navigation' | 'function' | 'media' | 'special'

export interface KeyDefinition {
  code: number
  label: string
  category: KeyCategory
}

export interface KeyPosition {
  id: string
  sourceCode: number
  label: string
  address: MatrixAddress
  geometry: ControlGeometry
}

export interface KeyAssignment {
  positionId: string
  sourceCode: number
  layer: number
  keyCode: number
  category: KeyCategory
}

export interface DeviceInfo {
  productName: string
  vendorId: number
  productId: number
  firmwareVersion: string
  serialNumber?: string
  boardId?: string
  protocolVersion: string
  runMode: 'app' | 'boot' | 'unknown'
}

export interface DeviceCapabilities {
  layers: number
  remap: boolean
  restoreFactory: boolean
  layoutRows: number
  layoutColumns: number
}

export interface KeyboardProfile {
  device: DeviceInfo
  capabilities: DeviceCapabilities
  positions: KeyPosition[]
  assignments: KeyAssignment[]
}

export const cloneAssignments = (items: KeyAssignment[]): KeyAssignment[] =>
  items.map((item) => ({ ...item }))

export function assignmentsEqual(a: KeyAssignment[], b: KeyAssignment[]): boolean {
  if (a.length !== b.length) return false
  return a.every((item, index) => {
    const other = b[index]
    return other !== undefined && item.positionId === other.positionId && item.layer === other.layer && item.keyCode === other.keyCode
  })
}

export function validateAssignments(profile: KeyboardProfile, assignments: KeyAssignment[]): string[] {
  const errors: string[] = []
  const positions = new Set(profile.positions.map((position) => position.id))
  const seen = new Set<string>()
  for (const item of assignments) {
    const identity = `${item.layer}:${item.positionId}`
    if (!positions.has(item.positionId)) errors.push(`未知键位：${item.positionId}`)
    if (item.layer < 0 || item.layer >= profile.capabilities.layers) errors.push(`无效层级：${item.layer}`)
    if (!Number.isInteger(item.keyCode) || item.keyCode < 0 || item.keyCode > 0xffff) errors.push(`无效键码：${item.keyCode}`)
    if (seen.has(identity)) errors.push(`重复键位：${identity}`)
    seen.add(identity)
  }
  return errors
}
