# 🚀 Arena AI WA Bot — Deploy Guide (සිංහල)
*(KAVIZ MD V1 · Baileys v7 · free hosting)*

> ⚠️ **Hugging Face ගැන**: 2026 July සිට HF free tier එකේ Docker/Gradio Spaces **PRO subscription** නැතුව create කරන්න බෑ (402 error). ඒ නිසා Plan A = **Render.com** (free, no card). ඔයාගේ HF account එක කෙසේ හරි **session backup storage** එකට පාවිච්චි වෙනවා (dataset repo එකක් — ඒක free).

---

## 🧩 Package එකේ මොනවද

| File | වැඩේ |
|---|---|
| `Dockerfile` | Node 20 + ffmpeg build script (Render + ඕන platform එකකටම) |
| `render.yaml` | **Render Blueprint** — settings ඔක්කොම කලින් හදලා |
| `hf-space.js` | deploy wrapper — **session auto-backup/restore** + **keep-alive self-ping** (sleep නෑ) |
| `README.md` | HF metadata (Render එකට අදාළ නෑ, තියන්න දෙන්න) |
| අනිත් ඔක්කොම | ඔයාගේ bot එකම — bot.js, ai.js, … (කිසිවක් වෙනස් කරලා නෑ) |

---

# 🥇 Plan A — Render.com (free · no card · 24/7)

**ඕන දේවල්:** GitHub account එකක් (ඔයාගේ තියෙනවා) + Render account එකක් (GitHub එකෙන්ම login වෙන්න පුළුවන්)

### Step 1 — GitHub repo එකට code දාන්න
1. github.com → **New repository** → name: `arena-ai-wa-bot-render` → **Private** → Create
2. Repo එකේ **uploading an existing file** link එක click කරන්න
3. මේ package folder එකේ **ඇතුළේ තියෙන files ඔක්කොම** drag & drop (`Dockerfile`, `render.yaml`, `hf-space.js`, `bot.js`, …)
4. **Commit changes**

### Step 2 — Render එකෙන් deploy කරන්න
1. https://render.com → **Sign in with GitHub** → authorize
2. **New +** → **Blueprint** → ඔයාගේ `arena-ai-wa-bot-render` repo එක select කරන්න
3. Render එක `render.yaml` කියවලා settings ඔක්කොම auto-fill කරනවා — ඔයා දෙන්න ඕන **env var values 3ක්** විතරයි:

| Env var | Value එක |
|---|---|
| `PAIR_KEY` | ඔයාගේ pair key එක — e.g. `KAVIZ724810` (මතක තියාගන්න!) |
| `HF_TOKEN` | ඔයාගේ Hugging Face token එක (`hf_...` කියලා පටන් ගන්න එක) |
| `HF_REPO` | `Kavuz/kaviz-session` *(session backup repo එක — මම දැනටමත් හදලා දීලා තියෙනවා)* |

4. **Apply** → build එක start වෙනවා (~5 min — Docker build + npm install)
5. Build ✅ වුණාම Render එක URL එකක් දෙනවා: `https://arena-ai-wa-bot-xxxx.onrender.com`

### Step 3 — WhatsApp link කරන්න (pairing)
1. Browser එකෙන් open: `https://arena-ai-wa-bot-xxxx.onrender.com/?key=<PAIR_KEY>`
2. WhatsApp number එක දාන්න (e.g. `94771234567`) → **pairing code** එක එනවා
3. Phone එකේ: WhatsApp → **Settings → Linked devices → Link a device → Link with phone number instead** → code එක දාන්න
4. ✅ Bot online!

### මොකද්ද auto වැඩ කරන්නේ
- 🔄 **Sleep නෑ**: wrapper එක විනාඩි 10 ට සැරයක් තමන්ගෙම URL එක ping කරනවා (Render 15 min ට sleep කරනවා — ping නිසා නිදින්නෙ නෑ)
- 💾 **Session backup**: විනාඩි 20 ට සැරයක් + stop වෙද්දි WhatsApp session එක ඔයාගේ HF dataset repo එකට backup වෙනවා → restart/redeploy වුණත් **ආයෙ pair කරන්න ඕන නෑ**
- 🛠 **ffmpeg + yt-dlp**: Dockerfile එකෙන් ffmpeg install වෙනවා, yt-dlp first use එකේදී auto
- 🔎 **Remote debug**: `https://…onrender.com/logs?key=<PAIR_KEY>` · status: `/status`

### 🆙 Update කරන හැටි
GitHub repo එකේ file එකක් edit කරාම Render auto-redeploy වෙනවා (autoDeploy: true).

---

# 🥈 Plan B — Bot-Hosting.net (free panel · 256MB)

Render ආසා නැත්නම් / GitHub ඕන නැතුව කරන්න:
1. https://bot-hosting.net → **Start free** → register (no card)
2. Panel එකේ **Create deployment** → Node.js → **Upload archive**
3. ඔයාගේ **මුල් bot zip එකේ** තියෙන `KAVIZ-MD-V1-panel.zip` එක upload → Unarchive
4. Startup file: `index.js` → Start
5. Console එකේ print වෙන **Pair site URL** එකෙන් pair කරන්න

> ⚠️ Free plan: **256MB RAM** (movies/ලොකු downloads වලට ටිකක් අමාරුයි) · **හැම දවස් 4කට සැරයක් panel එකෙන් Renew** click කරන්න ඕන · session restart වුණාම backup නැතුව re-pair

# 🥉 Plan C — Oracle Cloud Always Free VPS (ඇත්තම 24/7 · best)

කාලයක් යන්න ඕන නම් හොඳම එක: ARM 4-core/24GB, free forever — ඒත් signup එකට **credit card එකක්** ඕන + setup ටිකක් technical (ඕන නම් කියන්න, මම guide එකක් හදලා දෙන්නම්).

---

## ⚠️ දැනගෙන ඉන්න

| දේ | විස්තරය |
|---|---|
| **Baileys = unofficial** | number ban risk එකක් තියෙනවා (host එකට අදාළ නෑ) — පරණ/දෙතුන් number එකක් තියාගන්න |
| **Re-pair ඕන වුණොත්** | Phone එකේ Linked devices → පරණ device එක **Log out** කරලා ආයෙ pair කරන්න (device 4 limit) |
| **HF token එක** | chat එකේ paste කරපු නිසා පස්සේ https://huggingface.co/settings/tokens එකෙන් අලුත් token එකක් හදලා Render env var එකේ swap කරන්න එක හොඳ practice එකක් |
| **Disk ephemeral** | download කරපු files restart එකකදී මැකිලා යනවා — normal |

## 🆘 ප්‍රශ්න ආවොත්
- **Render build fail** → Events/Logs tab එකේ අන්තිම error එක screenshot කරලා එවන්න
- **Pair site open වෙන්නේ නෑ** → URL එකේ `?key=<PAIR_KEY>` තියෙනවද බලන්න
- **Bot offline** → `/logs?key=<PAIR_KEY>` එකෙන් console එක බලන්න — `logged out` නම් ආයෙ pair
