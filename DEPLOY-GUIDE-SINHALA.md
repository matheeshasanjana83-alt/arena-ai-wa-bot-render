# 🚀 Arena AI WA Bot — Deploy Guide (සිංහල)
*(KAVIZ MD V1 · Baileys v7 · free hosting)*

> ⚠️ **Hugging Face ගැන**: 2026 July සිට HF free tier එකේ Docker/Gradio Spaces **PRO subscription** නැතුව create කරන්න බෑ (402 error). ඔයාගේ HF account එක කෙසේ හරි **session backup storage** එකට පාවිච්චි වෙනවා (dataset repo එකක් — ඒක free).

## ✅ 2026-11-07 — දැනටමත් කරලා තියෙන දේවල් (Z.ai විසින්)

| ✅ | දේ |
|---|---|
| ✅ | **GitHub repo** එක හැදිලා code push කරලා: `matheeshasanjana83-alt/arena-ai-wa-bot-render` (private) — Dockerfile + render.yaml + wrapper ඔක්කොම ඇතුළත |
| ✅ | **Docker image** එක GitHub Actions වලින් build වෙලා GHCR එකට push වෙලා: `ghcr.io/matheeshasanjana83-alt/arena-ai-wa-bot:latest` (build ✅ success) |
| ✅ | **HF session backup repo**: `Kavuz/kaviz-session` (private dataset) — bot session එක auto-backup වෙනවා |
| ✅ | **Render registry credential** එක හදලා: `ghcr-kaviz` (`rgc-dbn7q23rjlhs739odng0`) |
| ✅ | **PAIR_KEY** එක තෝරලා: `KAVIZ831504` |
| ⛔ | Render **API එකෙන් service create** කරන්න card ඕන (402 — anti-abuse rule) → පහත Plan A dashboard එකෙන් card නැතුව කරන්න පුළුවන්, නැත්නම් Plan B (bot-hosting.net) |

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

# 🥇 Plan A — Render.com (free · dashboard එකෙන් = no card · 24/7)

> ⚠️ Render **API** එකෙන් service හදන්න card ඕන (Z.ai ට අත්හද බලලා තහවුරු — 402). ඒත් **dashboard එකෙන්** GitHub repo එකෙන් deploy කරන්න card ඕන නෑ (Render official: "No credit card is required"). Repo එක + code ඔක්කොම දැනටමත් push කරලා තියෙන නිසා ඔයාට clicks 5ක් විතරයි!

### Step 1 — Render dashboard එකෙන් deploy කරන්න
1. https://dashboard.render.com → **Sign in with GitHub** (GitHub authorize කරන්න — Render GitHub App එක install වෙනවා)
2. **New +** → **Blueprint** → repo list එකෙන් **`arena-ai-wa-bot-render`** select කරන්න
3. Render එක `render.yaml` කියවලා settings ඔක්කොම auto-fill කරනවා — ඔයා දෙන්න ඕන **env var values 3ක්** විතරයි:

| Env var | Value එක |
|---|---|
| `PAIR_KEY` | `KAVIZ831504` *(මම තෝරලා දුන්න එක — වෙනස් කරන්නත් පුළුවන්)* |
| `HF_TOKEN` | ඔයාගේ Hugging Face token එක (`hf_...`) |
| `HF_REPO` | `Kavuz/kaviz-session` *(session backup repo එක — දැනටමත් හදලා තියෙනවා)* |

4. **Apply** → build එක start වෙනවා (~5 min — Docker build)
5. Build ✅ වුණාම Render එක URL එකක් දෙනවා: `https://arena-ai-wa-bot-xxxx.onrender.com`

> 💡 Render dashboard එක card ඉල්ලුවොත් (account verify එකක් විදිහට): Plan B එකට මාරු වෙන්න, නැත්නම් card එකක් දාලා ඒකෙන් continue කරන්න (free plan එකෙන් charge වෙන්නේ නෑ — 750 free hours/month). Card දැම්මොත් කියන්න — Z.ai ට API එකෙන් service එක 1 min එකේ හදලා දෙන්න පුළුවන් (GHCR image එකත් ready).

### Step 2 — WhatsApp link කරන්න (pairing)
1. Browser එකෙන් open: `https://arena-ai-wa-bot-xxxx.onrender.com/?key=KAVIZ831504`
2. WhatsApp number එක දාන්න (e.g. `94771234567`) → **pairing code** එක එනවා
3. Phone එකේ: WhatsApp → **Settings → Linked devices → Link a device → Link with phone number instead** → code එක දාන්න
4. ✅ Bot online!

### මොකද්ද auto වැඩ කරන්නේ
- 🔄 **Sleep නෑ**: wrapper එක විනාඩි 10 ට සැරයක් තමන්ගෙම URL එක ping කරනවා (Render 15 min ට sleep කරනවා — ping නිසා නිදින්නෙ නෑ)
- 💾 **Session backup**: විනාඩි 20 ට සැරයක් + stop වෙද්දි WhatsApp session එක ඔයාගේ HF dataset repo එකට backup වෙනවා → restart/redeploy වුණත් **ආයෙ pair කරන්න ඕන නෑ**
- 🛠 **ffmpeg + yt-dlp**: Docker image එකේ ffmpeg install වෙලා තියෙනවා, yt-dlp first use එකේදී auto
- 🔎 **Remote debug**: `https://…onrender.com/logs?key=KAVIZ831504` · status: `/status`

### 🆙 Update කරන හැටි
GitHub repo එකේ file එකක් edit කරාම Render auto-redeploy වෙනවා + GitHub Actions එකෙන් GHCR image එකත් auto-build වෙනවා.

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
| **🔑 Tokens rotate කරන්න** | HF + GitHub + Render tokens 3ම chat එකේ paste වුණ නිසා, deploy ඉවර වුණාට පස්සේ ඒවා rotate කරන්න: HF → huggingface.co/settings/tokens · GitHub → github.com/settings/tokens · Render → dashboard → API Keys. අලුත් tokens හදලා Render/GitHub වල ඒ තැන්වල update කරන්න |
| **Disk ephemeral** | download කරපු files restart එකකදී මැකිලා යනවා — normal (Render) |

## 🆘 ප්‍රශ්න ආවොත්
- **Render build fail** → Events/Logs tab එකේ අන්තිම error එක screenshot කරලා එවන්න
- **Pair site open වෙන්නේ නෑ** → URL එකේ `?key=KAVIZ831504` තියෙනවද බලන්න
- **Bot offline** → `/logs?key=KAVIZ831504` එකෙන් console එක බලන්න — `logged out` නම් ආයෙ pair
