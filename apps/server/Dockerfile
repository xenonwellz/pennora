FROM oven/bun:1.3 AS build
WORKDIR /app

COPY package.json bun.lock ./
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN bun install

COPY . .

RUN bun build apps/server/src/index.ts --outdir dist --target bun

FROM oven/bun:1.3 AS runner
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY apps/server/src/db/migrations ./src/db/migrations

EXPOSE 3001
CMD ["bun", "run", "dist/index.js"]
