/**
 * test_v3010.js — v3.06.4 🖼 PHOTO DECK: ".menu ගැහුවාම මන් දාපු photo වලින් එකක් වැටෙනවා,
 * ආයෙත් ගැහුවාම ඊලග photo එක වැටෙනවා" (user directive 2026-11-13 — NOT a video!)
 *
 *  (1) LIVE rotation: _deckReset() → menuMedia() ×8 gives deck files 01→08 in order, 9th wraps to 01
 *  (2) rotation memory: media/menu-idx.json persists — survives restarts (gitignored, runtime-only)
 *  (3) LOGO (.setlogo) beats the deck; empty deck + no LOGO → null (text-only card)
 *  (4) commands: .addmenu / .delmenu / .deck wired in dispatch + OWNER_CMDS (owner-only)
 *  (5) deck add/delete helpers + deckStatus listing (with ⬅️ ඊළඟ marker)
 *  (6) deck files survive updates: shipped via manifest.files, runtime adds untouched by updater
 *  (7) version pins 3.06.4 (pkg + lock + manifest), notes opens v3.06.4
 */
const fs = require('fs');
const path = require('path');

const REPO = path.join(__dirname, '..');
const DECK = path.join(REPO, 'media', 'menu');
const IDX = path.join(REPO, 'media', 'menu-idx.json');
const BOT = fs.readFileSync(path.join(REPO, 'bot.js'), 'utf8');
const MAN = JSON.parse(fs.readFileSync(path.join(REPO, 'manifest.json'), 'utf8'));
const PKG = JSON.parse(fs.readFileSync(path.join(REPO, 'package.json'), 'utf8'));
const LOCK = JSON.parse(fs.readFileSync(path.join(REPO, 'package-lock.json'), 'utf8'));

let ok = 0, bad = 0;
const t = (name, cond) => { if (cond) { ok++; console.log('  ✅ ' + name); } else { bad++; console.log('  ❌ ' + name); } };

const bot = require(path.join(REPO, 'bot.js'));   // pairsite listens → we process.exit() below
const deckFiles = () => fs.readdirSync(DECK).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).sort();

// ── (1) LIVE sequential rotation 01→08 + wrap ──
const LOGO = path.join(REPO, 'logo.img');
const hadLogo = fs.existsSync(LOGO) ? fs.readFileSync(LOGO) : null;
fs.rmSync(LOGO, { force: true });
const hadIdx = fs.existsSync(IDX) ? fs.readFileSync(IDX, 'utf8') : null;
bot._deckReset();
const files = deckFiles();
t('deck ships 8 renders', files.length === 8);
const seq = [];
for (let i = 0; i < 9; i++) {
    const m = bot._menuMedia();
    if (!m || !m.image) break;
    seq.push(files.findIndex((f) => m.image.equals(fs.readFileSync(path.join(DECK, f)))));
}
t(`rotation is sequential 0→7 (01.jpg → 08.jpg): ${seq.slice(0, 8).join(',')}`, seq.slice(0, 8).every((v, i) => v === i));
t('9th call wraps back to 01.jpg', seq[8] === 0);

// ── (2) rotation memory persists ──
let st = {}; try { st = JSON.parse(fs.readFileSync(IDX, 'utf8')); } catch { }
t('menu-idx.json written after rotation (i=1 after 9 calls → next is 02)', st.i === 1 && st.n === 8);
bot._deckReset(); t('_deckReset clears state', !fs.existsSync(IDX));

// ── (3) LOGO > deck > null ──
fs.writeFileSync(LOGO, Buffer.alloc(3000, 9));
const lm = bot._menuMedia();
t('LOGO (.setlogo) wins over deck', lm && lm.image.equals(fs.readFileSync(LOGO)));
fs.rmSync(LOGO, { force: true });
const d1 = bot._menuMedia();
t('deck serves again after logo removed', d1 && d1.image && d1.image.length > 1000);
const bak = DECK + '.bak';
fs.renameSync(DECK, bak);
bot._deckReset();
t('empty deck + no LOGO → null (text-only card)', bot._menuMedia() === null);
fs.renameSync(bak, DECK);
bot._deckReset();

// ── (4) commands wired + owner-only ──
t('.addmenu in dispatch', /c === '\.addmenu'/.test(BOT));
t('.delmenu in dispatch', /c === '\.delmenu'/.test(BOT));
t('.deck + .menudeck in dispatch', /c === '\.deck' \|\| c === '\.menudeck'/.test(BOT));
['.addmenu', '.delmenu', '.deck', '.menudeck'].forEach((c) => t(`OWNER_CMDS includes ${c}`, bot.OWNER_CMDS.has(c)));
t('.addmenu in HELP text', /· \*\.setlogo\* · \*\.addmenu\* ·/.test(BOT));
t('.addmenu in Settings category', BOT.includes('✦ *.addmenu* — 🖼 photo deck add'));

// ── (5) handlers + status marker ──
t('handleAddMenu defined (caption or reply → deck)', /async function handleAddMenu\(/.test(BOT) && BOT.includes('user-${Date.now()}.'));
t('handleDelMenu defined (number → remove + idx reset)', /function handleDelMenu\(/.test(BOT) && /rmSync\(MENU_IDX, \{ force: true \}\)/.test(BOT));
t('deckStatus shows ⬅️ ඊළඟ marker', BOT.includes("'  ⬅️ ඊළඟ'"));
t('addmenu size guard (10MB) + empty guard', BOT.includes('photo එක 10 MB ට වඩා ලොකුයි') && BOT.includes("buf.length < 1000) throw new Error('photo එක හිස්')"));

// ── (6) deck survives updates ──
t('manifest.files += 01-08.jpg (update installs deck)', [...Array(8)].every((_, i) => MAN.files.includes(`media/menu/0${i + 1}.jpg`)));
t('runtime user-*.jpg NOT in manifest.files (updater never deletes them)', !MAN.files.some((f) => f.startsWith('media/menu/user-')));
t('.gitignore: menu-idx.json runtime-only', fs.readFileSync(path.join(REPO, '.gitignore'), 'utf8').includes('media/menu-idx.json'));

// ── (7) pins ──
t('pkg 3.07.0', PKG.version === '3.07.0');
t('lock 3.07.0', LOCK.version === '3.07.0');
t('manifest 3.07.0', MAN.version === '3.07.0');
t('notes opens v3.07.0', typeof MAN.notes === 'string' && MAN.notes.startsWith('v3.07.0:'));

// restore
if (hadLogo) fs.writeFileSync(LOGO, hadLogo);
if (hadIdx) fs.writeFileSync(IDX, hadIdx); else try { fs.rmSync(IDX, { force: true }); } catch { }

console.log(bad ? `\n⚠️ ${ok} passed, ${bad} failed` : `\n🎉 ALL ${ok} TESTS PASSED`);
process.exit(bad ? 1 : 0);
