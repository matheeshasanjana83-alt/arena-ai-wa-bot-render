/**
 * test_v309.js — v3.06.3 🎬 VIDEO BANNER (RELEASED) → v3.06.4 🖼 PHOTO DECK (current reality)
 * User directive 2026-11-12: "මේ png එක වෙනුවට මන් දාපු png ටික මිනිත්තු 1 එකකට මරු වෙන්න හදන්න
 * bot ට — දැන් තියෙන එක අයින් කරලා" + "kaviz v1 එක හැම එකකම තියෙන එක ＢＡＴＩＳＴＡ ＭＤ කියලා වෙනස් කරන්න
 * හැම name එකක්ම"
 * User directive 2026-11-13 (v3.06.4): "Video එකක් නෙමෙ බන් — .menu ගැහුවාම මන් දාපු photo වලින්
 * එකක් වැටෙනවා, ආයෙත් ගැහුවාම ඊලග photo එක වැටෙනවා" → video banner OUT, photo DECK IN.
 *
 *  (1) banner.mp4 REMOVED repo-wide (tree + manifest.files, in removed list) — deck replaces it
 *  (2) banner.jpg still gone everywhere (v3.06.3 cleanup holds)
 *  (3) bot.js menuMedia(): LOGO (.setlogo) > deck photo (sequential rotation) > null — 4 send sites
 *      (menu / setting / mode / alive); boot rmSync self-cleans BOTH stale banners
 *  (4) manifest: version 3.06.4, files += media/menu/01-08.jpg + tests/test_v3010.js,
 *      removed += banner.mp4
 *  (5) FULL REBRAND (v3.06.3, still holds): ZERO /kaviz/i anywhere in runtime src
 *  (6) old suites: version pins moved to 3.06.4
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

// ── (1) banner.mp4 removed everywhere (v3.06.4: photo deck replaces the video) ──
t('banner.mp4 gone from repo tree', !fs.existsSync(path.join(REPO, 'banner.mp4')));
t('banner.mp4 NOT in manifest.files', !man.files.includes('banner.mp4'));
t('manifest.removed += banner.mp4 (every bot deletes stale video on update)', Array.isArray(man.removed) && man.removed.includes('banner.mp4'));

// ── (1b) media/menu photo deck shipped ──
const DECK = path.join(REPO, 'media', 'menu');
t('media/menu deck exists', fs.existsSync(DECK));
const deckFiles = fs.readdirSync(DECK).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).sort();
t(`deck has exactly the 8 shipped renders 01-08.jpg — found ${deckFiles.length}`, deckFiles.join(',') === ['01', '02', '03', '04', '05', '06', '07', '08'].map((n) => `${n}.jpg`).join(','));
let deckMB = 0, allJpeg = true;
for (const f of deckFiles) {
    const b = fs.readFileSync(path.join(DECK, f));
    deckMB += b.length / 1048576;
    if (!(b.length > 12 && b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF)) allJpeg = false;   // JPEG magic
}
t('all deck files are real JPEGs (FFD8 magic)', allJpeg);
t(`deck total ${deckMB.toFixed(2)}MB — repo-friendly (<4MB)`, deckMB > 0.5 && deckMB < 4);

// ── (2) banner.jpg still deleted everywhere ──
t('banner.jpg gone from repo tree', !fs.existsSync(path.join(REPO, 'banner.jpg')));
t('banner.jpg NOT in manifest.files', !man.files.includes('banner.jpg'));
t('banner.jpg referenced in bot.js ONLY by the boot-clean rmSync', (BOT.match(/banner\.jpg/g) || []).length === 1);

// ── (3) bot.js deck wiring (menuMedia: LOGO > deck rotation > null) ──
t('MENU_DIR const → media/menu', BOT.includes("path.join(__dirname, 'media', 'menu')"));
t('MENU_IDX rotation memory → media/menu-idx.json', BOT.includes("path.join(__dirname, 'media', 'menu-idx.json')"));
t('menuMedia() helper defined', /function menuMedia\(\)/.test(BOT));
t('deckList() helper defined', /const deckList = \(\) =>/.test(BOT));
t('menuMedia serves image from deck', BOT.includes('image: fs.readFileSync(path.join(MENU_DIR, f))'));
t('rotation state written after each card send', BOT.includes("JSON.stringify({ i: (i + 1) % files.length"));
t('LOGO (.setlogo) checked before deck', BOT.indexOf('fs.existsSync(LOGO)') < BOT.indexOf('const files = deckList()'));
t('boot rmSync self-cleans stale banner.mp4', /rmSync\(path\.join\(__dirname, 'banner\.mp4'\)/.test(BOT));
t('old banner.jpg boot-clean still present', /rmSync\(path\.join\(__dirname, 'banner\.jpg'\)/.test(BOT));
t('no BANNER_VID video payload left', !BOT.includes("video: fs.readFileSync(BANNER_VID)") && !BOT.includes('mimetype: \'video/mp4\''));
const sites = (BOT.match(/const bm = menuMedia\(\);/g) || []).length;
t(`4 send sites route through menuMedia() (menu/setting/alive/mode) — found ${sites}`, sites === 4);
t('old banner.jpg boot-clean + helper before first send site', BOT.indexOf('rmSync') < BOT.indexOf('menuCaption(msg.pushName)'));

// ── (4) manifest v3.06.4 photo-deck pins moved to v3.06.6 (moviedex fix) ──
t('manifest version 3.06.6', man.version === '3.06.6');
t('pkg version 3.06.6', pkg.version === '3.06.6');
t('manifest.files += media/menu/01.jpg..08.jpg', [...Array(8)].every((_, i) => man.files.includes(`media/menu/0${i + 1}.jpg`)));
t('manifest.files += tests/test_v3010.js', man.files.includes('tests/test_v3010.js'));
t('manifest.files += tests/test_v3011.js (v3.06.6 moviedex fix)', man.files.includes('tests/test_v3011.js'));
t('manifest.files += tests/test_v309.js', man.files.includes('tests/test_v309.js'));
t('manifest.notes opens with v3.06.6 moviedex-fix entry', typeof man.notes === 'string' && man.notes.startsWith('v3.06.6:'));
t('.gitignore ignores media/menu-idx.json (rotation memory is runtime-only)', fs.readFileSync(path.join(REPO, '.gitignore'), 'utf8').includes('media/menu-idx.json'));

// ── (5) FULL REBRAND — zero KAVIZ in runtime src (v3.06.3, still holds) ──
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

// ── (6) old suites: pins moved to 3.06.5 ──
const pinned = ['test_v306.js', 'test_v289.js', 'test_v300.js', 'test_v308.js'];
for (const f of pinned) {
    const p = path.join(REPO, 'tests', f);
    if (fs.existsSync(p)) {
        const src = fs.readFileSync(p, 'utf8');
        t(`${f} pins 3.06.6`, src.includes('3.06.6') && !src.includes('3.06.4') && !src.includes('3.06.3'));
    }
}
t('no suite still pins 3.06.3/3.06.4 (tests dir, self + runners excluded)', fs.readdirSync(path.join(REPO, 'tests'))
    .filter((f) => f.endsWith('.js') && f !== 'test_v309.js')
    .every((f) => { const s = fs.readFileSync(path.join(REPO, 'tests', f), 'utf8'); return !s.includes("'3.06.3'") && !s.includes("'3.06.4'"); }));

console.log(bad ? `\n⚠️ ${ok} passed, ${bad} failed` : `\n🎉 ALL ${ok} TESTS PASSED`);
process.exit(bad ? 1 : 0);
