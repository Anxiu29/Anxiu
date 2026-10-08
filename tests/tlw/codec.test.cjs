// Run: node --test src/mouse/tlw/cb75/__tests__/codec.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')

// Use the project's TypeScript compiler; no test-only runtime dependency.
const cache = new Map()
const sourceRoot = path.resolve(__dirname, '../../src')
function load(name) {
    const filename = name.startsWith('@/') ? path.join(sourceRoot, name.slice(2)) + '.ts'
        : path.resolve(sourceRoot, ['protocol','transport'].includes(name) ? 'protocol/tlw' : 'domain/mouse', name + '.ts')
    return loadFile(filename)
}
function loadFile(filename) {
    if (cache.has(filename)) return cache.get(filename)
    const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText
    const exports = {}
    cache.set(filename, exports)
    vm.runInThisContext('(function(require,exports){' + compiled + '\n})', { filename })(
        (dependency) => dependency.startsWith('@/') ? load(dependency) : loadFile(path.resolve(path.dirname(filename), dependency + '.ts')), exports,
    )
    return exports
}
const codec = load('codec')
const model = load('model')
const { Command, encodePacket, decodePacket, toOutputReport, writePackets } = codec

test('documented byte positions and checksum including high-byte carry', () => {
    // Report ID 7 is a synthetic fixture, not a CB75 firmware assumption.
    const packet = {
        reportId: 7,
        command: Command.SetKeys,
        address: 0x1234,
        length: 3,
        data: Uint8Array.of(0x20, 0x01, 0x04),
    }
    const frame = encodePacket(packet)
    assert.equal(frame.length, 64)
    assert.deepEqual([...frame.slice(0, 11)], [7, 0x17, 1, 0xa9, 3, 0x34, 0x12, 0, 0x20, 1, 4])
    assert.ok(frame.slice(11).every((value) => value === 0))
    const output = toOutputReport(packet)
    assert.equal(output.reportId, 7)
    assert.equal(output.data.length, 63)
    assert.deepEqual(output.data, frame.slice(1))
    assert.equal(decodePacket(frame).address, 0x1234)
})

test('read request separates requested length from zero-filled data', () => {
    const frame = encodePacket({
        reportId: 7,
        command: Command.GetBasicInfo,
        address: 0,
        length: 25,
    })
    assert.deepEqual([...frame.slice(0, 8)], [7, 0xbc, 0, 0xa3, 25, 0, 0, 0])
    assert.ok(frame.slice(8).every((value) => value === 0))
})

test('invalid lengths, checksums and addresses cannot be silently truncated', () => {
    const packet = { reportId: 7, command: Command.GetKeys, address: 0, length: 3 }
    for (const patch of [
        { length: 57 },
        { length: -1 },
        { address: 65536 },
        { reportId: 256 },
        { length: 1.5 },
        { data: new Uint8Array(2) },
    ]) {
        assert.throws(() => encodePacket({ ...packet, ...patch }), RangeError)
    }
    const frame = encodePacket(packet)
    frame[9] ^= 1
    assert.throws(() => decodePacket(frame), /checksum/)
    assert.throws(() => decodePacket(frame.slice(1)), /64-byte/)
})

test('writes split at 56 bytes even in the middle of a DPI structure', () => {
    const data = Uint8Array.from({ length: 14 + 6 * 9 }, (_, i) => i)
    const packets = writePackets(7, Command.SetFunctions, 0x100, data)
    assert.deepEqual(
        packets.map((p) => [p.address, p.length]),
        [
            [0x100, 56],
            [0x138, 12],
        ],
    )
    assert.deepEqual(
        Uint8Array.from(packets.flatMap((p) => [...decodePacket(encodePacket(p)).data])),
        data,
    )
    assert.throws(
        () => writePackets(7, Command.SetFunctions, 0xffff, Uint8Array.of(1, 2)),
        /address space/,
    )
})

test('basic information scales matrix and macro capacities and reads little endian IDs', () => {
    const info = codec.parseBasicInfo(
        Uint8Array.of(
            0xaa,
            0x55,
            0,
            0,
            0,
            6,
            8,
            0,
            0,
            0,
            0,
            50,
            0x00,
            0x02,
            0x64,
            0,
            1,
            6,
            0,
            0,
            0,
            0x0f,
            0x32,
            0xf2,
            0x22,
        ),
    )
    assert.equal(info.keyBytes, 18)
    assert.equal(info.macroBytes, 1024)
    assert.equal(info.dpiRank, 512)
    assert.equal(info.dpiStart, 100)
    assert.equal(info.vendorId, 0x320f)
    assert.equal(info.productId, 0x22f2)
    assert.equal(info.firmwareVersion, undefined)
    const versioned = Uint8Array.from([
        0xaa, 0x55, 0, 0, 0, 6, 8, 0, 0, 0, 0, 50, 0x00, 0x02, 0x64, 0, 1, 6, 0x11, 0x01, 0, 0x0f, 0x32, 0xf2, 0x22,
    ])
    assert.equal(codec.parseBasicInfo(versioned).firmwareVersion, 'V0111')
    assert.throws(() => codec.parseBasicInfo(new Uint8Array(25)), /signature/)
    assert.throws(() => codec.parseBasicInfo(new Uint8Array(24)), /Truncated/)
})

test('DPI edits preserve every unrelated byte, reserved fields and extensions', () => {
    const raw = Uint8Array.of(
        0,
        2,
        3,
        4,
        5,
        6,
        7,
        8,
        9,
        0xa1,
        0xb2,
        3,
        0,
        2,
        1,
        1,
        0x20,
        3,
        0x40,
        6,
        255,
        128,
        64,
        0xcc,
        0xdd,
    )
    const info = model.parseFunctions(raw, 1)
    assert.equal(info.stages[0].x, 800)
    assert.equal(info.stages[0].y, 1600)
    assert.deepEqual(model.encodeFunctions(info), raw)
    info.stages[0].x = 3200
    const expected = raw.slice()
    expected[16] = 0x80
    expected[17] = 0x0c
    assert.deepEqual(model.encodeFunctions(info), expected)
    assert.throws(() => model.parseFunctions(raw, 2), /Truncated/)
    info.stages[0].x = -1
    assert.throws(() => model.encodeFunctions(info), RangeError)
})

test('key matrix preserves unknown firmware codes and rejects partial entries', () => {
    const raw = Uint8Array.of(0x13, 3, 0, 0x70, 2, 0, 0xfe, 0xab, 0xcd)
    assert.deepEqual(model.encodeKeys(model.parseKeys(raw)), raw)
    assert.throws(() => model.parseKeys(raw.slice(1)), /Truncated/)
    assert.throws(() => model.encodeKeys([[0x20, 0, 256]]), RangeError)
})

test('macro action bytes preserve press/release bits and 16-bit delays', () => {
    const raw = Uint8Array.of(2, 0, 0xa1, 0xb2, 0xf4, 1, 0x8a, 4, 0xff, 0xff, 0x0a, 4)
    const macro = model.parseMacroData(raw)
    assert.equal(macro.actions[0].delay, 500)
    assert.equal(macro.actions[1].delay, 65535)
    assert.deepEqual(model.encodeMacroData(macro), raw)
    assert.throws(() => model.parseMacroData(raw.slice(0, -1)), /count mismatch/)
    macro.actions[0].delay = 65536
    assert.throws(() => model.encodeMacroData(macro), RangeError)
})

