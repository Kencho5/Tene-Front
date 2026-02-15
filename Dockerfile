FROM node:20-alpine AS build

WORKDIR /app

RUN npm install -g pnpm

# Copy dependency files first for better layer caching
COPY package.json pnpm-lock.yaml ./

RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# Copy source files (this layer only rebuilds when source changes)
COPY . .

RUN --mount=type=cache,target=/app/.angular \
    pnpm run build

FROM node:20-alpine

WORKDIR /app

# Server bundle is self-contained — no node_modules needed
COPY --from=build /app/dist ./dist

EXPOSE 4000

ENV NODE_ENV=production
ENV PORT=4000

HEALTHCHECK --interval=10s --timeout=3s --start-period=15s --retries=2 \
  CMD node -e "require('http').get('http://localhost:4000/', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "dist/tene/server/server.mjs"]
