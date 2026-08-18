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

const modelNamesInSharedSource = ['application', 'domain', 'protocol', 'transport', 'stores', 'components', 'ui']
  .flatMap((directory) => filesBelow(join(sourceRoot, directory)))
  .filter((path) => /\b(?:C98|RK-C98)\b/i.test(readFileSync(path, 'utf8')))
  .map((path) => relative(sourceRoot, path))

describe('dependency boundaries', () => {
  it('keeps domain independent from application and adapters', () => {
    expect(forbiddenImports('domain', /vue|pinia|@\/application|@\/(protocol|transport|devices|stores|components|composition)/)).toEqual([])
  })

  it('keeps application independent from UI and concrete adapters', () => {
    expect(forbiddenImports('application', /vue|pinia|@\/(protocol|transport|devices|stores|components|composition)/)).toEqual([])
  })

  it('keeps protocol and transport adapters independent from devices and UI', () => {
    expect(forbiddenImports('protocol', /vue|pinia|@\/(devices|stores|components|composition)/)).toEqual([])
    expect(forbiddenImports('transport', /vue|pinia|@\/(protocol|devices|stores|components|composition)/)).toEqual([])
  })

  it('keeps generic components independent from model-specific adapters', () => {
    expect(forbiddenImports('components', /@\/(assets|devices|protocol|transport)|@\/ui\/(?:c98|rk|mg)[^/]*?/i)).toEqual([])
  })

  it('keeps stores dependent on application contracts instead of concrete adapters or the composition root', () => {
    expect(forbiddenImports('stores', /@\/(protocol|transport|devices|composition)/)).toEqual([])
  })

  it('keeps concrete model names out of shared source', () => {
    expect(modelNamesInSharedSource).toEqual([])
    expect(readFileSync(join(sourceRoot, 'App.vue'), 'utf8')).not.toMatch(/\b(?:C98|RK-C98)\b/i)
  })
})
