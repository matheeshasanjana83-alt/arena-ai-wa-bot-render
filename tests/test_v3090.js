/* test_v3090 — v3.10.0 🧊 PREMIUM CLASSIC OVERHAUL (user: "ඔබ මම කිවු කිසි දෙයක් කරලා නෑ" —
 *  v3.08 premium UI was interactive-first, user's WhatsApp client can't render native cards
 *  (screenshot proof: classic photo+caption menu at v3.08.1) → ALL the premium work was invisible.
 *  v3.09 rebuilds every VISIBLE surface (classic text the user actually sees) in one premium frame language):
 *
 *   (1) style.js v3.09 frame kit — RULE wide rule / head() brand-panel header / chip() ▢ ʟᴀʙᴇʟ ▸ ᴠᴀʟᴜᴇ /
 *       row() zero-padded 01 ▸ / close() ╰─〈 ʙᴀᴛɪꜱᴛᴀ ᴍᴅ 〉╯ — v3.08 legacy kit (THIN/sm/sect) intact
 *   (2) .menu main card — ＢＡＴＩＳＴＡ ＭＤ brand header + ʜɪ/ʙᴏᴛ/ꜱʏꜱ chips + ╭─〈 📂 ᴄᴀᴛᴇɢᴏʀɪᴇꜱ 〉 with
 *       zero-padded small-caps rows 01-14 + framed closer (old ╭─〔 ⚡ *INFO* 〕 language retired)
 *   (3) category cards (.menu <n>) — first bold line becomes the ╭─〈 ᴛɪᴛʟᴇ 〉─╮ header, body unchanged (data zero drift)
 *   (4) .setting panel — premium header + chip status block, option lines 1-10 byte-identical (number replies + tap rows still parse)
 *   (5) .mode panel — premium header + ᴡᴏʀᴋ/ᴀɪ ᴄʜᴀᴛ chips, *N |* option lines identical (v241 + tap rows still parse)
 *   (6) .alive / .version / HELP — same frame language
 *   (7) interactive bodies (.menu/.mode native card text) speak the same chips — one voice, both paths
 *   (8) version pins 3.10.0 (pkg + lock + manifest), notes opens v3.10.0, manifest.files += this suite
 *   (9) rebrand holds — no brand-kaviz regressions
 */
process.env.ARENA_NO_DELAY = '1'; process.env.ARENA_NO_REACT = '1';
process.env.ARENA_RATE_MIN = '1000'; process.env.ARENA_RATE_HOUR = '10000';
process.env.DL_TMP = require('os').tmpdir();

const fs = require('fs');
const path = require('path');
const REPO = path.join(__dirname, '..');

let pass = 0, fail = 0;
const t = (name, cond) => { if (cond) { pass++; console.log('  ✅ ' + name); } else { fail++; console.log('  ❌ ' + name); } };

const style = require(path.join(REPO, 'style.js'));
const SC = (s) => style.sm(String(s).toUpperCase());   // expected small-caps rendering, computed not hardcoded (S→s / X→x traps)

console.log('── (1) style.js v3.09 frame kit ──');
t('RULE wide rule exported (⌯ ━━━…━━━ ⌯)', typeof style.RULE === 'string' && /^⌯ ━+ ⌯$/.test(style.RULE));
t('head() default = RULE / full-width BRAND / RULE', style.head() === [style.RULE, '      ＢＡＴＩＳＴＡ  ＭＤ', style.RULE].join('\n'));
t('head(title) small-caps the panel title', style.head('⚙️ Settings Panel').includes('⚙️ ' + SC('Settings Panel')) && style.head('x').split('\n').length === 3);
t('chip() = ▢ ʟᴀʙᴇʟ ▸ ᴠᴀʟᴜᴇ', style.chip('Hi', '*Boss*') === '▢ ʜɪ ▸ *Boss*' && style.chip('AI Chat', 'ON').startsWith('▢ ' + SC('AI Chat') + ' ▸ '));
t('row() zero-padded 01 ▸', style.row(1, 'x') === '01 ▸ x' && style.row(14, 'y') === '14 ▸ y');
t('close() framed closer', style.close(8) === '╰─〈 ʙᴀᴛɪꜱᴛᴀ ᴍᴅ 〉────────╯' && style.close(2).endsWith('──╯'));
t('v3.08 legacy kit intact (BRAND/foot/bar/cut/use/THIN/sm/sect)', ['BRAND', 'foot', 'bar', 'cut', 'use', 'THIN', 'sm', 'sect'].every((k) => typeof style[k] !== 'undefined') && style.sm('MENU') === 'ᴍᴇɴᴜ');