test('battery and dongle flags reject invalid values', () => {
    assert.deepEqual(codec.parseBattery(Uint8Array.of(100, 2)), { percent: 100, charging: 2 })
    assert.throws(() => codec.parseBattery(Uint8Array.of(101, 0)), RangeError)
    assert.equal(codec.parseWirelessStatus(Uint8Array.of(0xff)), true)
    assert.equal(codec.parseWirelessStatus(Uint8Array.of(0)), false)
    assert.throws(() => codec.parseWirelessStatus(Uint8Array.of(1)), /Invalid/)
})

const wire = load('transport')
test('DPI polling reads hardware stage changes without configuration writes on either connection', async () => {
    for (const mode of ['wired', 'wireless']) {
        const device = new FakeHID(),
            transport = new wire.CB75Transport(device, 100, mode)
        const protocol = new (load('protocol').CB75Protocol)(transport)
        let hardwareStage = 3
        device.onSend = (id, request) => {
            const reply = request.slice()
            if (request[2] === 0xa5) reply[7 + 12] = hardwareStage
            device.receive(id, reply)
        }
        try {
            assert.equal(await protocol.readDpiStage(), 3)
            hardwareStage = 1
            assert.equal(await protocol.readDpiStage(), 1)
            assert.deepEqual(
                device.sent.map((p) => p.data[2]),
                mode === 'wired' ? [0xa5, 0xa5] : [0xa1, 0xa5, 0xa2, 0xa1, 0xa5, 0xa2],
            )
            for (const { data } of device.sent) {
                assert.equal(data[3], mode === 'wired' ? 56 : 24)
                assert.equal(data[4], 0)
                if (mode === 'wireless') assert.equal(data[31], 2)
            }
        } finally {
            protocol.destroy()
        }
    }
})
test('default wired transport replays September 16 reads and writes byte for byte', async () => {
    const fixture = JSON.parse(
        fs
            .readFileSync(path.join(__dirname, 'current-operations.json'), 'utf8')
            .replace(/^\uFEFF/, ''),
    )
    const device = new FakeHID(),
        transport = new wire.CB75Transport(device, 100)
    try {
        for (const snapshot of fixture.snapshots) {
            const packets = snapshot.packets.map((line) => {
                const match = line.match(/(OUT|IN) ID:(\d+) (.*)$/)
                return {
                    direction: match[1],
                    id: Number(match[2]),
                    data: Uint8Array.from(match[3].split(' ').map((v) => parseInt(v, 16))),
                }
            })
            for (const output of packets.filter((p) => p.direction === 'OUT')) {
                const p = output.data,
                    command = p[2] - 0xa0
                const input = packets.find(
                    (r) => r.direction === 'IN' && r.data.slice(0, 7).every((v, i) => v === p[i]),
                )
                assert.ok(input)
                device.onSend = (id, request) => {
                    assert.equal(id, output.id)
                    assert.deepEqual(request, p)
                    const stale = input.data.slice()
                    stale[2] -= 0xa0
                    stale[7] ^= 0xff
                    device.receive(id, stale)
                    device.receive(id, input.data)
                    device.receive(id, input.data)
                }
                if ([1, 2, 6, 9].includes(command)) {
                    await transport.write(command, p[4] | (p[5] << 8), p.slice(7, 7 + p[3]))
                } else {
                    assert.deepEqual(
                        await transport.read(command, p[4] | (p[5] << 8), p[3]),
                        input.data.slice(7, 7 + p[3]),
                    )
                }
            }
        }
    } finally {
        transport.stop()
    }
})

test('current wireless initializes and reads configuration with high commands and original routing', async () => {
    // Synthetic high-command variant of historical hardware data, not a new wireless capture.
    const fixture = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'wireless-readback.json'), 'utf8'),
    )
    const high = (value) => {
        const p = Uint8Array.from(value.split(' ').map((v) => parseInt(v, 16)))
        p[3] += 0xa0
        return p
    }
    const entries = [fixture[0], fixture[1], fixture[2], fixture.at(-1), ...fixture]
    const device = new FakeHID(),
        transport = new wire.CB75Transport(device, 100, 'wireless')
    let index = 0
    device.onSend = (id, request) => {
        const entry = entries[index++],
            sent = high(entry.request),
            reply = high(entry.response)
        assert.equal(id, sent[0])
        assert.deepEqual(request, sent.slice(1))
        const wrongRoute = reply.slice(1)
        wrongRoute[31] = 1
        wrongRoute[7] ^= 0xff
        device.receive(id, wrongRoute)
        device.receive(id, reply.slice(1))
    }
    const protocol = new (load('protocol').CB75Protocol)(transport)
    try {
        await protocol.init()
        const config = await protocol.readConfiguration()
        assert.equal(index, entries.length)
        assert.equal(config.functions.length, 128)
        assert.deepEqual([...config.keys[2]], [0x20, 0, 0x17])
        device.onSend = (id, request) => device.receive(id, request)
        for (let offset = 0; offset < 128; offset += 24) {
            await transport.write(
                wire.WriteCommand.Keys,
                offset,
                config.keysRaw.slice(offset, offset + 24),
            )
        }
        assert.deepEqual(
            device.sent.slice(-6).map((p) => [p.data[2], p.data[3], p.data[4], p.data[31]]),
            [
                [0xa9, 24, 0, 2],
                [0xa9, 24, 24, 2],
                [0xa9, 24, 48, 2],
                [0xa9, 24, 72, 2],
                [0xa9, 24, 96, 2],
                [0xa9, 8, 120, 2],
            ],
        )
    } finally {
        protocol.destroy()
    }
})
// Historical fixtures explicitly exercise the September 10/13 command family.
class LegacyTransport extends wire.CB75Transport {
    constructor(device, timeout = 2000, mode = 'wired') {
        super(device, timeout, mode, 'legacy')
    }
}
const capture = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'capture.json'), 'utf8').replace(/^\uFEFF/, ''),
)
const captured = capture.packets.map((line) => {
    const match = line.match(/(OUT|IN) ID:(\d+) (.*)$/)
    return {
        direction: match[1],
        reportId: Number(match[2]),
        data: Uint8Array.from(match[3].split(' ').map((v) => parseInt(v, 16))),
    }
})

class FakeHID extends EventTarget {
    opened = true
    sent = []
    onSend = () => {}
    async sendReport(reportId, data) {
        this.sent.push({ reportId, data: data.slice() })
        await this.onSend(reportId, data)
    }
    receive(reportId, data) {
        const event = new Event('inputreport')
        // Nonzero DataView offset catches accidental use of the entire buffer.
        const backing = new Uint8Array(data.length + 5)
        backing.set(data, 5)
        event.reportId = reportId
        event.data = new DataView(backing.buffer, 5, data.length)
        this.dispatchEvent(event)
    }
}

