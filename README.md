# Source Monster 👾

A premium, high-performance web application, CodeCanyon product showcase, and digital growth agency platform built with **Astro 6 SSR**, **PostgreSQL**, **Drizzle ORM**, and **Tailwind CSS**.

---

## 🚀 Key Features

- **Integrated CMS Monolith**: Unified single-application architecture containing the public agency site, CodeCanyon product showcase catalog, and private administrative control center.
- **SSR & Database**: High-speed hybrid server rendering powered by `@astrojs/node` and PostgreSQL via `drizzle-orm` and connection pooling.
- **Admin Control Center** (`/admin`):
  - Stateful session authentication with secure `HttpOnly`, `SameSite=Lax` cookies.
  - CodeCanyon Product CRUD with screenshot gallery and live preview.
  - Zero-Loss Lead Capture pipeline with honeypot bot filtering and pipeline management.
  - Services, Testimonials, and Global Site Settings managers.
- **Dual Storage Driver**: Automated Cloudflare R2 bucket integration with seamless local disk fallback (`STORAGE_DRIVER=local`) for offline development.
- **Email Pipeline**: Contact form and lead notifications powered by **Resend** with sanitized HTML templates.
- **Docker Ready**: One-command reproducible setup with multi-stage `Dockerfile` and `docker-compose.yml`.

---

## 🛠️ Setup & Installation

### 1. Environment Configuration
Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Key variables:
- `DATABASE_URL`: PostgreSQL connection string (e.g. `postgresql://sourcemonster:change-me-locally@localhost:5432/sourcemonster`)
- `SESSION_SECRET`: Long random secret string for session signing
- `RESEND_API_KEY`: API key for email notifications (optional for offline dev)
- `STORAGE_DRIVER`: `local` (default) or `r2`
- `SEED_ADMIN_EMAIL` & `SEED_ADMIN_PASSWORD`: Credentials for the initial administrator

### 2. Install Dependencies
```bash
pnpm install
```

### 3. Database Setup & Migrations
Ensure PostgreSQL is running (or launch via Docker: `docker compose up -d db`), then run:

```bash
# Apply database migrations
pnpm db:migrate

# Seed the initial admin account (reads SEED_ADMIN_* from .env)
pnpm db:seed:admin

# Seed default CodeCanyon products, services, and testimonials
pnpm db:seed:content
```

### 4. Run Development Server
```bash
pnpm dev
```
- Public Site: `http://localhost:4321`
- Product Showcase: `http://localhost:4321/products`
- Admin Control Center: `http://localhost:4321/admin`

---

## 🧪 Testing

Run the automated test suite with Vitest:

```bash
pnpm test
```

Includes validation tests for leads/products, password hashing, and session token verification.

---

## 🐳 Docker Deployment

To launch the entire platform and PostgreSQL with Docker:

```bash
# Build and start services in background
docker compose up -d --build

# Run initial seeding inside the container
docker compose exec app pnpm db:seed:admin
docker compose exec app pnpm db:seed:content
```

---

## 📁 Repository Structure

```text
sourcemonster/
├── drizzle/              # Generated SQL migrations
├── scripts/
│   ├── seed.ts           # Seeder runner (--only=admin | --only=content)
│   └── seeders/          # Admin and content seeders
├── src/
│   ├── actions/          # Astro server actions (e.g., zero-loss lead capture)
│   ├── components/       # Public UI components (Navbar, Services, Contact, etc.)
│   ├── layouts/
│   │   ├── BaseLayout.astro   # Public site layout
│   │   └── AdminLayout.astro  # Admin portal dashboard shell
│   ├── lib/
│   │   ├── auth/         # Password hashing and session management
│   │   ├── db/           # Drizzle client and PostgreSQL schema definitions
│   │   ├── settings/     # Cached global site settings provider
│   │   ├── storage/      # R2 and local filesystem media driver
│   │   └── validation/   # Zod validation schemas
│   ├── middleware.ts     # Route protection middleware
│   └── pages/
│       ├── index.astro        # Public homepage
│       ├── products/          # Dynamic product catalog and detail pages
│       └── admin/             # Authenticated control center routes
├── tests/                # Automated Vitest unit & integration tests
├── Dockerfile            # Multi-stage production container
└── docker-compose.yml    # Development container stack
```

---

© 2026 Source Monster. All Rights Reserved.
