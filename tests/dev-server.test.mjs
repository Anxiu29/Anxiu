import assert from 'node:assert/strict'
import { createServer } from 'node:net'
import { test } from 'node:test'
import {
  DEV_HOST,
  DEFAULT_DEV_PORT,
  isPortAvailable,
  findAvailablePort,
  startDevServer,
} from '../scripts/dev.mjs'

async function occupy(host) {
  const server = createServer()
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen({ host, port: 0 }, resolve)
  })
  return server
}
const close = (server) =>
  new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))

test('uses an explicit loopback address and a separate preferred port', () => {
  assert.equal(DEV_HOST, '127.0.0.1')
  assert.equal(DEFAULT_DEV_PORT, 5174)
})

for (const host of ['127.0.0.1', '::1']) {
  test('detects an occupied port on ' + host, async (context) => {
    let server
    try {
      server = await occupy(host)
    } catch (error) {
      if (host === '::1' && ['EAFNOSUPPORT', 'EADDRNOTAVAIL'].includes(error.code))
        return context.skip('IPv6 unavailable')
      throw error
    }
    try {
      const port = server.address().port
      assert.equal(await isPortAvailable(port), false)
      await assert.rejects(findAvailablePort(port, port), /没有找到可用开发端口/)
    } finally {
      await close(server)
    }
  })
}

test('released ports become available again', async () => {
  const server = await occupy(DEV_HOST)
  const port = server.address().port
  await close(server)
  assert.equal(await isPortAvailable(port), true)
})

test('starts the real Vite server on the explicit address', async () => {
  const server = await startDevServer({ open: false })
  try {
    assert.equal(server.config.server.host, DEV_HOST)
    assert.equal(server.config.server.strictPort, true)
    const address = server.httpServer.address()
    assert.equal(address.address, DEV_HOST)
    const response = await fetch('http://' + DEV_HOST + ':' + address.port)
    assert.equal(response.status, 200)
    assert.match(await response.text(), /<div id="app"><\/div>/)
  } finally {
    await server.close()
  }
})