test('wireless uses captured low commands and 24-byte chunks with exact offsets', async () => {
    const device = new FakeHID()
    const transport = new LegacyTransport(device, 100, 'wireless')
    device.onSend = (id, request) => {
        const reply = request.slice(),
            offset = request[4] | (request[5] << 8)
        assert.equal(id, 4)
        assert.equal(request.length, 63)
        assert.equal(request[0] | request[1], 0)
        assert.equal(request[31], 2)
        for (let i = 0; i < request[3]; i++) reply[7 + i] = offset + i
        device.receive(id, reply)
    }
    const bytes = await transport.readRange(wire.ReadCommand.Functions, 0, 128)
    assert.deepEqual(
        [...bytes],
        Array.from({ length: 128 }, (_, i) => i),
    )
    assert.deepEqual(
        device.sent.map((p) => [p.data[2], p.data[3], p.data[4]]),
        [
            [5, 24, 0],
            [5, 24, 24],
            [5, 24, 48],
            [5, 24, 72],
            [5, 24, 96],
            [5, 8, 120],
        ],
    )
    assert.throws(() => transport.read(wire.ReadCommand.BasicInfo, 0, 34), /packet size/)
    device.onSend = (id, request) => device.receive(id, request)
    await transport.write(wire.WriteCommand.Keys, 24, new Uint8Array(24))
    assert.equal(device.sent.at(-1).data[2], 9)
    await assert.rejects(
        transport.write(wire.WriteCommand.Keys, 0, new Uint8Array(56)),
        /packet size/,
    )
    transport.stop()
})

test('receiver FF response rejects immediately and prevents subsequent requests', async () => {
    const device = new FakeHID(),
        transport = new LegacyTransport(device, 100, 'wireless')
    device.onSend = (id, request) => {
        const reply = request.slice()
        reply[2] = 0xff
        device.receive(id, reply)
    }
    await assert.rejects(
        transport.readRange(wire.ReadCommand.BasicInfo, 0, 34),
        /receiver rejected/,
    )
    await assert.rejects(transport.read(wire.ReadCommand.Battery, 0, 6), /receiver rejected/)
    assert.equal(device.sent.length, 1)
})

test('wireless writes match all bytes in the September 13 hardware capture', async () => {
    const fixture = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'wireless-operations.json'), 'utf8'),
    )
    assert.deepEqual(fixture.device, { vid: 0x320f, pid: 0x22f3 })
    const packets = fixture.snapshots[0].packets.map((line) => {
        const match = line.match(/(OUT|IN) ID:(\d+) (.*)$/)
        return {
            direction: match[1],
            reportId: Number(match[2]),
            data: Uint8Array.from(match[3].split(' ').map((v) => parseInt(v, 16))),
        }
    })
    const device = new FakeHID(),
        transport = new LegacyTransport(device, 100, 'wireless')
    let index = 0
    device.onSend = (id, request) => {
        const output = packets[index++],
            input = packets[index++]
        assert.equal(output.direction, 'OUT')
        assert.equal(input.direction, 'IN')
        assert.equal(id, output.reportId)
        assert.deepEqual(request, output.data)
        // The source has many repeated IN reports; duplicates must not advance the queue.
        device.receive(id, input.data)
        device.receive(id, input.data)
    }
    for (const output of packets.filter((p) => p.direction === 'OUT')) {
        const p = output.data
        await transport.write(p[2], p[4] | (p[5] << 8), p.slice(7, 7 + p[3]))
    }
    assert.equal(index, packets.length)
    transport.stop()
})

test('wireless ignores another receiver route before accepting the mouse reply', async () => {
    const device = new FakeHID(),
        transport = new LegacyTransport(device, 100, 'wireless')
    device.onSend = (id, request) => {
        const other = request.slice()
        other[31] = 1
        other[7] = 99
        device.receive(id, other)
        const mouse = request.slice()
        mouse[7] = 50
        device.receive(id, mouse)
    }
    assert.equal((await transport.read(wire.ReadCommand.Battery, 0, 6))[0], 50)
    transport.stop()
})

test('wireless configuration replays the complete hardware read session', async () => {
    const fixture = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'wireless-readback.json'), 'utf8'),
    )
    const hex = (value) => Uint8Array.from(value.split(' ').map((v) => parseInt(v, 16)))
    const device = new FakeHID(),
        transport = new LegacyTransport(device, 100, 'wireless')
    let index = 0
    device.onSend = (id, request) => {
        const entry = fixture[index++]
        assert.ok(entry, 'no extra requests')
        const sent = hex(entry.request),
            reply = hex(entry.response)
        assert.equal(id, sent[0])
        assert.deepEqual(request, sent.slice(1))
        device.receive(reply[0], reply.slice(1))
    }
    const protocol = new (load('protocol').CB75Protocol)(transport)
    const config = await protocol.readConfiguration()
    assert.equal(index, fixture.length)
    assert.equal(config.basic.dpiStageCount, 6)
    assert.equal(config.functions.length, 128)
    assert.deepEqual([...config.keys[2]], [0x20, 0, 0x17])
    assert.deepEqual([...config.defaultKeys[2]], [0x10, 2, 0])
    protocol.destroy()
})

test('wireless read session ends communication when decoding fails', async () => {
    const device = new FakeHID(),
        transport = new LegacyTransport(device, 100, 'wireless')
    device.onSend = (id, request) => device.receive(id, request)
    await assert.rejects(
        transport.readSession(async () => {
            throw new Error('decode failed')
        }),
        /decode failed/,
    )
    assert.deepEqual(
        device.sent.map((p) => p.data[2]),
        [1, 2],
    )
    transport.stop()
})

test('actual firmware read requests match every supported captured request', () => {
    for (const packet of captured.filter(
        (p) => p.direction === 'OUT' && [3, 5, 7, 8, 0x1a].includes(p.data[2]),
    )) {
        assert.equal(packet.reportId, wire.CB75_HID.reportId)
        assert.deepEqual(
            wire.encodeRead(packet.data[2], packet.data[4] | (packet.data[5] << 8), packet.data[3]),
            packet.data,
        )
    }
    assert.throws(() => wire.encodeRead(0xa3, 0, 25), /Unverified/)
})

test('transport reads real basic information and ignores unrelated or duplicate reports', async () => {
    const device = new FakeHID()
    const transport = new LegacyTransport(device)
    const reply = captured.find((p) => p.direction === 'IN' && p.data[2] === 3)
    device.onSend = () => {
        device.receive(5, reply.data)
        device.receive(4, reply.data.slice(0, 8))
        const unrelated = reply.data.slice()
        unrelated[4] = 56
        device.receive(4, unrelated)
        device.receive(4, reply.data)
        device.receive(4, reply.data)
    }
    const basic = codec.parseBasicInfo(await transport.read(wire.ReadCommand.BasicInfo, 0, 34))
    assert.equal(basic.keyCount, 42)
    assert.equal(basic.macroBytes, 3072)
    assert.equal(basic.dpiStageCount, 6)
    assert.equal(basic.dpiStep, 50)
    transport.stop()
})

