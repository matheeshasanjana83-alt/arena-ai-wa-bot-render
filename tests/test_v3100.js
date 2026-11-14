/* test_v3100 — v3.10.0 🔘 BUTTON MENU + 🛡 ANTI-CRASHER PRO (sachi-anticrasher port):
 *
 * User: "Button menu එක හදන්න පුලුවන්ද bot ට · මේ bot ගේ තියෙන මගේ බොට් ගේ නැතු අලුත් function
 * command සෙරම ඇඩ් කරන්න එකක් නැර" (uploaded sachi-anticrasher-main.zip = AntiCrasher suite).
 * Batista's antibug.js detector was already the SUPER-SET — this release ports the missing
 * COMMAND SURFACE (sachi .ac suite) + the REAL button menu:
 *
 *   (1) ui.listContent — proto listMessage (listType 1, viewOnce wrapper) = classic WhatsApp
 *       button-list UI — a DIFFERENT message type from the v3.08 interactiveMessage/native_flow
 *       card that never rendered on the user's client
 *   (2) ui.parseTap — listResponseMessage.singleSelectReply.selectedRowId unwraps like a typed
 *       command; interactiveResponseMessage path untouched
 *   (3) ui.flowNodes({list:true}) — list is NOT native_flow → biz/interactive node skipped
 *       (private: bot node only; group: none)
 *   (4) bot.js tier chain — .menu/.setting/.mode: 🔘 button list → 🧊 interactive card → classic
 *       text/photo — never-silent (send wrapper relays listMessage + ackWait + fallback)
 *   (5) 🔘 .menubtn on|off toggle (settings.btn, default ON) + OWNER_CMDS
 *   (6) antibug sachi port — 🧪 dryrun on|off (detect-only), 📋 wl add|del|list (whitelist never
 *       flagged), 🚪 kick on|off (severe + group + bot admin → remove), 📊 stats (per-sender
 *       totals + top 5), ⚙️ thresholds (limits view), 🧪 check (quoted-message live analyze),
 *       📨 reports (history); guard(): whitelist skip → dry-run branch (no actions) → kick
 *   (7) status card + HELP + Security CATS mention the new sub-commands
 *   (8) version pins 3.10.0 (pkg + lock + manifest), notes opens v3.10.0, manifest.files += this suite
 */
process.env.ARENA_NO_DELAY = '1'; process.env.ARENA_NO_REACT = '1';
process.env.ARENA_RATE_MIN = '1000'; process.env.ARENA_RATE_HOUR = '10000';
process.env.DL_TMP = require('os').tmpdir();

const fs = require('fs');
const path = require('path');
const REPO = path.join(__dirname, '..');

let pass = 0, fail = 0;
const t = (name, cond) => { if (cond) { pass++; console.log('  ✅ ' + name); } else { fail++; console.log('  ❌ ' + name); } };

const SETF = path.join(REPO, 'settings.json');
const SET_BACK = fs.existsSync(SETF) ? fs.readFileSync(SETF, 'utf8') : null;
const STF = path.join(REPO, 'antibug_state.json');
const ST_BACK = fs.existsSync(STF) ? fs.readFileSync(STF, 'utf8') : null;

const ui = require(path.join(REPO, 'ui.js'));
const antibug = require(path.join(REPO, 'antibug.js'));

// fresh state for assertions (restored at the end)
try { fs.rmSync(STF, { force: true }); } catch { }
antibug._state.catches.length = 0; antibug._state.reportsLog.length = 0; antibug._state.senders = {};
antibug.setCfg({ wl: [], dryrun: false, kick: false });

