# Source Monster 👾

A premium, high-performance web development and growth strategy agency platform built with **Astro 6**, **Tailwind CSS**, and **SSR (Server-Side Rendering)**.

## 🚀 Key Features

- **Modern Tech Stack**: Built with Astro 6 for lightning-fast performance.
- **SSR & Backend**: Equipped with the Node.js adapter for on-demand rendering and backend logic.
- **Astro Actions**: Integrated form handling for contact requests using secure server-side actions.
- **Email Integration**: Integrated with **Resend** for reliable project initiation notifications.
- **Premium Design**: Modern UI with glassmorphism, dynamic animations (AOS, GSAP, Swiper), and a strict design system.
- **Content Collections**: Type-safe management of team, services, testimonials, and workflow data.

## 🛠️ Setup & Installation

### 1. Clone & Install
```bash
git clone https://github.com/dev1191/sourcemonster.git
cd sm2
npm install
```

### 2. Environment Variables
Create a `.env` file in the root directory and add your Resend API key:

```env
RESEND_API_KEY=your_resend_api_key_here
CONTACT_EMAIL=contact@sourcemonster.in
```

### 3. Development
```bash
npm run dev
```
Open `http://localhost:4321` to view the site.

## 📁 Project Structure

```text
/
├── src/
│   ├── actions/      # Server-side actions (e.g., email handling)
│   ├── components/   # Reusable UI components
│   ├── content/      # JSON data for Services, Team, etc.
│   ├── layouts/      # Main page structures
│   └── pages/        # Route entry points
├── public/           # Static assets (images, favicon)
└── astro.config.mjs  # Astro & Adapter configuration
```

## 🏗️ Deployment

Since the project uses **SSR** with the Node adapter, you can deploy it to any server capable of running Node.js (e.g., VPS with PM2, Vercel, or Netlify with the appropriate adapter).

Currently configured for **Node.js (Standalone)**.

---
© 2026 Source Monster. All Rights Reserved.