test('transport serializes requests and assembles captured function blocks', async () => {
    const device = new FakeHID()
    const transport = new LegacyTransport(device)
    device.onSend = (_, data) => {
        const reply = captured.find(
            (p) =>
                p.direction === 'IN' &&
                p.data[2] === data[2] &&
                p.data[3] === data[3] &&
                p.data[4] === data[4],
        )
        assert.ok(reply)
        queueMicrotask(() => device.receive(4, reply.data))
    }
    const [functions, battery] = await Promise.all([
        transport.readRange(wire.ReadCommand.Functions, 0, 128),
        transport.read(wire.ReadCommand.Battery, 0, 6),
    ])
    assert.equal(functions.length, 128)
    assert.deepEqual([...functions.slice(14, 23)], [1, 0, 15, 15, 0, 0, 0, 255, 0])
    assert.equal(functions[56], 255)
    assert.deepEqual(codec.parseBattery(battery), { percent: 100, charging: 2 })
    transport.stop()
})

test('timeout rejects queued reads and requires a fresh transport', async () => {
    const device = new FakeHID()
    const transport = new LegacyTransport(device, 15)
    const results = await Promise.allSettled([
        transport.read(wire.ReadCommand.BasicInfo, 0, 34),
        transport.read(wire.ReadCommand.Battery, 0, 6),
    ])
    assert.ok(results.every((r) => r.status === 'rejected' && /timeout/.test(r.reason.message)))
    assert.equal(device.sent.length, 1)
})

test('closing during a request cancels it; ACK errors never become configuration data', async () => {
    const device = new FakeHID()
    const transport = new LegacyTransport(device)
    device.onSend = () => transport.stop()
    await assert.rejects(transport.read(wire.ReadCommand.BasicInfo, 0, 34), /closed/)
    const second = new LegacyTransport(device)
    device.onSend = (_, data) => {
        const response = data.slice()
        response[6] = 0xff
        device.receive(4, response)
    }
    await assert.rejects(second.read(wire.ReadCommand.BasicInfo, 0, 34), /ACK 0xff/)
})

test('complete configuration read keeps all 42 matrix slots and raw firmware fields', async () => {
    const { CB75Protocol } = load('protocol')
    const device = new FakeHID()
    const transport = new LegacyTransport(device)
    device.onSend = (_, request) => {
        const reply = captured.find(
            (p) =>
                p.direction === 'IN' &&
                p.data[2] === request[2] &&
                p.data[4] === request[4] &&
                p.data[5] === request[5] &&
                p.data[3] >= request[3],
        )
        assert.ok(reply, 'Each requested range must exist in the supplied capture')
        const data = reply.data.slice()
        // 42 * 3 = 126 matrix bytes: the final read requests 14 of the
        // captured 16 bytes. This shorter tail also succeeded on the device.
        data[3] = request[3]
        device.receive(4, data)
    }
    try {
        const config = await new CB75Protocol(transport).readConfiguration()
        assert.equal(config.functions.length, 128)
        assert.equal(config.keys.length, 42)
        assert.equal(config.defaultKeys.length, 42)
        assert.deepEqual(config.keys[0], [0x10, 1, 0])
        assert.deepEqual(config.keys[3], [0xa0, 0x10, 0])
        assert.deepEqual(config.keys[41], [0, 0, 0])
        assert.equal(config.battery.percent, 100)
        assert.deepEqual(
            device.sent.map((p) => p.data[2]),
            [3, 5, 5, 5, 8, 8, 8, 7, 7, 7, 0x1a],
        )
    } finally {
        transport.stop()
    }
})

const operations = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'operations.json'), 'utf8').replace(/^\uFEFF/, ''),
)
function packetsFor(n, command) {
    return operations.snapshots
        .find((s) => s.n === n)
        .packets.filter((line) => line.includes(' OUT ID:'))
        .map((line) => {
            const text = line.match(/ID:\d+ (.*)$/)[1]
            return Uint8Array.from(text.split(' ').map((v) => parseInt(v, 16)))
        })
        .filter((data) => command === undefined || data[2] === command)
}
function blockFor(n, command = 6) {
    const result = new Uint8Array(128)
    for (const data of packetsFor(n, command))
        result.set(data.slice(7, 7 + data[3]), data[4] | (data[5] << 8))
    return result
}

test('configuration edits reuse static metadata until an explicit refresh', async () => {
    const { CB75Protocol } = load('protocol')
    const blocks = new Map()
    for (const packet of captured.filter((p) => p.direction === 'IN' && [3, 5, 7, 8, 0x1a].includes(p.data[2]))) {
        const command = packet.data[2]
        const block = blocks.get(command) ?? new Uint8Array(128)
        const offset = packet.data[4] | (packet.data[5] << 8)
        block.set(packet.data.slice(7, 7 + packet.data[3]), offset)
        blocks.set(command, block)
    }
    const reads = []
    const transport = {
        dataSize: 56,
        readSession: (read) => read(),
        readRange: async (command, address, length) => {
            reads.push(command)
            return blocks.get(command).slice(address, address + length)
        },
        read: async (command, address, length) => blocks.get(command).slice(address, address + length),
        write: async (command, address, bytes) => {
            if (command === wire.WriteCommand.Functions) blocks.get(wire.ReadCommand.Functions).set(bytes, address)
        },
        stop: () => undefined,
    }
    const protocol = new CB75Protocol(transport)
    const initial = await protocol.readConfiguration()
    await protocol.setRate(initial.functions[11])
    assert.equal(reads.filter((command) => command === wire.ReadCommand.BasicInfo).length, 1)
    assert.equal(reads.filter((command) => command === wire.ReadCommand.DefaultKeys).length, 1)
    await protocol.readConfiguration()
    assert.equal(reads.filter((command) => command === wire.ReadCommand.BasicInfo).length, 2)
    assert.equal(reads.filter((command) => command === wire.ReadCommand.DefaultKeys).length, 2)
})

test('write envelopes reproduce all supported operation captures exactly', () => {
    for (const snapshot of operations.snapshots) {
        for (const data of packetsFor(snapshot.n).filter((p) => [1, 2, 6, 9].includes(p[2]))) {
            assert.deepEqual(
                wire.encodeWrite(data[2], data[4] | (data[5] << 8), data.slice(7, 7 + data[3])),
                data,
            )
        }
    }
    assert.throws(() => wire.encodeWrite(0x16, 0, new Uint8Array(56)), /Unverified/)
})

test('3000 DPI and right-button Q match the labeled capture without altering other fields', () => {
    const settings = load('settings')
    const initial = new Uint8Array(128)
    for (const packet of captured.filter(
        (p) => p.direction === 'IN' && p.data[2] === 5 && p.data[3] > 1,
    )) {
        initial.set(packet.data.slice(7, 7 + packet.data[3]), packet.data[4])
    }
    const limits = { dpiStart: 50, dpiStep: 50, dpiRank: 149, dpiStageCount: 6 }
    settings.changeDpi(initial, 2, 3000, limits)
    assert.deepEqual(initial, blockFor(2))
    assert.equal(settings.readDpi(initial, 2, limits), 3000)
    assert.throws(() => settings.changeDpi(initial, 2, 3025, limits), RangeError)
    assert.throws(() => settings.changeDpi(initial, 6, 3000, limits), RangeError)
    const keys = captured
        .find((p) => p.direction === 'IN' && p.data[2] === 8 && p.data[4] === 0)
        .data.slice(7)
    keys.set(model.encodeKeys([settings.KEYBOARD_BINDINGS.find((b) => b.label === 'Q').value]), 6)
    assert.deepEqual(keys, packetsFor(4, 9)[0].slice(7))
})

