/**
 * test_v3110.js — 🚀 REPORT V2 (user-provided modules: token.js · token-store.js · report.js)
 *
 * Coverage:
 *   (1) token.js — crypto engine: HKDF reporting key (deterministic / null guards / changes with inputs),
 *       computeReportingToken (16B deterministic, content-sensitive), extractTokenContent (whitelist + sort),
 *       tokenEndpoints (fromMe both ways)
 *   (2) token-store.js — ingest message stanzas w/ reporting>reporting_token, junk reject, LRU cap,
 *       stats, attachTokenCapture attach/detach on fake ws, no-ws safe no-op
 *   (3) report.js — buildSpamReportNode shape (private MessageMenu / group GroupInfoReport + subject),
 *       failure reasons (no key / no proto / no token / no messageSecret), sendSpamReport ACCEPT
 *       (report_id) / discard / transport-fail, extractReportResult walk
 *   (4) antibug integration — tryModern null/meta guards + structural fast-exit (query never hit),
 *       retaliate v2-first (report_id VERIFIED → legacy volley SKIPPED, block still lands),
 *       retaliate structural-fail → legacy volley fallback, reportv2 off → straight legacy,
 *       guard e2e with meta.message → v2 path, guard e2e real-sendSpamReport (no proto here) → legacy
 *   (5) surfaces — .antibug tokens card (with/without store), .antibug reportv2 on|off, status card v2 chip,
 *       help rows, reporttest v2-armed line, reportManual v2 (REPORT SENT · v2 + report_id) and legacy
 *       fallback, reportsText 🆔 row, scanText id verdict, bot.js wiring pins
 *   (6) version pins — pkg/lock/manifest 3.11.0, manifest.files += token.js/token-store.js/report.js/test_v3110,
 *       ALL test files re-pinned 3.11.0, updater repo hold
 */
process.env.ANTIBUG_TEST_FAST = '1';

const fs = require('fs');
const path = require('path');
const REPO = path.join(__dirname, '..');

let pass = 0, fail = 0;
const t = (name, cond) => { if (cond) { pass++; console.log('  ✅ ' + name); } else { fail++; console.log('  ❌ ' + name); } };

const SETF = path.join(REPO, 'settings.json');
const SET_BACK = fs.existsSync(SETF) ? fs.readFileSync(SETF, 'utf8') : null;
const STF = path.join(REPO, 'antibug_state.json');
const ST_BACK = fs.existsSync(STF) ? fs.readFileSync(STF, 'utf8') : null;

const tok = require(path.join(REPO, 'token.js'));
const rptTokens = require(path.join(REPO, 'token-store.js'));
const rptModern = require(path.join(REPO, 'report.js'));
const antibug = require(path.join(REPO, 'antibug.js'));

// fresh state (restored at the end)
try { fs.rmSync(STF, { force: true }); } catch { }
antibug._state.catches.length = 0; antibug._state.reportsLog.length = 0; antibug._state.senders = {};
antibug._state.reports.length = 0;   // fresh 24h report budget (v277 pattern — stale entries shrink want)
antibug.setCfg({ wl: [], dryrun: false, kick: false, reportV2: true, report: true, block: true, dailyCap: 20, reportCount: 3 });   // dailyCap pinned — ambient settings.json dailyCap 5 නම් budget tests consume වෙනවා

const BOSS = '947709999999@s.whatsapp.net';
const SECRET = Buffer.from('0123456789abcdef0123456789abcdef');
const MOCK_MSG = { conversation: 'bug', messageContextInfo: { messageSecret: SECRET } };
// minimal REAL protobuf encoder — token HMAC needs wire-valid bytes (JSON bytes don't parse as proto)
const pbVarint = (n) => { const out = []; let v = n; while (v > 0x7f) { out.push((v & 0x7f) | 0x80); v >>>= 7; } out.push(v); return Buffer.from(out); };
const pbField = (num, payload) => Buffer.concat([Buffer.from([(num << 3) | 2]), pbVarint(payload.length), payload]);
const mockProto = { Message: { encode: (m) => ({ finish: () => pbField(1, Buffer.from(String(m.conversation || ''), 'utf8')) }) } };
const RAW_BUG = Buffer.from([0x0a, 0x03, 0x62, 0x75, 0x67]);   // field1 'bug'
const RAW_CAT = Buffer.from([0x0a, 0x03, 0x63, 0x61, 0x74]);   // field1 'cat'

