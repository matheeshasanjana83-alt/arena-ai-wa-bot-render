'use strict';

/**
 * token-store.js — 🚀 REPORT V2 · The Interceptor (v3.11.0 — user-provided module, integrated)
 *
 * Hooks the RAW Baileys websocket (`sock.ws.on('CB:message')`) and captures the
 * `reporting > reporting_token` node that WhatsApp servers attach on incoming messages.
 * Each token is keyed by message id (LRU, 800) — when the bot later reports that message
 * with the modern `spam` IQ, the captured token goes with it (no recompute needed).
 * Tokens live in memory only — a restart loses them (fresh ones arrive with new messages).
 */

const MAX_ENTRIES = 800;

function findChild(node, tag) {
  if (!node || !Array.isArray(node.content)) return null;
  for (const c of node.content) {
    if (c && c.tag === tag) return c;
  }
  return null;
}

function toBuffer(content) {
  if (Buffer.isBuffer(content)) return content;
  if (content instanceof Uint8Array) return Buffer.from(content);
  if (typeof content === 'string') return Buffer.from(content, 'binary');
  return null;
}

class TokenStore {
  constructor(logger, max = MAX_ENTRIES) {
    this.logger = logger;
    this.max = max;
    this.map = new Map();
    this.captured = 0;
  }

  ingest(stanza) {
    try {
      if (!stanza || stanza.tag !== 'message') return;
      const reporting = findChild(stanza, 'reporting');
      if (!reporting) return;
      const tokenNode = findChild(reporting, 'reporting_token');
      if (!tokenNode) return;
      const token = toBuffer(tokenNode.content);
      if (!token || token.length < 6) return;

      const id = stanza.attrs && stanza.attrs.id;
      if (!id) return;

      this.map.set(id, { token, capturedAt: Date.now() });
      this.captured++;
      if (this.map.size > this.max) {
        const oldest = this.map.keys().next().value;
        this.map.delete(oldest);
      }
    } catch (e) {
      this.logger && this.logger.debug('token ingest failed', { error: String(e) });
    }
  }

  get(id) {
    const hit = this.map.get(id);
    return hit ? hit.token : null;
  }

  has(id) {
    return this.map.has(id);
  }

  stats() {
    return { captured: this.captured, stored: this.map.size };
  }

  clear() {
    this.map.clear();
  }
}

function attachTokenCapture(sock, tokenStore, logger) {
  const ws = sock && sock.ws;
  if (!ws || typeof ws.on !== 'function') {
    logger && logger.warn('raw socket not available - reporting tokens cannot be captured');
    return () => {};
  }
  const handler = (node) => tokenStore.ingest(node);
  ws.on('CB:message', handler);
  logger && logger.debug('reporting-token capture attached');
  return () => {
    if (typeof ws.off === 'function') ws.off('CB:message', handler);
  };
}

module.exports = { TokenStore, attachTokenCapture, findChild };
