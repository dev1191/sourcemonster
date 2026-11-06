# ---- deps ----
FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ---- build ----
FROM deps AS build
COPY . .
RUN pnpm build

# ---- runtime ----
FROM node:22-alpine AS runtime
WORKDIR /app
RUN corepack enable
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4321
COPY package.json pnpm-lock.yaml ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY drizzle ./drizzle
COPY scripts ./scripts
RUN chmod +x scripts/docker-entrypoint.sh \
 && addgroup -S app && adduser -S app -G app
USER app
EXPOSE 4321
ENTRYPOINT ["./scripts/docker-entrypoint.sh"]
CMD ["node", "./dist/server/entry.mjs"]

