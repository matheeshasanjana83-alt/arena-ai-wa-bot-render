'use strict';

/**
 * token.js — 🚀 REPORT V2 · The Crypto Engine (v3.11.0 — user-provided module, integrated)
 *
 * Reporting token derivation for WhatsApp spam reports — the OFFICIAL modern report path.
 * When you tap "Report" in the app, WhatsApp derives an HKDF key from the message's
 * messageSecret (messageContextInfo.messageSecret) + msgId + from/to + "Report Token",
 * then HMACs a canonicalized (whitelisted-field) re-encoding of the message protobuf —
 * 16 bytes = reporting_token. The server verifies it and returns a report_id:
 * the ONLY proof that a report actually landed (legacy moderation IQ has no such proof).
 */

const { hkdfSync, createHmac } = require('crypto');

const ENC_SECRET_REPORT_TOKEN = 'Report Token';

const WIRE = { VARINT: 0, FIXED64: 1, BYTES: 2, FIXED32: 5 };

const REPORTING_FIELDS = [
  { f: 1 },
  { f: 3, s: [{ f: 2 }, { f: 3 }, { f: 8 }, { f: 11 }, { f: 17, s: [{ f: 21 }, { f: 22 }] }, { f: 25 }] },
  { f: 4, s: [{ f: 1 }, { f: 16 }, { f: 17, s: [{ f: 21 }, { f: 22 }] }] },
  { f: 5, s: [{ f: 3 }, { f: 4 }, { f: 5 }, { f: 16 }, { f: 17, s: [{ f: 21 }, { f: 22 }] }] },
  { f: 6, s: [{ f: 1 }, { f: 17, s: [{ f: 21 }, { f: 22 }] }, { f: 30 }] },
  { f: 7, s: [{ f: 2 }, { f: 7 }, { f: 10 }, { f: 17, s: [{ f: 21 }, { f: 22 }] }, { f: 20 }] },
  { f: 8, s: [{ f: 2 }, { f: 7 }, { f: 9 }, { f: 17, s: [{ f: 21 }, { f: 22 }] }, { f: 21 }] },
  { f: 9, s: [{ f: 2 }, { f: 6 }, { f: 7 }, { f: 13 }, { f: 17, s: [{ f: 21 }, { f: 22 }] }, { f: 20 }] },
  { f: 12, s: [{ f: 1 }, { f: 2 }, { f: 14, m: true }, { f: 15 }] },
  { f: 18, s: [{ f: 6 }, { f: 16 }, { f: 17, s: [{ f: 21 }, { f: 22 }] }] },
  { f: 26, s: [{ f: 4 }, { f: 5 }, { f: 8 }, { f: 13 }, { f: 17, s: [{ f: 21 }, { f: 22 }] }] },
  { f: 28, s: [{ f: 1 }, { f: 2 }, { f: 4 }, { f: 5 }, { f: 6 }, { f: 7, s: [{ f: 21 }, { f: 22 }] }] },
  { f: 37, s: [{ f: 1, m: true }] },
  {
    f: 49,
    s: [{ f: 2 }, { f: 3, s: [{ f: 1 }, { f: 2 }] }, { f: 5, s: [{ f: 21 }, { f: 22 }] }, { f: 8, s: [{ f: 1 }, { f: 2 }] }]
  },
  { f: 53, s: [{ f: 1, m: true }] },
  { f: 55, s: [{ f: 1, m: true }] },
  { f: 58, s: [{ f: 1, m: true }] },
  { f: 59, s: [{ f: 1, m: true }] },
  {
    f: 60,
    s: [{ f: 2 }, { f: 3, s: [{ f: 1 }, { f: 2 }] }, { f: 5, s: [{ f: 21 }, { f: 22 }] }, { f: 8, s: [{ f: 1 }, { f: 2 }] }]
  },
  {
    f: 64,
    s: [{ f: 2 }, { f: 3, s: [{ f: 1 }, { f: 2 }] }, { f: 5, s: [{ f: 21 }, { f: 22 }] }, { f: 8, s: [{ f: 1 }, { f: 2 }] }]
  },
  { f: 66, s: [{ f: 2 }, { f: 6 }, { f: 7 }, { f: 13 }, { f: 17, s: [{ f: 21 }, { f: 22 }] }, { f: 20 }] },
  { f: 74, s: [{ f: 1, m: true }] },
  { f: 87, s: [{ f: 1, m: true }] },
  { f: 88, s: [{ f: 1 }, { f: 2, s: [{ f: 1 }] }, { f: 3, s: [{ f: 21 }, { f: 22 }] }] },
  { f: 92, s: [{ f: 1, m: true }] },
  { f: 93, s: [{ f: 1, m: true }] },
  { f: 94, s: [{ f: 1, m: true }] }
];

function compile(fields) {
  const map = new Map();
  for (const f of fields) {
    map.set(f.f, { m: f.m, children: f.s ? compile(f.s) : undefined });
  }
  return map;
}

