import { createServer as createNetServer } from 'node:net'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

import { createServer as createViteServer } from 'vite'

/** 开发服务器优先使用的端口。 */
export const DEFAULT_DEV_PORT = 5173

/** 限制扫描范围，避免端口异常时无限查找。 */
const MAX_DEV_PORT = DEFAULT_DEV_PORT + 100

/**
 * 通过一次短暂的 TCP 监听判断端口是否可用。
 *
 * 只检查 127.0.0.1 即可识别占用 0.0.0.0 的 Vite 进程；检查完成后会立即
 * 关闭临时服务，不会长期占用端口。
 */
export function isPortAvailable(port) {
  return new Promise((resolveAvailability) => {
    const probe = createNetServer()

    probe.unref()
    probe.once('error', () => resolveAvailability(false))
    probe.listen({ host: '127.0.0.1', port, exclusive: true }, () => {
      probe.close(() => resolveAvailability(true))
    })
  })
}

/** 从起始端口向后寻找第一个可用端口。 */
export async function findAvailablePort(
  startPort = DEFAULT_DEV_PORT,
  endPort = MAX_DEV_PORT,
) {
  for (let port = startPort; port <= endPort; port += 1) {
    if (await isPortAvailable(port)) return port
  }

  throw new Error(`没有找到可用开发端口（${startPort}-${endPort}）`)
}

/**
 * 先确定端口，再以严格端口模式启动 Vite。
 *
 * strictPort 可以防止“检查后端口恰好被其他进程抢占”时 Vite 再次静默换端口；
 * open 使用最终选中的绝对地址，确保浏览器不会误开另一个项目的 5173 页面。
 */
export async function startDevServer() {
  const port = await findAvailablePort()

  if (port !== DEFAULT_DEV_PORT) {
    console.log(`[dev] 端口 ${DEFAULT_DEV_PORT} 已占用，改用 ${port}`)
  }

  const server = await createViteServer({
    server: {
      host: '0.0.0.0',
      port,
      strictPort: true,
      open: `http://localhost:${port}`,
    },
  })

  await server.listen()
  server.printUrls()
  server.bindCLIShortcuts({ print: true })
}

// 导入本文件做自动化测试时不启动服务；只有 npm run dev 执行入口才启动。
const isExecutedDirectly =
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url

if (isExecutedDirectly) {
  await startDevServer()
}
