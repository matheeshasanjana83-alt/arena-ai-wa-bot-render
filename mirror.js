'use strict';
/**
 * mirror.js — KAVIZ MD V1 v2.21 — file / URL → direct share link (relay)
 *
 * UX = අනිත් bots වලගේ /dl/<id>?code= links වගේ: file එකක් upload කරලා
 * browser එකෙන් උනේන direct download link එකක් ගන්නවා (status/grp share).
 *
 * Host chain:
 *   1. qu.ax                  — 30 days, short link (≤ ~950 MB)
 *   2. transfer.archivete.am  — ~7 days / 100 downloads, streams big files (PUT)
 *
 * All uploads go through net.js smartFetch (proxy-pool fallback included).
 */
const fs = require('fs');
const { Readable, Transform, PassThrough } = require('stream');

let netMod = null;
try { netMod = require('./net'); } catch { }
const fetchFn = (...a) => (netMod && netMod.smartFetch ? netMod.smartFetch(...a) : fetch(...a));

const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36' };
const QUAX_MAX = 950 * 1048576;          // qu.ax cap guess → bigger files go straight to transfer
const BUF_MAX = 190 * 1048576;           // buffer-upload ceiling (read whole file to RAM)

const safeName = (n) => encodeURIComponent(String(n || 'file.bin').replace(/[^\w.\-() ]+/g, '_').slice(0, 120));

/** hand-rolled multipart → body is a plain Buffer, reusable across smartFetch route retries
 *  v2.90: field param — qu.ax wants "files[]", gofile/tmpfiles want "file" */
function multipart(buf, name, field = 'files[]') {
    const b = safeName(name);
    const head = Buffer.from('--KV\r\nContent-Disposition: form-data; name="' + field + '"; filename="' + b + '"\r\nContent-Type: application/octet-stream\r\n\r\n');
    const tail = Buffer.from('\r\n--KV--\r\n');
    return { body: Buffer.concat([head, buf, tail]), type: 'multipart/form-data; boundary=KV' };
}

