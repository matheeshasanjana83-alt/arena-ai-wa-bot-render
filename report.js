'use strict';

/**
 * report.js — 🚀 REPORT V2 · The IQ Sender (v3.11.0 — user-provided module, integrated)
 *
 * Builds and sends the MODERN WhatsApp spam report: `xmlns='spam'` IQ with the full
 * message protobuf + content_validation (reporting_token v2 + reporting_token_key).
 * The server answers with a report_id — the only VERIFIED proof a report landed
 * (the legacy `moderation` IQ in antibug.js is stanza-accepted but unverifiable).
 * Private chats report the sender (flow MessageMenu); groups report the group
 * (flow GroupInfoReport + subject).
 */

const { deriveReportingKey, computeReportingToken, tokenEndpoints } = require('./token');

const SPAM_FLOW = {
  user: 'MessageMenu',
  group: 'GroupInfoReport'
};

// baileys 7 repo dependency name = 'baileys' (@whiskeysockets scope is the legacy install name) — try all, never throw
const BAILEYS_PKGS = ['baileys', '@whiskeysockets/baileys', '@adiwajshing/baileys'];

function loadBaileys() {
  for (const name of BAILEYS_PKGS) {
    try {
      const b = require(name);
      if (b && (b.proto || (b.WAProto && b.WAProto.proto) || typeof b.generateMessageIDV2 === 'function')) return b;
    } catch { }
  }
  return null;
}

function getProto() {
  const b = loadBaileys();
  return b ? (b.proto || (b.WAProto && b.WAProto.proto) || null) : null;
}

function getMessageIdGenerator() {
  const b = loadBaileys();
  if (b) {
    if (typeof b.generateMessageIDV2 === 'function') return b.generateMessageIDV2;
    if (typeof b.generateMessageID === 'function') return b.generateMessageID;
  }
  const { randomBytes } = require('crypto');
  return () => '3EB0' + randomBytes(8).toString('hex').toUpperCase();
}

function encodeMessage(message, proto) {
  if (!proto || !proto.Message || typeof proto.Message.encode !== 'function') return null;
  try {
    return Buffer.from(proto.Message.encode(message).finish());
  } catch {
    return null;
  }
}

function buildSpamReportNode(opts) {
  const {
    message, key, timestampSec, senderJid, chatJid, groupSubject,
    flow, capturedToken, iqId, proto, localMessageType = '0', mediaType = '0'
  } = opts;

  if (!message || !key || !key.id) return { node: null, reason: 'no message key' };

  const raw = encodeMessage(message, proto);
  if (!raw) return { node: null, reason: 'could not encode message protobuf' };

  const messageSecret = message.messageContextInfo && message.messageContextInfo.messageSecret;
  const { from, to } = tokenEndpoints(key);

  let reportingKey = null;
  if (messageSecret) {
    reportingKey = deriveReportingKey({ messageId: key.id, from, to, messageSecret });
  }

  let token = capturedToken || null;
  if (!token && reportingKey) {
    token = computeReportingToken(reportingKey, raw);
  }

  if (!token || !reportingKey) {
    return {
      node: null,
      reason: !token ? 'no reporting token available for this message' : 'no reporting key (messageSecret missing)'
    };
  }

  const isGroup = typeof chatJid === 'string' && chatJid.endsWith('@g.us');
  const reportedJid = isGroup ? chatJid : senderJid;
  const spamFlow = flow || (isGroup ? SPAM_FLOW.group : SPAM_FLOW.user);

  const listAttrs = { jid: reportedJid, spam_flow: spamFlow };
  if (isGroup && groupSubject) listAttrs.subject = groupSubject;

  const messageAttrs = {
    from: senderJid,
    t: String(Number(timestampSec) || Math.floor(Date.now() / 1000)),
    id: key.id
  };

  const messageNode = {
    tag: 'message',
    attrs: messageAttrs,
    content: [
      { tag: 'raw', attrs: { v: '2', local_message_type: String(localMessageType), mediatype: String(mediaType) }, content: raw },
      {
        tag: 'content_validation',
        attrs: { type: 'plaintext_v3' },
        content: [
          { tag: 'reporting_token', attrs: { v: '2' }, content: token },
          { tag: 'reporting_token_key', attrs: {}, content: reportingKey }
        ]
      }
    ]
  };

  const node = {
    tag: 'iq',
    attrs: { id: iqId || getMessageIdGenerator()(), to: 's.whatsapp.net', type: 'set', xmlns: 'spam' },
    content: [{ tag: 'spam_list', attrs: listAttrs, content: [messageNode] }]
  };

  return { node, token, key: reportingKey, raw };
}

function extractReportResult(response) {
  const out = { reportId: null, errorCode: null, errorText: null };
  if (!response || typeof response !== 'object') return out;

  const walk = (node, depth = 0) => {
    if (!node || depth > 4) return;
    if (node.attrs) {
      if (!out.reportId && node.attrs.report_id) out.reportId = String(node.attrs.report_id);
      if (!out.reportId && node.attrs.reportId) out.reportId = String(node.attrs.reportId);
      if (node.attrs.code && !out.errorCode) out.errorCode = Number(node.attrs.code);
      if (node.attrs.text && !out.errorText) out.errorText = String(node.attrs.text);
    }
    if (node.tag === 'report_id' && node.content) {
      const c = node.content;
      out.reportId = Buffer.isBuffer(c) ? c.toString() : String(c);
    }
    if (Array.isArray(node.content)) {
      for (const child of node.content) walk(child, depth + 1);
    }
  };

  walk(response);
  return out;
}

async function sendSpamReport(sock, opts) {
  const proto = opts.proto || getProto();
  const built = buildSpamReportNode({ ...opts, proto });

  if (!built.node) {
    return { ok: false, reportId: null, errorCode: null, errorText: null, reason: built.reason };
  }

  try {
    const response = await sock.query(built.node, 30000);
    const res = extractReportResult(response);
    const ok = !!res.reportId;
    return {
      ok, reportId: res.reportId, errorCode: res.errorCode, errorText: res.errorText,
      reason: ok ? undefined : res.errorText || 'server returned no report id (discarded)'
    };
  } catch (e) {
    const code = e && e.output && e.output.statusCode ? e.output.statusCode : null;
    return {
      ok: false, reportId: null, errorCode: code,
      errorText: e && e.message ? e.message : String(e), reason: 'iq failed'
    };
  }
}

module.exports = { SPAM_FLOW, buildSpamReportNode, sendSpamReport, extractReportResult, encodeMessage, getProto };