const COMPILED = compile(REPORTING_FIELDS);
const EMPTY_MAP = new Map();

function decodeVarint(buffer, offset) {
  let value = 0;
  let bytes = 0;
  let shift = 0;
  while (offset + bytes < buffer.length) {
    const current = buffer[offset + bytes];
    value |= (current & 0x7f) << shift;
    bytes++;
    if ((current & 0x80) === 0) return { value, bytes, ok: true };
    shift += 7;
    if (shift > 35) return { value: 0, bytes: 0, ok: false };
  }
  return { value: 0, bytes: 0, ok: false };
}

function encodeVarint(value) {
  const parts = [];
  let remaining = value >>> 0;
  while (remaining > 0x7f) {
    parts.push((remaining & 0x7f) | 0x80);
    remaining >>>= 7;
  }
  parts.push(remaining);
  return Buffer.from(parts);
}

function extractTokenContent(data, cfg) {
  const out = [];
  let i = 0;
  while (i < data.length) {
    const tag = decodeVarint(data, i);
    if (!tag.ok) return null;
    const fieldNum = tag.value >> 3;
    const wireType = tag.value & 0x7;
    const fieldStart = i;
    i += tag.bytes;
    const fieldCfg = cfg.get(fieldNum);

    const pushSlice = (end) => {
      if (end > data.length) return false;
      out.push({ num: fieldNum, bytes: data.subarray(fieldStart, end) });
      i = end;
      return true;
    };
    const skip = (end) => {
      if (end > data.length) return false;
      i = end;
      return true;
    };

    if (wireType === WIRE.VARINT) {
      const v = decodeVarint(data, i);
      if (!v.ok) return null;
      const end = i + v.bytes;
      if (!fieldCfg) {
        if (!skip(end)) return null;
        continue;
      }
      if (!pushSlice(end)) return null;
      continue;
    }
    if (wireType === WIRE.FIXED64) {
      const end = i + 8;
      if (!fieldCfg) {
        if (!skip(end)) return null;
        continue;
      }
      if (!pushSlice(end)) return null;
      continue;
    }
    if (wireType === WIRE.FIXED32) {
      const end = i + 4;
      if (!fieldCfg) {
        if (!skip(end)) return null;
        continue;
      }
      if (!pushSlice(end)) return null;
      continue;
    }
    if (wireType === WIRE.BYTES) {
      const len = decodeVarint(data, i);
      if (!len.ok) return null;
      const valStart = i + len.bytes;
      const valEnd = valStart + len.value;
      if (valEnd > data.length) return null;
      if (!fieldCfg) {
        i = valEnd;
        continue;
      }
      if (fieldCfg.m || fieldCfg.children) {
        const sub = extractTokenContent(data.subarray(valStart, valEnd), fieldCfg.children ?? EMPTY_MAP);
        if (sub === null) return null;
        if (sub.length > 0) {
          out.push({
            num: fieldNum,
            bytes: Buffer.concat([encodeVarint(tag.value), encodeVarint(sub.length), sub])
          });
        }
        i = valEnd;
        continue;
      }
      out.push({ num: fieldNum, bytes: data.subarray(fieldStart, valEnd) });
      i = valEnd;
      continue;
    }
    return null;
  }
  if (out.length === 0) return Buffer.alloc(0);
  out.sort((a, b) => a.num - b.num);
  return Buffer.concat(out.map((f) => f.bytes));
}

function hkdf(ikm, length, infoString) {
  const info = infoString ? Buffer.from(infoString, 'utf8') : Buffer.alloc(0);
  return Buffer.from(hkdfSync('sha256', ikm, Buffer.alloc(0), info, length));
}

function deriveReportingKey({ messageId, from, to, messageSecret }) {
  if (!messageId || !messageSecret) return null;
  const useCaseSecret = Buffer.concat([
    Buffer.from(String(messageId), 'utf8'),
    Buffer.from(String(from || ''), 'utf8'),
    Buffer.from(String(to || ''), 'utf8'),
    Buffer.from(ENC_SECRET_REPORT_TOKEN, 'utf8')
  ]);
  const info = useCaseSecret.toString('latin1');
  return hkdf(Buffer.from(messageSecret), 32, info);
}

function computeReportingToken(reportingKey, messageProtobuf) {
  const content = extractTokenContent(messageProtobuf, COMPILED);
  if (!content || content.length === 0) return null;
  return createHmac('sha256', reportingKey).update(content).digest().subarray(0, 16);
}

function tokenEndpoints(key) {
  const from = key.fromMe ? key.remoteJid : key.participant || key.remoteJid;
  const to = key.fromMe ? key.participant || key.remoteJid : key.remoteJid;
  return { from, to };
}

module.exports = {
  ENC_SECRET_REPORT_TOKEN,
  hkdf,
  deriveReportingKey,
  computeReportingToken,
  extractTokenContent,
  tokenEndpoints,
  compile,
  REPORTING_FIELDS
};
