FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

RUN npm install -g pnpm && pnpm install --frozen-lockfile

COPY . .

RUN pnpm run build

FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/dist/tene ./dist/tene
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules

ENV PORT=8080
EXPOSE 8080

CMD ["node", "dist/tene/server/server.mjs"]