(async () => {
    console.log('── (1) ui.listContent — REAL button list (proto listMessage) ──');
    const secs = [{ title: 'MENU', rows: [{ title: '01 · 📥 Download', description: 'files', rowId: '.menu 1' }, { title: '02 · 🤖 AI', description: 'chat', rowId: '.menu 10' }] }];
    const lc = ui.listContent({ title: 'ＢＡＴＩＳＴＡ  ＭＤ · MENU', text: 'hi boss', buttonText: '📂 CATEGORIES ⬇️', sections: secs });
    const lm = lc?.viewOnceMessage?.message?.listMessage;
    t('viewOnceMessage wrapper + listMessage body (send-wrapper detectable shape)', !!lc?.viewOnceMessage?.message && !!lm);
    t('listType 1 (SINGLE_SELECT) + sections passthrough', lm?.listType === 1 && Array.isArray(lm?.sections) && lm.sections.length === 1 && lm.sections[0].rows.length === 2);
    t('baked rowId survives (tap → command path)', lm?.sections?.[0]?.rows?.[0]?.rowId === '.menu 1');
    t('title/text/buttonText/footerText present', typeof lm?.title === 'string' && typeof lm?.text === 'string' && /CATEGORIES/.test(lm?.buttonText || '') && typeof lm?.footerText === 'string');
    t('caps enforced (title≤60 · text≤1024 · buttonText≤24)', ui.listContent({ title: 'x'.repeat(99), text: 'y'.repeat(5000), buttonText: 'z'.repeat(99), sections: secs }).viewOnceMessage.message.listMessage.title.length <= 60
        && ui.listContent({ title: 'x', text: 'y'.repeat(5000), sections: secs }).viewOnceMessage.message.listMessage.text.length <= 1024
        && ui.listContent({ title: 'x', buttonText: 'z'.repeat(99), sections: secs }).viewOnceMessage.message.listMessage.buttonText.length <= 24);
    t('null without usable sections (fail-safe → next tier)', ui.listContent({ sections: [] }) === null && ui.listContent({}) === null && ui.listContent({ sections: 'junk' }) === null);
    t('junk rows filtered, ≤10 sections cap', (() => { const c = ui.listContent({ sections: [{ title: 'A', rows: [{ title: '', rowId: 'x' }] }, { title: 'B', rows: [{ title: 'ok', rowId: '.ok' }] }, ...Array.from({ length: 12 }, (_, i) => ({ title: 'S' + i, rows: [{ title: 'r' + i, rowId: '.r' + i }] })) ] }); return c.viewOnceMessage.message.listMessage.sections.length === 10 && c.viewOnceMessage.message.listMessage.sections[0].rows.length === 1; })());

    console.log('── (2) parseTap — listResponseMessage (button tap) ──');
    t('list tap ".menu 2" → command id', ui.parseTap({ listResponseMessage: { singleSelectReply: { selectedRowId: '.menu 2' } } }) === '.menu 2');
    t('list tap junk/foreign id → null (route guard)', ui.parseTap({ listResponseMessage: { singleSelectReply: { selectedRowId: 'rm -rf' } } }) === null);
    t('no tap → null', ui.parseTap({ conversation: 'hi' }) === null && ui.parseTap(null) === null);
    t('v3.08 interactive tap STILL works (backward compat)', ui.parseTap({ interactiveResponseMessage: { nativeFlowResponseMessage: { paramsJson: JSON.stringify({ id: '.setting 3' }) } } }) === '.setting 3');

    console.log('── (3) flowNodes — list is NOT native_flow ──');
    const tags = (n) => n.map((x) => x.tag).join(',');
    t('list private → bot node only (no biz/interactive)', tags(ui.flowNodes('94771234567@s.whatsapp.net', { list: true })) === 'bot');
    t('list group → no nodes', ui.flowNodes('123-456@g.us', { list: true }).length === 0);
    t('interactive private → biz,bot (v3.08.1 mirror unchanged)', tags(ui.flowNodes('94771234567@s.whatsapp.net')) === 'biz,bot');
    t('interactive group → biz only', tags(ui.flowNodes('123-456@g.us')) === 'biz');

    console.log('── (4) bot.js tier chain — 🔘 button → 🧊 interactive → classic ──');
    const BOT = fs.readFileSync(path.join(REPO, 'bot.js'), 'utf8');
    t('send wrapper detects BOTH interactiveMessage AND listMessage', BOT.includes('const isList = !!(content?.viewOnceMessage?.message?.listMessage)') && BOT.includes('const isInt = !!(content?.viewOnceMessage?.message?.interactiveMessage)') && BOT.includes('if (isInt || isList)'));
    t('list relay uses flowNodes list-mode (no native_flow node)', BOT.includes('ui.flowNodes(jid, { list: isList })'));
    t('never-silent ack window on native cards (list + interactive)', /native card — server receipt නෑ \(8s\) → fallback/.test(BOT) && BOT.includes("throw new Error('native card not accepted — fallback')"));
    t('sendListPanel helper (btnOn gate + ui.listContent + classic-safe catch)', BOT.includes('async function sendListPanel(send, jid, msg,') && BOT.includes('if (!SOCK?.waUploadToServer || !btnOn()) return null;') && BOT.includes('ui.listContent({ title, text, footer: foot(), buttonText, sections })'));
    t('.menu TIER 1 button list before interactive card', BOT.indexOf("sendListPanel(send, jid, msg, {\n        title: `${BRAND} · MENU`") < BOT.indexOf('const sentInt = await sendInteractivePanel(send, jid, msg, {\n        title: `${BRAND} · MENU`') && BOT.includes("buttonText: '📂 CATEGORIES ⬇️'"));
    t('.setting TIER 1 button list (tap → .setting <n>)', BOT.includes("buttonText: '⚙️ OPTIONS ⬇️'") && BOT.includes("sections: ui.sectionsOf(rows, 'SETTINGS'),\n    });\n    if (sentList?.key?.id) { settingState.set"));
    t('.mode TIER 1 button list (tap → .mode <n>)', BOT.includes("buttonText: '🛡️ MODES ⬇️'") && BOT.includes("if (sentList?.key?.id) { modeState.set"));
    t('tier-1 menu vars declared BEFORE first send (TDZ guard: v/ram/catRows)', BOT.indexOf('const catRows = CATS.map') < BOT.indexOf("buttonText: '📂 CATEGORIES ⬇️'"));

    console.log('── (5) 🔘 .menubtn toggle ──');
    t('.menubtn command routed (on|off + status)', BOT.includes("if (c === '.menubtn')") && BOT.includes("d.btn = b2 === 'on'"));
    t('OWNER_CMDS += .menubtn (owner-only)', BOT.includes("'.forward', '.menubtn'])"));
    t('btnOn gate reads settings.btn (default ON)', BOT.includes("const btnOn = () => readSettings().btn !== false;"));
    t('HELP mentions .menubtn', /🛡️ \*\.antibug\* · \*\.block\* · \*\.unblock\* · \*\.blocklist\* · \*\.antispam\* · \*\.spamlog\* · \*\.menubtn\*/.test(BOT));
    t('Security CATS mentions button toggle', BOT.includes('🔘 *.menubtn on|off* — button menu toggle'));

    console.log('── (6) 🛡 antibug sachi port — dryrun ──');
    t('cfg().dryrun defaults OFF', antibug.cfg().dryrun === false);
    const drOn = await antibug.command('dryrun', 'on');
    t('.antibug dryrun on → cfg true + honest card', antibug.cfg().dryrun === true && /Dry-run ON/.test(drOn) && /test mode/.test(drOn));
    let delCalled = 0, blockCalled = 0, reportsSent = 0;
    const fakeSock = {
        chatModify: async () => { delCalled++; },
        sendMessage: async (j, c) => { if (c?.delete) delCalled++; if (c?.text) reportsSent++; return { key: { id: 'x' } }; },
        updateBlockStatus: async () => { blockCalled++; },
        groupMetadata: async () => ({ participants: [] }),
        groupParticipantsUpdate: async () => { },
        query: async () => { throw new Error('no'); },
    };
    const bugMsg = { key: { remoteJid: '94770123456@s.whatsapp.net', fromMe: false, id: 'DRY1' }, message: { conversation: '්ා'.repeat(600) }, messageTimestamp: Math.floor(Date.now() / 1000) };
    const r1 = await antibug.guard(bugMsg, { sock: fakeSock, me: { pn: '94770999999@s.whatsapp.net' }, send: async () => { reportsSent++; }, log: () => { } });
    t('dry-run: bug detected + handled (AI never touches it)', r1 === true);
    t('dry-run: NO delete-for-me / NO revoke / NO block', delCalled === 0 && blockCalled === 0);
    t('dry-run: catch recorded with 🧪 marker', antibug._state.catches[0]?.done === '🧪 dry-run — action නෑ');
    await antibug.command('dryrun', 'off');
    t('.antibug dryrun off → cfg false + actions restored', antibug.cfg().dryrun === false);

    console.log('── (6b) 📋 whitelist ──');
    t('wl add → cfg + confirm', /✅.*94771234567/.test(await antibug.command('wl', 'add', '94771234567')) && antibug.cfg().wl.includes('94771234567'));
    t('wl add junk → usage hint', /❌ number එකක් දෙන්න/.test(await antibug.command('wl', 'add', 'abc')));
    t('wl duplicate → warning', /දැනටමත්/.test(await antibug.command('wl', 'add', '94771234567')));
    const wlMsg = { key: { remoteJid: '94771234567@s.whatsapp.net', fromMe: false, id: 'WL1' }, message: { conversation: '්ා'.repeat(600) }, messageTimestamp: Math.floor(Date.now() / 1000) };
    t('whitelisted sender carrying a REAL bug → guard ignores (never flagged)', (await antibug.guard(wlMsg, { sock: fakeSock, me: { pn: '94770999999@s.whatsapp.net' }, send: async () => { }, log: () => { } })) === false && delCalled === 0);
    t('wl list card shows the number', /94771234567/.test(await antibug.command('wl', 'list')));
    t('wl del → removed', /🗑️/.test(await antibug.command('wl', 'del', '94771234567')) && !antibug.cfg().wl.includes('94771234567'));
    t('wl del missing → warning', /whitelist එකේ නෑ/.test(await antibug.command('wl', 'del', '94771234567')));

    console.log('── (6c) 🚪 kick on|off ──');
    const kickOn = await antibug.command('kick', 'on');
    t('.antibug kick on → cfg true + honest card', antibug.cfg().kick === true && /Kick ON/.test(kickOn));
    const kickSock = {
        ...fakeSock,
        groupMetadata: async () => ({ participants: [{ id: '94770999999@s.whatsapp.net', admin: 'admin' }] }),
        groupParticipantsUpdate: async (g, p, action) => { blockCalled += 100; return [p[0]]; },
    };
    const kickMsg = { key: { remoteJid: '120363-xyz@g.us', fromMe: false, participant: '94775555555@s.whatsapp.net', id: 'K1' }, message: { conversation: 'x' + '\u0000'.repeat(400) }, messageTimestamp: Math.floor(Date.now() / 1000) };
    const before = blockCalled;
    await antibug.guard(kickMsg, { sock: kickSock, me: { pn: '94770999999@s.whatsapp.net' }, send: async () => { }, log: () => { } });
    t('severe bug in group + bot admin + kick ON → groupParticipantsUpdate(remove)', blockCalled >= before + 100);
    await antibug.command('kick', 'off');
    const before2 = blockCalled;
    await antibug.guard({ ...kickMsg, key: { ...kickMsg.key, id: 'K2' } }, { sock: kickSock, me: { pn: '94770999999@s.whatsapp.net' }, send: async () => { }, log: () => { } });
    t('kick OFF → no kick call (delete path only)', blockCalled === before2);
    t('.antibug kick off card', /Kick OFF/.test(await antibug.command('kick', 'off')));

    console.log('── (6d) 📊 stats · ⚙️ thresholds · 🧪 check · 📨 reports ──');
    antibug._state.senders = {};   // isolate from guard() runs above (fresh totals)
    antibug.bumpSender('94771111111@s.whatsapp.net', true); antibug.bumpSender('94771111111@s.whatsapp.net', false); antibug.bumpSender('94772222222@s.whatsapp.net', false);
    const st = antibug.statsText();
    t('stats: totals + top sender ranking', /ANTI-BUG STATS/.test(st) && /×3/.test(st) && /94771111111/.test(st) && /severe ×1/.test(st));
    const th = antibug.thresholdsText();
    t('thresholds: limits view (text 12000 / mentions 256 / depth 14)', /THRESHOLDS/.test(th) && /text = 12000/.test(th) && /mentions = 256/.test(th) && /depth = 14/.test(th));
    const bugQuoted = { conversation: '්ා'.repeat(600) };
    const ck = antibug.checkText(bugQuoted);
    t('check: quoted bug → FLAGGED + reasons + action hint', /BUG CHECK/.test(ck) && /FLAGGED/.test(ck) && /සිංහල විරාම/.test(ck) && /wl add/.test(ck));
    t('check: clean message → CLEAN', /CLEAN/.test(antibug.checkText({ conversation: 'මම ගෙදර යනවා යාළුවෙන්' })));
    t('check: no quoted message → usage hint', /reply\* කරලා/.test(antibug.checkText(null)));
    t('reports: empty state honest', /fire වෙලා නෑ/.test(antibug.reportsText()));
    antibug._state.reportsLog.unshift({ at: Date.now(), who: '94775555555', want: 3, ok: 3, fails: 0, aborted: false, err: '', blockedNow: true, kind: 'manual' });
    t('reports: history rows (ok/want + block + kind)', /REPORT HISTORY/.test(antibug.reportsText()) && /3\/3/.test(antibug.reportsText()) && /MANUAL/i.test(antibug.reportsText()) && /block ✅/.test(antibug.reportsText()));

    console.log('── (6e) status card + command surface ──');
    const card = await antibug.command('', '');
    t('status card: dryrun/kick/wl chips + new sub-commands', /DRY-RUN|dryrun/.test(card) && /kick \(group\)/.test(card) && /whitelist/.test(card) && /\.antibug dryrun on \/ off\*/.test(card) && /\.antibug wl add\|del\|list <num>\*/.test(card) && /\.antibug check\*/.test(card) && /\.antibug stats\*/.test(card) && /\.antibug thresholds\*/.test(card) && /\.antibug reports\*/.test(card) && /\.antibug kick on \/ off\*/.test(card));
    t('command(rest0,rest1,rest2) triple-arg call in bot.js', BOT.includes('await antibug.command(rest[0], rest[1], rest[2])'));
    t('.antibug check routed in bot.js (quoted message → checkText)', BOT.includes("const qm = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage || null") && BOT.includes('antibug.checkText(qm)'));

    console.log('── (7) feature-parity hold (v3.09 premium + v3.08 taps) ──');
    t('v3.09 premium kit untouched (head/chip/row/close)', BOT.includes("chip('Hi'") && BOT.includes("${sect('📂 Menu')}"));
    t('menu classic fallback still last tier', BOT.includes('const caption = menuCaption(msg.pushName);'));
    t('number-reply panels include menuState', /panels = \[\[settingState\.get\(jid0\), '\.setting '\], \[menuState\.get\(jid0\), '\.menu '\]/.test(BOT));

    console.log('── (8) version pins ──');
    const pkg = JSON.parse(fs.readFileSync(path.join(REPO, 'package.json'), 'utf8'));
    const lock = JSON.parse(fs.readFileSync(path.join(REPO, 'package-lock.json'), 'utf8'));
    const man = JSON.parse(fs.readFileSync(path.join(REPO, 'manifest.json'), 'utf8'));
    t('pkg 3.10.0', pkg.version === '3.10.0');
    t('lock 3.10.0', lock.version === '3.10.0' && lock.packages[''].version === '3.10.0');
    t('manifest 3.10.0', man.version === '3.10.0');
    t('manifest.notes opens v3.10.0', typeof man.notes === 'string' && man.notes.startsWith('v3.10.0:'));
    t('manifest.files += tests/test_v3100.js (+ ui.js + antibug.js)', man.files.includes('tests/test_v3100.js') && man.files.includes('ui.js') && man.files.includes('antibug.js'));

    console.log('── (9) rebrand holds ──');
    const noNick = (src) => src.split('\n').filter((l) => !/\u0d9a\u0dc0\u0dd2\u0dc3\u0dca|\u0db6\u0da7\u0dd2\u0dc3\u0dca\u0da7\u0dcf|\ud83c\udff7\ufe0f/.test(l)).join('\n');   // කවිස්/බටිස්ටා/🏷️ nickname lines
    const leaks = fs.readdirSync(REPO).filter((f) => f.endsWith('.js') && /kaviz/i.test(noNick(fs.readFileSync(path.join(REPO, f), 'utf8'))));
    t('zero brand-kaviz in runtime .js (nickname lines whitelisted)', leaks.length === 0);
    if (leaks.length) console.log('     leaks: ' + leaks.join(', '));

    // settings/state restore (no runtime pollution)
    if (SET_BACK === null) { try { fs.rmSync(SETF, { force: true }); } catch { } } else { fs.writeFileSync(SETF, SET_BACK); }
    if (ST_BACK === null) { try { fs.rmSync(STF, { force: true }); } catch { } } else { fs.writeFileSync(STF, ST_BACK); }

    console.log(`\n${pass} pass, ${fail} fail`);
    process.exit(fail ? 1 : 0);
})().catch((e) => { console.log('SUITE CRASH:', e.stack); process.exit(1); });
