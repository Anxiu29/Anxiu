import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import KeyPicker from '@/components/KeyPicker.vue'

describe('KeyPicker', () => {
  it('blocks additional key selection while an immediate write is running', async () => {
    const wrapper = mount(KeyPicker, {
      props: { keys: [{ code: 4, label: 'A', category: 'basic' }], disabled: true },
    })

    const key = wrapper.find('.picker-key')
    expect(key.attributes('disabled')).toBeDefined()
    await key.trigger('click')
    expect(wrapper.emitted('select')).toBeUndefined()
  })
})
