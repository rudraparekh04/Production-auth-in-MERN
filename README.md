# 🔐 MERN Auth — Two-Token Authentication System

A production-ready full-stack authentication system built with the MERN stack, featuring a dual-token (Access + Refresh) JWT strategy, automatic token rotation, and MongoDB session management.

---

## 📁 Project Structure

```
mern-auth/
├── backend/                    # Express.js API
│   ├── config/
│   │   └── jwt.config.js       # Token generation, verification, cookie helpers
│   ├── controllers/
│   │   ├── auth.controller.js  # register, login, refresh, logout, logoutAll
│   │   └── user.controller.js  # profile, password change, sessions
│   ├── middleware/
│   │   ├── auth.middleware.js  # protect, authorize, optionalAuth
│   │   ├── error.middleware.js # global error handler
│   │   └── validation.middleware.js
│   ├── models/
│   │   └── User.model.js       # Mongoose schema with hashed refresh tokens
│   ├── routes/
│   │   ├── auth.routes.js
│   │   └── user.routes.js
│   ├── server.js               # App entry, MongoDB connect, rate limiting
│   ├── .env.example
│   └── package.json
│
├── frontend/                   # React + Vite
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx / .css
│   │   │   └── LoadingSpinner.jsx / .css
│   │   ├── context/
│   │   │   └── AuthContext.jsx  # Global auth state, login/register/logout
│   │   ├── pages/
│   │   │   ├── Landing.jsx / .css
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── AuthPage.css     # Shared auth styles
│   │   │   ├── Dashboard.jsx / .css
│   │   │   └── Profile.jsx / .css
│   │   ├── styles/
│   │   │   └── global.css
│   │   ├── utils/
│   │   │   └── axios.js         # Axios instances + silent refresh interceptor
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   ├── vercel.json
│   └── package.json
│
├── render.yaml                 # Render.com backend deployment config
├── package.json                # Root: run both services concurrently
└── README.md
```

---

## 🔑 Two-Token Authentication Flow

```
┌─────────────┐     POST /auth/login      ┌─────────────────┐
│   Browser   │ ─────────────────────────▶│   Express API   │
│             │                           │                 │
│             │◀─── Access Token (15m) ───│  Verify creds   │
│             │◀─── Refresh Token cookie ─│  Generate JWTs  │
│  [Memory]   │     (HttpOnly, 7d)        │  Hash & save RT │
│  accessTkn  │                           └─────────────────┘
└─────────────┘
       │
       │  API request with Authorization: Bearer <accessToken>
       ▼
┌─────────────────┐
│   Express API   │──▶ Valid? Serve data
│  protect()      │──▶ Expired? Return 401 + code: TOKEN_EXPIRED
└─────────────────┘
       │
       │  Access token expires → Axios interceptor catches 401
       ▼
┌─────────────┐    POST /auth/refresh     ┌─────────────────┐
│   Browser   │ ─── (sends RT cookie) ──▶│   Express API   │
│             │                           │                 │
│             │◀── New Access Token ──────│ Verify RT sig   │
│             │◀── New Refresh Token ─────│ Check RT in DB  │
│             │    (rotated cookie)       │ Remove old RT   │
└─────────────┘                           │ Store new RT    │
                                          └─────────────────┘
```

### Security Properties

| Property | Implementation |
|---|---|
| XSS Protection | Access token in memory (not localStorage), refresh token in HttpOnly cookie |
| CSRF Protection | SameSite cookie + custom headers required |
| Token Reuse Detection | Using old refresh token clears ALL sessions |
| Replay Attack Prevention | Refresh token rotated on every use |
| Brute Force Protection | Rate limiting: 10 auth requests / 15 min |
| Password Security | bcrypt with 12 salt rounds |
| Stored Token Security | SHA-256 hash stored in DB (not raw token) |
| Session Limiting | Max 5 concurrent sessions per user |

---

## 🚀 Local Development Setup

### Prerequisites

- Node.js v18+
- MongoDB (local) or MongoDB Atlas account
- npm or yarn

### Step 1 — Clone & Install

```bash
git clone <your-repo-url>
cd mern-auth

# Install all dependencies (root + backend + frontend)
npm run install:all
```

### Step 2 — Configure Backend Environment

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:

```env
NODE_ENV=development
PORT=5000

# Local MongoDB
MONGO_URI=mongodb://127.0.0.1:27017
DB_NAME=mern_auth_db

# Generate secure secrets (run in terminal):
# node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_ACCESS_SECRET=your_64_char_random_hex_here
JWT_REFRESH_SECRET=another_64_char_random_hex_here

JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

CLIENT_URL=http://localhost:5173
```

### Step 3 — Configure Frontend Environment

```bash
cd frontend
cp .env.example .env
```

Edit `frontend/.env`:

```env
# In development, Vite proxies /api → localhost:5000 automatically
# Leave empty for local dev (proxy handles it)
VITE_API_URL=
```

### Step 4 — Start Development Servers

