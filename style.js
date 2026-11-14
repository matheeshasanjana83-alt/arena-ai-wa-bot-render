/**
 * style.js — ＢＡＴＩＳＴＡ  ＭＤ v2.22 message style (single source of truth)
 * Every caption / list / status that leaves the bot flows through here,
 * so the whole bot speaks with one hand-made voice — not a generated one.
 *
 *   ⏳ react while working  →  ✅ / ❌ when done   (bot.js HEAVY commands)
 *   progress bubbles self-delete when finished — no "✅ done" residue
 *   captions = one title line + a gray blockquote footer, nothing more
 */
const BRAND = 'ＢＡＴＩＳＴＡ  ＭＤ';

/** gray blockquote footer — extra is a short note (size, days, warning…) */
const foot = (extra) => `> ⚡ ${BRAND}${extra ? '  ·  ' + extra : ''}`;

/** download progress bar */
const bar = (pct, n = 12) => {
    const on = Math.max(0, Math.min(n, Math.round((pct || 0) / 100 * n)));
    return '▰'.repeat(on) + '▱'.repeat(n - on);
};

/** safe text cut */
const cut = (s, n) => String(s || '').trim().slice(0, n);

/** one-line usage hint */
const use = (line, example) => `${line}${example ? '\n   ' + example : ''}`;

/* ── v3.08 premium kit ─────────────────────────────────────────────
 * thin divider + small-caps labels + info chips — one shared visual
 * language for every card the bot speaks (menu, panels, movie, AI). */
const THIN = '⌯ ━━━━━━━━━━━━━ ⌯';

/* ── v3.09 PREMIUM FRAME KIT ───────────────────────────────────────
 * හැම card එකකම (menu / setting / mode / alive / version / category)
 * එකම premium frame language — wide brand rules + chip rows +
 * numbered ▸ rows + framed closer. WhatsApp proportional font එකේ
 * alignment කඩන්නෙ නැති විදිහට rules own-line, chips left-aligned. */
const RULE = '⌯ ━━━━━━━━━━━━━━━━━━━━━ ⌯';

/** brand/panel header block — RULE / centered title (or full-width BRAND) / RULE */
const head = (title) => [
    RULE,
    title ? `   ${sm(String(title).toUpperCase())}` : `      ${BRAND}`,
    RULE,
].join('\n');

/** info chip — `▢ ʟᴀʙᴇʟ ▸ ᴠᴀʟᴜᴇ` */
const chip = (label, value) => `▢ ${sm(String(label || '').toUpperCase())} ▸ ${value}`;

/** zero-padded menu row — `01 ▸ ᴛᴇxᴛ` */
const row = (n, text) => `${String(n).padStart(2, '0')} ▸ ${text}`;

/** framed bottom closer — `╰─〈 ʙᴀᴛɪꜱᴛᴀ ᴍᴅ 〉────╯` */
const close = (pad = 8) => `╰─〈 ʙᴀᴛɪꜱᴛᴀ ᴍᴅ 〉${'─'.repeat(Math.max(2, pad))}╯`;

const SC = { A: 'ᴀ', B: 'ʙ', C: 'ᴄ', D: 'ᴅ', E: 'ᴇ', F: 'ꜰ', G: 'ɢ', H: 'ʜ', I: 'ɪ', J: 'ᴊ', K: 'ᴋ', L: 'ʟ', M: 'ᴍ', N: 'ɴ', O: 'ᴏ', P: 'ᴘ', Q: 'ǫ', R: 'ʀ', S: 's', T: 'ᴛ', U: 'ᴜ', V: 'ᴠ', W: 'ᴡ', X: 'x', Y: 'ʏ', Z: 'ᴢ' };
const sm = (s) => String(s || '').replace(/[A-Z]/g, (c) => SC[c] || c);

/** premium section header — ╭─〈 ᴛɪᴛʟᴇ 〉─╮ */
const sect = (title) => `╭─〈 ${sm(String(title || '').toUpperCase())} 〉─╮`;

module.exports = { BRAND, foot, bar, cut, use, THIN, sm, sect, RULE, head, chip, row, close };