test('rate, brightness and RGB edits preserve all other bytes', () => {
    const settings = load('settings')
    const baseline = blockFor(5)
    const color = baseline.slice()
    settings.changeColor(color, '#32ff17')
    assert.deepEqual(color, blockFor(7))
    const brightness = baseline.slice()
    brightness[2] = 2
    assert.deepEqual(brightness, blockFor(6))
    const rate = baseline.slice()
    settings.changeRate(rate, 3)
    assert.equal(rate[11], 3)
    rate[11] = baseline[11]
    assert.deepEqual(rate, baseline)
    assert.throws(() => settings.changeRate(rate, 4), /Unsupported/)
})

function configurationDevice(ignoreWrites = false) {
    const device = new FakeHID()
    const functions = blockFor(5)
    const keys = blockFor(4, 9)
    device.onSend = (_, request) => {
        const command = request[2],
            length = request[3],
            address = request[4] | (request[5] << 8)
        const reply = request.slice()
        if (command === 6 || command === 9) {
            if (!ignoreWrites)
                (command === 6 ? functions : keys).set(request.slice(7, 7 + length), address)
        } else if (command === 5 || command === 8) {
            reply.set((command === 5 ? functions : keys).slice(address, address + length), 7)
        } else if (![1, 2].includes(command)) {
            const packet = captured.find(
                (p) =>
                    p.direction === 'IN' &&
                    p.data[2] === command &&
                    p.data[4] === request[4] &&
                    p.data[3] >= length,
            )
            assert.ok(packet)
            reply.set(packet.data.slice(7, 7 + length), 7)
        }
        queueMicrotask(() => device.receive(4, reply))
    }
    return { device, functions, keys }
}

test('saving commits complete packets, ends fast mode, and verifies fresh device readback', async () => {
    const { CB75Protocol } = load('protocol')
    const { device, functions } = configurationDevice()
    const transport = new LegacyTransport(device)
    try {
        const config = await new CB75Protocol(transport).setDpi(2, 3000)
        assert.deepEqual([...functions.slice(34, 38)], [59, 59, 59, 59])
        assert.deepEqual(config.functions, functions)
        const writes = device.sent.filter((p) => [1, 2, 6, 9].includes(p.data[2]))
        assert.deepEqual(
            writes.map((p) => [p.data[2], p.data[3], p.data[4]]),
            [
                [1, 24, 0],
                [6, 56, 0],
                [6, 56, 56],
                [6, 16, 112],
                [2, 24, 0],
            ],
        )
    } finally {
        transport.stop()
    }
})

test('a successful echo without applied settings is not reported as a successful save', async () => {
    const { CB75Protocol } = load('protocol')
    const { device } = configurationDevice(true)
    const transport = new LegacyTransport(device)
    try {
        await assert.rejects(new CB75Protocol(transport).setRate(3), /readback/)
    } finally {
        transport.stop()
    }
})

test('cannot overwrite an empty matrix slot or remove the last left click', async () => {
    const { CB75Protocol } = load('protocol')
    const { device } = configurationDevice()
    const transport = new LegacyTransport(device)
    const protocol = new CB75Protocol(transport)
    try {
        await assert.rejects(protocol.setKey(4, [0x20, 0, 0x14]), /Invalid mouse key/)
        await assert.rejects(protocol.setKey(0, [0x20, 0, 0x14]), /left mouse button/)
        assert.ok(device.sent.every((p) => ![1, 2, 6, 9].includes(p.data[2])))
    } finally {
        transport.stop()
    }
})

const macros = load('macros')
const profiles = load('profiles')
const capturedMacro = {
    name: '2',
    actions: [
        { delay: 54, typeAndStatus: 0x8a, code: 0x14 },
        { delay: 540, typeAndStatus: 0x0a, code: 0x14 },
        { delay: 157, typeAndStatus: 0x8a, code: 0x1a },
        { delay: 0, typeAndStatus: 0x0a, code: 0x1a },
    ],
}

test('macro encoder reproduces capture #9 including SIZE 26 and padding exactly', () => {
    const bytes = macros.encodeCapturedMacro(capturedMacro, 3072)
    assert.equal(bytes.length, 56)
    assert.deepEqual(wire.encodeWrite(wire.WriteCommand.Macros, 0, bytes), packetsFor(9, 0x15)[0])
    assert.throws(() => macros.encodeCapturedMacro(capturedMacro, 32), /capacity/)
    assert.throws(
        () =>
            macros.validateMacro({
                ...capturedMacro,
                actions: [{ delay: -1, typeAndStatus: 0x8a, code: 4 }],
            }),
        /action/,
    )
    const large = macros.encodeCapturedMacro(
        { name: 'long', actions: Array.from({ length: 20 }, () => capturedMacro.actions[0]) },
        3072,
    )
    assert.equal(large.length, 112)
    assert.equal(large[2], 90)
})

test('macro binding writes captured macro first without fast mode, then verifies binding', async () => {
    const { CB75Protocol } = load('protocol')
    const { device } = configurationDevice()
    const original = device.onSend
    device.onSend = (id, request) =>
        request[2] === 0x15 ? device.receive(id, request.slice()) : original(id, request)
    const transport = new LegacyTransport(device)
    try {
        const config = await new CB75Protocol(transport).bindMacro(2, capturedMacro)
        assert.deepEqual(config.keys[2], [0x70, 0, 0])
        const writes = device.sent.filter((p) => [1, 2, 9, 0x15].includes(p.data[2]))
        assert.deepEqual(writes[0].data, packetsFor(9, 0x15)[0])
        assert.deepEqual(
            writes.map((p) => p.data[2]),
            [0x15, 1, 9, 9, 9, 2],
        )
        assert.deepEqual(config.macro, capturedMacro)
    } finally {
        transport.stop()
    }
})

test('macro cannot replace the last left click and rejected macro prevents key writes', async () => {
    const { CB75Protocol } = load('protocol')
    const { device } = configurationDevice()
    const original = device.onSend
    device.onSend = (id, request) => {
        if (request[2] !== 0x15) return original(id, request)
        const reply = request.slice()
        reply[6] = 0xff
        device.receive(id, reply)
    }
    const transport = new LegacyTransport(device)
    const protocol = new CB75Protocol(transport)
    try {
        await assert.rejects(protocol.bindMacro(0, capturedMacro), /left mouse button/)
        assert.equal(device.sent.filter((p) => p.data[2] === 0x15).length, 0)
        await assert.rejects(protocol.bindMacro(2, capturedMacro), /ACK/)
        assert.equal(device.sent.filter((p) => p.data[2] === 9).length, 0)
    } finally {
        transport.stop()
    }
})

