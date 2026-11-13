/**
 * test_v3011.js — v3.06.5→v3.06.6 🎬 .moviedex FIX: "moviedex එක වැඩ නැනේ එක බලලා fix කරන්න" (user, 2026-11-13)
 *
 *  Root causes found live (2026-11-13 diag):
 *   ① the shared-pool BOOTSTRAP token 406s "find no content" on EVERY BFF call (soft region-block
 *      poisons a token issued behind a blocked IP) — preferring it killed search too
 *   ② resource-position/v2 old param shape (failUrl=&failCode=&resourceNum=1&isVip=false) answers
 *      an EMPTY list for visitor JWTs — downloads + real menu sizes dead
 *   ③ identity: fixed stale x-client-build stamp + 4.0.02/NG combo flagged; MovieBox-Tui ships
 *      4.0.01/US + Cronet UA + DYNAMIC stamp + OLD hex secret (visitor-only, proven)
 *
 *  Asserts:
 *   (1) MB_BOOTSTRAP_TOKEN removed from src + token chain (mbPickToken = registered → visitor)
 *   (2) TUI position params PRIMARY (failCode=404&resourceNum=0&isVip=true + encoded failUrl),
 *       old shape kept as mid-fallback (mbPosQueryOld), mbPosRows = TUI → old → style-flip retry
 *   (3) TUI identity default: Cronet UA, 4.0.01, sp 40401, version_code 50020117-21, region US;
 *       dynamic x-client-build (sec+ms+000+rand . md5hex) ; OLD hex secret bytes + base64 key kept
 *   (4) row.direct carries the row OWN link; mbDirectUrl = row-link-first → position/v2 fallback; CDN UA follows identity
 *   (5) boot registration simplified (no bootstrap condition)
 *   (6) version pins 3.06.6 (pkg + lock + manifest), notes opens v3.06.6, manifest lists this file
 *   (7) rebrand/regressions still hold (ＢＡＴＩＳＴＡ  ＭＤ footer, zero /kaviz/i in moviedex)
 *   (8) OFFLINE function checks: mbClientBuild format, mbPosQuery shape, mbHeaders TUI style,
 *       _mbState.style — plus optional RUN_LIVE E2E (search → rows → direct URL → CDN range GET)
 */
const fs = require('fs');
const path = require('path');

const REPO = path.join(__dirname, '..');
let pass = 0, fail = 0;
const t = (name, cond) => { if (cond) { pass++; console.log('  ✅ ' + name); } else { fail++; console.log('  ❌ ' + name); } };

const MV = fs.readFileSync(path.join(REPO, 'moviedex.js'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(REPO, 'package.json'), 'utf8'));
const lock = JSON.parse(fs.readFileSync(path.join(REPO, 'package-lock.json'), 'utf8'));
const man = JSON.parse(fs.readFileSync(path.join(REPO, 'manifest.json'), 'utf8'));

