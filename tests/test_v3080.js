/**
 * test_v3080.js — v3.08.0 🧊 PREMIUM UI + NEW WHATSAPP API (user: "ඔකෙ flows ටික ලස්සනට premium
 * look එකකින් · අලුත්ම whatsapp api · v3.08 ලොකුම ලොකු වෙනසක් · ai වලින් හැදුවා කියලා හදුන ගන්න බැරි වෙන්න")
 *
 *  Asserts:
 *   (1) ui.js engine — parseTap / sectionsOf chunking (10-cap + labels) / ctaJson guard / footer BRAND
 *   (2) fail-safe — image-without-upload → null · empty buttons → null · junk paramsJson → null tap
 *   (3) E2E (real baileys proto): interactiveContent → generateWAMessageFromContent builds a
 *       WAMessage with key.id (self-dedupe/state tracking works) + encode/decode round-trip survives
 *   (4) bot.js wiring — ui require, tap routing before number-reply, sendInteractivePanel,
 *       interactive-first in .menu/.setting/.mode with classic fallback + state tracking on BOTH paths
 *   (5) moviedex wiring — ctx ui/upload, sendInteractive helper, ONE-card poster quality menu with
 *       WYSIWYG numbering, search results tap-card replaces the number list (≤20) + full text list for >20
 *   (6) style.js premium kit — THIN / sm() small-caps / sect() header, .keys + .moviedex usage rebuilt
 *   (7) version pins 3.08.0 (pkg + lock + manifest), notes opens v3.08.0, manifest.files += ui.js + this suite
 *   (8) rebrand holds — no brand-kaviz regressions (nickname lines whitelisted like v309)
 */
const fs = require('fs');
const path = require('path');
const REPO = path.join(__dirname, '..');

let pass = 0, fail = 0;
const t = (name, cond) => { if (cond) { pass++; console.log('  ✅ ' + name); } else { fail++; console.log('  ❌ ' + name); } };

const ui = require(path.join(REPO, 'ui.js'));
const style = require(path.join(REPO, 'style.js'));

const BOT = fs.readFileSync(path.join(REPO, 'bot.js'), 'utf8');
const MV = fs.readFileSync(path.join(REPO, 'moviedex.js'), 'utf8');
const UI = fs.readFileSync(path.join(REPO, 'ui.js'), 'utf8');
const ST = fs.readFileSync(path.join(REPO, 'style.js'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(REPO, 'package.json'), 'utf8'));
const lock = JSON.parse(fs.readFileSync(path.join(REPO, 'package-lock.json'), 'utf8'));
const man = JSON.parse(fs.readFileSync(path.join(REPO, 'manifest.json'), 'utf8'));

console.log('── (1) ui.js pure engine ──');
t('parseTap: baked command id unwraps', ui.parseTap({ interactiveResponseMessage: { nativeFlowResponseMessage: { paramsJson: JSON.stringify({ id: '.menu 2', title: 'x' }) } } }) === '.menu 2');
t('parseTap: moviedex quality tap routes full grammar', ui.parseTap({ interactiveResponseMessage: { nativeFlowResponseMessage: { paramsJson: JSON.stringify({ id: '.moviedex 3 2' }) } } }) === '.moviedex 3 2');
t('parseTap: junk paramsJson → null', ui.parseTap({ interactiveResponseMessage: { nativeFlowResponseMessage: { paramsJson: 'not-json{{' } } }) === null);
t('parseTap: non-command id → null (never routes foreign ids)', ui.parseTap({ interactiveResponseMessage: { nativeFlowResponseMessage: { paramsJson: JSON.stringify({ id: 'https://evil.example' }) } } }) === null);
t('parseTap: normal message → null', ui.parseTap({ conversation: 'hello' }) === null && ui.parseTap(null) === null);
const secs = ui.sectionsOf(Array.from({ length: 23 }, (_, i) => ({ title: `${i + 1} · item`, id: '.cmd ' + (i + 1) })), 'RESULTS');
t('sectionsOf: 23 rows → 10/10/3 chunking', secs.length === 3 && secs.map((s) => s.rows.length).join(',') === '10,10,3');
t('sectionsOf: continuation labels (11–20 / 21–23)', secs[1].title.includes('11–20') && secs[2].title.includes('21–23'));
t('sectionsOf: rowId trim + title cap 24', ui.sectionsOf([{ title: 'x'.repeat(40), id: '  .m 1  '.repeat(20) }])[0].rows[0].title.length <= 24);
t('sectionsOf: empty/blank rows dropped', ui.sectionsOf([{ title: '  ', id: '.x' }, { title: 'ok', id: '.ok' }]).length === 1);
t('ctaJson: https ok · ftp/garbage rejected', !!ui.ctaJson('Open', 'https://a.b/c') && ui.ctaJson('Open', 'ftp://x') === null && ui.ctaJson('Open', 'javascript:alert(1)') === null);
t('DIV2 thin divider shared', typeof ui.DIV2 === 'string' && ui.DIV2.includes('━'));