console.log('── (2-7) rendered premium surfaces (offline require) ──');
const SETF = path.join(REPO, 'settings.json');
const SET_BACK = fs.existsSync(SETF) ? fs.readFileSync(SETF, 'utf8') : null;
fs.writeFileSync(SETF, JSON.stringify({ react: false, autoUpdate: false }, null, 2));
const bot = require(path.join(REPO, 'bot.js'));

(async () => {
    const menu = bot.menuCaption('Boss');
    t('menu: ＢＡＴＩＳＴＡ ＭＤ brand header (head())', menu.startsWith(style.RULE) && menu.includes('ＢＡＴＩＳＴＡ  ＭＤ'));
    t('menu: ʜɪ / ʙᴏᴛ / ꜱʏꜱ chip block', menu.includes('▢ ʜɪ ▸ *Boss*') && /▢ ʙᴏᴛ ▸ v\d/.test(menu) && menu.includes('▢ ' + SC('SYS') + ' ▸'));
    t('menu: old ╭─〔 INFO 〕 language retired', !menu.includes('╭─〔') && !menu.includes('· MENU ◈'));
    t('menu: ╭─〈 📂 ᴄᴀᴛᴇɢᴏʀɪᴇꜱ 〉─╮ section', menu.includes('╭─〈 📂 ' + SC('Categories') + ' 〉─╮'));
    t('menu: 14 zero-padded small-caps rows (01 ▸ … 14 ▸)', menu.includes('01 ▸ 📥 ' + SC('Download')) && menu.includes('03 ▸ 🍿 ' + SC('MovieDex')) && menu.includes('10 ▸ 🤖 ' + SC('AI')) && menu.includes('14 ▸ 📊 ' + SC('Status')));
    t('menu: framed closer + number-reply footer', menu.includes('╰─〈 ʙᴀᴛɪꜱᴛᴀ ᴍᴅ 〉' + '─'.repeat(20) + '╯') && menu.includes('🔢'));

    const set = bot.settingCaption();
    t('setting: premium header + BOT NAME brand line', set.includes('⚙️ ' + SC('Settings Panel')) && set.includes('*BOT NAME:* ＢＡＴＩＳＴＡ  ＭＤ'));
    t('setting: chip status block (ᴠᴇʀꜱɪᴏɴ/ᴋᴇʏꜱ/ᴍᴇᴍᴏʀʏ/ᴘʀᴏᴠɪᴅᴇʀ)', set.includes('▢ ' + SC('Version') + ' ▸ v') && set.includes('▢ ' + SC('Keys') + ' ▸') && set.includes('▢ ' + SC('Memory') + ' ▸') && set.includes('▢ ' + SC('Provider') + ' ▸'));
    t('setting: option lines 1-10 byte-identical shape (number replies + tap rows)', ['1 | Mode: All (Public)', '2 | Mode: Self (Private)', '8 | Max File:'].every((s) => set.includes(s)) && /\n10 \|/.test(set));
    const setRows = set.split('\n').map((l) => l.match(/^\s*(\d{1,2})\s*\|\s*(.+)$/)).filter(Boolean);
    t('setting: bot.js tap-row regex still extracts 10 options', setRows.length === 10 && setRows[0][1] === '1');

    const mode = bot.modeCaption();
    t('mode: premium header + ᴡᴏʀᴋ/ᴀɪ ᴄʜᴀᴛ chips', mode.includes('🛡️ ' + SC('Mode Panel')) && mode.includes('▢ ' + SC('Work') + ' ▸') && mode.includes('▢ ' + SC('AI Chat') + ' ▸'));
    t('mode: *N |* option lines intact (12 options)', ['*1 |* Public', '*16 |* AI: All Public'].every((s) => mode.includes(s)));
    const modeRows = mode.split('\n').map((l) => l.match(/\*(\d{1,2})\s*\|\*\s*(.+)$/)).filter(Boolean);
    t('mode: bot.js tap-row regex still extracts 12 options', modeRows.length === 12 && modeRows[0][1] === '1');

    const alive = bot.aliveCaption('alive');
    t('alive: brand header + ꜱᴛᴀᴛᴜꜱ/ʙᴏᴛ/ᴛɪᴍᴇ/ʜᴏꜱᴛ/ꜱʜɪᴇʟᴅ chips', alive.startsWith(style.RULE) && alive.includes('▢ ' + SC('Status') + ' ▸ 💠') && /▢ ʙᴏᴛ ▸ v\d/.test(alive) && alive.includes('▢ ' + SC('Time') + ' ▸') && alive.includes('▢ ' + SC('Shield') + ' ▸'));

    const BOT = fs.readFileSync(path.join(REPO, 'bot.js'), 'utf8');
    t('category card: first bold line → ╭─〈 ᴛɪᴛʟᴇ 〉─╮ frame (body zero drift)', BOT.includes("const title = (lines.shift() || '').replace(/\\*/g, '')") && BOT.includes("[sect(title), '', ...lines, '', close(18), '', foot('↩️ *.menu*')]"));
    t('menu interactive body speaks the chip language', BOT.includes("${chip('Hi'"));
    t('mode interactive body speaks the chip language', BOT.includes("${chip('Work', cur.toUpperCase())}"));
    t('.version card premium (head + chips)', BOT.includes("head('🤖 Version')") && BOT.includes("chip('Version',") && BOT.includes("chip('Auto-Update',"));
    t('HELP rebuilt on the kit (head + ᴄᴏᴍᴍᴀɴᴅꜱ chip)', /const HELP = `\$\{head\(\)\}/.test(BOT) && BOT.includes('▢ ᴄᴏᴍᴍᴀɴᴅꜱ ▸'));

    console.log('── (8) version pins ──');
    const pkg = JSON.parse(fs.readFileSync(path.join(REPO, 'package.json'), 'utf8'));
    const lock = JSON.parse(fs.readFileSync(path.join(REPO, 'package-lock.json'), 'utf8'));
    const man = JSON.parse(fs.readFileSync(path.join(REPO, 'manifest.json'), 'utf8'));
    t('pkg 3.10.0', pkg.version === '3.10.0');
    t('lock 3.10.0', lock.version === '3.10.0' && lock.packages[''].version === '3.10.0');
    t('manifest 3.10.0', man.version === '3.10.0');
    t('manifest.notes opens v3.10.0', typeof man.notes === 'string' && man.notes.startsWith('v3.10.0:'));
    t('manifest.files += tests/test_v3090.js', man.files.includes('tests/test_v3090.js'));

    console.log('── (9) rebrand holds ──');
    const noNick = (src) => src.split('\n').filter((l) => !/\u0d9a\u0dc0\u0dd2\u0dc3\u0dca|\u0db6\u0da7\u0dd2\u0dc3\u0dca\u0da7\u0dcf|\ud83c\udff7\ufe0f/.test(l)).join('\n');   // කවිස්/බටිස්ටා/🏷️ nickname lines
    const leaks = fs.readdirSync(REPO).filter((f) => f.endsWith('.js') && /kaviz/i.test(noNick(fs.readFileSync(path.join(REPO, f), 'utf8'))));
    t('zero brand-kaviz in runtime .js (nickname lines whitelisted)', leaks.length === 0);
    if (leaks.length) console.log('     leaks: ' + leaks.join(', '));

    // settings restore (no runtime pollution)
    if (SET_BACK === null) { try { fs.rmSync(SETF, { force: true }); } catch { } } else { fs.writeFileSync(SETF, SET_BACK); }

    console.log(`\n${pass} pass, ${fail} fail`);
    process.exit(fail ? 1 : 0);
})().catch((e) => { console.log('SUITE CRASH:', e.stack); process.exit(1); });
