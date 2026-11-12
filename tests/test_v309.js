/**
 * test_v309.js — v3.06.3 🎬 VIDEO BANNER + FULL ＢＡＴＩＳＴＡ ＭＤ REBRAND
 * User directive 2026-11-12: "මේ png එක වෙනුවට මන් දාපු png ටික මිනිත්තු 1 එකකට මරු වෙන්න හදන්න
 * bot ට — දැන් තියෙන එක අයින් කරලා" + "kaviz v1 එක හැම එකකම තියෙන එක ＢＡＴＩＳＴＡ ＭＤ කියලා වෙනස් කරන්න
 * හැම name එකක්ම"
 *
 *  (1) banner.mp4 = the new default banner: real MP4 (ftyp magic), 60s-class file, <16MB WhatsApp
 *      video-message hard cap, >3MB (not a truncated download)
 *  (2) banner.jpg DELETED repo-wide: gone from git tree, manifest.files, and bot.js code paths
 *  (3) bot.js bannerMedia(): LOGO (.setlogo) > banner.mp4 (video+mimetype) > null — 4 send sites
 *      (menu / setting / mode / alive) all route through it; boot rmSync self-cleans stale banner.jpg
 *  (4) manifest: version 3.06.3, files += banner.mp4 + tests/test_v309.js, removed += banner.jpg
 *  (5) FULL REBRAND: ZERO /kaviz/i anywhere in runtime src — package name batista-md, style.js
 *      BRAND = ＢＡＴＩＳＴＡ ＭＤ (footer single-source), ai.js persona identity lock, updater UA,
 *      sticker EXIF defaults, pair-site, agent cards
 *  (6) old suites: version pins moved to 3.06.3
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const REPO = path.join(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(REPO, 'package.json'), 'utf8'));
const man = JSON.parse(fs.readFileSync(path.join(REPO, 'manifest.json'), 'utf8'));
const BOT = fs.readFileSync(path.join(REPO, 'bot.js'), 'utf8');
const STYLE = fs.readFileSync(path.join(REPO, 'style.js'), 'utf8');
const AI = fs.readFileSync(path.join(REPO, 'ai.js'), 'utf8');
const UPD = fs.readFileSync(path.join(REPO, 'updater.js'), 'utf8');
const MEDIA = fs.readFileSync(path.join(REPO, 'media.js'), 'utf8');
const FEAT = fs.readFileSync(path.join(REPO, 'features.js'), 'utf8');
const BRAND = '\uFF22\uFF21\uFF34\uFF29\uFF33\uFF34\uFF21';                                             // ＢＡＴＩＳＴＡ (full-width A = U+FF21)
const FULL = '\uFF22\uFF21\uFF34\uFF29\uFF33\uFF34\uFF21  \uFF2D\uFF24';               // ＢＡＴＩＳＴＡ  ＭＤ (user's exact double-space form)

let ok = 0, bad = 0;
const t = (name, cond) => { if (cond) { ok++; console.log('  ✅ ' + name); } else { bad++; console.log('  ❌ ' + name); } };

// ── (1) banner.mp4 asset ──
const vidPath = path.join(REPO, 'banner.mp4');
t('banner.mp4 exists', fs.existsSync(vidPath));
if (fs.existsSync(vidPath)) {
    const buf = fs.readFileSync(vidPath);
    const mb = buf.length / 1048576;
    t(`banner.mp4 real MP4 (ftyp magic)`, buf.length > 12 && buf.slice(4, 8).toString() === 'ftyp');
    t(`banner.mp4 size ${mb.toFixed(2)}MB — under WhatsApp 16MB video cap`, mb < 16);
    t('banner.mp4 not truncated (>3MB)', mb > 3);
}

// ── (2) banner.jpg deleted everywhere ──
t('banner.jpg gone from repo tree', !fs.existsSync(path.join(REPO, 'banner.jpg')));
t('banner.jpg NOT in manifest.files', !man.files.includes('banner.jpg'));
t('banner.jpg referenced in bot.js ONLY by the boot-clean rmSync', (BOT.match(/banner\.jpg/g) || []).length === 1);

// ── (3) bot.js video-banner wiring ──
t('BANNER_VID const → banner.mp4', BOT.includes("path.join(__dirname, 'banner.mp4')"));
t('bannerMedia() helper defined', /function bannerMedia\(\)/.test(BOT));
t('bannerMedia serves video+mimetype', BOT.includes("video: fs.readFileSync(BANNER_VID)") && BOT.includes("mimetype: 'video/mp4'"));
t('LOGO (.setlogo) still wins over video', BOT.indexOf('LOGO)') < BOT.indexOf('BANNER_VID)'));
t('boot rmSync self-cleans stale banner.jpg', /rmSync\(path\.join\(__dirname, 'banner\.jpg'\)/.test(BOT));
const sites = (BOT.match(/const bm = bannerMedia\(\);/g) || []).length;
t(`4 send sites route through bannerMedia() (menu/setting/alive/mode) — found ${sites}`, sites === 4);
t('no legacy per-site BANNER ternary left', !BOT.includes('fs.existsSync(BANNER)'));
t('old banner.jpg boot-clean + helper before first send site', BOT.indexOf('rmSync') < BOT.indexOf('menuCaption(msg.pushName)'));

// ── (4) manifest v3.06.3 ──
t('manifest version 3.06.3', man.version === '3.06.3');
t('pkg version 3.06.3', pkg.version === '3.06.3');
t('manifest.files += banner.mp4', man.files.includes('banner.mp4'));
t('manifest.files += tests/test_v309.js', man.files.includes('tests/test_v309.js'));
t('manifest.removed += banner.jpg (every bot deletes stale file on update)', Array.isArray(man.removed) && man.removed.includes('banner.jpg'));
t('manifest.notes opens with v3.06.3 video-banner entry', typeof man.notes === 'string' && man.notes.startsWith('v3.06.3:'));

// ── (5) FULL REBRAND — zero KAVIZ in runtime src ──
const rootJs = fs.readdirSync(REPO).filter((f) => f.endsWith('.js'));
let leaks = [];
for (const f of rootJs) {
    const src = fs.readFileSync(path.join(REPO, f), 'utf8');
    if (/kaviz/i.test(src)) leaks.push(f);
}
t(`zero /kaviz/i in ${rootJs.length} runtime .js files`, leaks.length === 0 && rootJs.length > 20);
if (leaks.length) console.log('     leaks: ' + leaks.join(', '));
t('package.json name = batista-md', pkg.name === 'batista-md');
t('style.js BRAND = ＢＡＴＩＳＴＡ  ＭＤ (footer single-source)', STYLE.includes(`const BRAND = '${FULL}'`));
t('ai.js persona identity = ＢＡＴＩＳＴＡ  ＭＤ', AI.includes(FULL) && !/kaviz/i.test(AI));
t('bot.js HELP header rebranded', BOT.includes(`*◈ ${FULL} ◈* — commands`));
t('bot.js MENU header rebranded', BOT.includes(`*◈ ${FULL} · MENU ◈*`));
t('bot.js settings BOT NAME rebranded', BOT.includes(`*BOT NAME:* ${FULL}`));
t('updater.js UA = batista-md-bot-updater', UPD.includes("'batista-md-bot-updater'"));
t('media.js sticker EXIF default = ＢＡＴＩＳＴＡ  ＭＤ', MEDIA.includes(`pack = '${FULL}'`));
t('features.js sticker pack default = ＢＡＴＩＳＴＡ  ＭＤ', FEAT.includes(`'${FULL}'`));
t('docs rebranded (README.md, README-BOT.md)', !/kaviz/i.test(fs.readFileSync(path.join(REPO, 'README.md'), 'utf8'))
    && !/kaviz/i.test(fs.readFileSync(path.join(REPO, 'README-BOT.md'), 'utf8')));

// ── (6) old suites: pins moved to 3.06.3 ──
const pinned = ['test_v306.js', 'test_v289.js', 'test_v300.js', 'test_v308.js'];
for (const f of pinned) {
    const p = path.join(REPO, 'tests', f);
    if (fs.existsSync(p)) {
        const src = fs.readFileSync(p, 'utf8');
        t(`${f} pins 3.06.3`, src.includes('3.06.3') && !src.includes('3.06.2'));
    }
}
t('no suite still pins 3.06.2 (tests dir, self excluded)', fs.readdirSync(path.join(REPO, 'tests'))
    .filter((f) => f.endsWith('.js') && f !== 'test_v309.js')
    .every((f) => !fs.readFileSync(path.join(REPO, 'tests', f), 'utf8').includes("'3.06.2'")));

console.log(bad ? `\n⚠️ ${ok} passed, ${bad} failed` : `\n🎉 ALL ${ok} TESTS PASSED`);
process.exit(bad ? 1 : 0);