console.log('── (1) dead bootstrap token OUT ──');
t('MB_BOOTSTRAP_TOKEN removed from moviedex.js', !MV.includes('MB_BOOTSTRAP_TOKEN'));
t('old bootstrap JWT string gone', !MV.includes('l4MFha-s4DfMUOEQqPUGKZ_1NqfgI7NewaGJ0Saruik'));
t('mbPickToken: registered → visitor (no bootstrap leg)', /function mbPickToken\(\)\s*{\s*if \(tokenUsable\(mbUserToken\)[\s\S]{0,120}return mbToken;/.test(MV));

console.log('── (2) TUI position params ──');
t('mbPosQuery = TUI shape (failCode=404&resourceNum=0&isVip=true)', MV.includes('&failUrl=${encodeURIComponent(stub)}&failCode=404&resourceNum=0&isVip=true'));
t('mbPosQueryOld keeps the v2.46 shape as mid-fallback', MV.includes('failUrl=&failCode=&resourceNum=1&isVip=false'));
t('mbPosRows exists (TUI → old → style-flip)', /async function mbPosRows\(/.test(MV) && MV.includes("mbStyle = mbStyle === 'tui' ? 'bot' : 'tui'"));
t('mbDirectUrl row-link-FIRST (own signed MP4 → position/v2 fallback)', MV.includes("if (own.startsWith('http') && !MB_STUB_RE.test(own)) return own;") && /async function mbDirectUrl\([\s\S]{0,400}await mbPosRows\(/.test(MV));
t('mbPositionSize routes through mbPosRows (menu sizes back)', /async function mbPositionSize\([\s\S]{0,300}await mbPosRows\(/.test(MV));
t('position link accepts url OR resourceLink field', MV.includes("rows[0]?.resourceLink || rows[0]?.url"));

console.log('── (3) TUI identity default ──');
t('OLD hex secret bytes present (TUI signing key)', MV.includes('0xef, 0xa8, 0x91, 0x97, 0x4e, 0xec, 0xd3, 0x14'));
t('base64 gateway key kept (bot-style fallback)', MV.includes("Buffer.from('76iRl07s0xSN9jqmEWAt79EBJZulIQIsV64FZr2O', 'base64')"));
t('TUI cert sha256 salt input present', MV.includes('03d4b741632d136bc23e2de4c6adcdb7712f1980b619c183221801730bbd0410'));
t('mbIdentityTui: Cronet UA', MV.includes('Cronet/135.0.7012.3'));
t('mbIdentityTui: 4.0.01 + sp_code 40401 + install ps', MV.includes("'4.0.01.0813.03'") && MV.includes("sp_code: '40401'") && MV.includes("install_ch: 'ps'"));
t('mbIdentityTui: version_code 50020117-21', MV.includes('50020117') && MV.includes('50020121'));
t('mbIdentityBot fallback kept (4.0.02/NG)', MV.includes("'4.0.02.0831.03'") && MV.includes("region: 'NG'"));
t('mbStyle defaults to tui', /let mbStyle = 'tui'/.test(MV));

console.log('── (4) row link + CDN UA ──');
t('row.direct carries the row OWN link (row-link-first — live-verified signed MP4)', MV.includes("link: String(it.resourceLink || it.url || '')"));
t('directDownload passes row.direct.link', MV.includes('row.direct.se, row.direct.ep, row.direct.rid, row.direct.link'));
t('CDN UA follows the active identity', MV.includes("'User-Agent': mbUA || 'okhttp/4.12.0'"));

console.log('── (5) boot registration simplified ──');
t('boot re-register without bootstrap condition', MV.includes('if (!tokenUsable(mbUserToken)) scheduleMbRegister(2000)'));

console.log('── (6) version pins ──');
t('pkg 3.06.5', pkg.version === '3.07.0');
t('lock 3.06.5', lock.version === '3.07.0');
t('manifest 3.06.5', man.version === '3.07.0');
t('notes opens v3.07.0', typeof man.notes === 'string' && man.notes.startsWith('v3.07.0:'));
t('manifest lists tests/test_v3011.js', man.files.includes('tests/test_v3011.js'));

console.log('── (7) rebrand + regressions ──');
t('moviedex footer = ＢＡＴＩＳＴＡ  ＭＤ via style.js BRAND (rebrand reach)', MV.includes("const MV_FOOT = \`> ⚡ \${BRAND} 🍁\`") && !/ＫＡＶＩＺ/.test(MV));
t('pairsite h1 rebranded (full-width scan)', !/ＫＡＶＩＺ/.test(fs.readFileSync(path.join(REPO, 'pairsite.js'), 'utf8')));
t('ZERO /kaviz/i in runtime moviedex source', !/\bkaviz\b/i.test(MV.replace(/ＫＡＶＩＺ/g, '')));
t('resource list perPage 20 (server cap) untouched', MV.includes('perPage=20&all=0&pagerMode=0&resolution='));
t('x-user token upgrade capture still wired', MV.includes("r.headers.get('x-user')"));

console.log('── (8) offline function checks ──');
let mod = null;
try { mod = require(path.join(REPO, 'moviedex.js')); t('moviedex.js require OK', true); }
catch (e) { t('moviedex.js require OK — ' + e.message.slice(0, 60), false); }
if (mod) {
    const b = mod.mbClientBuild(Date.now());
    t('mbClientBuild format stamp.hash', /^\d{17,19}\.[0-9a-f]{32}$/.test(b));
    t('mbClientBuild dynamic (two calls differ)', mod.mbClientBuild(Date.now()) !== mod.mbClientBuild(Date.now() + 1000));
    const q = mod.mbPosQuery('S1', 'R1', 'https://macdn.aoneroom.com/other/x.mp4');
    t('mbPosQuery URL shape', q === '/wefeed-mobile-bff/subject-api/resource-position/v2?subjectId=S1&resourceId=R1&failUrl=https%3A%2F%2Fmacdn.aoneroom.com%2Fother%2Fx.mp4&failCode=404&resourceNum=0&isVip=true');
    const h = mod.mbHeaders('GET', 'https://api6.aoneroom.com/wefeed-mobile-bff/subject-api/get?subjectId=1', '');
    t('TUI headers: Cronet UA live', /Cronet\/135\.0\.7012\.3/.test(h['User-Agent']));
    t('TUI headers: x-client-build present + fresh', /^\d{17,19}\.[0-9a-f]{32}$/.test(h['x-client-build']));
    t('TUI headers: x-client-info carries 4.0.01', JSON.parse(h['x-client-info']).version_name === '4.0.01.0813.03');
    t('TUI headers: no legacy x-idle-data block', h['x-idle-data'] === undefined);
    t('state exposes style', mod._mbState().style === 'tui');
    // signature sanity: TUI secret HMAC over a known canonical — must be base64, 24 chars
    const sig = String(h['x-tr-signature']).split('|')[2];
    t('x-tr-signature base64 (md5-hmac, 22 chars)', /^[A-Za-z0-9+/]{22}==$/.test(sig));
}

if (process.env.RUN_LIVE) {
    console.log('── RUN_LIVE E2E ──');
    (async () => {
        try {
            const list = await mod.mbSearch('black clover', 3);
            t(`live search (${(list || []).length} rows)`, (list || []).length > 0);
            const sid = list[0].sid;
            const rows = await mod.combinedRows(sid, 1, 1, []).catch(() => []);
            t(`live combinedRows S1E1 (${rows.length} rows: ${rows.map(r => r.label).join(',')})`, rows.length > 0);
            const d = rows.find(r => r.direct);
            t('live rows carry .direct', !!d);
            if (d) {
                const url = await mod.mbDirectUrl(d.direct.sid, d.direct.se, d.direct.ep, d.direct.rid, d.direct.link);
                t('live direct URL real (' + url.slice(0, 60) + '…)', /^https?:\/\//.test(url) && !/macdn\.aoneroom\.com\/other\//.test(url));
                const r = await fetch(url, { headers: { 'User-Agent': mod.mbHeaders('GET', 'https://api6.aoneroom.com/', '').hasOwnProperty('x') ? 'okhttp/4.12.0' : 'okhttp/4.12.0', Range: 'bytes=0-1048575' }, signal: AbortSignal.timeout(30000) });
                const buf = await r.arrayBuffer();
                t(`live CDN range GET ${r.status} ${Math.round(buf.byteLength / 1024)}KB`, r.status === 206 && buf.byteLength >= 1048576);
                try { await r.body?.cancel(); } catch { }
            }
            console.log(`\nRESULT: ${pass} pass, ${fail} fail`);
            process.exit(fail ? 1 : 0);
        } catch (e) { console.log('LIVE FATAL:', e.message); console.log(`\nRESULT: ${pass} pass, ${fail} fail`); process.exit(1); }
    })();
    return;
}

console.log(`\nRESULT: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