```bash
# From root — starts both backend (port 5000) and frontend (port 5173)
npm run dev

# Or run separately:
npm run dev:backend   # Express on :5000
npm run dev:frontend  # Vite on :5173
```

### Step 5 — Verify It's Working

```bash
# Health check
curl http://localhost:5000/api/health

# Expected response:
# {"status":"OK","message":"MERN Auth API is running",...}
```

Open http://localhost:5173 in your browser.

---

## 🌐 Deployment

### Backend → Render.com (Free)

1. Push your code to GitHub

2. Go to [render.com](https://render.com) → **New Web Service**

3. Connect your GitHub repo

4. Set these settings:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`

5. Add Environment Variables in Render dashboard:

```
NODE_ENV=production
MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/
DB_NAME=mern_auth_db
JWT_ACCESS_SECRET=<generate with: openssl rand -hex 64>
JWT_REFRESH_SECRET=<generate with: openssl rand -hex 64>
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
CLIENT_URL=https://your-app.vercel.app
```

6. Deploy — note your URL (e.g., `https://mern-auth-backend.onrender.com`)

### Frontend → Vercel (Free)

1. Go to [vercel.com](https://vercel.com) → **New Project**

2. Import your GitHub repo

3. Set these settings:
   - **Root Directory:** `frontend`
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`

4. Add Environment Variable:

```
VITE_API_URL=https://mern-auth-backend.onrender.com/api
```

5. Deploy — your live URL will be `https://your-app.vercel.app`

6. Go back to Render and update `CLIENT_URL` to your Vercel URL

### MongoDB Atlas (Database)

1. Create free cluster at [mongodb.com/atlas](https://mongodb.com/atlas)
2. Create database user with read/write access
3. Whitelist IP: `0.0.0.0/0` (allow all — Render uses dynamic IPs)
4. Get connection string: `mongodb+srv://user:pass@cluster.mongodb.net/`
5. Use this as `MONGO_URI` in Render

---

## 📡 API Reference

### Auth Endpoints (rate limited: 10 req / 15 min)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | Public | Create new account |
| POST | `/api/auth/login` | Public | Login, returns access token + sets cookie |
| POST | `/api/auth/refresh` | Cookie | Rotate refresh token, get new access token |
| POST | `/api/auth/logout` | Bearer | Logout current session |
| POST | `/api/auth/logout-all` | Bearer | Logout all devices |
| GET | `/api/auth/me` | Bearer | Get current user |

### User Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/user/profile` | Bearer | Get profile |
| PUT | `/api/user/profile` | Bearer | Update name/bio |
| PUT | `/api/user/change-password` | Bearer | Change password (invalidates all sessions) |
| GET | `/api/user/sessions` | Bearer | List active sessions |
| GET | `/api/user/all` | Admin | List all users (paginated) |

### Example: Register

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Jane Doe","email":"jane@example.com","password":"Secret123"}'
```

Response:
```json
{
  "message": "Account created successfully",
  "accessToken": "eyJhbGc...",
  "user": {
    "id": "...",
    "name": "Jane Doe",
    "email": "jane@example.com",
    "role": "user"
  }
}
```

### Example: Refresh Token

```bash
# The refresh token is sent automatically via HttpOnly cookie
curl -X POST http://localhost:5000/api/auth/refresh \
  --cookie "refreshToken=<your-rt>" \
  -H "Content-Type: application/json"
```

---

## 🔒 Security Checklist

- [x] Passwords hashed with bcrypt (12 rounds)
- [x] Access tokens stored in-memory only (not localStorage)
- [x] Refresh tokens in HttpOnly, SameSite, Secure cookies
- [x] Refresh tokens SHA-256 hashed before DB storage
- [x] Token rotation on every refresh call
- [x] Refresh token reuse detection (clears all sessions)
- [x] Max 5 sessions per user
- [x] Rate limiting on auth routes (10/15min)
- [x] Helmet.js security headers
- [x] CORS configured for specific origins only
- [x] Input validation with express-validator
- [x] Password change invalidates all sessions

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, React Router v6 |
| Styling | Pure CSS with CSS Variables |
| HTTP Client | Axios with interceptors |
| Backend | Node.js, Express.js |
| Database | MongoDB with Mongoose |
| Auth | JWT (jsonwebtoken), bcryptjs |
| Security | Helmet, express-rate-limit, cookie-parser |
| Validation | express-validator |
| Deployment | Vercel (frontend) + Render (backend) + MongoDB Atlas |

---

## 🧪 Testing the Auth Flow

1. **Register** a new account
2. **Inspect cookies** in DevTools → Application → Cookies (see `refreshToken` as HttpOnly)
3. **Inspect memory** — access token is NOT in localStorage/sessionStorage
4. **Wait 15 min** (or set `JWT_ACCESS_EXPIRY=10s` for testing) — next API call silently refreshes
5. **Open two tabs** — both stay logged in (shared cookie)
6. **Logout All** — refresh token cleared from DB, all tabs become unauthenticated
7. **Change password** — all sessions terminated, must re-login