/** qu.ax — POST multipart, returns JSON { files: [{ url }] } */
async function upQuax(buf, name) {
    const mp = multipart(buf, name);
    const r = await fetchFn('https://qu.ax/upload.php', { method: 'POST', body: mp.body, headers: { ...UA, 'Content-Type': mp.type } });
    if (!r.ok) throw new Error('qu.ax HTTP ' + r.status);
    const j = await r.json();
    const u = j && j.files && j.files[0] && j.files[0].url;
    if (!/^https?:\/\//.test(u || '')) throw new Error('qu.ax bad reply');
    return { url: u, host: 'qu.ax', days: 30 };
}

/** transfer.archivete.am — PUT /<name> → plain-text link (Buffer or file path, streams big files)
 *  v2.87: opts passthrough (signal) — callers bound the upload time so a slow/blocked host can
 *  never hang the command forever (.uploadtra 104MB stall fix). */
async function upTransfer(bufOrPath, name, opts = {}) {
    const body = typeof bufOrPath === 'string'
        ? Readable.toWeb(fs.createReadStream(bufOrPath))
        : bufOrPath;
    const r = await fetchFn('https://transfer.archivete.am/' + safeName(name), {
        method: 'PUT', body, duplex: 'half',
        headers: { ...UA, 'Content-Type': 'application/octet-stream' },
        ...opts,
    });
    const t = (await r.text()).trim();
    if (!/^https?:\/\//.test(t)) throw new Error('transfer HTTP ' + r.status + ' ' + t.slice(0, 60));
    const del = r.headers.get('x-url-delete') || null;
    return { url: t, host: 'transfer', days: 7, del };
}

/** gofile.io — v2.90 .uploadgo: guest API (LIVE-PROBED 2026-10-27): GET /servers → store list ok;
 *  POST {server}.gofile.io/contents/uploadfile (multipart field "file") → {downloadPage, guestToken, id}.
 *  Guests can UPLOAD but NOT download via API (contents = error-notPremium, /download/web/ = 302 page,
 *  site wt.obf.js anti-bot token) → card links the browser downloadPage; free files clean after ~10d inactive. */
async function upGofile(buf, name, opts = {}) {
    const mp = multipart(buf, name, 'file');
    const sr = await fetchFn('https://api.gofile.io/servers', { ...opts, headers: { ...UA } });
    if (!sr.ok) throw new Error('gofile servers HTTP ' + sr.status);
    const sj = await sr.json().catch(() => null);
    const sname = sj && sj.data && sj.data.servers && sj.data.servers[0] && sj.data.servers[0].name;
    if (!sname) throw new Error('gofile servers list හිස්');
    const r = await fetchFn('https://' + sname + '.gofile.io/contents/uploadfile', {
        method: 'POST', body: mp.body,
        headers: { ...UA, 'Content-Type': mp.type },
        ...opts,
    });
    const j = await r.json().catch(() => null);
    const d = j && j.data;
    if (!r.ok || !d || !d.downloadPage) throw new Error('gofile HTTP ' + r.status + ' ' + String((j && j.status) || '').slice(0, 40));
    return { url: d.downloadPage, host: 'gofile', days: 10, fileId: d.id || null, guestToken: d.guestToken || null };
}

/** tmpfiles.org — v2.90 .uploadtm: POST /api/v1/upload (field "file") → { data: { url } }.
 *  100 MB cap · files expire in 60 MINUTES (card warns). The /dl/<ts>.<hash>/ direct link is
 *  SINGLE-USE → resolvers.js re-derives it from the page at download time (never cached). */
const TMPFILES_MAX = 100 * 1048576;
async function upTmpfiles(buf, name, opts = {}) {
    if (buf.length > TMPFILES_MAX) throw new Error('tmpfiles 100 MB cap — මේ file එක ලොකු වැඩියි (.uploadgo/.uploadtra use කරන්න)');
    const mp = multipart(buf, name, 'file');
    const r = await fetchFn('https://tmpfiles.org/api/v1/upload', {
        method: 'POST', body: mp.body,
        headers: { ...UA, 'Content-Type': mp.type },
        ...opts,
    });
    if (!r.ok) throw new Error('tmpfiles HTTP ' + r.status);
    const j = await r.json().catch(() => null);
    const u = j && j.data && j.data.url;
    if (!/^https?:\/\/tmpfiles\.org\//.test(u || '')) throw new Error('tmpfiles bad reply');
    return { url: u, host: 'tmpfiles', days: 0.04 };   // ~1h — the command formats this as ⏳ 60 min
}

/** 🌊 v3.06 — cheap size probe (HEAD, then 1-byte Range GET fallback) → { total, mime, isHtml, name }.
 *  No body download — lets .mirror decide disk-path vs stream-pipe BEFORE pulling anything. */
async function probeSize(u) {
    let total = 0, mime = '', name = '';
    try {
        const r = await fetchFn(u, { method: 'HEAD', headers: { ...UA }, redirect: 'follow' });
        if (r.ok) {
            total = parseInt(r.headers.get('content-length') || '0', 10) || 0;
            mime = (r.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
        }
        try { await r.body?.cancel(); } catch { }
    } catch { }
    if (!total || !mime) {
        // HEAD blocked/405/missing length → 1-byte Range GET: content-range "bytes 0-0/12345" gives real size
        try {
            const g = await fetchFn(u, { headers: { ...UA, Range: 'bytes=0-0' }, redirect: 'follow' });
            if (g.ok) {
                const m = (g.headers.get('content-range') || '').match(/\/(\d+)\s*$/);
                if (m) total = parseInt(m[1], 10) || total;
                mime = mime || (g.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
                const nm = (g.headers.get('content-disposition') || '').match(/filename\*?=(?:UTF-8''|")?([^";]+)/i);
                if (nm) name = decodeURIComponent(nm[1]);
            }
            try { await g.body?.cancel(); } catch { }
        } catch { }
    }
    return { total, mime, isHtml: mime === 'text/html', name };
}

/** 🌊 v3.06 — compose [head][src][tail] multipart on the fly (chunked — no content-length
 *  needed; x0.at accepts it, `cat f | curl -F file=@- https://x0.at` proved it live). */
function multipartStream(srcNode, name) {
    const b = 'KV' + Date.now().toString(36) + Math.round(Math.random() * 1e9).toString(36);
    const head = Buffer.from('--' + b + '\r\nContent-Disposition: form-data; name="file"; filename="' + safeName(name) + '"\r\nContent-Type: application/octet-stream\r\n\r\n');
    const tail = Buffer.from('\r\n--' + b + '--\r\n');
    const out = new PassThrough();
    out.write(head);
    srcNode.on('error', (e) => out.destroy(e));
    srcNode.pipe(out, { end: false });
    srcNode.on('end', () => out.end(tail));
    return { stream: out, boundary: b };
}

/** 🌊 v3.06 — remote URL → STREAMING upload chain (zero disk / zero RAM buffering, any size).
 *  2026-11 live probe (bot container): transfer.archivete.am PUT = 403 (datacenter block),
 *  0x0.st = uploads disabled, pixeldrain = 401 API-key-only → working chain:
 *    1. x0.at     — multipart chunked POST · ≤1024MiB · 3-100d retention (size-based)
 *    2. filebin.net — raw PUT · bins live 6d · direct ?dl=1 download link
 *    3. transfer.archivete.am — kept as last resort in case its 403 phase ends
 *  Source is re-GET per attempt (a body can only be consumed once) · 90s stall watchdog per hop. */
async function streamUpload(u, opts = {}) {
    const { total = 0, onProgress = null, name = 'file.bin', signal = null } = opts;
    const X0_MAX = 1024 * 1048576;
    const chain = total > X0_MAX ? ['filebin', 'transfer'] : ['x0at', 'filebin', 'transfer'];
    let lastErr = null;
    for (const host of chain) {
        let r;
        try { r = await fetchFn(u, { headers: { ...UA }, redirect: 'follow', ...(signal ? { signal } : {}) }); }
        catch (e) { lastErr = e; continue; }
        if (!r.ok) { try { await r.body?.cancel(); } catch { } lastErr = new Error('server එකෙන් HTTP ' + r.status); continue; }
        const mime = (r.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
        if (mime === 'text/html') { try { await r.body?.cancel(); } catch { } throw new Error('මේ link එකෙන් එන්නේ web page එකක් — direct download link එකක් එවන්න'); }
        const sz = total || parseInt(r.headers.get('content-length') || '0', 10) || 0;
        let loaded = 0, lastData = Date.now(), lastTick = 0;
        const counter = new Transform({
            transform(chunk, _enc, cb) {
                loaded += chunk.length; lastData = Date.now();
                if (onProgress && Date.now() - lastTick > 6000) { lastTick = Date.now(); try { onProgress(loaded, sz); } catch { } }
                if (sz && loaded > sz + 1048576) return cb(new Error('size overflow'));
                cb(null, chunk);
            },
            flush(cb) { try { if (onProgress) onProgress(loaded, sz || loaded); } catch { } cb(); }
        });
        const src = Readable.fromWeb(r.body);   // undici fetch body = WEB stream — fromWeb ඕනේ
        src.on('error', (e) => counter.destroy(e));
        src.pipe(counter);
        const wd = setInterval(() => { if (Date.now() - lastData > 90e3) counter.destroy(new Error('stream stall (90s data නෑ)')); }, 30e3);
        try {
            if (host === 'x0at') {
                const mp = multipartStream(counter, name);
                const rr = await fetchFn('https://x0.at/', {
                    method: 'POST', body: Readable.toWeb(mp.stream), duplex: 'half',
                    headers: { ...UA, 'Content-Type': 'multipart/form-data; boundary=' + mp.boundary },
                    ...(signal ? { signal } : {}),
                });
                const t = (await rr.text()).trim();
                if (rr.ok && /^https?:\/\//.test(t)) {
                    const days = sz ? Math.max(3, Math.round(3 + 97 * Math.pow(1 - Math.min(sz, X0_MAX) / X0_MAX, 2))) : 30;
                    return { url: t, host: 'x0at', days, loaded, name: safeName(name) };
                }
                throw new Error('x0.at HTTP ' + rr.status + ' ' + t.slice(0, 50));
            }
            if (host === 'filebin') {
                const bin = 'kv' + Date.now().toString(36) + Math.round(Math.random() * 1e9).toString(36);
                const fname = safeName(name);
                const rr = await fetchFn('https://filebin.net/' + bin + '/' + fname, {
                    method: 'PUT', body: Readable.toWeb(counter), duplex: 'half',
                    headers: { ...UA, 'Content-Type': 'application/octet-stream' },
                    ...(signal ? { signal } : {}),
                });
                if (rr.status !== 201) throw new Error('filebin HTTP ' + rr.status);
                try { await rr.body?.cancel(); } catch { }
                return { url: 'https://filebin.net/' + bin + '/' + fname + '?dl=1', host: 'filebin', days: 6, loaded, name: fname };
            }
            // transfer.archivete.am — last resort (2026-11: 403 from datacenter IPs)
            const rr = await fetchFn('https://transfer.archivete.am/' + safeName(name), {
                method: 'PUT', body: Readable.toWeb(counter), duplex: 'half',
                headers: { ...UA, 'Content-Type': 'application/octet-stream' },
                ...(signal ? { signal } : {}),
            });
            const t = (await rr.text()).trim();
            if (!/^https?:\/\//.test(t)) throw new Error('transfer HTTP ' + rr.status + ' ' + t.slice(0, 60));
            const del = rr.headers.get('x-url-delete') || null;
            return { url: t, host: 'transfer', days: 7, del, loaded, name: safeName(name) };
        } catch (e) {
            lastErr = e;
            try { src.destroy(); } catch { }
        } finally { clearInterval(wd); }
    }
    throw lastErr || new Error('upload hosts හැම එකක්ම fail');
}

/** Buffer → best host (qu.ax 30d first, transfer fallback) */
async function uploadBuffer(buf, name) {
    if (buf.length <= QUAX_MAX) { try { return await upQuax(buf, name); } catch { } }
    return await upTransfer(buf, name);
}

/** File on disk → link. Small files try qu.ax first; big files stream PUT to transfer. */
async function uploadFile(filePath, name) {
    let sz = 0;
    try { sz = fs.statSync(filePath).size; } catch { }
    if (sz > 0 && sz <= BUF_MAX) { try { return await upQuax(fs.readFileSync(filePath), name); } catch { } }
    return await upTransfer(filePath, name);
}

module.exports = { uploadBuffer, uploadFile, upQuax, upTransfer, upGofile, upTmpfiles, probeSize, streamUpload, TMPFILES_MAX, QUAX_MAX, BUF_MAX };
