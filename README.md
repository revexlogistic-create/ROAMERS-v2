# 🌍 Roamers Community — Deployment Guide

Morocco's premier experiential travel platform.

---

## ⚡ Quick Start (Local)

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env — at minimum set JWT_SECRET

# 3. Start the server
npm start
# → http://localhost:3000
```

**Default admin account** (auto-created on first boot):
- Email: `admin@roamerscommunity.ma`
- Password: `admin123`
- Login at `/` → Sign In → redirected to `admin.html`

---

## 🗂️ Project Structure

```
roamers-mvp/
├── server.js          # Express production server
├── database.js        # SQLite schema + auto-seed
├── mailer.js          # Email notifications
├── package.json
├── .env               # Your config (git-ignored)
├── .env.example       # Config template
├── Procfile           # Railway / Heroku deploy
├── render.yaml        # Render.com deploy
├── routes/
│   ├── auth.js        # Register, login, profile, wishlist
│   ├── bookings.js    # Create, list, cancel bookings
│   ├── forms.js       # Contact, Plan My Trip, Team Building
│   └── admin.js       # Admin-only data access
├── middleware/
│   └── auth.js        # JWT verification
├── data/
│   └── roamers.db     # SQLite database (auto-created)
└── public/
    ├── index.html     # SPA frontend
    └── admin.html     # Admin dashboard
```

---

## 🔌 API Endpoints

### Auth
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login → returns JWT |
| GET | `/api/auth/me` | Get current user |
| PUT | `/api/auth/profile` | Update profile |
| PUT | `/api/auth/password` | Change password |
| POST | `/api/auth/wishlist/:expId` | Toggle wishlist |
| DELETE | `/api/auth/account` | Delete account |

### Bookings
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/bookings` | Create booking |
| GET | `/api/bookings` | Get my bookings |
| GET | `/api/bookings/:id` | Get single booking |
| PATCH | `/api/bookings/:id/cancel` | Cancel booking |

### Forms
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/forms/contact` | Contact message |
| POST | `/api/forms/plan` | Plan My Trip request |
| POST | `/api/forms/team` | Team building request |

### Admin (requires admin JWT)
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/admin/stats` | Dashboard KPIs |
| GET | `/api/admin/bookings` | All bookings |
| PATCH | `/api/admin/bookings/:id` | Update status |
| GET | `/api/admin/users` | All users |
| GET | `/api/admin/plan-requests` | Plan My Trip submissions |
| GET | `/api/admin/team-requests` | Team Building submissions |
| GET | `/api/admin/messages` | Contact messages |

### Health
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/health` | Server status |

---

## 🚀 Deploy to Render (Free)

1. Push to GitHub
2. Go to [render.com](https://render.com) → New Web Service
3. Connect your repo
4. Render auto-detects `render.yaml`
5. Add environment variables:
   - `JWT_SECRET` → generate: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
   - `NODE_ENV` → `production`
   - `ADMIN_PASSWORD` → your secure password

---

## 🚀 Deploy to Railway

```bash
npm install -g railway
railway login
railway new
railway up
```

Set env vars in Railway dashboard.

---

## 🔒 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | ✅ | Long random string (64+ chars) |
| `PORT` | No | Default: 3000 |
| `NODE_ENV` | No | `production` for prod |
| `ADMIN_EMAIL` | No | Default: admin@roamerscommunity.ma |
| `ADMIN_PASSWORD` | No | Default: admin123 — **change in prod!** |
| `SMTP_HOST` | No | Email server (skip to disable email) |
| `SMTP_USER` | No | Email credentials |
| `SMTP_PASS` | No | Email password / app password |
| `WHATSAPP_NUMBER` | No | Business WhatsApp (no +) |

---

## 📦 Tech Stack

- **Frontend**: Vanilla JS SPA (zero build step)
- **Backend**: Express.js 4.x
- **Database**: SQLite via better-sqlite3 (file-based, zero config)
- **Auth**: JWT (jsonwebtoken) + bcryptjs
- **Email**: Nodemailer (optional)
- **Security**: Helmet, CORS, Rate limiting

---

## 🔄 Data Flow

```
Browser SPA → /api/* → Express Routes → SQLite DB
     ↑                                      ↓
     └──────── JSON Response ───────────────┘
```

All bookings, users, form submissions are persisted in `data/roamers.db`.
The SPA continues to work offline for browsing; API calls are made for
auth, bookings, and form submissions.

