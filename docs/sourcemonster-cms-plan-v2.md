# SourceMonster CMS — Phase-by-Phase Implementation Plan

## 1. Project goal

Convert the existing `dev1191/sourcemonster` Astro website from mostly static content into a manageable product showcase and lead-generation website. The first release should let an administrator manage four CodeCanyon products, publish product detail pages, and receive customer inquiries.

### Keep the architecture simple

- Keep the existing Astro application and its public design.
- Use Astro SSR and Astro server-side endpoints/Actions.
- Use PostgreSQL with Drizzle ORM.
- Use Zod for server-side validation.
- Use server-side sessions for admin authentication.
- Use Cloudflare R2 for uploaded media.
- Keep the existing Resend integration for email notifications.
- Deploy as one Node.js application.

**Do not introduce Turborepo, a separate Hono/Express backend, Nuxt, multi-tenancy, or a page builder for this first release.** Those add complexity without solving a current requirement.

---

## 2. Existing repository assessment

The repository currently uses Astro SSR with the Node standalone adapter, Tailwind styling, Astro Content Collections backed by JSON, and an Astro Action that sends contact email through Resend. The homepage is assembled from reusable Astro components.

Before changing anything:

- [ ] Confirm the current default branch and create a feature branch.
- [ ] Install dependencies using the repository's existing package manager.
- [ ] Run the development server and inspect the public pages.
- [ ] Run a production build and record any existing warnings/errors.
- [ ] Identify all static JSON content and hardcoded page content.
- [ ] Record existing environment variables and deployment commands.
- [ ] Confirm Node.js version and Astro adapter configuration.
- [ ] Keep working components and styles unless there is a clear reason to change them.

Baseline commands (adjust to the package manager and scripts already in the repo):

```bash
pnpm install
pnpm dev
pnpm build
pnpm preview
```

Do not start the CMS implementation until the existing site builds successfully, or any pre-existing build failures are documented.

---

## 3. Target repository structure

This is a suggested structure. Follow existing naming conventions where they already work.

```text
sourcemonster/
├── public/
├── src/
│   ├── actions/
│   ├── components/
│   ├── content/
│   ├── layouts/
│   ├── lib/
│   │   ├── auth/
│   │   ├── db/
│   │   │   ├── schema/
│   │   │   ├── client.ts
│   │   │   └── index.ts
│   │   ├── email/
│   │   ├── storage/
│   │   └── validation/
│   ├── middleware.ts
│   └── pages/
│       ├── index.astro
│       ├── products/
│       │   ├── index.astro
│       │   └── [slug].astro
│       ├── admin/
│       │   ├── login.astro
│       │   ├── index.astro
│       │   ├── products/
│       │   ├── leads/
│       │   └── settings/
│       └── api/
│           ├── products/
│           ├── leads/
│           └── admin/
├── drizzle/
│   └── migrations/
├── scripts/
│   ├── seed.ts                  # seed runner (admin + content)
│   ├── seeders/
│   │   ├── admin-user.ts
│   │   └── static-content.ts
│   └── docker-entrypoint.sh     # migrate, then start the app
├── Dockerfile
├── docker-compose.yml
├── docker-compose.prod.yml
├── .dockerignore
├── astro.config.mjs
├── drizzle.config.ts
├── package.json
└── .env.example
```

### Request flow

```text
Visitor / Administrator
          |
          v
       Astro SSR
          |
          +---- Public pages
          |
          +---- Admin pages (authenticated)
          |
          +---- Server endpoints / Astro Actions
                         |
             +-----------+-----------+
             |           |           |
          Drizzle      R2 storage   Resend
             |
         PostgreSQL
```

All database access, authentication, storage credentials, and email API keys must remain server-side. Never bundle secrets into browser JavaScript or `PUBLIC_` environment variables.

---

## 4. Database design

Create tables incrementally as each phase is implemented. Use UUID primary keys consistently, UTC timestamps, foreign keys, unique constraints, and indexes for frequently queried columns.

### 4.1 `admin_users`

Suggested columns:

- `id` — UUID primary key.
- `name` — administrator display name.
- `email` — unique, normalized email.
- `password_hash` — password hash only; never plaintext.
- `role` — initially just `admin` is sufficient.
- `is_active` — allow access to be disabled without deleting history.
- `last_login_at` — nullable timestamp.
- `created_at`, `updated_at`.

Avoid building a complex role/permission system until multiple staff accounts require it.

### 4.2 `admin_sessions`

Suggested columns:

- `id` — UUID or secure random identifier.
- `admin_user_id` — foreign key.
- `token_hash` — hash of the session token, not the raw token.
- `expires_at` — session expiry.
- `created_at`, `last_seen_at`.

### 4.3 `products`

Suggested columns:

| Column | Purpose |
|---|---|
| `id` | UUID primary key |
| `title` | Product name |
| `slug` | Unique URL slug |
| `short_description` | Product card summary |
| `description` | Full product description |
| `thumbnail_media_id` | Main image reference, nullable initially |
| `codecanyon_url` | Purchase URL |
| `demo_url` | Optional live demo URL |
| `documentation_url` | Optional documentation URL |
| `version` | Current product version |
| `technologies` | Structured list or related table |
| `features` | Structured list or related table |
| `status` | `draft` or `published` |
| `is_featured` | Homepage highlighting |
| `sort_order` | Display order |
| `seo_title` | Optional SEO title |
| `seo_description` | Optional SEO description |
| `published_at` | Nullable timestamp |
| `created_at`, `updated_at` | Audit timestamps |

For features and technologies, choose one consistent representation. A JSON column is acceptable for simple lists; use separate relational tables if they need independent management or querying.

### 4.4 `media`

Stores file metadata; the actual file is stored in R2.

Suggested columns:

- `id`
- `disk` — for example, `r2`.
- `object_key` — key/path in the bucket.
- `original_name`
- `mime_type`
- `size_bytes`
- `width`, `height` — optional image dimensions.
- `alt_text`
- `created_at`

### 4.5 `product_media`

Connects products to gallery images:

- `id`
- `product_id`
- `media_id`
- `caption` — optional.
- `sort_order`
- `created_at`

### 4.6 `leads`

Suggested columns:

| Column | Purpose |
|---|---|
| `id` | UUID primary key |
| `name` | Required contact name |
| `email` | Required contact email |
| `company` | Optional company |
| `subject` | Optional subject |
| `message` | Inquiry message |
| `product_id` | Optional related product |
| `service_id` | Optional related service, added in Phase 5 |
| `budget` | Optional budget range |
| `source_page` | Page that generated the inquiry |
| `status` | `new`, `contacted`, `qualified`, `converted`, `rejected` |
| `admin_notes` | Private notes; never public |
| `created_at`, `updated_at` | Timestamps |

### 4.7 Later tables

Add only when implementing the corresponding feature:

- `services`
- `portfolio_projects`
- `testimonials`
- `pages`
- `site_settings`
- `product_releases` or `product_changelogs`
- `admin_audit_logs` if operationally needed.

Use migrations for all schema changes. Decide whether related records should be archived, unpublished, or deleted before implementing destructive actions.

---

# Phase 1 — Database and project foundation

## Objective

Connect PostgreSQL and Drizzle without changing the public website's appearance or behavior.

## Tasks

### 1. Install dependencies