function sampleProfile() {
    return {
        version: 1,
        model: 'CB75-Mouse',
        name: 'Work',
        functions: [...blockFor(5)],
        keys: [...blockFor(4, 9)],
    }
}

test('profile files validate identity, bounds, left click and macro dependencies', () => {
    const p = sampleProfile()
    assert.deepEqual(profiles.validateProfile(JSON.parse(JSON.stringify(p))), p)
    assert.throws(() => profiles.validateProfile({ ...p, model: 'other' }), /Invalid/)
    assert.throws(() => profiles.validateProfile({ ...p, functions: [256] }), /Invalid/)
    const noLeft = { ...p, keys: [...p.keys] }
    noLeft.keys[0] = 0x20
    assert.throws(() => profiles.validateProfile(noLeft), /left/)
    p.keys.splice(6, 3, 0x70, 0, 0)
    assert.throws(() => profiles.validateProfile(p), /macro/)
    p.macro = capturedMacro
    assert.deepEqual(profiles.validateProfile(p).macro, capturedMacro)
})

test('profile applies both settings and keys with readback and preserves device profile selector', async () => {
    const { CB75Protocol } = load('protocol')
    const { device, functions, keys } = configurationDevice()
    const transport = new LegacyTransport(device)
    try {
        const p = sampleProfile()
        p.functions[0] = 9
        p.functions[11] = 3
        p.keys.splice(6, 3, 0x20, 0, 4)
        const config = await new CB75Protocol(transport).applyProfile(p)
        assert.equal(config.functions[0], 0)
        assert.equal(functions[11], 3)
        assert.deepEqual([...keys.slice(6, 9)], [0x20, 0, 4])
        assert.deepEqual(
            device.sent.filter((p) => [1, 2, 6, 9].includes(p.data[2])).map((p) => p.data[2]),
            [1, 6, 6, 6, 2, 1, 9, 9, 9, 2],
        )
    } finally {
        transport.stop()
    }
})

test('profile readback failure halts before key writes; invalid empty slots fail before any writes', async () => {
    const { CB75Protocol } = load('protocol')
    const { device } = configurationDevice(true)
    const transport = new LegacyTransport(device)
    const protocol = new CB75Protocol(transport)
    try {
        const bad = sampleProfile()
        bad.keys[12] = 0x20
        await assert.rejects(protocol.applyProfile(bad), /empty key/)
        assert.equal(device.sent.filter((p) => [1, 6, 9].includes(p.data[2])).length, 0)
        const p = sampleProfile()
        p.functions[11] = 3
        await assert.rejects(protocol.applyProfile(p), /readback/)
        assert.equal(device.sent.filter((p) => p.data[2] === 9).length, 0)
    } finally {
        transport.stop()
    }
})

test('all four polling rates update only the rate field', () => {
    const settings = load('settings')
    for (const rate of settings.VERIFIED_RATES) {
        const before = blockFor(5),
            after = before.slice()
        settings.changeRate(after, rate.code)
        assert.equal(after[11], rate.code)
        after[11] = before[11]
        assert.deepEqual(after, before)
    }
    assert.deepEqual(
        settings.VERIFIED_RATES.map((r) => r.hz),
        [125, 250, 500, 1000],
    )
})

test('DPI disable moves the active stage and cannot disable the last enabled stage', () => {
    const settings = load('settings'),
        data = blockFor(5)
    const limits = { dpiStageCount: 6 }
    const active = data[12]
    settings.changeDpiEnabled(data, active, false, limits)
    assert.equal(data[14 + active * 9], 0)
    assert.notEqual(data[12], active)
    for (let i = 1; i < 6; i++) settings.changeDpiEnabled(data, i, false, limits)
    const before = data.slice()
    assert.throws(() => settings.changeDpiEnabled(data, 0, false, limits), /at least one DPI/)
    assert.deepEqual(data, before)
    settings.changeDpiEnabled(data, 2, true, limits)
    assert.equal(data[32], 1)
})

test('DPI color changes only that stage RGB triplet', () => {
    const settings = load('settings'),
        before = blockFor(5),
        after = before.slice()
    settings.changeDpiColor(after, 4, '#1234ab', { dpiStageCount: 6 })
    assert.deepEqual([...after.slice(56, 59)], [0x12, 0x34, 0xab])
    after.set(before.slice(56, 59), 56)
    assert.deepEqual(after, before)
    assert.throws(() => settings.changeDpiColor(after, 0, 'red', { dpiStageCount: 6 }), /RGB/)
})

test('editing an enabled DPI stage activates it immediately and verifies readback', async () => {
    const { CB75Protocol } = load('protocol'),
        { device } = configurationDevice()
    const transport = new LegacyTransport(device)
    try {
        const c = await new CB75Protocol(transport).setDpi(1, 2000)
        assert.equal(c.functions[12], 1)
        assert.equal(c.functions[25], 39)
    } finally {
        transport.stop()
    }
})

test('seven light modes and brightness/speed sliders preserve unrelated configuration', async () => {
    const { CB75Protocol } = load('protocol'),
        { device } = configurationDevice()
    const transport = new LegacyTransport(device),
        protocol = new CB75Protocol(transport)
    try {
        for (let mode = 0; mode < 7; mode++)
            assert.equal((await protocol.setLightMode(mode)).functions[1], mode)
        assert.equal((await protocol.setBrightness(0)).functions[2], 0)
        for (let speed = 0; speed <= 3; speed++)
            assert.equal((await protocol.setLightSpeed(speed)).functions[3], speed)
        for (const invalid of [-1, 4, 1.5])
            await assert.rejects(protocol.setLightSpeed(invalid), /Unsupported/)
        await assert.rejects(protocol.setLightMode(7), /Unsupported/)
    } finally {
        transport.stop()
    }
})

test('empty macro files are editable locally but cannot be sent or bound through profiles', () => {
    const empty = { name: 'Default', actions: [] }
    assert.deepEqual(macros.validateMacro(empty), empty)
    assert.throws(() => macros.encodeCapturedMacro(empty, 3072), /empty macro/)
    const p = sampleProfile()
    p.keys.splice(6, 3, 0x70, 0, 0)
    p.macro = empty
    assert.throws(() => profiles.validateProfile(p), /requires its macro/)
})

test('factory reset sends a device command and verifies defaults after recovery', async () => {
    const { CB75Protocol } = load('protocol'),
        { device, keys } = configurationDevice()
    const original = device.onSend
    device.onSend = (id, request) => {
        if (request[2] !== 0x0d) return original(id, request)
        for (const packet of captured.filter(
            (p) => p.direction === 'IN' && p.data[2] === 7 && p.data[3] > 1,
        )) {
            keys.set(packet.data.slice(7, 7 + packet.data[3]), packet.data[4])
        }
        device.receive(id, request.slice())
    }
    const transport = new LegacyTransport(device)
    try {
        const c = await new CB75Protocol(transport).restoreFactory()
        assert.deepEqual(c.keys, c.defaultKeys)
        assert.equal(device.sent[0].data[2], 0x0d)
        assert.equal(device.sent[0].data[3], 24)
        assert.equal(c.macro, undefined)
    } finally {
        transport.stop()
    }
})