console.log('── (2) fail-safe builders ──');
(async () => {
    const noImg = await ui.interactiveContent({ jid: '1@s.whatsapp.net', upload: null, title: 'T', text: 'body', sections: ui.sectionsOf([{ title: 'a', id: '.a 1' }], 'S') });
    t('text-header card builds WITHOUT uploader (no media → no upload needed)', !!noImg?.viewOnceMessage?.message?.interactiveMessage);
    t('footer defaults to ＢＡＴＩＳＴＡ ＭＤ brand line', (noImg.viewOnceMessage.message.interactiveMessage.footer?.text || '').includes('ＢＡＴＩＳＴＡ'));
    const imgNoUpload = await ui.interactiveContent({ jid: '1@s.whatsapp.net', upload: null, image: Buffer.from('x'.repeat(100)), title: 'T', sections: ui.sectionsOf([{ title: 'a', id: '.a 1' }], 'S') });
    t('image WITHOUT uploader → null (never throws up the chain)', imgNoUpload === null);
    const noButtons = await ui.interactiveContent({ jid: '1@s.whatsapp.net', upload: null, title: 'T', text: 'x' });
    t('no sections + no cta → null (classic card instead)', noButtons === null);
    const cta = await ui.interactiveContent({ jid: '1@s.whatsapp.net', upload: null, title: 'T', text: 'x', ctaUrl: { text: 'Stream', url: 'https://a.b/c' } });
    t('cta_url button builds', !!cta && JSON.stringify(cta.viewOnceMessage.message.interactiveMessage.nativeFlowMessage.buttons).includes('cta_url'));
    const ctaBad = await ui.interactiveContent({ jid: '1@s.whatsapp.net', upload: null, title: 'T', text: 'x', ctaUrl: { text: 'S', url: 'nope' } });
    t('bad cta url → null', ctaBad === null);

    console.log('── (3) E2E WAMessage build (real baileys proto) ──');
    const b = await ui.cap();
    t('baileys proto InteractiveMessage reachable', !!b?.proto?.Message?.InteractiveMessage);
    const content = await ui.interactiveContent({
        jid: '947700000000@s.whatsapp.net', upload: null, title: 'ＢＡＴＩＳＴＡ ＭＤ · MENU', text: 'body text',
        selectTitle: '📂 Categories', sections: ui.sectionsOf([{ title: '1 · ⚡ Info', desc: 'bot status', id: '.menu 1' }], 'MENU'),
    });
    const m = b.generateWAMessageFromContent('947700000000@s.whatsapp.net', content, { userJid: '947700000000@s.whatsapp.net' });
    t('generateWAMessageFromContent builds the WAMessage', !!m?.message?.viewOnceMessage?.message?.interactiveMessage);
    t('key.id generated (sentIds + panel state tracking work)', typeof m?.key?.id === 'string' && m.key.id.length > 10);
    const enc = b.proto.Message.encode(m.message).finish();
    const dec = b.proto.Message.decode(enc);
    t('encode/decode round-trip survives (wire-safe)', !!dec.viewOnceMessage?.message?.interactiveMessage?.nativeFlowMessage?.buttons?.length);
    const rowsJson = JSON.parse(m.message.viewOnceMessage.message.interactiveMessage.nativeFlowMessage.buttons[0].buttonParamsJson);
    t('single_select params: rowId baked = .menu 1', rowsJson.sections[0].rows[0].rowId === '.menu 1');
    t('single_select params: row title ≤ 24 + description kept', rowsJson.sections[0].rows[0].title === '1 · ⚡ Info' && rowsJson.sections[0].rows[0].description === 'bot status');

    console.log('── (4) bot.js wiring ──');
    t("bot.js requires ./ui", BOT.includes("require('./ui')"));
    t('tap routing runs BEFORE the number-reply bridge (ui.parseTap)', BOT.indexOf('ui.parseTap(msg.message)') >= 0 && BOT.indexOf('ui.parseTap(msg.message)') < BOT.indexOf('/^\\d{1,3}$/.test(text)'));
    t('tap log line (console truth)', BOT.includes('👆 tap →'));
    t('sendInteractivePanel helper defined', /async function sendInteractivePanel\(/.test(BOT));
    t('panel helper guards SOCK uploader + falls back to null', BOT.includes('if (!SOCK?.waUploadToServer) return null;'));
    t('.menu interactive-first + classic fallback + state on both', /const sentInt = await sendInteractivePanel\(send, jid, msg, \{[\s\S]{0,400}?title: `\$\{BRAND\} · MENU`/.test(BOT) && BOT.includes("if (sentInt?.key?.id) { menuState.set(jid, { id: sentInt.key.id, at: Date.now() }); return; }"));
    t('.setting rows built from the caption itself (zero drift)', BOT.includes("const rows = settingCaption().split('\\n')"));
    t('.mode rows built from the caption itself', BOT.includes("const rows = modeCaption().split('\\n')"));
    t('.mode interactive body reuses live cur/aiOn/aim values', BOT.includes('const cur = guard.chatMode(), aiOn = guard.aiChatOn(), aim = guard.aiMode();'));
    t('menu tap ids route to existing .menu <n> handler (no duplicate logic)', BOT.includes("id: `.menu ${i + 1}`"));
    t('send wrapper relays interactive content itself (pacing + sentIds + remember kept)', /if \(content\?\.viewOnceMessage\?\.message\?\.interactiveMessage\) \{[\s\S]{0,700}?generateWAMessageFromContent\(jid, content, \{ userJid: ME\.pn \|\| jid, quoted: opts\?\.quoted \}\)[\s\S]{0,300}?relayMessage\(jid, wa\.message, \{ messageId: wa\.key\.id \}\)/.test(BOT));
    t('relay path registers sentIds + remember (self-dedupe + stale-card guidance intact)', /interactiveMessage\) \{[\s\S]{0,900}?sentIds\.add\(s\.key\.id\)/.test(BOT));

    console.log('── (5) moviedex wiring ──');
    t('handle ctx += ui + upload', MV.includes('const { send, jid, msg, rest, react, ui, upload } = ctx;'));
    t('sendInteractive helper guards ui/upload', /async function sendInteractive\(ctx, \{ title, text, image, sections, selectTitle \}\)/.test(MV) && MV.includes('if (!ctx?.ui || !ctx?.upload) return null;'));
    t('sendCard = ONE interactive card (poster media header + tap quality)', MV.includes('selectTitle: \'🎬 Download\'') && MV.includes('ctx.ui.sectionsOf([...qRows, ...sbRows], \'QUALITY\')'));
    t('quality tap ids keep WYSIWYG numbering (row i+1, subs qlen+i+1)', MV.includes('id: `.moviedex ${n} ${i + 1}`') && MV.includes('id: `.moviedex ${n} ${(rows || []).length + i + 1}`'));
    t('poster fetch 8s timeout, junk poster → classic caption card', MV.includes('AbortSignal.timeout(8000)') && MV.includes('poster.length > 1000'));
    t('search results: ONE tap-card replaces the number list', MV.includes("selectTitle: '🍿 Results'") && MV.includes("id: `.moviedex ${i + 1}`"));
    t('search >20 results still ships the FULL text list (new message, not a dead edit)', MV.includes("if (list.length > 20) await send(jid, { text: listText(arg, list)") && MV.includes('tap card එකේ පළවෙනි 20 යි'));
    t('session routing intact: setUi on the interactive card too', MV.includes('setUi(s3, sentInt, \'list\')') && MV.includes("setUi(s, sent, 'movie', n)"));
    t('.moviedex usage card rebuilt with the premium kit', MV.includes("sect('🎬 ＭＯＶＩＥＤＥＸ')") && MV.includes('${THIN}'));
    t('bot.js passes upload to moviedex (SOCK.waUploadToServer)', BOT.includes('moviedex.handle(c, { send, jid, msg, rest, react, ui, upload: SOCK?.waUploadToServer, me: ME })'));

    console.log('── (6) style.js premium kit ──');
    t('THIN / sm() / sect() exported', typeof style.THIN === 'string' && style.sm('MENU') === 'ᴍᴇɴᴜ' && style.sect('keys') === '╭─〈 ᴋᴇʏs 〉─╮');
    t('sm() leaves full-width ＢＡＴＩＳＴＡ untouched', style.sm('ＢＡＴＩＳＴＡ') === 'ＢＡＴＩＳＴＡ');
    t('.keys card rebuilt (premium header + thin divider)', BOT.includes("sect('🔑 API KEYS')") && BOT.includes("${THIN}"));
    t('legacy exports untouched (BRAND/foot/bar/cut/use)', ['BRAND', 'foot', 'bar', 'cut', 'use'].every((k) => typeof style[k] !== 'undefined'));
    t('HELP advertises the v3.08 premium UI', BOT.includes('🧊 v3.08 premium UI'));

    console.log('── (7) version pins ──');
    t('pkg 3.08.0', pkg.version === '3.08.0');
    t('lock 3.08.0', lock.version === '3.08.0');
    t('manifest 3.08.0', man.version === '3.08.0');
    t('manifest.notes opens v3.08.0', typeof man.notes === 'string' && man.notes.startsWith('v3.08.0:'));
    t('manifest.files += ui.js', man.files.includes('ui.js'));
    t('manifest.files += tests/test_v3080.js', man.files.includes('tests/test_v3080.js'));

    console.log('── (8) rebrand holds ──');
    const noNick = (src) => src.split('\n').filter((l) => !/\u0d9a\u0dc0\u0dd2\u0dc3\u0dca|\u0db6\u0da7\u0dd2\u0dc3\u0dca\u0da7\u0dcf|\ud83c\udff7\ufe0f/.test(l)).join('\n');   // කවිස්/බටිස්ටා/🏷️ nickname lines
    const leaks = fs.readdirSync(REPO).filter((f) => f.endsWith('.js') && /kaviz/i.test(noNick(fs.readFileSync(path.join(REPO, f), 'utf8'))));
    t('zero brand-kaviz in runtime .js (nickname lines whitelisted)', leaks.length === 0);
    if (leaks.length) console.log('     leaks: ' + leaks.join(', '));

    console.log(`\n${pass} pass, ${fail} fail`);
    process.exit(fail ? 1 : 0);
})().catch((e) => { console.log('SUITE CRASH:', e.stack); process.exit(1); });
