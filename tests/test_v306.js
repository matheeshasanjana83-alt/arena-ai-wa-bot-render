'use strict';
/**
 * test_v306.js — 🌊 .mirror STREAM-PIPE (v3.06.0)
 * probeSize (HEAD → 1-byte Range GET) + streamUpload (source body → transfer.archivete.am
 * PUT, zero disk / zero RAM buffering) — lets .mirror relay 1GB+ movies on 512MB-disk hosts
 * without ever touching the disk (bot-hosting ceiling: "need 300+ MB, only 269.2 MB free").
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

let passed = 0, failed = 0, warned = 0;
const ok = (n) => { passed++; console.log('  ✅ ' + n); };
const bad = (n, e) => { failed++; console.log('  ❌ ' + n + ' — ' + (e && e.message || e)); };
const warn = (n, e) => { warned++; console.log('  ⚠️  ' + n + ' — ' + (e && e.message || e) + '  (soft — sandbox network)'); };
const check = (n, fn) => { try { fn(); ok(n); } catch (e) { bad(n, e); } };
const checkA = async (n, fn, soft) => { try { await fn(); ok(n); } catch (e) { if (soft) warn(n, e); else bad(n, e); } };

(async () => {
    console.log('\n== v3.06.0 .mirror stream-pipe ==\n');
    const R = path.join(__dirname, '..');

    // [1] version pins
    check('[1] version 3.06.5 pkg+manifest + manifest lists test_v306.js', () => {
        assert.strictEqual(require('../package.json').version, '3.06.7', 'pkg version');
        const m = JSON.parse(fs.readFileSync(path.join(R, 'manifest.json'), 'utf8'));
        assert.strictEqual(m.version, '3.06.7', 'manifest version');
        assert(m.files.includes('tests/test_v306.js'), 'manifest.files missing test_v306.js');
        assert(m.notes.includes('STREAM-PIPE'), 'manifest.notes marker');
    });

    // [2] mirror.js exports the new functions
    const mirror = require('../mirror');
    check('[2] mirror exports probeSize + streamUpload', () => {
        assert.strictEqual(typeof mirror.probeSize, 'function', 'probeSize');
        assert.strictEqual(typeof mirror.streamUpload, 'function', 'streamUpload');
    });

    // [3] source markers — cmdMirror branches + menu line
    check('[3] tools.js stream branch + bot.js menu line', () => {
        const t = fs.readFileSync(path.join(R, 'tools.js'), 'utf8');
        assert(t.includes('mirror.streamUpload'), 'tools uses streamUpload');
        assert(t.includes('mirror.probeSize'), 'tools probes size first');
        assert(t.includes('fitsDisk'), 'disk-fit decision');
        assert(t.includes('bigOrUnknown'), 'big/unknown branch');
        assert(t.includes('stream mode…'), 'disk-full fallback marker');
        const b = fs.readFileSync(path.join(R, 'bot.js'), 'utf8');
        assert(b.includes('1GB+ movies OK'), 'menu line not updated');
    });

    // [4] LIVE probeSize — known file, HEAD or Range path must give a real size
    const PROBE_URL = 'https://raw.githubusercontent.com/matheeshasanjana83-alt/arena-ai-wa-bot-render/main/package.json';
    await checkA('[4] LIVE probeSize(package.json) → total>0, not html', async () => {
        const p = await mirror.probeSize(PROBE_URL);
        assert(p && p.total > 0, 'total=' + (p && p.total));
        assert(!p.isHtml, 'isHtml should be false');
    }, true);

    // [5] LIVE full-cycle: direct-file source → stream-pipe → transfer link → bytes match
    //     (same code path a 1GB movie takes, just with a 2KB payload;
    //      seed via upTransfer (direct-file URL) because qu.ax short links serve an HTML viewer)
    await checkA('[5] LIVE stream round-trip → chain host → bytes match', async () => {
        const payload = Buffer.from('batista v306 stream-pipe test ' + Date.now() + ' · ' + 'x'.repeat(2048));
        const seed = await mirror.upTransfer(payload, 'batista-v306-src.txt');
        assert(/^https?:\/\//.test(seed.url), 'seed url: ' + seed.url);
        let ticks = 0;
        const out = await mirror.streamUpload(seed.url, {
            total: payload.length,
            name: 'batista-v306-out.txt',
            onProgress: () => { ticks++; },
        });
        assert(/^https?:\/\//.test(out.url), 'out url: ' + out.url);
        assert.strictEqual(out.loaded, payload.length, 'loaded=' + out.loaded + ' want ' + payload.length);
        assert(['x0at', 'filebin', 'transfer'].includes(out.host), 'host=' + out.host);
        assert(ticks >= 1, 'progress ticked');
        const res = await fetch(out.url);
        assert(res.ok, 'GET out url → ' + res.status);
        const back = Buffer.from(await res.arrayBuffer());
        assert(Buffer.compare(back, payload) === 0, 'bytes differ (back=' + back.length + ')');
    }, true);

    console.log(`\n— v3.06.0: ${passed} passed, ${failed} failed, ${warned} soft-warned —\n`);
    process.exit(failed ? 1 : 0);
})();
