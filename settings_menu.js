/**
 * settings_menu.js — ⚙️ v3.12.0 extended settings features (user's 12-item settings menu)
 * Store: settings.json `sm` field (settings.json = PROTECTED — survives updates, keys safe).
 * attach(sock, deps) wires:
 *   📵 anti-call (reject + notice)        · 👋 welcome/goodbye (per group)
 *   🔗 anti-link (groups, non-admins)     · 🤬 anti-bad (groups, non-admins) + ⚠️ warn → kick
 *   🗑️ anti-delete (text restore)        · ⌨️ auto-typing / 🎙️ auto-recording presence
 *   ⌨️ custom prefix dispatch ('!' etc. → real command dispatch)
 * Panel numbers 11-23 handled by applyPanel() (bot.js applySetting default → here).
 * Per-chat toggles ("this chat"/"this group") live in sm.chats[jid].
 */
'use strict';
const fs = require('fs');
const path = require('path');
const guard = require('./guard');   // 🛠️ work-type cycle (chatMode/setChatMode)

const SET = path.join(__dirname, 'settings.json');
const DEPS = { sock: null, dispatch: null, send: null, log: () => { }, ME: {} };
const adminCache = new Map();        // group jid → { admins:Set, t }
const recentTexts = new Map();       // chat jid → [{ id, sender, text, t }]
const presenceLast = new Map();      // chat jid → last presence t
const seenEvents = new Map();        // dedupe key → t (welcome/goodbye double-fire guard)

