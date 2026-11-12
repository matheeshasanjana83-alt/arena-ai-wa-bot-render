'use strict';
/**
 * hf-space.js — Hugging Face Space wrapper for ＢＡＴＩＳＴＡ  ＭＤ (Arena AI WA Bot)
 *
 * කරන වැඩ 4:
 *   1. Boot වෙද්දි  → HF_TOKEN + HF_REPO secrets දැම්ම නම්, HF Dataset එකේ තියෙන
 *                     session backup එක (auth/ + settings.json …) restore කරනවා
 *                     → Space restart වුණත් WhatsApp link එක නැති වෙන්නේ නෑ
 *   2. launcher.js spawn (bot එකේම auto-restart / rollback logic එක ඒකේම)
 *   3. විනාඩි 20 ට සැරයක් + stop වෙද්දි → session එක HF Dataset එකට backup
 *   4. SPACE_HOST self-ping (විනාඩි 10 ට සැරයක්) → free Space එක sleep වෙන්නේ නෑ
 *
 * Secrets (Space Settings → Variables and secrets):
 *   PAIR_KEY  — pair site key (ඕන)          e.g. BATISTA2026
 *   HF_TOKEN  — HF access token (Write)      session backup ඕන නම් විතරයි
 *   HF_REPO   — dataset repo "user/name"     e.g. myname/batista-session
 */

