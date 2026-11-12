const { onMessages } = require('./bot');
const fs = require('fs');
let n = 0;
const mk = (text) => ({ key: { id: 'IN' + (++n), remoteJid: '94771234567@s.whatsapp.net', fromMe: true }, message: { conversation: text } });
(async () => {
    const out = [];
    const send = async (jid, c) => { out.push(c); return { key: { id: 'OUT' + (++n) } }; };
    await onMessages({ type: 'notify', messages: [mk('.menu')] }, send);
    out.forEach((c, i) => console.log(i, Object.keys(c).join(','), (c.caption || c.text || '').split('\n')[0]));
})();
