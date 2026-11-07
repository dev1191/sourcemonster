# Source Monster 👾

A premium, high-performance web application, CodeCanyon product showcase, and digital growth agency platform built with **Astro 6 SSR**, **PostgreSQL**, **Drizzle ORM**, **Tailwind CSS**, and **Starwind UI**.

---

## 🚀 Key Features

- **Integrated CMS Monolith**: Unified single-application architecture containing the public agency site, CodeCanyon product showcase catalog, and private administrative control center.
- **Dedicated Services Layer (`src/services/`)**: Clean, typed business logic layer separating database queries, Drizzle operations, and storage workflows from presentation templates and Astro page routes.
- **SSR & Database**: High-speed hybrid server rendering powered by `@astrojs/node` and PostgreSQL via `drizzle-orm` with connection pooling.
- **Admin Control Center** (`/admin`):
  - Stateful session authentication with secure `HttpOnly`, `SameSite=Lax` cookies.
  - **CodeCanyon Products & Add-ons CRUD**: Comprehensive management of main products and companion add-on modules, complete with multi-screenshot galleries, external marketplace links, live demos, and documentation links.
  - **Reusable Table & Search Filter System**: Custom `<Table>` component with live zero-latency client-side search (`/` hotkey, `Esc` clear), server-side query filters, status tabs, and dynamic empty states.
  - **Zero-Loss Lead Capture**: Lead capture pipeline with honeypot bot filtering, pipeline status updates, and admin notes.
  - **Content Management**: Services, Testimonials, and Global Site Settings managers with live previews.
- **Starwind UI Design System**: Tailored dark-mode UI components (`Table`, `Button`, `Card`, `Dropzone`, `FeedbackAlert`, `ThemeToggle`) built with Astro and Tailwind Variants.
- **Dual Storage Driver**: Automated Cloudflare R2 bucket integration with seamless local disk fallback (`STORAGE_DRIVER=local`) for offline development.
- **Email Pipeline**: Contact form and lead notifications powered by **Resend** with sanitized HTML templates.
- **Docker & CI/CD Ready**: Multi-stage `Dockerfile`, `docker-compose.yml`, and GitHub Actions automated deployment pipeline with Docker build cache cleanup.

---

## 🛠️ Setup & Installation

### 1. Environment Configuration
Copy `.env.example` to `.env` and configure your credentials:

```bash
cp .env.example .env
```

Key environment variables:
- `DATABASE_URL`: PostgreSQL connection string (e.g. `postgresql://sourcemonster:change-me-locally@localhost:5432/sourcemonster`)
- `SESSION_SECRET`: Long random secret string for cryptographic session signing
- `RESEND_API_KEY`: API key for email notifications (optional for local offline dev)
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

## 🏗️ Architecture & Services Layer

All backend operations and data mutations are consolidated under `src/services/`:

| Service | File | Responsibilities |
| :--- | :--- | :--- |
| **Products** | `src/services/products.service.ts` | Product catalog retrieval, single product detail with gallery, product creation, updates, and deletion. |
| **Add-ons** | `src/services/addons.service.ts` | Companion module listings by parent product, gallery management, creation, updates, and deletion. |
| **Leads** | `src/services/leads.service.ts` | Lead persistence, status transitions, search/filtering, notes, and zero-loss lead capture. |
| **Services** | `src/services/services.service.ts` | Bespoke service offerings CRUD and status management. |
| **Testimonials** | `src/services/testimonials.service.ts` | Client endorsements, quotes, and social proof CRUD. |
| **Dashboard** | `src/services/dashboard.service.ts` | Aggregated analytics, recent activity streams, and platform KPIs. |

---

## 🎨 UI & Table Component System

The project uses a custom UI abstraction layer in `src/components/ui/` wrapping Starwind primitives:

```astro
---
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui";
---

<Table
  searchable={true}
  searchPlaceholder="Search records..."
  filters={[
    { label: "All", value: "all", href: "?status=all", active: true },
    { label: "Active", value: "active", href: "?status=active" },
  ]}
  isEmpty={items.length === 0}
  emptyTitle="No items found"
  emptySubtitle="Get started by creating your first item."
>
  <TableHeader>
    <TableRow>
      <TableHead>Title</TableHead>
      <TableHead>Status</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {items.map((item) => (
      <TableRow>
        <TableCell>{item.title}</TableCell>
        <TableCell>{item.status}</TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

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
├── .github/workflows/    # CI/CD automated deployment workflow
├── drizzle/              # Generated SQL migrations
├── scripts/
│   ├── seed.ts           # Seeder runner (--only=admin | --only=content)
│   └── seeders/          # Admin and content seeders
├── src/
│   ├── actions/          # Astro server actions (e.g., zero-loss lead capture)
│   ├── components/       # UI Components
│   │   ├── admin/        # Admin header, sidebar, and layout parts
│   │   ├── starwind/     # Starwind design system primitives
│   │   └── ui/           # Reusable Table, Button, Card, Dropzone, Alerts
│   ├── layouts/
│   │   ├── BaseLayout.astro   # Public site layout
│   │   └── AdminLayout.astro  # Admin portal dashboard shell
│   ├── lib/
│   │   ├── auth/         # Password hashing and session management
│   │   ├── db/           # Drizzle client and PostgreSQL schema definitions
│   │   ├── settings/     # Cached global site settings provider
│   │   ├── storage/      # R2 and local filesystem media driver
│   │   └── validation/   # Zod validation schemas
│   ├── services/         # Business logic layer (products, addons, leads, etc.)
│   ├── middleware.ts     # Route protection middleware
│   └── pages/
│       ├── index.astro        # Public homepage
│       ├── products/          # Dynamic product catalog and detail pages
│       └── admin/             # Authenticated control center routes
│           ├── products/      # Products & Add-ons CRUD pages
│           ├── leads/         # Lead pipeline management
│           ├── services/      # Bespoke services manager
│           ├── testimonials/  # Client testimonials manager
│           └── settings/      # Global site settings
├── tests/                # Automated Vitest unit & integration tests
├── Dockerfile            # Multi-stage production container
└── docker-compose.yml    # Development container stack
```

---

© 2026 Source Monster. All Rights Reserved.
