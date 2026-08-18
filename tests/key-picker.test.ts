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

  it('separates extended keys into browsable categories and hides dash placeholders', async () => {
    const wrapper = mount(KeyPicker, {
      props: {
        keys: [
          { code: 61697, label: 'Win', category: 'special' },
          { code: 4277, label: '下一首', category: 'media' },
          { code: 62226, label: '主灯亮度+', category: 'special' },
          { code: 29441, label: '鼠标左键', category: 'special' },
          { code: 4498, label: 'Calc', category: 'special' },
          { code: 25141, label: '~', category: 'special' },
          { code: 167, label: '-', category: 'special' },
        ],
      },
    })

    await wrapper.findAll('.picker-modes button')[1]!.trigger('click')
    expect(wrapper.findAll('.extended-category-tabs button').map((button) => button.text())).toEqual([
      '系统功能1', '媒体1', '灯光1', '鼠标1', '快捷指令1', '更多1',
    ])
    expect(wrapper.find('.extended-key-list').text()).toContain('Win')
    expect(wrapper.text()).not.toContain('0x00A7')

    await wrapper.findAll('.extended-category-tabs button')[3]!.trigger('click')
    expect(wrapper.find('.extended-key-list').text()).toContain('鼠标左键')
    expect(wrapper.find('.extended-key-list').text()).not.toContain('Win')
  })
})
