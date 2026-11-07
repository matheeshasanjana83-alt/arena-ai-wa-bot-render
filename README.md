---
title: Arena AI WA Bot
emoji: 🤖
colorFrom: green
colorTo: purple
sdk: docker
app_port: 7860
pinned: false
---

# 🤖 Arena AI WA Bot (KAVIZ MD V1) — Deploy Package

Baileys v7 වලින් හැදපු WhatsApp AI bot එක — **Render.com free** (Plan A) හෝ ඕන Docker host එකක 24/7 run වෙන්න හදපු package එක. HF Space metadata මෙතන තියෙන්නේ PRO එකක් තියෙන කාට හරි (2026 Jul ඉඳන් free Docker Spaces නෑ).

## ⚡ ඉක්මන් start එක (Render)
1. `render.yaml` + Dockerfile එක GitHub repo එකක් දාලා → render.com → **New Blueprint**
2. Env vars: `PAIR_KEY`, `HF_TOKEN`, `HF_REPO` (=`Kavuz/kaviz-session`) → Apply
3. `https://<service>.onrender.com/?key=<PAIR_KEY>` එකෙන් number එක දාලා **pairing code** ගන්න
4. WhatsApp → **Linked devices → Link with phone number instead** → code එක දාන්න

## 🔐 Env vars
| Var | අනිවාර්යද | වැඩේ |
|---|---|---|
| `PAIR_KEY` | ✅ | pair site / logs පිටතින් open වෙන එක නවත්තනවා |
| `HF_TOKEN` | optional | session backup එකට (HF Access Token — **Write**) |
| `HF_REPO` | optional | backup dataset — e.g. `Kavuz/kaviz-session` |

`HF_TOKEN` + `HF_REPO` දැම්මොත් restart/redeploy වුණත් WhatsApp session එක auto-restore වෙනවා — ආයෙ pair කරන්න ඕන නෑ.

## 📱 Bot commands
`.ai` `.moviedex` `.download` `.yt` `.song` `.tiktok` `.fb` `.setting` `.mode` … — full list එක `README-BOT.md` එකේ

> වැඩි විස්තර: `DEPLOY-GUIDE-SINHALA.md` එක බලන්න
