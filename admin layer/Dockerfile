# Admin vrstva — produkční obraz (Node server)
# Použití: docker build -t ponici-admin . && docker run -p 3101:3101 -v ponici-data:/app/content ponici-admin
#
# Obsah (content/) se kopíruje do /app/seed-content jako verzovaný seed.
# Při startu kontejneru se spustí scripts/seed-content.sh, který zkopíruje
# seed na perzistentní disk /app/content POUZE když je disk prázdný
# (první deploy). Existující data na disku se nikdy nepřepisují.

FROM node:22-bookworm-slim AS build
WORKDIR /app

# celý workspace (core, ui, admin)
COPY package.json package-lock.json ./
COPY packages packages
COPY apps/admin apps/admin
RUN npm ci --workspace=admin

RUN npm run build -w admin

FROM node:22-bookworm-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3101

COPY package.json package-lock.json ./
COPY packages packages
COPY apps/admin apps/admin
COPY scripts/seed-content.sh scripts/seed-content.sh
# verzovaný obsah jako initial seed (nikdy se nepřepisuje existující disk)
COPY content /app/seed-content
RUN npm ci --omit=dev --workspace=admin

# data (obsah, audity) — namountovat perzistentní disk na /app/content
VOLUME ["/app/content"]

EXPOSE 3101
# seed (jen pokud je disk prázdný) → start adminu
CMD ["sh", "-c", "sh scripts/seed-content.sh && npm run start -w admin"]