test('factory reset acknowledgement alone cannot report success when keys remain changed', async () => {
    const { CB75Protocol } = load('protocol'),
        { device } = configurationDevice()
    const original = device.onSend
    device.onSend = (id, request) =>
        request[2] === 0x0d ? device.receive(id, request.slice()) : original(id, request)
    const transport = new LegacyTransport(device)
    try {
        await assert.rejects(new CB75Protocol(transport).restoreFactory(), /readback mismatch/)
    } finally {
        transport.stop()
    }
})

test('native mouse labels include the migrated operation and action labels', () => {
    const { mouseLabel } = load('@/ui/mouseLabels')
    for (const key of ['dpi', 'lighting', 'saveMacro', 'moveUp', 'moveDown', 'playNormal']) assert.notEqual(mouseLabel(key), key)
    assert.ok(mouseLabel('operationCompleted', { operation: '测试' }).includes('测试'))
})

test('saving and renaming the default macro updates it in place and preserves actions after reload', () => {
    const source = fs.readFileSync(
        path.resolve(__dirname, '../../src/stores/mouse/macroStore.ts'),
        'utf8',
    )
    const compiled = ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText
    const storage = new Map()
    let sequence = 0
    function openStore() {
        const exports = {}
        const dependencies = {
            pinia: { defineStore: (_, setup) => setup },
            vue: { ref: (value) => ({ value }), computed: (getter) => ({ get value() { return getter() } }), watch: (source, callback) => callback(source.value) },
            '@/domain/mouse/macros': macros,
            '@/domain/mouse/settings': load('settings'),
            '@/domain/mouse/types': load('types'),
            './deviceStore': { useDeviceStore: () => ({ identity: { storage: { macros: 'cb75-mouse.macros.v1' } } }) },
            '@/ui/downloadBlob': {},
        }
        vm.runInThisContext('(function(require,exports,localStorage,crypto){' + compiled + '})')(
            (name) => {
                assert.ok(name in dependencies)
                return dependencies[name]
            },
            exports,
            {
                getItem: (key) => storage.get(key) ?? null,
                setItem: (key, value) => storage.set(key, value),
                removeItem: (key) => storage.delete(key),
            },
            { randomUUID: () => `macro-${++sequence}` },
        )
        return exports.useMacroStore()
    }
    const store = openStore()
    store.ensureDefault('Default')
    assert.equal(store.macros.value[0].actions.length, 0)
    assert.equal(store.save(capturedMacro, 'default'), 'default')
    store.save({ ...capturedMacro, name: 'Edited', playbackMode: 2, playbackCount: 5 }, 'default')
    store.rename('default', 'Renamed')
    assert.equal(store.macros.value.length, 1)
    assert.equal(store.macros.value[0].name, 'Renamed')
    const reopened = openStore()
    assert.equal(reopened.macros.value.length, 1)
    assert.deepEqual(reopened.macros.value[0].actions, capturedMacro.actions)
    assert.equal(reopened.macros.value[0].playbackMode, 2)
    assert.equal(reopened.macros.value[0].playbackCount, 5)
    reopened.save({ ...capturedMacro, name: 'New macro' })
    assert.equal(reopened.macros.value.length, 2)
    const created = reopened.create('Macro')
    assert.ok(created)
    assert.equal(reopened.macros.value.length, 3)
    assert.equal(reopened.macros.value.find((m) => m.id === created).name, 'Macro 1')
    assert.deepEqual(reopened.macros.value.find((m) => m.id === created).actions, [])
    const second = reopened.create('Macro')
    assert.equal(reopened.macros.value.find((m) => m.id === second).name, 'Macro 2')
    reopened.save({ ...capturedMacro, name: 'Macro 1' }, created)
    assert.equal(reopened.macros.value.length, 4)
    assert.deepEqual(
        openStore().macros.value.find((m) => m.name === 'Macro 1').actions,
        capturedMacro.actions,
    )
    while (reopened.macros.value.length < 100) reopened.create('Macro')
    assert.equal(reopened.create('Macro'), undefined)
    assert.equal(reopened.macros.value.length, 100)
})

test('macro playback binding supports four stop modes and counted playback without altering captured actions', () => {
    for (let mode = 0; mode < 4; mode++) {
        const macro = { ...capturedMacro, playbackMode: mode, playbackCount: 1 }
        assert.deepEqual(macros.macroBinding(macro), [0x70, 0, mode])
        assert.deepEqual(
            macros.encodeCapturedMacro(macro, 3072),
            macros.encodeCapturedMacro(capturedMacro, 3072),
        )
    }
    for (const count of [2, 255])
        assert.deepEqual(
            macros.macroBinding({ ...capturedMacro, playbackMode: 0, playbackCount: count }),
            [0x71, 0, count],
        )
    for (const invalid of [
        { playbackMode: 4 },
        { playbackCount: 0 },
        { playbackCount: 256 },
        { playbackCount: 1.5 },
    ])
        assert.throws(() => macros.validateMacro({ ...capturedMacro, ...invalid }), /playback/)
    const p = sampleProfile()
    p.macro = { ...capturedMacro, playbackMode: 0, playbackCount: 5 }
    p.keys.splice(6, 3, 0x71, 0, 5)
    assert.equal(profiles.validateProfile(p).macro.playbackCount, 5)
    p.macro = undefined
    assert.throws(() => profiles.validateProfile(p), /macro/)
})

test('macro stop modes and repeat count are written into key bindings and read back', async () => {
    const { CB75Protocol } = load('protocol'),
        { device } = configurationDevice(),
        original = device.onSend
    device.onSend = (id, request) =>
        request[2] === 0x15 ? device.receive(id, request.slice()) : original(id, request)
    const transport = new LegacyTransport(device),
        protocol = new CB75Protocol(transport)
    try {
        for (const [mode, count, code] of [
            [0, 1, [0x70, 0, 0]],
            [1, 1, [0x70, 0, 1]],
            [2, 1, [0x70, 0, 2]],
            [3, 1, [0x70, 0, 3]],
            [0, 5, [0x71, 0, 5]],
        ]) {
            const config = await protocol.bindMacro(2, {
                ...capturedMacro,
                playbackMode: mode,
                playbackCount: count,
            })
            assert.deepEqual(config.keys[2], code)
        }
    } finally {
        transport.stop()
    }
})

test('reset all keys writes defaults while preserving functions and key padding', async () => {
    const { CB75Protocol } = load('protocol'),
        { device, functions, keys } = configurationDevice()
    keys[126] = 0xa5
    keys[127] = 0x5a
    const before = functions.slice()
    const transport = new LegacyTransport(device),
        protocol = new CB75Protocol(transport)
    try {
        await protocol.setKey(2, [0x20, 0, 0x14])
        const config = await protocol.resetKeys()
        assert.deepEqual(config.keys, config.defaultKeys)
        assert.deepEqual(config.functions, before)
        assert.deepEqual([...config.keysRaw.slice(126)], [0xa5, 0x5a])
    } finally {
        transport.stop()
    }
})

