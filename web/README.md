# 🔧 SGA — Sistema de Gestión Automotriz

> A modern, full-stack Automotive Workshop Management System built with **Next.js**, **Firebase**, and **Tailwind CSS**. Designed to digitize the complete vehicle service pipeline — from reception to client approval.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js) ![Firebase](https://img.shields.io/badge/Firebase-Auth%20%2B%20Firestore-orange?logo=firebase) ![Tailwind](https://img.shields.io/badge/Tailwind-v4-06B6D4?logo=tailwindcss) ![i18n](https://img.shields.io/badge/i18n-EN%20%7C%20ES-blue) ![Theme](https://img.shields.io/badge/Theme-Light%20%7C%20Dark-purple)

---

## ✨ Features

| Module | Description |
|---|---|
| 📋 **Reception** | Vehicle check-in with fluid audits, valuables inventory, fuel level, odometer, and digital liability signature |
| 🔧 **Technician** | Inspection dashboard — log Pass/Fail/Critical items with notes, auto-assign technician to jobs |
| 💰 **Advisor** | Quote builder — review diagnosis, attach per-part pricing + labor, generate shareable client link |
| 📱 **Client Portal** | Public quote view — toggle optional repairs in real-time, approve & sign electronically |
| 📊 **Analytics** | Owner dashboard — revenue, active jobs, approval rate, pipeline status distribution |
| 👥 **User Management** | Admin panel for role assignment (Admin, Reception, Technician, Advisor) |

### Cross-Cutting

- 🌐 **Full i18n** — English & Spanish with instant switching
- 🌗 **Light/Dark theme** — System-aware with manual toggle
- 🔐 **RBAC** — Role-based access control on every route
- 📝 **Audit Log** — Every status change is tracked with actor, timestamp, and action
- 🔗 **Shareable Quotes** — Public `/quote/[id]` links work without authentication

---

## 🏗️ Tech Stack

- **Framework**: Next.js 16 (App Router + Turbopack)
- **Auth & DB**: Firebase Auth (Email/Password) + Cloud Firestore
- **UI**: Tailwind CSS v4 + shadcn/ui components
- **Language**: TypeScript
- **Hosting**: Vercel (recommended) or Firebase Hosting

---

## 🚀 Getting Started

### Prerequisites

- Node.js ≥ 18
- A Firebase project with **Authentication** and **Firestore** enabled

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_USERNAME/mechanic-app.git
cd mechanic-app/web

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env.local
# Edit .env.local with your Firebase credentials

# 4. Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project (or use an existing one)
3. Enable **Authentication** → Email/Password provider
4. Enable **Cloud Firestore** → Start in test mode
5. Go to Project Settings → Your Apps → Add Web App
6. Copy the config values into `.env.local`

---

## 👤 Demo Flow

Follow this pipeline to test the complete system:

1. **Login** → Use `admin@test.com` / `123456` (or create a new account)
2. **Reception** (`/reception`) → Register a vehicle with client info, fluid audit, and digital signature
3. **Technician** (`/technician`) → Select the job, log inspection items (Pass/Fail/Critical)
4. **Advisor** (`/advisor`) → Review the diagnosis, assign prices, generate a quote
5. **Client** (`/quote/[id]`) → Toggle optional repairs, review total, approve electronically
6. **Analytics** (`/analytics`) → See the job flow through the pipeline

> 💡 Each module has a **Demo Auto-fill** button (magic wand icon) to quickly populate sample data.

---

## 📁 Project Structure

```
web/
├── src/
│   ├── app/              # Next.js App Router pages
│   │   ├── reception/    # Vehicle check-in
│   │   ├── technician/   # Inspection dashboard
│   │   ├── advisor/      # Quote builder
│   │   ├── quote/[id]/   # Public client view
│   │   ├── analytics/    # Owner dashboard
│   │   ├── admin/users/  # User management
│   │   └── login/        # Auth page
│   ├── components/       # Reusable UI (shadcn + custom)
│   ├── contexts/         # Auth, Language, Theme providers
│   ├── lib/              # Firebase config + DB functions
│   ├── locales/          # i18n JSON (en.json, es.json)
│   └── types/            # TypeScript interfaces + RBAC config
├── firestore.rules       # Production security rules
├── firebase.json         # Firebase service config
└── .env.example          # Environment variable template
```

---

## 🔐 Security

Firestore Security Rules enforce:
- **Users** can only read their own profile; Admins can manage all
- **Jobs** are gated by role + status (Reception creates, Technician diagnoses, Advisor quotes)
- **Client quotes** are publicly readable (Ready/Approved status only)

---

## 🌐 Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Set environment variables in Vercel dashboard
4. Deploy automatically on push

### Firebase Hosting

```bash
npm run build
firebase deploy --only hosting
```

---

## 📄 License

MIT — Free to use, modify, and distribute.