const PREFIXES = ['', '!', '#', '+', '~'];
const WARN_STEPS = [3, 4, 5, 0];
const BADWORDS = ['hutto', 'hukanna', 'huknna', 'pako', 'pakaya', 'gesseka', 'gepaththa', 'umb ', 'ammopakaya', 'fuck', 'bitch', 'asshole', 'dickhead', 'motherfucker', 'wanker', 'cunt', 'shitface', 'kari ', 'duwa ', 'punnai'];
const BAD_RX = new RegExp('(^|[^a-z])(' + BADWORDS.map((w) => w.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')([^a-z]|$)', 'i');
const LINK_RX = /(?:chat\.whatsapp\.com\/(?:invite\/)?[\w-]{10,})|(?:wa\.me\/\d{7,15})|(?:t\.me\/\+?[\w]{4,})/i;

// ── settings.json store (never touches other fields) ─────────
function readAll() { try { return JSON.parse(fs.readFileSync(SET, 'utf8')); } catch { return {}; } }
function writeAll(d) { try { fs.writeFileSync(SET, JSON.stringify(d, null, 2)); } catch { } }
function getSm() {
    const d = readAll();
    const s = (d.sm && typeof d.sm === 'object') ? d.sm : {};
    s.chats = (s.chats && typeof s.chats === 'object') ? s.chats : {};
    s.warns = (s.warns && typeof s.warns === 'object') ? s.warns : {};
    return s;
}
const saveSm = (s) => { const d = readAll(); d.sm = s; writeAll(d); };
function chatSm(jid) {
    const s = getSm();
    s.chats[jid] = (s.chats[jid] && typeof s.chats[jid] === 'object') ? s.chats[jid] : {};
    return { s, c: s.chats[jid] };
}
const isGroup = (j) => String(j || '').endsWith('@g.us');

// ── bot.js integration getters ─────────
const prefix = () => String(getSm().prefix || '');
const isExtraOwner = (j) => {
    const on = String(getSm().ownerNumber || '').replace(/\D/g, '');
    if (!on || !j) return false;
    const b = String(j).split('@')[0].split(':')[0];
    return b === on || b.endsWith(on.slice(-9));
};
const chatAiOn = (jid) => { try { return getSm().chats[String(jid)]?.ai !== 'off'; } catch { return true; } };
const chatLabel = (jid, key) => {
    try {
        const v = getSm().chats[String(jid)]?.[key];
        if (key === 'ai') return v === 'off' ? 'OFF' : 'default';
        return (v === 'on' || v === true) ? 'ON' : 'OFF';
    } catch { return 'OFF'; }
};

// ── panel (numbers 11-23) — called from bot.js applySetting default ─────────
function applyPanel(n, jid) {
    const s = getSm();
    const cyc = (v, steps) => steps[(steps.indexOf(v) + 1) % steps.length] || steps[0];
    switch (n) {
        case 11: {   // 🛠️ work type mode — cycle public/private/inbox/groups
            const nxt = cyc(guard.chatMode(), ['public', 'private', 'inbox', 'groups']);
            guard.setChatMode(nxt);
            return `🛠️ Work Type: ${nxt.toUpperCase()}${nxt === 'public' ? ' — හැම chat එකකම commands' : nxt === 'private' ? ' — Message yourself විතරයි' : nxt === 'inbox' ? ' — inbox (DM) වල විතරයි' : ' — groups වල විතරයි'}`;
        }
        case 12: {   // ⌨️ command prefix — dot + extra prefix ('!' etc.)
            const nxt = cyc(String(s.prefix || ''), PREFIXES);
            s.prefix = nxt; saveSm(s);
            return `⌨️ Prefix: ${nxt ? `*.* සහ *${nxt}* දෙකම` : '*.* (default)'}`;
        }
        case 14: { s.antiCall = !s.antiCall; saveSm(s); return `📞 Anti Call: ${s.antiCall ? 'ON — calls reject කරනවා' : 'OFF'}`; }
        case 15: {   // 🤖 AI chat (this chat)
            const cs = chatSm(jid);
            cs.c.ai = cs.c.ai === 'off' ? undefined : 'off';
            saveSm(cs.s);
            return `🤖 AI Chat (this chat): ${cs.c.ai === 'off' ? 'OFF — මේ chat එකේ auto-reply නෑ' : 'default rules'}`;
        }
        case 16: { const cs = chatSm(jid); cs.c.antiLink = !cs.c.antiLink; saveSm(cs.s); return `🔗 Anti Link (this group): ${cs.c.antiLink ? 'ON — invite links delete + warn' : 'OFF'}`; }
        case 17: { const cs = chatSm(jid); cs.c.antiBad = !cs.c.antiBad; saveSm(cs.s); return `🤬 Anti Bad (this group): ${cs.c.antiBad ? 'ON — bad words delete + warn' : 'OFF'}`; }
        case 18: {   // ⚠️ warn limit cycle 3→4→5→off
            const nxt = cyc(Number(s.warnLimit ?? 3), WARN_STEPS);
            s.warnLimit = nxt; saveSm(s);
            return `⚠️ Warn Limit: ${nxt || 'OFF'}${nxt ? ` — ${nxt} warnings → kick` : ''}`;
        }
        case 19: { s.autoTyping = !s.autoTyping; saveSm(s); return `⌨️ Auto Typing: ${s.autoTyping ? 'ON' : 'OFF'}`; }
        case 20: { s.autoRecording = !s.autoRecording; saveSm(s); return `🎙️ Auto Recording: ${s.autoRecording ? 'ON' : 'OFF'}`; }
        case 21: { const cs = chatSm(jid); cs.c.welcome = cs.c.welcome === 'on' ? undefined : 'on'; saveSm(cs.s); return `👋 Welcome (this group): ${cs.c.welcome === 'on' ? 'ON' : 'OFF'}`; }
        case 22: { const cs = chatSm(jid); cs.c.goodbye = cs.c.goodbye === 'on' ? undefined : 'on'; saveSm(cs.s); return `👋 Goodbye (this group): ${cs.c.goodbye === 'on' ? 'ON' : 'OFF'}`; }
        case 23: { s.antiDelete = !s.antiDelete; saveSm(s); return `🗑️ Anti Delete: ${s.antiDelete ? 'ON — deleted text restore වෙනවා' : 'OFF'}`; }
        default: return null;
    }
}
const setOwner = (num) => {
    const s = getSm();
    s.ownerNumber = String(num || '').replace(/\D/g, '');
    saveSm(s);
    return s.ownerNumber ? `👑 Owner No: +${s.ownerNumber} — ඒ number එකෙන් ආපු messages වලටත් owner commands වැඩ` : '👑 Owner No cleared';
};

// ── helpers ─────────
async function adminsOf(jid) {
    const hit = adminCache.get(jid);
    if (hit && Date.now() - hit.t < 600e3) return hit.admins;
    try {
        const md = await DEPS.sock?.groupMetadata?.(jid);
        const admins = new Set((md?.participants || []).filter((p) => p.admin).map((p) => p.id));
        adminCache.set(jid, { admins, t: Date.now() });
        return admins;
    } catch { return new Set(); }
}
const dedupe = (k, ms = 4000) => {
    const now = Date.now(), t = seenEvents.get(k) || 0;
    seenEvents.set(k, now);
    if (seenEvents.size > 300) seenEvents.delete(seenEvents.keys().next().value);
    return now - t < ms;
};
const rememberText = (jid, id, sender, text) => {
    let arr = recentTexts.get(jid) || [];
    arr.push({ id, sender, text, t: Date.now() });
    while (arr.length > 200) arr.shift();
    recentTexts.set(jid, arr);
};
const findText = (jid, id) => (recentTexts.get(jid) || []).find((m) => m.id === id);
const warnOf = (s, jid, sender) => s.warns[jid + ':' + sender] || 0;
async function strike(s, jid, sender, reason, key) {
    const n = warnOf(s, jid, sender) + 1;
    s.warns[jid + ':' + sender] = n;
    const lim = Number(s.warnLimit || 3);
    saveSm(s);
    try {
        await DEPS.send(jid, { text: `⚠️ @${String(sender).split('@')[0]} — ${reason} (warn ${n}${lim ? '/' + lim : ''})`, mentions: [sender] }, { quoted: key });
    } catch { }
    if (lim && n >= lim) {
        try { await DEPS.sock.groupParticipantsUpdate(jid, [sender], 'remove'); } catch { }
        s.warns[jid + ':' + sender] = 0; saveSm(s);
        try { await DEPS.send(jid, { text: `🚪 @${String(sender).split('@')[0]} — warn limit ${lim} ඉක්මව්වා → group එකෙන් අයින් කළා`, mentions: [sender] }); } catch { }
    }
}

// ── event wiring ─────────
function attach(sock, deps) {
    Object.assign(DEPS, { sock, ...deps });
    const log = DEPS.log;

    // 📵 anti-call — reject + polite notice
    sock.ev.on('call', async (calls) => {
        try {
            const s = getSm();
            for (const c of calls || []) {
                if (!s.antiCall || !c?.from) continue;
                try { await sock.rejectCall(c.id, c.from); } catch { }
                if (!dedupe('call:' + c.from, 15000)) {
                    try { await DEPS.send(c.from, { text: '📵 Anti Call ON — මට calls දෙන්න එපා යාලුවෙන්. Message එකක් දාන්න 🤖' }); } catch { }
                }
                log('📵 anti-call rejected → ' + String(c.from).slice(0, 24));
            }
        } catch { }
    });

    // 👋 welcome / goodbye (per group toggles)
    sock.ev.on('group-participants.update', async (u) => {
        try {
            const jid = u?.id, act = String(u?.action || '');
            if (!jid || !isGroup(jid)) return;
            const s = getSm(), c = (s.chats[jid] || {});
            const add = act === 'add', leave = act === 'remove' || act === 'leave';
            if (!add && !leave) return;
            if ((add && c.welcome !== 'on') || (leave && c.goodbye !== 'on')) return;
            for (const p of u.participants || []) {
                if (dedupe(jid + act + p)) continue;
                let gname = '';
                try { gname = (await sock.groupMetadata(jid))?.subject || ''; } catch { }
                const who = '@' + String(p).split('@')[0];
                const text = add
                    ? `👋 *Welcome ${gname} group එකට!*\n\n${who} — එන්න එපා කියලා කවුරුත් කිව්වේ නෑ 😎\n> rules: spam කරන්න එපා, පිළිවෙලට ඉන්න — enjoy! 🎉`
                    : `👋 *Goodbye!*\n\n${who} group එකෙන් අයින් වුණා.\n> යන ගමන් ඉහන් වෙන්න — ආයෙත් එන්න! 🍃`;
                try { await sock.sendMessage(jid, { text, mentions: [p] }); } catch { }
            }
        } catch { }
    });

    // 🧯 per-message features — own listener (independent of bot.js flow)
    sock.ev.on('messages.upsert', async (u) => {
        try {
            if (u?.type !== 'notify') return;
            const s = getSm();
            for (const msg of u.messages || []) {
                const key = msg.key, jid = key?.remoteJid;
                if (!jid || jid === 'status@broadcast') continue;
                const own = msg.message?.protocolMessage ? msg.message : (msg.message?.ephemeralMessage?.message || msg.message?.viewOnceMessageV2?.message || msg.message);
                const pm = own?.protocolMessage;

                if (pm && pm.type === 0) {   // 🗑️ REVOKE → anti-delete restore
                    if (!s.antiDelete || !findText(jid, pm.key?.id)) continue;
                    const hit = findText(jid, pm.key.id);
                    if (String(hit.sender) === String(DEPS.ME?.pn || '').split('@')[0]) continue;
                    if (dedupe('del:' + pm.key.id, 10000)) continue;
                    try { await DEPS.send(jid, { text: `🗑️ *Anti Delete*\n@${String(hit.sender).split('@')[0]} කවුරුහරි මෙක delete කළා:\n\n"${String(hit.text).slice(0, 500)}"`, mentions: [hit.sender] }); } catch { }
                    continue;
                }

                const text = String(own?.conversation || own?.extendedTextMessage?.text || '').slice(0, 4000);
                if (text && !key.fromMe) rememberText(jid, key.id, key.participant || key.remoteJid, text);

                if (key.fromMe) continue;   // moderation + presence = outside messages only

                // ⌨️ / 🎙️ presence (throttled)
                if ((s.autoTyping || s.autoRecording) && !presenceThrottled(jid)) {
                    const st = s.autoRecording ? 'recording' : 'composing';
                    try { await sock.sendPresenceUpdate(st, jid); } catch { }
                    setTimeout(() => { try { sock.sendPresenceUpdate('paused', jid); } catch { } }, 3500);
                }

                if (!isGroup(jid) || !text) continue;
                const { c } = chatSm(jid);
                if (!c.antiLink && !c.antiBad) continue;
                const sender = key.participant || key.remoteJid;
                const admins = await adminsOf(jid);
                if (admins.has(sender) || admins.has(DEPS.ME?.lid)) continue;   // admins + bot immune
                if (c.antiLink && LINK_RX.test(text)) { await removeMsg(jid, key); await strike(s, jid, sender, '🔗 group link දාන්න එපා (anti-link)', key); continue; }
                if (c.antiBad && BAD_RX.test(text)) { await removeMsg(jid, key); await strike(s, jid, sender, '🤬 කතා කරන විදිහ හරි නෑ (anti-bad)', key); }
            }
        } catch (e) { DEPS.log?.('⚙️ settings_menu listener: ' + e.message); }
    });
    log?.('⚙️ settings_menu attached (v3.12 features)');
}
function presenceThrottled(jid) {
    const now = Date.now(), t = presenceLast.get(jid) || 0;
    if (now - t < 3000) return true;
    presenceLast.set(jid, now);
    return false;
}
async function removeMsg(jid, key) {
    try { await DEPS.sock.sendMessage(jid, { delete: key }); } catch (e) {
        if (!removeMsg.warned) { removeMsg.warned = true; DEPS.log?.('⚙️ anti-link/bad delete needs bot admin: ' + e.message); }
    }
}

module.exports = { attach, prefix, isExtraOwner, chatAiOn, chatLabel, applyPanel, setOwner, _io: { getSm, saveSm, BAD_RX, LINK_RX, rememberText, findText, presenceThrottled } };
