/**
 * ui.js — ＢＡＴＩＳＴＡ ＭＤ v3.08 PREMIUM UI ENGINE
 * WhatsApp native interactive cards (Baileys 7 — the newest WA API):
 *   • single_select  → tap-to-pick native list (menu categories, movie quality, search results)
 *   • cta_url        → one-tap link buttons (stream / source page)
 * Everything goes through the bot's normal send wrapper (pace + out-guard + self-dedupe).
 *
 * Fail-safe by design: every builder returns `null` when the environment can't do
 * interactive cards (old baileys, media upload fail, bad JSON) — callers fall back to
 * the classic text/photo card, so a broken button can NEVER break a flow.
 *
 * User taps arrive as `interactiveResponseMessage` → parseTap() unwraps the command
 * id we baked into the button (".menu 2", ".moviedex 3 2"…) and bot.js routes it like
 * a normal command — zero duplicate flow logic.
 */
const { BRAND } = require('./style');

let B = null;   // baileys cache
async function cap() { try { B ||= await import('baileys'); return B; } catch { return null; } }

/** thin premium divider */
const DIV2 = '⌯ ━━━━━━━━━━━━━ ⌯';

/** pure: interactive tap → baked command id (null when not ours / not parseable) */
function parseTap(message) {
    const pj = message?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson;
    if (!pj) return null;
    try {
        const p = JSON.parse(pj);
        const id = String(p.id || '').trim();
        return id.startsWith('.') ? id.slice(0, 300) : null;
    } catch { return null; }
}

/** pure: rows → sections of ≤10 (WhatsApp native list limit) */
function sectionsOf(rows, sectionTitle) {
    const clean = (s, n) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);
    const rows10 = [];
    for (const r of (rows || [])) {
        const title = clean(r.title, 24);
        if (!title) continue;
        rows10.push({ title, description: clean(r.desc, 72) || undefined, rowId: clean(r.id, 256) });
    }
    const sections = [];
    for (let i = 0; i < rows10.length; i += 10) {
        sections.push({ title: clean(sectionTitle, 24) + (i ? ` · ${i + 1}–${Math.min(i + 10, rows10.length)}` : ''), rows: rows10.slice(i, i + 10) });
    }
    return sections;
}

/** pure: cta button json (used by both builder + tests) */
function ctaJson(text, url) {
    const u = String(url || '').trim();
    if (!/^https?:\/\//i.test(u)) return null;
    return { display_text: String(text || 'Open').slice(0, 48), url: u, merchant_url: u };
}

/**
 * build the full send() content for a native interactive card.
 *   title    — header title (no image) · image — buffer for the media header
 *   text     — body (WhatsApp formatting allowed)
 *   footer   — small gray footer (BRAND by default)
 *   buttons  — { sections: [{title, desc, id}] } → single_select · { ctaUrl: {text, url} } → cta_url
 * returns a content object for sock.sendMessage, or null → caller falls back to classic card.
 */
async function interactiveContent({ jid, upload, image, title, text, footer, sections, ctaUrl, selectTitle }) {
    const b = await cap();
    const IM = b?.proto?.Message?.InteractiveMessage;
    if (!IM) return null;
    const buttons = [];
    const secs = Array.isArray(sections) ? sections.filter((s) => s?.rows?.length).slice(0, 10) : [];
    if (secs.length) {
        buttons.push({ name: 'single_select', buttonParamsJson: JSON.stringify({ title: String(selectTitle || 'Select').slice(0, 48), sections: secs }) });
    }
    const cta = ctaUrl ? ctaJson(ctaUrl.text, ctaUrl.url) : null;
    if (cta) buttons.push({ name: 'cta_url', buttonParamsJson: JSON.stringify(cta) });
    if (!buttons.length) return null;
    try {
        let header;
        if (image) {
            const prep = await b.prepareWAMessageMedia({ image }, { upload, timeoutMs: 12000 });
            if (!prep?.imageMessage) throw new Error('media prep fail');
            header = IM.Header.fromObject({ hasMediaAttachment: true, imageMessage: prep.imageMessage });
        } else {
            header = IM.Header.fromObject({ hasMediaAttachment: false, title: String(title || BRAND).slice(0, 60), subtitle: String(title || BRAND).slice(0, 60) });
        }
        const bodyText = String(text || '').slice(0, 1024) || ' ';
        return {
            viewOnceMessage: {
                message: {
                    messageContextInfo: { deviceListMetadataVersion: 2, deviceListMetadata: {} },
                    interactiveMessage: IM.fromObject({
                        header,
                        body: IM.Body.fromObject({ text: bodyText }),
                        footer: IM.Footer.fromObject({ text: String(footer || '> ⚡ ' + BRAND).slice(0, 100) }),
                        nativeFlowMessage: IM.NativeFlowMessage.fromObject({ buttons }),
                    }),
                },
            },
        };
    } catch { return null; }
}

module.exports = { parseTap, sectionsOf, ctaJson, interactiveContent, cap, DIV2, _reset: () => { B = null; } };
