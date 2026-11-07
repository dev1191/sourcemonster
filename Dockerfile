# ---- deps ----
FROM node:24-slim AS deps
WORKDIR /app

ENV CI=true
ENV HOME=/root
ENV PNPM_HOME="/root/.local/share/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN npm install -g pnpm@latest \
 && pnpm config set manage-package-manager-versions false

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml* ./
RUN pnpm install --frozen-lockfile

# ---- build ----
FROM deps AS build
COPY . .
RUN pnpm build

# ---- runtime ----
FROM node:24-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production HOST=0.0.0.0 PORT=4321
ENV HOME="/home/app"
ENV PNPM_HOME="/home/app/.local/share/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN npm install -g pnpm@latest \
 && pnpm config set manage-package-manager-versions false \
 && groupadd -r app \
 && useradd -m -r -g app -s /bin/bash app \
 && mkdir -p /home/app/.local/share/pnpm \
 && chown -R app:app /home/app

COPY --chown=app:app package.json pnpm-lock.yaml pnpm-workspace.yaml* ./
COPY --chown=app:app --from=deps /app/node_modules ./node_modules
COPY --chown=app:app --from=build /app/dist ./dist
COPY --chown=app:app drizzle ./drizzle
COPY --chown=app:app scripts ./scripts

RUN chmod +x scripts/docker-entrypoint.sh \
 && chown -R app:app /app

USER app
EXPOSE 4321
ENTRYPOINT ["./scripts/docker-entrypoint.sh"]
CMD ["node", "./dist/server/entry.mjs"]
