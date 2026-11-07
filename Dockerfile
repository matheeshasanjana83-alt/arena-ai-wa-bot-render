# =============================================================
#  KAVIZ MD V1 (Arena AI WA Bot) — Hugging Face Space (free)
#  SDK: docker · app_port: 7860  (pairsite එක PORT env එකෙන් 7860 ට listen කරනවා)
# =============================================================
FROM node:20-slim

# ffmpeg — moviedex/video muxing වලට ඕන · tar — session backup එකට
RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg ca-certificates tar \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# bot files ඔක්කොම
COPY . .

# PORT env එක platform එකෙන් එනවා (Render: auto · HF: 7860) — hf-space.js එකේ default 7860

# deps install — --ignore-scripts: package.json එකේ "postinstall": node launcher.js
# එක නිසා scripts run කර්රේ නැතුව (නැත්නම් docker build එකම bot start වෙලා hang වෙනවා)
RUN npm install --ignore-scripts \
 && npm install --ignore-scripts --no-save @huggingface/hub

# HF Spaces container එක UID 1000 ට run වෙනවා — app folder එකට write permission ඕන
# (auth/, settings.json, .backup/ ඒවා runtime එකේ හැදෙන නිසා)
RUN useradd -m -u 1000 user \
 && chown -R user:user /app

USER user

EXPOSE 7860

# launcher.js = bot එකේම auto-restart system එක — ඒක එහෙමම තියනවා
CMD ["node", "hf-space.js"]