test('mouse macro actions encode press/release and 16-bit post-action delays', () => {
    const macro = {
        name: 'Mouse',
        actions: [
            { delay: 1234, typeAndStatus: 0x81, code: 1 },
            { delay: 0, typeAndStatus: 1, code: 1 },
        ],
    }
    assert.deepEqual(
        [...macros.encodeCapturedMacro(macro, 3072).slice(22, 30)],
        [0xd2, 4, 0x81, 1, 0, 0, 1, 1],
    )
    for (const code of [0, 3, 32])
        assert.throws(
            () => macros.validateMacro({ ...macro, actions: [{ ...macro.actions[0], code }] }),
            /action/,
        )
})

test('shortcut assignment targets the selected button and rejects disabled or invalid values', async () => {
    const source = fs.readFileSync(
        path.resolve(__dirname, '../../src/stores/mouse/keyStore.ts'),
        'utf8',
    )
    const compiled = ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText
    const writes = []
    const device = {
        config: { defaultKeys: Array.from({ length: 4 }, () => [0x10, 1, 0]) },
        run: async (action) => {
            await action({ setKey: (index, key) => writes.push({ index, key }) })
            return true
        },
    }
    const dependencies = {
        pinia: { defineStore: (_, setup) => setup },
        vue: {
            ref: (value) => ({ value }),
            computed: (getter) => ({
                get value() {
                    return getter()
                },
            }),
            watch: () => {},
        },
        './deviceStore': { useDeviceStore: () => device },
        '@/domain/mouse/settings': load('settings'),
    }
    const exports = {}
    vm.runInThisContext('(function(require,exports){' + compiled + '})')(
        (name) => dependencies[name],
        exports,
    )
    const store = exports.useKeyStore()
    assert.equal(await store.assignShortcut(3, 6, 2), true)
    assert.deepEqual(writes, [{ index: 2, key: [0x20, 3, 6] }])
    for (const args of [
        [1, 6, 3],
        [16, 6, 2],
        [1, 255, 2],
        [1, 6, 10],
    ])
        assert.equal(store.assignShortcut(...args), undefined)
    assert.equal(writes.length, 1)
})

test('numpad recording preserves distinct physical HID keys and macro press/release bytes', () => {
    const { keyboardUsageFromEventCode, KEYBOARD_BINDINGS } = load('settings')
    const expected = {
        NumLock: 0x53,
        NumpadDivide: 0x54,
        NumpadMultiply: 0x55,
        NumpadSubtract: 0x56,
        NumpadAdd: 0x57,
        NumpadEnter: 0x58,
        Numpad1: 0x59,
        Numpad2: 0x5a,
        Numpad3: 0x5b,
        Numpad4: 0x5c,
        Numpad5: 0x5d,
        Numpad6: 0x5e,
        Numpad7: 0x5f,
        Numpad8: 0x60,
        Numpad9: 0x61,
        Numpad0: 0x62,
        NumpadDecimal: 0x63,
        NumpadEqual: 0x67,
    }
    for (const [eventCode, expectedCode] of Object.entries(expected)) {
        const code = keyboardUsageFromEventCode(eventCode)
        assert.equal(code, expectedCode)
        assert.ok(KEYBOARD_BINDINGS.some((key) => key.value[2] === code))
        const macro = macros.validateMacro({
            name: eventCode,
            actions: [
                { delay: 50, typeAndStatus: 0x8a, code },
                { delay: 0, typeAndStatus: 0x0a, code },
            ],
        })
        assert.deepEqual(
            [...macros.encodeCapturedMacro(macro, 3072).slice(22, 30)],
            [50, 0, 0x8a, code, 0, 0, 0x0a, code],
        )
    }
    for (let digit = 0; digit <= 9; digit++)
        assert.notEqual(
            keyboardUsageFromEventCode('Numpad' + digit),
            keyboardUsageFromEventCode('Digit' + digit),
        )
    assert.equal(keyboardUsageFromEventCode('Enter'), 0x28)
    assert.equal(keyboardUsageFromEventCode('KeyA'), 4)
    assert.equal(keyboardUsageFromEventCode('ArrowLeft'), 0x50)
    assert.equal(keyboardUsageFromEventCode('Escape'), 0x29)
    assert.equal(keyboardUsageFromEventCode('Unidentified'), undefined)
    assert.equal(keyboardUsageFromEventCode('ControlLeft'), 0xe0)
    assert.equal(keyboardUsageFromEventCode('MetaRight'), 0xe7)
    assert.equal(keyboardUsageFromEventCode('Comma'), 0x36)
    assert.equal(keyboardUsageFromEventCode('Insert'), 0x49)
    assert.equal(keyboardUsageFromEventCode('Delete'), 0x4c)
})

test('fire button macro encodes counted left clicks and validates its interval', () => {
    const macro = macros.createFireMacro('Fire', 3, 30)
    assert.deepEqual(macros.macroBinding(macro), [0x71, 0, 3])
    assert.deepEqual(macro.actions, [
        { delay: 0, typeAndStatus: 0x81, code: 1 },
        { delay: 30, typeAndStatus: 1, code: 1 },
    ])
    assert.doesNotThrow(() => macros.encodeCapturedMacro(macro, 3072))
    for (const [count, interval] of [
        [0, 30],
        [256, 30],
        [1, 0],
        [1, 65536],
        [1, 1.5],
    ])
        assert.throws(() => macros.createFireMacro('Fire', count, interval))
})

test('delay insertion accumulates at the chosen boundary and rejects unsupported pauses', () => {
    const { insertMacroDelay, validateMacro } = load('macros')
    const actions = [
        { delay: 30, typeAndStatus: 0x8a, code: 4 },
        { delay: 0, typeAndStatus: 0x0a, code: 4 },
    ]
    insertMacroDelay(actions, 1, 100)
    assert.equal(actions[0].delay, 130)
    insertMacroDelay(actions, 2, 65535)
    assert.equal(actions[1].delay, 65535)
    assert.doesNotThrow(() => validateMacro({ name: 'delay', actions }))
    for (const [index, delay] of [
        [0, 30],
        [3, 30],
        [1, 0],
        [1, 1.5],
        [2, 1],
    ]) {
        const before = JSON.stringify(actions)
        assert.throws(() => insertMacroDelay(actions, index, delay))
        assert.equal(JSON.stringify(actions), before)
    }
})

// Shared regression cases run through each repository's existing capture harness.
test('profile preflight rejects phantom left click and disabled DPI before any writes', async () => {
    const { CB75Protocol } = load('protocol')
    for (const modify of [
        (profile) => { profile.keys[0] = 0x20; profile.keys.splice(120, 3, 0x10, 1, 0) },
        (profile) => { profile.functions[14 + profile.functions[12] * 9] = 0 },
        (profile) => { profile.keys[127] ^= 1 },
    ]) {
        const { device } = configurationDevice()
        const transport = new LegacyTransport(device)
        const profile = sampleProfile()
        modify(profile)
        try {
            await assert.rejects(new CB75Protocol(transport).applyProfile(profile), /physical key|disabled DPI|outside|empty key/)
            assert.equal(device.sent.filter((packet) => [1, 6, 9, 0x15].includes(packet.data[2])).length, 0)
        } finally { transport.stop() }
    }
})