Example using pnpm (check compatibility with the repo's Node and Astro versions first):

```bash
pnpm add drizzle-orm postgres zod
pnpm add -D drizzle-kit
```

### 2. Configure environment variables

Create `.env.example`:

```dotenv
DATABASE_URL=postgresql://user:password@localhost:5432/sourcemonster
SESSION_SECRET=replace-with-a-long-random-secret
RESEND_API_KEY=
CONTACT_EMAIL=
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
R2_PUBLIC_BASE_URL=

# Docker Compose (local PostgreSQL service)
POSTGRES_USER=sourcemonster
POSTGRES_PASSWORD=change-me-locally
POSTGRES_DB=sourcemonster

# Admin seeder (used only by `db:seed`, never by the running app)
SEED_ADMIN_NAME=Admin
SEED_ADMIN_EMAIL=admin@example.com
SEED_ADMIN_PASSWORD=
```

Rules:

- Keep `.env` out of Git.
- Inside Docker Compose, `DATABASE_URL` uses the service hostname (`db`), not `localhost`: `postgresql://sourcemonster:change-me-locally@db:5432/sourcemonster`.
- `SEED_ADMIN_*` variables are read only by the seed command. Leave `SEED_ADMIN_PASSWORD` empty in `.env.example`; never commit a real password.
- Use separate development and production credentials.
- Never expose secrets through `PUBLIC_` variables.
- Generate a long random session secret.

### 3. Create Drizzle modules

Suggested files:

```text
src/lib/db/client.ts
src/lib/db/schema/admin-users.ts
src/lib/db/schema/admin-sessions.ts
src/lib/db/schema/products.ts
src/lib/db/schema/media.ts
src/lib/db/schema/leads.ts
src/lib/db/index.ts
```

Keep database imports server-only. Configure the connection lifecycle for a long-running Node server; do not create a new connection for every query.

### 4. Configure migrations

Create `drizzle.config.ts` with PostgreSQL dialect, schema path, migration output directory, and `DATABASE_URL` from the environment.

Suggested package scripts:

```json
{
  "db:generate": "drizzle-kit generate",
  "db:migrate": "drizzle-kit migrate",
  "db:studio": "drizzle-kit studio",
  "db:seed": "tsx scripts/seed.ts",
  "db:seed:admin": "tsx scripts/seed.ts --only=admin",
  "db:seed:content": "tsx scripts/seed.ts --only=content"
}
```

Generate and apply migrations using the installed Drizzle Kit version's supported commands. Add `tsx` as a dev dependency to run the seed scripts (`pnpm add -D tsx`).

### 5. Docker and Docker Compose

Provide a reproducible setup so the app and PostgreSQL start with one command. Docker is for local development and simple single-server deployment; it does not change the single-application architecture.

#### Files

```text
Dockerfile
docker-compose.yml          # local development (app + PostgreSQL)
docker-compose.prod.yml     # production overrides (no bind mounts, restart policy)
.dockerignore
scripts/docker-entrypoint.sh
```

#### `Dockerfile` (multi-stage)

Use a multi-stage build so the final image contains only what is needed to run the app. Adjust the Node version to the one the repository already uses.

```dockerfile
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
# Full node_modules (including drizzle-kit and tsx) so `db:migrate` and
# `db:seed` can run inside the container. To slim the image, use
# `pnpm install --prod` here and run migrations/seeds from a separate
# one-off service built from the `deps` stage.
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
```

Notes:

- The Astro Node standalone adapter produces `dist/server/entry.mjs`; confirm the path against the repo's build output.
- Run as a non-root user.
- Build-time values must not include secrets. Secrets are provided at runtime through environment variables.
- The runtime image keeps dev dependencies so migrations and seeds can run in the container. This trades a larger image for simpler operations; switch to a separate one-off `migrate` service later if image size matters.

#### `scripts/docker-entrypoint.sh`

```sh
#!/bin/sh
set -e

if [ "${RUN_MIGRATIONS:-false}" = "true" ]; then
  echo "Running database migrations..."
  pnpm db:migrate
fi

exec "$@"
```

- Run migrations automatically only in development (`RUN_MIGRATIONS=true` in `docker-compose.yml`).
- In production, prefer running migrations as a controlled deployment step (see Phase 7), so multiple app replicas never migrate concurrently.
- Never run seeders from the entrypoint. Seeding is an explicit command.

#### `docker-compose.yml` (development)

```yaml
services:
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    ports:
      - "127.0.0.1:5432:5432"   # bind to localhost only
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 5s
      timeout: 5s
      retries: 10

  app:
    build:
      context: .
      target: runtime
    restart: unless-stopped
    env_file: .env
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}
      RUN_MIGRATIONS: "true"
    ports:
      - "4321:4321"
    depends_on:
      db:
        condition: service_healthy

volumes:
  pgdata:
```

Optional: for hot reload during development, add a separate `dev` service (or a `docker-compose.override.yml`) that bind-mounts the source and runs `pnpm dev --host`, instead of using the production image for day-to-day coding.

#### `docker-compose.prod.yml` (production overrides)

- No source bind mounts.
- Do not publish the PostgreSQL port; keep the database on the internal Docker network only.
- Set `RUN_MIGRATIONS: "false"` and run migrations as a separate step.
- Provide secrets through the host's secret mechanism or an untracked env file, never through committed files.
- Add a reverse proxy (Caddy or Nginx) for HTTPS, or use the host's existing proxy.

#### `.dockerignore`

```text
node_modules
dist
.git
.env
.env.*
!.env.example
*.log
.vscode
```

Never copy `.env` into an image.

#### Typical commands

```bash
cp .env.example .env              # then fill in values
docker compose up -d --build      # start PostgreSQL + app (migrations run on start in dev)
docker compose exec app pnpm db:seed   # seed admin + static content (explicit step)
docker compose logs -f app
docker compose down               # stop; data persists in the pgdata volume
docker compose down -v            # stop AND delete database data (destructive)
```

## Acceptance criteria

- [ ] `docker compose up -d --build` starts PostgreSQL and the app from a clean checkout.
- [ ] The app waits for a healthy database before starting.
- [ ] Database data persists across restarts through a named volume.
- [ ] The image runs as a non-root user and contains no `.env` or secrets.
- [ ] `docker compose exec app pnpm db:migrate` applies migrations to a clean database.
- [ ] Existing Astro development server still works.
- [ ] Production build succeeds.
- [ ] Application can connect to PostgreSQL.
- [ ] Drizzle schema and migrations are committed.
- [ ] A clean database can be created using migrations.
- [ ] Secrets are not exposed to browser bundles.
- [ ] No public-site regression is introduced.

**Phase 1 is complete only when all criteria pass.**

---

# Phase 2 — Admin authentication and dashboard shell

## Objective

Create a private admin area before adding content-management features.

## Suggested routes

```text
/admin/login
/admin
/admin/products
/admin/products/new
/admin/products/[id]/edit
/admin/leads
/admin/settings
```

## Authentication requirements

Implement:

1. Email/password login.
2. Password hashing with Argon2id or bcrypt.
3. Random server-side sessions.
4. HTTP-only cookies.
5. Session expiry and invalidation.
6. Logout.
7. Protected admin pages.
8. Protected admin mutations and API endpoints.
9. Login rate limiting.
10. CSRF protection for cookie-authenticated state-changing requests.

Production cookies should use `HttpOnly`, `Secure`, and an appropriate `SameSite` policy. Do not store session tokens in localStorage.

## Initial administrator setup

Do not create a public admin registration page. Create the first administrator with an explicit seed command, never through the web app. Never hardcode a production password in source code.

### Admin user seeder

Files:

```text
scripts/seed.ts                  # entry point; supports --only=admin|content
scripts/seeders/admin-user.ts    # admin seeder
```

Run with:

```bash
pnpm db:seed:admin
# or, in Docker:
docker compose exec app pnpm db:seed:admin
```

Behavior:

1. Read `SEED_ADMIN_NAME`, `SEED_ADMIN_EMAIL`, and `SEED_ADMIN_PASSWORD` from the environment.
2. Validate them with Zod: normalized, valid email; password of at least 12 characters. Fail with a clear message if any value is missing.
3. In production (`NODE_ENV=production`), refuse to run if `SEED_ADMIN_PASSWORD` is missing or equals a known placeholder value. Do not generate a default password.
4. Hash the password with the same Argon2id/bcrypt helper the login flow uses. Never store or log the plaintext password.
5. Make the seeder idempotent: if an admin with that email already exists, skip it and print a notice. Do not overwrite the existing password unless an explicit flag is passed (for example, `--reset-password`).
6. Set `role = admin` and `is_active = true`.
7. Print only the email and a success message. Never print the password or hash.
8. Exit with a non-zero code on failure so CI and deployment scripts can detect it.

Development convenience: a documented local-only default (for example, `admin@example.com`) is acceptable in `.env.example` as long as the password is left blank and the seeder refuses placeholder credentials in production.

After the first admin exists, remove `SEED_ADMIN_PASSWORD` from the production environment.

## Admin layout

Create a reusable layout with:

- Sidebar navigation.
- Header/top bar.
- Current administrator identity.
- Logout action.
- Responsive mobile navigation.
- Main content area.
- Consistent loading, empty, success, and error states.

Initial navigation: Dashboard, Products, Leads, Settings. Add more sections when their phases are implemented.

## Authorization rules

- Protect every admin page.
- Protect every admin endpoint and mutation independently.
- Do not rely on hiding buttons in the UI.
- Re-check the session and permission on the server.
- Return suitable `401` and `403` responses for API requests.

## Acceptance criteria

- [ ] Anonymous visitors cannot access admin pages.
- [ ] Anonymous requests cannot call admin mutations.
- [ ] Valid credentials create a server-side session.
- [ ] Logout invalidates the session.
- [ ] Expired sessions are rejected.
- [ ] Login attempts are rate-limited.
- [ ] Production cookies have secure settings.
- [ ] Initial admin is created through a controlled setup process.
- [ ] `db:seed:admin` creates the admin, hashes the password, and is safe to run twice.
- [ ] The admin seeder refuses to run in production with a missing or placeholder password.

---

# Phase 3 — Product CMS and public product pages

## Objective

Manage the four CodeCanyon products through the admin dashboard and render their public pages from PostgreSQL. This is the highest-priority feature phase.

## Product form fields

### Basic information

- Product title.
- URL slug.
- Short description.
- Full description.
- Thumbnail.
- Category, only if categories are useful.

### Links

- CodeCanyon purchase URL.
- Live demo URL, if available.
- Documentation URL, if available.
- Support/contact URL, if applicable.

### Product details

- Version.
- Technologies.
- Features.
- Requirements.
- Changelog/release notes.

### Publishing and SEO

- Draft/published status.
- Featured toggle.
- Display order.
- SEO title.
- SEO description.
- Social sharing image.

Only publish claims, features, compatibility, ratings, and customer numbers that can be verified. Do not render arbitrary untrusted HTML from product descriptions.

## Admin screens

Build:

- Product list with search and status filter.
- Create product.
- Edit product.
- Preview product.
- Publish/unpublish.
- Reorder products.
- Manage screenshots/gallery.
- Delete or archive with confirmation.

The product list should show thumbnail, title, status, featured state, updated date, and actions. Add pagination if the list grows.

## Image upload flow

Use Cloudflare R2 for thumbnails and screenshots.

1. Admin selects an image.
2. Server validates file type, size, and content where practical.
3. Server generates a safe object key.
4. Server uploads the object to R2.
5. Server stores metadata in PostgreSQL.
6. Admin assigns the media to a product.
7. Public pages display the image through a configured public URL or controlled delivery route.

Security requirements:

- Allow only required image formats.
- Verify MIME type and file signature where practical.
- Enforce a maximum file size.
- Generate object keys on the server; do not trust user filenames.
- Reject executable uploads.
- Require admin authentication.
- Define cleanup for abandoned uploads and deleted media.
- Do not assume an R2 bucket is publicly readable; configure access intentionally.

## Public routes

```text
/products
/products/[slug]
```

The listing page should query published products only and show thumbnail, title, short description, and a detail link. Add featured products and sorting where appropriate.

A product detail page should include:

1. Product name and concise pitch.
2. Main image.
3. Features.
4. Technologies.
5. Screenshots/gallery.
6. Demo link, when available.
7. Documentation link, when available.
8. CodeCanyon purchase CTA.
9. Separate customization/custom-development CTA.
10. Related products, if useful.

Keep the purchase CTA distinct from the custom-development inquiry CTA. They serve different visitor intents.

## SEO

Each product page should have:

- Unique title and meta description.
- Canonical URL.
- Open Graph metadata.
- Descriptive image alt text.
- Stable slug.
- Appropriate structured data only when the page genuinely qualifies.

Generate a sitemap from published content. Draft products must not be indexed or exposed as published content.

## Static content seeder

Import the content that currently lives in Astro Content Collections (JSON) and hardcoded components into PostgreSQL, so the CMS starts with the real site content instead of an empty database.

Files:

```text
scripts/seeders/static-content.ts   # reads existing JSON, upserts into the database
src/content/**/*.json               # source data (kept until migration is verified)
public/images/**                    # existing local images referenced by the content
```

Run with:

```bash
pnpm db:seed:content
# or everything (admin + content):
pnpm db:seed
```

Behavior:

1. Read the existing JSON collection files directly from `src/content/` (or from a one-time exported snapshot kept under `scripts/seeders/data/`).
2. Map each record to the new schema (products first; services, portfolio, and testimonials once Phase 5 tables exist).
3. Validate every record with the same Zod schemas the admin forms use. Report invalid records instead of silently skipping them.
4. Use **upserts keyed on `slug`**, so the seeder is idempotent. Running it twice must not create duplicates.
5. Do not overwrite content an administrator has edited. By default, only insert missing records; overwrite only with an explicit `--force` flag.
6. Import images: upload existing local images to R2 (or copy them to local storage in development), create `media` rows, and link them through `thumbnail_media_id` / `product_media`. Skip images already imported (match on a stable object key).
7. Default imported products to `draft`. Publish only after the admin verifies descriptions, links, and claims (see the checklist below).
8. Run inside a transaction per entity type so a failure leaves no half-imported data.
9. Print a summary: created, skipped (already exists), and failed counts.

Rules:

- Seed only content that exists and is accurate. Do not invent products, testimonials, statistics, or client names to fill gaps.
- Keep seed data separate from test fixtures. Tests use their own fixtures and a separate database.
- Local development without R2 credentials: allow a `STORAGE_DRIVER=local` mode that writes to a gitignored directory so the seeder and uploads still work offline.
- Keep the original JSON files until the database-backed pages have been verified in production, then remove them in a separate commit.

## Migrate the four existing products

Use the static content seeder for the initial import, then review each product in the admin dashboard. For each product:

- [ ] Verify product name and claims.
- [ ] Add accurate short and full descriptions.
- [ ] Add CodeCanyon URL.
- [ ] Add working demo URL, if available.
- [ ] Add documentation URL, if available.
- [ ] Upload thumbnail and screenshots.
- [ ] Add verified features and technologies.
- [ ] Add SEO metadata.
- [ ] Preview on desktop and mobile.
- [ ] Publish after review.

## Acceptance criteria

- [ ] Admin can create, edit, preview, publish, and unpublish products.
- [ ] Admin can upload thumbnails and multiple screenshots.
- [ ] Public listing reads from PostgreSQL.
- [ ] Product detail pages use stable slugs.
- [ ] Draft products are not publicly exposed as published content.
- [ ] Purchase, demo, and documentation links work.
- [ ] Custom-development CTA is distinct.
- [ ] Product pages have unique SEO metadata.
- [ ] Existing visual design remains consistent.
- [ ] `db:seed:content` imports the four existing products from the current static content.
- [ ] The content seeder is idempotent and does not overwrite admin edits without `--force`.
- [ ] Seeded products start as drafts and images are linked through `media`.

---

# Phase 4 — Lead capture and inquiry management

## Objective

Capture inquiries from people interested in product customization, integrations, or custom development.

A product showcase alone does not guarantee direct clients. Clear service positioning, credible examples, and a simple inquiry path are also necessary.

## Public inquiry form

Possible fields:

- Name.
- Email.
- Company (optional).
- Related product/service (optional).
- Budget range (optional).
- Message.
- Privacy notice/consent where appropriate.

Do not ask for unnecessary information.

## Server-side submission flow

1. Validate all fields on the server using Zod.
2. Normalize and validate the email address.
3. Apply rate limiting.
4. Add spam protection, such as a honeypot and/or an appropriate challenge.
5. Save the lead in PostgreSQL.
6. Send a notification through Resend.
7. Return a safe success response.

**Save the lead before sending the email.** If email delivery fails, the inquiry must remain stored. Consider logging notification failure and providing a retry mechanism later.

Escape user-submitted values before inserting them into HTML email templates. Never return stack traces or internal error details to visitors.

## Email notification contents

- Lead name and email.
- Company, if supplied.
- Related product/service.
- Budget, if supplied.
- Message.
- Source page.
- Link to the admin lead record.

Do not include private admin notes or secrets in notification emails.

## Admin lead management

Lead list:

- Name.
- Email.
- Related product/service.
- Status.
- Date received.

Lead detail:

- Full message and contact details.
- Source page.
- Related product/service.
- Private admin notes.
- Status update.

Suggested statuses: `new`, `contacted`, `qualified`, `converted`, `rejected`.

Record product/source attribution. Do not label simple inquiry counts as unique visitors or conversion rates unless reliable visitor/event tracking also exists.

## Acceptance criteria

- [ ] Public form validates server-side.
- [ ] Valid inquiries are saved to PostgreSQL.
- [ ] Email notification is attempted after persistence.
- [ ] Email failure does not lose a lead.
- [ ] Spam and repeated submissions are controlled.
- [ ] Admin can view leads and update status.
- [ ] Admin notes are private.
- [ ] Leads can be attributed to products or services.

---

# Phase 5 — Services, portfolio, and testimonials

## Objective

Move the remaining important business content into the CMS after product and lead workflows are stable.

## Services

Suggested fields:

- Title and slug.
- Short and full description.
- Icon/image.
- Features or deliverables.
- Sort order.
- Published status.
- SEO metadata.

Only list services the business can genuinely deliver. Examples might include backend API development, Laravel development, Node.js development, Vue/Astro frontend work, and third-party integrations.

## Portfolio projects

Suggested fields:

- Project title and slug.
- Summary and full description.
- Client name, only with permission.
- Industry/category.
- Technologies.
- Thumbnail and gallery.
- Demo URL.
- Published status.
- SEO metadata.

Do not publish confidential client information, private screenshots, or unsupported performance claims.

## Testimonials

Suggested fields:

- Client display name.
- Role/company, if approved.
- Testimonial text.
- Avatar, optional.
- Related project, optional.
- Display order.
- Published status.

Only publish genuine testimonials with permission. Do not create fictional client quotes.

## Other static content

Move team members or workflow steps into the CMS only if they need regular editing. Content that rarely changes can remain static configuration.

## Extend the content seeder

When the Phase 5 tables are added, extend `scripts/seeders/static-content.ts` to import the existing services, portfolio projects, and testimonials from the current static content. Keep the same rules: upsert by slug, validate with Zod, idempotent, no invented content, and import only testimonials that are genuine and approved.

## Acceptance criteria

- [ ] Admin can manage services.
- [ ] Admin can manage portfolio projects.
- [ ] Admin can manage testimonials.
- [ ] Public pages show published content only.
- [ ] Existing content is migrated accurately.
- [ ] Content changes do not require code deployment.

---

# Phase 6 — Site settings and editable pages

## Objective

Make frequently changed website information manageable without building an unrestricted page builder.

## Site settings

Possible settings:

- Site name.
- Logo and favicon.
- Contact email.
- Public phone number, if desired.
- Social profile URLs.
- Default SEO title and description.
- Default social sharing image.
- Footer text.

Use known, validated setting keys. Do not accept arbitrary executable configuration or scripts.

## Navigation

If navigation needs to be editable, store structured entries containing label, URL, target behavior, display order, and visibility. Validate URLs and do not allow arbitrary HTML or JavaScript.

## Basic page management

For a small number of editable pages, a `pages` table can contain:

- Title.
- Slug.
- Structured content or a carefully selected rich-text format.
- SEO title and description.
- Draft/published status.
- Published timestamp.

Start with known page templates. Do not build a drag-and-drop page builder unless a real use case appears.

## Acceptance criteria

- [ ] Admin can edit approved site settings.
- [ ] Public layout reads settings safely.
- [ ] Navigation is editable if required.
- [ ] Selected pages can be edited.
- [ ] Invalid URLs and unsafe HTML are rejected or safely handled.
- [ ] Default SEO metadata is available as a fallback.

---

# Phase 7 — Security, testing, and production deployment

## Objective

Prepare the CMS for real visitors and administrator use.

## Security checklist

### Authentication and authorization

- [ ] Passwords are securely hashed.
- [ ] Sessions are random, server-side, and expiring.
- [ ] Cookies use secure production flags.
- [ ] Login is rate-limited.
- [ ] Admin pages and APIs enforce authentication.
- [ ] Cookie-authenticated state changes have CSRF protection.
- [ ] Logout invalidates the server-side session.
- [ ] Admin setup is not publicly accessible after initialization.

### Input and output handling

- [ ] All mutations validate input server-side.
- [ ] User content is escaped when rendered.
- [ ] Untrusted HTML is not rendered directly.
- [ ] Email templates escape submitted values.
- [ ] Database queries use parameterized Drizzle operations.
- [ ] Public endpoints return only public fields.
- [ ] Errors do not expose secrets or stack traces.

### Uploads

- [ ] Uploads require admin authentication.
- [ ] File type and size are restricted.
- [ ] Object keys are generated by the server.
- [ ] Uploads cannot execute as server code.
- [ ] Deleted/abandoned media cleanup is defined.

### Operations

- [ ] HTTPS is enabled.
- [ ] Production secrets are outside Git.
- [ ] Database backups are configured and restore-tested.
- [ ] R2 credentials have only required permissions.
- [ ] Logs do not contain passwords, session tokens, or secret keys.
- [ ] Dependencies are reviewed and updated deliberately.
- [ ] Docker image runs as non-root and contains no secrets or `.env` file.
- [ ] The PostgreSQL port is not published publicly in production.
- [ ] Seed credentials are removed from the production environment after the first admin is created.
- [ ] Seeders are never run automatically on deploy.

## Testing

Add automated tests for:

- Product validation and slug uniqueness.
- Public product filtering.
- Admin authentication.
- Session expiry and logout.
- Unauthorized admin endpoint access.
- Lead validation and persistence.
- Email failure after lead persistence.
- Upload validation.
- Draft versus published content.
- Admin seeder: creates the admin, is idempotent, rejects weak or placeholder passwords in production.
- Content seeder: idempotent upserts, no duplicates on a second run, no overwrite without `--force`, invalid records reported.

Manual end-to-end checks:

- Start from a clean checkout with `docker compose up -d --build`, seed, and log in.

- Browse public pages on desktop and mobile.
- Log in and log out.
- Create and publish a product.
- Open the product detail page.
- Submit an inquiry.
- Confirm it appears in the admin dashboard.
- Simulate email failure and confirm the lead remains stored.
- Confirm draft products are not publicly visible.
- Confirm unauthenticated users cannot perform admin operations.

## Production deployment sequence

1. Provision PostgreSQL and create a dedicated database user.
2. Configure production environment variables.
3. Configure the R2 bucket and least-privilege credentials.
4. Configure Resend and verify the sending domain.
5. Build the Docker image (`docker compose -f docker-compose.yml -f docker-compose.prod.yml build`).
6. Run migrations as a controlled deployment step (for example, `docker compose run --rm app pnpm db:migrate`) before starting the new app version.
7. On first deployment only, run `db:seed:admin` with a strong `SEED_ADMIN_PASSWORD`, then remove that variable. Run `db:seed:content` once to import the existing content, then review and publish in the admin dashboard.
8. Start the application (`docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d`) or use the existing Node.js deployment approach.
9. Configure reverse proxy and HTTPS.
10. Test public pages, admin login, uploads, and inquiry submission.
11. Confirm backups and recovery procedures.

Keep application releases and database migrations compatible. Do not make undocumented production schema changes manually. Never run seeders automatically on every deploy.

## Acceptance criteria

- [ ] Production build succeeds.
- [ ] Critical automated tests pass.
- [ ] Manual end-to-end tests pass.
- [ ] Security checks pass.
- [ ] HTTPS and secrets are configured.
- [ ] Database backup and restore process is documented.
- [ ] Public and admin workflows work in production.

---

## 5. Suggested server-side API routes

Astro endpoints can provide JSON APIs where useful. Astro Actions may be preferable for some form submissions. Avoid implementing the same operation twice through both mechanisms.

| Method | Endpoint | Purpose | Access |
|---|---|---|---|
| GET | `/api/products` | List published products | Public |
| GET | `/api/products/[slug]` | Get one published product | Public |
| POST | `/api/leads` | Submit inquiry | Public, rate-limited |
| POST | `/api/admin/login` | Create admin session | Public, rate-limited |
| POST | `/api/admin/logout` | Invalidate session | Admin |
| GET | `/api/admin/products` | List all products | Admin |
| POST | `/api/admin/products` | Create product | Admin |
| PATCH | `/api/admin/products/[id]` | Update product | Admin |
| DELETE | `/api/admin/products/[id]` | Delete/archive product | Admin |
| POST | `/api/admin/media` | Upload media | Admin |
| GET | `/api/admin/leads` | List leads | Admin |
| PATCH | `/api/admin/leads/[id]` | Update lead status/notes | Admin |

For every endpoint:

- Validate path parameters and request bodies.
- Enforce authorization on the server.
- Return appropriate HTTP status codes.
- Avoid exposing internal database fields.
- Use consistent error responses.
- Add pagination to potentially large lists.

---

## 6. Recommended first release scope

Do not wait until every possible CMS feature is complete. Launch the first useful version with:

- Existing public website.
- Docker/Docker Compose setup for local and production runs.
- Admin login, with the first admin created by the seeder.
- Static content seeder for the four existing products.
- Product CRUD for the four products.
- Product screenshots and media management.
- Public product listing and detail pages.
- CodeCanyon purchase links.
- Custom-development inquiry forms.
- Lead storage and email notifications.
- Basic SEO metadata.

Add services, portfolio, testimonials, and site settings after the first release is stable.

---

## 7. Conversion and content recommendations

The website serves two distinct visitor intents:

1. A visitor wants to purchase an existing CodeCanyon product.
2. A visitor wants customization, integration, or custom development.

Keep these actions visually distinct on product pages:

- Primary: **Buy on CodeCanyon**.
- Secondary: **Request customization / discuss a project**.
- Supporting: View demo and read documentation, where available.

Build trust using real evidence:

- Working demos.
- Accurate screenshots.
- Clear feature lists.
- Documentation.
- Genuine testimonials.
- Portfolio projects that can be publicly shared.
- Clear contact information and support expectations.

Do not use fake reviews, invented client logos, inflated statistics, or unsupported claims. A product showcase alone does not guarantee direct clients; the quality of the offer, proof, and inquiry path matters.

---

## 8. Development rules and commit plan

Follow these rules throughout implementation:

1. Preserve the existing Astro project and public design.
2. Do not introduce Turborepo for this single-application CMS.
3. Do not create a separate backend service without a concrete requirement.
4. Keep database access in server-only modules.
5. Keep business logic out of presentation components.
6. Validate all external input on the server.
7. Restrict public queries to published content.
8. Protect every admin operation on the server.
9. Use migrations for database changes.
10. Keep secrets out of Git and browser bundles.
11. Do not add a page builder or blog before product and lead workflows work.
12. Build and test after each phase.
13. Commit each completed phase separately.
14. Seeders must be idempotent, validated, and run only by explicit command, never automatically on deploy.
15. Never commit real credentials; seed credentials come from environment variables.

Suggested commits:

```text
chore: prepare astro app for cms
feat: add postgres and drizzle schema
chore: add dockerfile and docker compose setup
feat: add admin authentication
feat: add admin user seeder
feat: add admin dashboard layout
feat: add product management
feat: add r2 media uploads
feat: add static content seeder
feat: render dynamic product pages
feat: add lead capture and management
feat: add services and portfolio cms
feat: add testimonials and site settings
test: add cms security and integration tests
docs: document cms deployment
```

---

## 9. Definition of done

The first release is ready when:

- [ ] Existing SourceMonster website still works.
- [ ] An administrator can log in securely.
- [ ] All four products can be managed without editing source files.
- [ ] Product images and screenshots are stored in R2.
- [ ] Public product pages are generated from PostgreSQL.
- [ ] Product pages contain working CodeCanyon and demo links where available.
- [ ] Visitors can request customization or development work.
- [ ] Inquiries are saved and visible in the admin dashboard.
- [ ] Email notification failure does not lose inquiries.
- [ ] Published content has appropriate SEO metadata.
- [ ] Draft content is not exposed publicly.
- [ ] Deployment, migrations, backups, and environment variables are documented.
- [ ] A new developer can run `docker compose up -d --build`, seed the admin and content, and log in without manual database setup.
- [ ] The existing static content is imported into PostgreSQL by an idempotent seeder.

## Final architecture decision

**Astro SSR + Astro server-side endpoints/Actions + PostgreSQL + Drizzle ORM + Zod + Cloudflare R2 + Resend, packaged with Docker/Docker Compose.**

Keep the CMS inside the existing SourceMonster repository and deploy it as one application. This meets the current requirements with less operational complexity. A separate API can be extracted later if another application genuinely needs to consume it.
