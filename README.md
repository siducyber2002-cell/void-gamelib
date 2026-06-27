# 🎮 GameLib — Your Gaming Universe

A full-stack gaming library web app built with **React + Vite + Tailwind CSS** on the frontend and **Python + FastAPI + PostgreSQL (Supabase)** on the backend.

---

## 📁 Project Structure

```
gamelib/
├── frontend/          ← React + Vite + Tailwind
├── backend/           ← Python + FastAPI
└── database/          ← Postgres schema reference (Supabase-hosted)
```

---

## 🚀 Quick Setup

### 1. Supabase Database

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **Project Settings → Database → Connect** and copy the **Session pooler** (or Transaction pooler) connection details — host, port, user, password
3. Tables are created automatically on first backend run via SQLAlchemy (`Base.metadata.create_all`), so no manual schema script is needed
4. (Optional) Use the **SQL Editor** in the Supabase dashboard to inspect or seed data manually

> Note: use the **pooler** hostname (`aws-x-<region>.pooler.supabase.com`), not the legacy direct `db.<project-ref>.supabase.co` host — many networks can't resolve the direct host anymore.

---

### 2. Backend (FastAPI)

```
cd backend

# Copy and fill in your env file
cp .env.example .env
# Edit .env — set your Supabase DB credentials and a strong SECRET_KEY

# Create a virtual environment
python -m venv venv

# Activate it
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the server
uvicorn main:app --reload --port 8000
```

API docs available at: **http://localhost:8000/docs**

---

### 3. Frontend (React + Vite)

```
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

App available at: **http://localhost:5173**

---

## 🔑 .env Configuration

```
DB_HOST=aws-x-<region>.pooler.supabase.com
DB_PORT=5432
DB_USER=postgres.<project-ref>
DB_PASSWORD=your_supabase_db_password_here
DB_NAME=postgres

SECRET_KEY=your_super_long_random_secret_key_here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080

FRONTEND_URL=http://localhost:5173

NEWS_API_KEY=your_newsapi_key_here
```

> Use the **Session pooler** port (`5432`) if your network is IPv4-only, or the **Transaction pooler** port (`6543`) if your network supports IPv6.

---

## 📋 Features

| Page | Description |
| --- | --- |
| 🏠 Home | Hero carousel, new releases, trending, recommended |
| 🎯 Discover | Netflix-style game browser with filters |
| 📚 Library | Personal game collection with status tabs |
| 🔥 Trending | Most played, downloaded, rated, fastest growing |
| 📰 News | Gaming news center with categories |
| 💬 Community | Discord-style real-time chat by channel |
| 📊 Dashboard | Personal analytics with charts |
| 👤 Profile | Editable gaming identity |
| 🏆 Achievements | Gamification with rarity tiers |
| 👥 Friends | Social network with requests & DMs |
| ⚙️ Settings | Theme, password, notifications, privacy |

---

## 🎨 Dynamic Accent Colors

Go to **Settings → Appearance** to switch between 6 accent colors:

- 🔵 Ocean Blue
- 🟣 Violet Dream
- 🌸 Neon Rose
- 🟢 Mint Fresh
- 🟡 Golden Hour
- 🟠 Sunset Fire

---

## 🛠️ Tech Stack

**Frontend**
- React 18 + Vite 5
- Tailwind CSS 3
- React Router v6
- Axios
- Recharts (charts)
- React Hot Toast (notifications)
- Lucide React (icons)
- Framer Motion (animations)

**Backend**
- Python 3.10+
- FastAPI
- SQLAlchemy 2.0
- psycopg2 (PostgreSQL driver)
- PassLib + bcrypt (password hashing)
- python-jose (JWT)
- Pydantic v2

**Database**
- PostgreSQL 15+ (hosted on Supabase)

---

## 📡 API Endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | /api/auth/register | Register new user |
| POST | /api/auth/token | Login (get JWT) |
| GET | /api/auth/me | Get current user |
| PUT | /api/auth/me | Update profile |
| POST | /api/auth/change-password | Change password |
| GET | /api/games/ | List/search games |
| GET | /api/games/trending | Trending games |
| POST | /api/games/ | Add game |
| GET | /api/library/ | Get user library |
| POST | /api/library/ | Add game to library |
| PUT | /api/library/{id} | Update library entry |
| DELETE | /api/library/{id} | Remove from library |
| GET | /api/friends/ | Get friends list |
| POST | /api/friends/request/{user_id} | Send friend request |
| POST | /api/friends/accept/{id} | Accept request |
| GET | /api/community/messages | Get channel messages |
| POST | /api/community/messages | Send message |
| GET | /api/dashboard/stats | Get user stats |
| GET | /api/achievements/me | Get my achievements |
| GET | /api/news/live | Get live/cached news articles |

Full interactive docs: **http://localhost:8000/docs**
