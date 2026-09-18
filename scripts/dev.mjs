import { createServer as createNetServer } from 'node:net'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

import { createServer as createViteServer } from 'vite'

/** 开发服务器优先使用的端口。 */
export const DEFAULT_DEV_PORT = 5174

// 固定使用 IPv4 回环地址，避免 localhost 被解析到另一个项目的 IPv6 服务。
export const DEV_HOST = '127.0.0.1'

/** 限制扫描范围，避免端口异常时无限查找。 */
const MAX_DEV_PORT = DEFAULT_DEV_PORT + 100

/** 探测一个地址，完成后立即释放监听。 */
function isAddressAvailable(host, port) {
  return new Promise((resolveAvailability) => {
    const probe = createNetServer()
    probe.once('error', (error) => {
      // 没有 IPv6 的系统无需占用 IPv6 端口；其他错误都视为不可用。
      resolveAvailability(host === '::1' && ['EAFNOSUPPORT', 'EADDRNOTAVAIL'].includes(error.code))
    })
    probe.listen({ host, port, exclusive: true }, () => {
      probe.close((error) => resolveAvailability(!error))
    })
  })
}

/** 同时检查 IPv4 和 IPv6，避免两个项目显示相同端口却指向不同服务。 */
export async function isPortAvailable(port) {
  const available = await Promise.all([
    isAddressAvailable(DEV_HOST, port),
    isAddressAvailable('::1', port),
  ])
  return available.every(Boolean)
}

/** 从起始端口向后寻找第一个可用端口。 */
export async function findAvailablePort(startPort = DEFAULT_DEV_PORT, endPort = MAX_DEV_PORT) {
  for (let port = startPort; port <= endPort; port += 1) {
    if (await isPortAvailable(port)) return port
  }

  throw new Error(`没有找到可用开发端口（${startPort}-${endPort}）`)
}

/**
 * 先确定端口，再以严格端口模式启动 Vite。
 *
 * strictPort 可以防止“检查后端口恰好被其他进程抢占”时 Vite 再次静默换端口；
 * open 使用最终选中的绝对地址，确保浏览器不会误开另一个项目的页面。
 */
export async function startDevServer({ open = true } = {}) {
  const port = await findAvailablePort()

  if (port !== DEFAULT_DEV_PORT) {
    console.log(`[dev] 端口 ${DEFAULT_DEV_PORT} 已占用，改用 ${port}`)
  }

  const server = await createViteServer({
    server: {
      host: DEV_HOST,
      port,
      strictPort: true,
      open: open ? `http://${DEV_HOST}:${port}` : false,
    },
  })

  await server.listen()
  server.printUrls()
  server.bindCLIShortcuts({ print: true })
  return server
}

// 导入本文件做自动化测试时不启动服务；只有 npm run dev 执行入口才启动。
const isExecutedDirectly =
  process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url

if (isExecutedDirectly) {
  await startDevServer()
}
