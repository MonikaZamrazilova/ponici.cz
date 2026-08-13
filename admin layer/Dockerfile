# Admin vrstva — produkční obraz (Node server)
# Použití: docker build -t ponici-admin . && docker run -p 3101:3101 -v ponici-data:/app/content ponici-admin

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
RUN npm ci --omit=dev --workspace=admin

# data (obsah, audity) — namountovat perzistentní disk na /app/content
VOLUME ["/app/content"]

EXPOSE 3101
CMD ["npm", "run", "start", "-w", "admin"]
