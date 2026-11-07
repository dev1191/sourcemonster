# ---- base ----
FROM node:24-slim AS base
WORKDIR /app

ENV CI=true
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV PNPM_CONFIG_MANAGE_PACKAGE_MANAGER_VERSIONS=false

RUN mkdir -p /pnpm && chmod 777 /pnpm \
 && npm install -g pnpm@latest

# ---- deps ----
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml* ./
RUN pnpm install --frozen-lockfile

# ---- build ----
FROM deps AS build
COPY . .
RUN pnpm build

# ---- runtime ----
FROM base AS runtime
WORKDIR /app

ENV NODE_ENV=production HOST=0.0.0.0 PORT=4321

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml* ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY drizzle ./drizzle
COPY scripts ./scripts

RUN chmod +x scripts/docker-entrypoint.sh \
 && groupadd -r app \
 && useradd -m -r -g app -s /bin/bash app \
 && chown -R app:app /app /pnpm

USER app
EXPOSE 4321
ENTRYPOINT ["./scripts/docker-entrypoint.sh"]
CMD ["node", "./dist/server/entry.mjs"]
