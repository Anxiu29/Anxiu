import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const sourceRoot = join(process.cwd(), 'src')
const filesBelow = (directory: string): string[] => readdirSync(directory).flatMap((name) => {
  const path = join(directory, name)
  return statSync(path).isDirectory() ? filesBelow(path) : path.endsWith('.ts') || path.endsWith('.vue') ? [path] : []
})

const forbiddenImports = (directory: string, forbidden: RegExp) => filesBelow(join(sourceRoot, directory)).flatMap((path) => {
  const violations = readFileSync(path, 'utf8').split('\n').filter((line) => /^import\s/.test(line) && forbidden.test(line))
  return violations.map((line) => `${relative(sourceRoot, path)}: ${line.trim()}`)
})

describe('dependency boundaries', () => {
  it('keeps domain independent from application and adapters', () => {
    expect(forbiddenImports('domain', /vue|pinia|@\/application|@\/(protocol|transport|devices|stores|components|composition)/)).toEqual([])
  })

  it('keeps application independent from UI and concrete adapters', () => {
    expect(forbiddenImports('application', /vue|pinia|@\/(protocol|transport|devices|stores|components|composition)/)).toEqual([])
  })

  it('keeps protocol and transport adapters independent from UI', () => {
    expect(forbiddenImports('protocol', /vue|pinia|@\/(stores|components|composition)/)).toEqual([])
    expect(forbiddenImports('transport', /vue|pinia|@\/(stores|components|composition)/)).toEqual([])
  })
})
