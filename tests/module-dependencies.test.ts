import { describe, expect, it } from 'vitest'
import { join } from 'node:path'
import { moduleDependencies } from './helpers/moduleDependencies'

const root = join(process.cwd(), 'src')
describe('module dependency detection', () => {
  it('resolves relative paths and detects multiline, dynamic, type and re-export dependencies', () => {
    const result = moduleDependencies(join(root, 'domain', 'example.ts'), `
      import {
        SomeType
      } from '../application/ports'
      export { adapter } from '../protocol/KeyboardProtocol'
      const lazy = import('../transport/HidTransport')
      type State = import('../stores/driverState').State
      import legacy = require('../devices/catalog')
      const state = require('../composition/root')
    `, root)
    expect(result).toEqual([
      '@/application/ports', '@/protocol/KeyboardProtocol', '@/transport/HidTransport',
      '@/stores/driverState', '@/devices/catalog', '@/composition/root',
    ])
  })

  it('reads both Vue script blocks without treating template or comment text as imports', () => {
    const result = moduleDependencies(join(root, 'components', 'Example.vue'), `
      <script lang="ts">export { adapter } from '../devices/catalog'</script>
      <script setup lang="ts">
        // import ignored from '../transport/ignored'
        const example = "import fake from '../protocol/fake'"
        import { ref } from 'vue'
      </script>
      <template><div>import fake from '../stores/fake'</div></template>
    `, root)
    expect(result).toEqual(['@/devices/catalog', 'vue'])
  })
})