(async () => {
    console.log('── (1) token.js — crypto engine ──');
    t('ENC secret pinned ("Report Token")', tok.ENC_SECRET_REPORT_TOKEN === 'Report Token');
    const k1 = tok.deriveReportingKey({ messageId: 'MSG1', from: 'a@s.whatsapp.net', to: 'b@s.whatsapp.net', messageSecret: SECRET });
    const k2 = tok.deriveReportingKey({ messageId: 'MSG1', from: 'a@s.whatsapp.net', to: 'b@s.whatsapp.net', messageSecret: SECRET });
    t('HKDF key deterministic 32B', Buffer.isBuffer(k1) && k1.length === 32 && k1.equals(k2));
    t('different messageId → different key', !k1.equals(tok.deriveReportingKey({ messageId: 'MSG2', from: 'a@s.whatsapp.net', to: 'b@s.whatsapp.net', messageSecret: SECRET })));
    t('null without messageSecret / messageId', tok.deriveReportingKey({ messageId: 'M' }) === null && tok.deriveReportingKey({ messageSecret: SECRET }) === null);
    const ep1 = tok.tokenEndpoints({ fromMe: true, remoteJid: 'me@s.whatsapp.net', participant: 'other@s.whatsapp.net' });
    const ep2 = tok.tokenEndpoints({ fromMe: false, remoteJid: 'me@s.whatsapp.net', participant: 'other@s.whatsapp.net' });
    t('tokenEndpoints fromMe both ways', ep1.from === 'me@s.whatsapp.net' && ep1.to === 'other@s.whatsapp.net' && ep2.from === 'other@s.whatsapp.net' && ep2.to === 'me@s.whatsapp.net');
    const raw = RAW_BUG;
    const tk1 = tok.computeReportingToken(k1, raw);
    t('token 16B deterministic', Buffer.isBuffer(tk1) && tk1.length === 16 && tk1.equals(tok.computeReportingToken(k1, raw)));
    t('token content-sensitive (different message → different token)', !tk1.equals(tok.computeReportingToken(k1, RAW_CAT)));
    t('token key-sensitive', !tk1.equals(tok.computeReportingToken(tok.deriveReportingKey({ messageId: 'MSG2', from: 'a@s.whatsapp.net', to: 'b@s.whatsapp.net', messageSecret: SECRET }), raw)));
    t('null on empty/unmatched protobuf', tok.computeReportingToken(k1, Buffer.from([0x78, 0x01])) === null);
    const canonical = tok.extractTokenContent(Buffer.concat([Buffer.from([0x0a, 0x03, 0x61, 0x62, 0x63]), Buffer.from([0x50, 0x07])]), tok.compile(tok.REPORTING_FIELDS));
    t('extractTokenContent runs on hand-built protobuf', Buffer.isBuffer(canonical) && canonical.length > 0);

    console.log('── (2) token-store.js — interceptor ──');
    const store = new rptTokens.TokenStore(null, 3);
    const msgNode = (id, tkn) => ({ tag: 'message', attrs: { id }, content: [{ tag: 'reporting', content: [{ tag: 'reporting_token', content: tkn }] }] });
    store.ingest(msgNode('T1', Buffer.from('tokentoken1')));
    t('ingest → has/get Buffer', store.has('T1') && Buffer.isBuffer(store.get('T1')) && store.get('T1').length >= 6);
    store.ingest({ tag: 'iq', attrs: { id: 'X' } });
    store.ingest({ tag: 'message', attrs: { id: 'X' } });
    store.ingest(msgNode('X', Buffer.from('ab')));
    store.ingest(msgNode('X'));
    store.ingest({ tag: 'message', content: [{ tag: 'reporting', content: [{ tag: 'reporting_token', content: Buffer.from('tokentoken9') }] }] });
    t('junk stanzas rejected (wrong tag / no reporting / short token / no id)', store.get('X') === null);
    t('stats captured/stored', store.stats().captured === 1 && store.stats().stored === 1);
    store.ingest(msgNode('T2', Buffer.from('tokentoken2')));
    store.ingest(msgNode('T3', Buffer.from('tokentoken3')));
    store.ingest(msgNode('T4', Buffer.from('tokentoken4')));
    t('LRU cap 3 → oldest evicted on 4th', store.has('T4') && store.has('T3') && !store.has('T1') && store.stats().stored === 3);
    const handlers = {};
    const fakeWs = { on: (ev, fn) => { handlers[ev] = fn; }, off: (ev) => { delete handlers[ev]; } };
    const store2 = new rptTokens.TokenStore(null);
    const detach = rptTokens.attachTokenCapture({ ws: fakeWs }, store2, null);
    t('attachTokenCapture → handler attached', typeof handlers['CB:message'] === 'function');
    handlers['CB:message'](msgNode('W1', Buffer.from('tokentokenW')));
    t('CB:message emission ingested', store2.has('W1'));
    detach();
    t('detach removes handler', handlers['CB:message'] === undefined);
    handlers['CB:message'] && handlers['CB:message'](msgNode('W2', Buffer.from('tokentokenX')));
    t('post-detach emission NOT ingested', !store2.has('W2'));
    const noopDetach = rptTokens.attachTokenCapture({}, store2, { warn: () => { } });
    t('no ws → safe noop detach', typeof noopDetach === 'function' && noopDetach() === undefined);

    console.log('── (3) report.js — IQ sender ──');
    const key = { remoteJid: '94770111111@s.whatsapp.net', id: 'MSGKEY1', fromMe: false };
    const built = rptModern.buildSpamReportNode({ message: MOCK_MSG, key, timestampSec: 1700000000, senderJid: '94770111111@s.whatsapp.net', chatJid: '94770111111@s.whatsapp.net', proto: mockProto });
    const sl = built.node && built.node.content && built.node.content[0];
    const mn = sl && sl.content && sl.content[0];
    const cv = mn && mn.content && mn.content[1];
    t('iq spam node shape', !!built.node && built.node.tag === 'iq' && built.node.attrs.xmlns === 'spam' && built.node.attrs.to === 's.whatsapp.net' && built.node.attrs.type === 'set');
    t('spam_list private: jid=sender + MessageMenu flow', sl.attrs.jid === '94770111111@s.whatsapp.net' && sl.attrs.spam_flow === 'MessageMenu');
    t('message node attrs (from/t/id)', mn.attrs.id === 'MSGKEY1' && mn.attrs.from === '94770111111@s.whatsapp.net' && mn.attrs.t === '1700000000');
    t('raw v2 + content_validation plaintext_v3', mn.content[0].tag === 'raw' && mn.content[0].attrs.v === '2' && cv.attrs.type === 'plaintext_v3');
    t('reporting_token 16B + reporting_token_key 32B', cv.content[0].tag === 'reporting_token' && cv.content[0].attrs.v === '2' && cv.content[0].content.length === 16 && cv.content[1].tag === 'reporting_token_key' && cv.content[1].content.length === 32);
    const gBuilt = rptModern.buildSpamReportNode({ message: MOCK_MSG, key, timestampSec: 1, senderJid: '94770111111@s.whatsapp.net', chatJid: '120363@g.us', groupSubject: 'Bug Squad', proto: mockProto });
    t('group: GroupInfoReport + subject + reportedJid=group', gBuilt.node.content[0].attrs.spam_flow === 'GroupInfoReport' && gBuilt.node.content[0].attrs.jid === '120363@g.us' && gBuilt.node.content[0].attrs.subject === 'Bug Squad');
    t('fail: no message/key → reason', rptModern.buildSpamReportNode({ message: null, key: {}, proto: mockProto }).reason === 'no message key');
    t('fail: proto null → encode reason', /could not encode/.test(rptModern.buildSpamReportNode({ message: MOCK_MSG, key, proto: null }).reason));
    t('fail: no secret + no captured token → token reason', /no reporting token/.test(rptModern.buildSpamReportNode({ message: { conversation: 'x' }, key, proto: mockProto }).reason));
    t('fail: captured token but no messageSecret → key reason', /no reporting key \(messageSecret missing\)/.test(rptModern.buildSpamReportNode({ message: { conversation: 'x' }, key, capturedToken: Buffer.alloc(16, 7), proto: mockProto }).reason));
    const acc = await rptModern.sendSpamReport({ query: async () => ({ content: [{ tag: 'report_id', attrs: {}, content: Buffer.from('RPT-1234567890') }] }) }, { message: MOCK_MSG, key, proto: mockProto });
    t('sendSpamReport ACCEPT → ok + reportId', acc.ok === true && acc.reportId === 'RPT-1234567890');
    const discarded = await rptModern.sendSpamReport({ query: async () => ({}) }, { message: MOCK_MSG, key, proto: mockProto });
    t('no report_id → honest discard reason', discarded.ok === false && /no report id/.test(discarded.reason));
    const failed = await rptModern.sendSpamReport({ query: async () => { throw new Error('boom'); } }, { message: MOCK_MSG, key, proto: mockProto });
    t('transport fail → iq failed', failed.ok === false && failed.reason === 'iq failed' && failed.errorText === 'boom');
    const attrs = rptModern.extractReportResult({ attrs: { report_id: 'ATTRID9' }, content: [{ attrs: { code: '400', text: 'bad' } }] });
    t('extractReportResult attrs walk (id/code/text)', attrs.reportId === 'ATTRID9' && attrs.errorCode === 400 && attrs.errorText === 'bad');

    console.log('── (4) antibug integration — tryModern + retaliate v2-first / fallback ──');
    t('tryModern: no meta/message → null', await antibug.tryModern('9477x@s.whatsapp.net', { sock: {} }, null) === null && await antibug.tryModern('9477x@s.whatsapp.net', { sock: {} }, { key: { id: 'x' } }) === null);
    let modernQ = 0;
    const structSock = { query: async () => { modernQ++; return {}; } };
    const struct = await antibug.tryModern('94770444444@s.whatsapp.net', { sock: structSock }, { message: { conversation: 'bug' }, key, timestampSec: 1, chatJid: '94770444444@s.whatsapp.net' });   // secret-less msg → structural (no secret/no captured token)
    t('structural fail (no token, no secret) → ok:false + query NEVER hit (no retry)', struct && struct.ok === false && /no reporting|could not encode/.test(struct.reason) && modernQ === 0);
    const origSend = rptModern.sendSpamReport;
    try {
        rptModern.sendSpamReport = async () => ({ ok: true, reportId: 'V2ID-AB12CD34' });
        antibug._state.reportsLog.length = 0;
        let blocks = 0, legacyQ = 0, ownerCard = '';
        const sock1 = { query: async () => { legacyQ++; throw new Error('legacy-not-expected'); }, updateBlockStatus: async () => { blocks++; } };
        const r1 = await antibug.retaliate('94770111111@s.whatsapp.net', { sock: sock1, me: { pn: BOSS }, send: async (j, c) => { ownerCard = c && c.text; }, log: () => { } }, { key: { id: 'K1', fromMe: false }, canBlock: true, message: MOCK_MSG, chatJid: '94770111111@s.whatsapp.net', timestampSec: 1 });
        const e1 = antibug._state.reportsLog[0];
        t('retaliate v2-first: VERIFIED (kind v2 + reportId) + legacy volley SKIPPED + block lands', r1.blockedNow === true && e1.kind === 'v2' && e1.reportId === 'V2ID-AB12CD34' && e1.ok === 1 && legacyQ === 0 && blocks === 1);
        t('owner card shows 🚀 v2 VERIFIED + report id', /v2 VERIFIED/.test(ownerCard || '') && /V2ID-AB12CD3/.test(ownerCard || ''));
        t('reportsText row shows (v2) + 🆔', /\(v2\)/.test(antibug.reportsText()) && /🆔V2ID-AB12CD/.test(antibug.reportsText()));
        t('scanText verdict shows id', /id:V2ID-AB12C/.test(await antibug.command('scan')));
        rptModern.sendSpamReport = async () => ({ ok: false, reason: 'no reporting token available for this message' });
        antibug._state.reportsLog.length = 0;
        antibug.setCfg({ reportCount: 3 });
        let legacy2 = 0;
        const sock2 = { query: async () => { legacy2++; return {}; }, updateBlockStatus: async () => { } };
        const r2 = await antibug.retaliate('94770222222@s.whatsapp.net', { sock: sock2, me: { pn: BOSS }, send: async () => { }, log: () => { } }, { key: { id: 'K2' }, canBlock: false, message: MOCK_MSG, chatJid: '94770222222@s.whatsapp.net' });
        t('structural fail → legacy volley fallback ×3 (never silent)', r2.ok === 3 && legacy2 === 3 && !antibug._state.reportsLog[0].kind);
        rptModern.sendSpamReport = async () => { throw new Error('spy'); };
        antibug.setCfg({ reportV2: false });
        let spyCalls = 0;
        rptModern.sendSpamReport = async () => { spyCalls++; return { ok: true, reportId: 'SHOULD-OFF' }; };
        let legacy3 = 0;
        const sock3 = { query: async () => { legacy3++; return {}; } };
        await antibug.retaliate('94770333333@s.whatsapp.net', { sock: sock3, me: { pn: BOSS }, send: async () => { }, log: () => { } }, { key: { id: 'K3' }, canBlock: false, message: MOCK_MSG, chatJid: '94770333333@s.whatsapp.net' });
        t('reportv2 off → modern NEVER attempted, straight legacy', spyCalls === 0 && legacy3 === 3);
        antibug.setCfg({ reportV2: true });
        // guard e2e with meta.message passthrough → v2 path
        rptModern.sendSpamReport = async () => ({ ok: true, reportId: 'GUARD-ID-1' });
        const sock4 = { query: async () => { throw new Error('no-legacy'); }, updateBlockStatus: async () => { }, chatModify: async () => { }, sendMessage: async () => ({ key: { id: 'x' } }), groupMetadata: async () => ({ participants: [] }) };
        const bugMsg = { key: { remoteJid: '94770777777@s.whatsapp.net', fromMe: false, id: 'G1' }, message: { conversation: '්ා'.repeat(600) }, messageTimestamp: Math.floor(Date.now() / 1000) };
        await antibug.guard(bugMsg, { sock: sock4, me: { pn: BOSS }, send: async () => { }, log: () => { } });
        await antibug._retalRunning.get('94770777777@s.whatsapp.net');
        t('guard e2e: meta.message reaches retaliate → v2 VERIFIED', antibug._state.reportsLog[0].reportId === 'GUARD-ID-1' && antibug._state.reportsLog[0].kind === 'v2');
    } finally {
        rptModern.sendSpamReport = origSend;
    }
    // real sendSpamReport (no proto in this runtime) → structural → legacy fallback e2e
    antibug._state.reportsLog.length = 0;
    let legacy5 = 0, delMe = 0;
    const sock5 = { query: async () => { legacy5++; return {}; }, updateBlockStatus: async () => { }, chatModify: async () => { delMe++; }, sendMessage: async () => ({ key: { id: 'x' } }), groupMetadata: async () => ({ participants: [] }) };
    const bugMsg2 = { key: { remoteJid: '94770888888@s.whatsapp.net', fromMe: false, id: 'G2' }, message: { conversation: '්ා'.repeat(600) }, messageTimestamp: Math.floor(Date.now() / 1000) };
    await antibug.guard(bugMsg2, { sock: sock5, me: { pn: BOSS }, send: async () => { }, log: () => { } });
    await antibug._retalRunning.get('94770888888@s.whatsapp.net');
    t('guard e2e real path (no token/proto): deleteForMe + legacy volley fallback', delMe === 1 && legacy5 === 3 && !antibug._state.reportsLog[0].kind);

    console.log('── (5) surfaces — cards / commands / manual v2 ──');
    t('tokens card: no store → attach hint', /attach වෙලා නෑ/.test(await antibug.command('tokens')));
    antibug.setTokenStore({ stats: () => ({ captured: 7, stored: 4 }), get: () => null });
    const tkCard = await antibug.command('tokens');
    t('tokens card: captured 7 · stored 4 + v2 ON', /captured: 7/.test(tkCard) && /store එකේ: 4/.test(tkCard) && /v2 report: 🚀 ON/.test(tkCard));
    antibug.setTokenStore(null);
    const offCard = await antibug.command('reportv2', 'off');
    t('.antibug reportv2 off → cfg false + honest card', antibug.cfg().reportV2 === false && /Report v2 OFF/.test(offCard));
    const onCard = await antibug.command('reportv2', 'on');
    t('.antibug reportv2 on → cfg true', antibug.cfg().reportV2 === true && /Report v2 ON/.test(onCard));
    const status = await antibug.command('', '');
    t('status card: 🚀 v2 chip + tokens count', /🚀 v2: ✅/.test(status) && /tokens: 0/.test(status));
    t('help rows: reportv2 + tokens', /\*\.antibug reportv2 on \/ off\* — 🚀 v2 verified report \(report_id\)/.test(status) && /\*\.antibug tokens\* — 📨 captured reporting tokens/.test(status));
    t('help footer: v2 VERIFIED path named', /report v2 \(VERIFIED\) \/ legacy \(24h budget\)/.test(status));
    const rt = await antibug.reportTest({ sock: { query: async () => ({}) }, me: { pn: BOSS }, log: () => { } });
    t('reporttest card: v2 path armed line', /stanza ACCEPTED/.test(rt) && /v2 path: 🚀 armed/.test(rt) && /tokens 0/.test(rt));
    // manual v2
    const origSend2 = rptModern.sendSpamReport;
    try {
        rptModern.sendSpamReport = async () => ({ ok: true, reportId: 'MANUAL-V2-ID-1' });
        antibug._state.reportsLog.length = 0;
        const m1 = await antibug.reportManual({ stanzaId: 'QID1', participantJid: '94779999999@s.whatsapp.net', participant: '94779999999@s.whatsapp.net', remoteJid: '94779999999@s.whatsapp.net', message: MOCK_MSG }, { sock: { query: async () => { throw new Error('legacy-not-expected'); } }, me: { pn: BOSS }, log: () => { } });
        t('manual v2: REPORT SENT · v2 + report_id VERIFIED', /REPORT SENT · v2/.test(m1) && /report_id: MANUAL-V2-ID/.test(m1) && antibug._state.reportsLog[0].kind === 'manual-v2');
        rptModern.sendSpamReport = async () => ({ ok: false, reason: 'no reporting token available for this message' });
        const m2 = await antibug.reportManual({ stanzaId: 'QID2', participantJid: '94779999999@s.whatsapp.net', participant: '94779999999@s.whatsapp.net', remoteJid: '94779999999@s.whatsapp.net' }, { sock: { query: async () => ({}) }, me: { pn: BOSS }, log: () => { } });
        t('manual fallback (no quoted message): legacy REPORT SENT', /REPORT SENT/.test(m2) && !/· v2/.test(m2) && antibug._state.reportsLog[0].kind === 'manual');
    } finally {
        rptModern.sendSpamReport = origSend2;
    }
    const BOT = fs.readFileSync(path.join(REPO, 'bot.js'), 'utf8');
    t('bot.js: TokenStore + attachTokenCapture + setTokenStore wired', BOT.includes('new reportTokens.TokenStore(logger)') && BOT.includes('reportTokens.attachTokenCapture(sock, tokenStore, logger)') && BOT.includes('antibug.setTokenStore(tokenStore)'));
    t('bot.js: .antibug report quotedMessage passthrough (v2 path)', BOT.includes('message: ci.quotedMessage'));
    t('bot.js: Security CATS reportv2 + tokens line', BOT.includes('🚀 *.antibug reportv2 on|off* — v2 VERIFIED report (report_id) · *.antibug tokens*'));

    console.log('── (6) version pins ──');
    const pkg = JSON.parse(fs.readFileSync(path.join(REPO, 'package.json'), 'utf8'));
    const lock = JSON.parse(fs.readFileSync(path.join(REPO, 'package-lock.json'), 'utf8'));
    const manifest = JSON.parse(fs.readFileSync(path.join(REPO, 'manifest.json'), 'utf8'));
    t('pkg 3.11.0', pkg.version === '3.11.0');
    t('lock 3.11.0 (root + packages root)', lock.version === '3.11.0' && lock.packages[''].version === '3.11.0');
    t('manifest 3.11.0', manifest.version === '3.11.0');
    t('manifest.notes opens v3.11.0 entry', manifest.notes.startsWith('v3.11.0:'));
    t('manifest.files += token.js + token-store.js + report.js + tests/test_v3110.js', ['token.js', 'token-store.js', 'report.js', 'tests/test_v3110.js'].every((f) => manifest.files.includes(f)));
    const testFiles = fs.readdirSync(path.join(REPO, 'tests')).filter((f) => f.startsWith('test_') && f.endsWith('.js'));
    // convention (v3.09.0 sweep එකේ ඉඳන්): pin තියෙන්නෙ version-checking suites වල විතරයි — ඒ හැම එකක්ම current version එකට re-pin වෙලා ඕනේ
    const versionSuites = testFiles.filter((f) => { const s = fs.readFileSync(path.join(REPO, 'tests', f), 'utf8'); return /version\s*===\s*['"]3\.\d{2}\.\d|\.version,\s*['"]3\.\d{2}\.\d|\.includes\((?:pkg|manifest|man|lock|LOCK|PKG)\.version\)|startsWith\(['"]v3\.\d{2}/.test(s); });
    const stalePinned = versionSuites.filter((f) => !fs.readFileSync(path.join(REPO, 'tests', f), 'utf8').includes('3.11.0'));
    t('ALL ' + versionSuites.length + ' version-checking suites re-pinned 3.11.0', stalePinned.length === 0 && versionSuites.length >= 30);
    const updater = fs.readFileSync(path.join(REPO, 'updater.js'), 'utf8');
    t('updater REPO hold (arena-ai-wa-bot-render)', updater.includes('arena-ai-wa-bot-render'));
    t('no leftover 3.10.0 pkg refs in runtime files', !pkg.version.includes('3.10.0') && manifest.version !== '3.10.0');
})().finally(() => {
    antibug.setTokenStore(null);
    antibug.setCfg({ wl: [], dryrun: false, kick: false, reportV2: true, report: true, block: true });
    if (SET_BACK === null) { try { fs.rmSync(SETF, { force: true }); } catch { } } else { try { fs.writeFileSync(SETF, SET_BACK); } catch { } }
    if (ST_BACK === null) { try { fs.rmSync(STF, { force: true }); } catch { } } else { try { fs.writeFileSync(STF, ST_BACK); } catch { } }
    console.log(`\nv3.11.0 REPORT V2: ${pass} pass · ${fail} fail`);
    process.exit(fail ? 1 : 0);
}).catch((e) => { console.error('FATAL', e); process.exit(1); });
