import { writeFile } from 'node:fs/promises'

const sourceUrl = 'https://raw.githubusercontent.com/sparklinkplayjoy/keyboard-docs/main/keyboard/keyboard.md'
const outputPath = new URL('../src/protocol/xsyd/officialKeyMap.ts', import.meta.url)

const response = await fetch(sourceUrl)
if (!response.ok) throw new Error(`读取官方键值表失败：HTTP ${response.status}`)
const markdown = await response.text()
const codeBlock = markdown.match(/```typescript\s+const keyMap\s*=\s*\{([\s\S]*?)\};\s*```/)?.[1]
if (!codeBlock) throw new Error('官方文档中没有找到 keyMap 代码块')

const entries = Array.from(codeBlock.matchAll(/^\s*(\d+):\s*(['"])(.*?)\2,/gm), (match) => ({ code: Number(match[1]), label: match[3] }))
if (entries.length < 250) throw new Error(`官方键值数量异常：${entries.length}`)

const lines = entries.map(({ code, label }) => `  ${code}: ${JSON.stringify(label)},`)
const source = `/**
 * 星闪悦动官方键值表的项目内镜像，按数字键码可直接全文搜索。
 * 来源：${sourceUrl}
 * 更新方式：npm run sync:keymap
 */
export const OFFICIAL_XSYD_KEY_MAP: Readonly<Record<number, string>> = {
${lines.join('\n')}
}

export const officialKeyName = (code: number) => OFFICIAL_XSYD_KEY_MAP[code] ?? \`未知(0x\${code.toString(16).padStart(4, '0').toUpperCase()})\`
`

await writeFile(outputPath, source, 'utf8')
console.log(`已同步 ${entries.length} 个官方键值到 ${outputPath.pathname}`)