const { spawn, execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT = __dirname;
if (!process.env.PORT) process.env.PORT = '7860';   // Render/HF set කරනවා නම් ඒකම ගන්නවා
const TOKEN = String(process.env.HF_TOKEN || '').trim();
const REPO = String(process.env.HF_REPO || '').trim();          // "user/name"
const BACKUP_NAME = 'batista-session-backup.tar.gz';
const BACKUP_EVERY_MIN = 20;
const PING_EVERY_MIN = 10;
const SNAP_PATHS = ['auth', 'settings.json', '.version.json', 'ai_memory.json'];

const log = (m) => console.log('[hf-sync] ' + m);
const hasHub = () => { try { require.resolve('@huggingface/hub'); return true; } catch { return false; } };
const syncEnabled = () => !!(TOKEN && REPO && hasHub());

/* ---------- tar helpers ---------- */
function makeSnapshot() {
    const existing = SNAP_PATHS.filter((p) => fs.existsSync(path.join(ROOT, p)));
    if (!existing.includes('auth')) return null;                 // pair නොකරා තැනක් backup කරන්නෙ නෑ
    const out = path.join(os.tmpdir(), BACKUP_NAME);
    try {
        fs.rmSync(out, { force: true });
        execFileSync('tar', ['-czf', out, '-C', ROOT, ...existing], { timeout: 60000 });
        return fs.readFileSync(out);
    } catch (e) { log('tar fail: ' + e.message); return null; }
}

function restoreSnapshot(buf) {
    const tmp = path.join(os.tmpdir(), 'restore-' + Date.now() + '.tar.gz');
    try {
        fs.writeFileSync(tmp, buf);
        execFileSync('tar', ['-xzf', tmp, '-C', ROOT], { timeout: 60000 });
        fs.chmodSync(path.join(ROOT, 'auth'), 0o700);
        return true;
    } catch (e) { log('untar fail: ' + e.message); return false; }
    finally { try { fs.rmSync(tmp, { force: true }); } catch { } }
}

/* ---------- HF dataset sync ---------- */
async function restoreFromHub() {
    if (!syncEnabled()) {
        log(TOKEN && REPO ? '@huggingface/hub package එක නෑ → restore skip' : 'HF_TOKEN / HF_REPO secrets නෑ → restore skip (first run එකට හරි)');
        return;
    }
    try {
        const { downloadFile } = require('@huggingface/hub');
        const blob = await downloadFile({
            repo: 'datasets/' + REPO, path: BACKUP_NAME,
            credentials: { accessToken: TOKEN },
        });
        if (!blob) { log('backup එකක් තාම නෑ (first run — pair කරාට පස්සේ හැදෙනවා)'); return; }
        const buf = Buffer.from(await blob.arrayBuffer());
        if (fs.existsSync(path.join(ROOT, 'auth', 'creds.json'))) { log('local session එක තියෙනවා → restore ඕන නෑ'); return; }
        log('restore කරනවා (' + buf.length + ' bytes) ...');
        if (restoreSnapshot(buf)) log('✅ session restore වුණා — WhatsApp link එක ආයෙත් scan කරන්න ඕන නෑ');
    } catch (e) { log('restore fail: ' + String(e.message).slice(0, 120) + ' (ප්‍රශ්නයක් නෑ — pair කරලා continue වෙන්න පුළුවන්)'); }
}

async function backupToHub(reason) {
    if (!syncEnabled()) return;
    try {
        const buf = makeSnapshot();
        if (!buf) return;
        const { uploadFile, createRepo } = require('@huggingface/hub');
        const creds = { accessToken: TOKEN };
        try { await createRepo({ repo: 'datasets/' + REPO, private: true, credentials: creds }); }
        catch (e) { if (!/exist/i.test(String(e.message))) throw e; }
        await uploadFile({
            repo: 'datasets/' + REPO, path: BACKUP_NAME,
            blob: new Blob([buf]), credentials: creds,
        });
        log('✅ backup upload වුණා (' + buf.length + ' bytes · ' + reason + ')');
    } catch (e) { log('backup fail (' + reason + '): ' + String(e.message).slice(0, 120)); }
}

/* ---------- keep-alive self-ping (Render / HF / ඕන host) ---------- */
function startSelfPing() {
    const ext = String(process.env.RENDER_EXTERNAL_URL || '').trim().replace(/\/$/, '');
    const host = String(process.env.SPACE_HOST || '').trim();
    const url = (ext || (host ? 'https://' + host : '')) + '/status';
    if (url === '/status') { log('external URL එකක් නෑ (RENDER_EXTERNAL_URL / SPACE_HOST) → self-ping skip'); return; }
    setInterval(() => { fetch(url).catch(() => { }); }, PING_EVERY_MIN * 60 * 1000);
    setTimeout(() => { fetch(url).catch(() => { }); }, 30 * 1000);
    log('keep-alive ping එක ලෑස්ති → ' + url);
}

/* ---------- main ---------- */
let exiting = false;

async function main() {
    console.log('🚀 Arena AI WA Bot — deploy wrapper v1.1 (Render / HF · HF-dataset session backup)');
    await restoreFromHub();
    startSelfPing();

    const child = spawn(process.execPath, [path.join(ROOT, 'launcher.js')], {
        stdio: 'inherit', cwd: ROOT, env: process.env,
    });

    const timer = setInterval(() => { if (!exiting) backupToHub('timer ' + BACKUP_EVERY_MIN + 'min'); }, BACKUP_EVERY_MIN * 60 * 1000);
    timer.unref();

    const shutdown = async (sig) => {
        if (exiting) return; exiting = true;
        log(sig + ' ආවා → final backup එක දාලා stop වෙනවා ...');
        try { await Promise.race([backupToHub('final ' + sig), new Promise((r) => setTimeout(r, 15000))]); } catch { }
        try { child.kill('SIGTERM'); } catch { }
        setTimeout(() => process.exit(0), 3000);
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    child.on('exit', (code) => {
        if (exiting) { process.exit(code || 0); return; }
        // launcher එකම exit වුණොත් (code 0 = manual stop) — platform එක ආයෙ start කරාම backup එකෙන් restore වෙනවා
        console.log('[hf-sync] launcher exit (' + code + ') — HF restart කරනවා නම් session backup එකෙන් ආපහු එනවා');
        backupToHub('launcher-exit').finally(() => process.exit(code || 0));
    });
}

main().catch((e) => { console.error('[hf-sync] fatal: ' + e.message); process.exit(1); });
