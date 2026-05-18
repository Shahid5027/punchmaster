# 🛡️ GeoShield AI — Geofence-Validated Telemetry Attendance System

> **Securing corporate physical perimeters with automated browser telemetry, secure server-side Haversine verification, and real-time security anomaly audit streams.**

---

## 🚀 Executive Summary & Feature List

**GeoShield AI** is a professional-grade, high-fidelity enterprise SaaS platform designed to solve workforce physical attendance fraud. Rather than relying on easily spoofable QR codes or insecure self-reporting, GeoShield AI secures transaction integrity through a **zero-trust browser telemetry validation pipeline**.

### 🌟 Core Product Features

*   **Zero-Trust Browser Telemetry Validation**: Automatically requests and captures browser GPS coordinates, verifying accuracy before allowing punches.
*   **Dual-Layer Geofence Verification**: Implements client-side perimeter visual calculations (Haversine metrics) paired with absolute server-side cryptographic and distance verification.
*   **Dynamic Interactive Map UI**: Built on React Leaflet, featuring real-time user positioning dots, office perimeter geofence circle visualizations, and dynamic distance calculations.
*   **Workforce Audit Activity Stream**: Real-time admin chronological activity log tracking all active check-ins, warning alerts for out-of-bounds telemetry drifts, and blocked coordinate spoofing punches.
*   **Administrative Geofence Configurator**: Interactive control panel enabling administrators to drag markers on a live map, update office landmarks, adjust radius allowances, and configure tardiness policies.
*   **Monthly RFC 4180 CSV Reports**: One-click high-compliance CSV timesheet compiler with correct quote-escapes for downstream payroll integrations.
*   **Live "Sync Active" Pulse Radar**: Visual indicators communicating constant client-to-ledger synchronization status updates.
*   **Interactive Float Toast Stack**: Dynamic custom sliding notifications console providing instant transaction status, boundary failure explanations, and security alerts.
*   **Lightweight Animated Counters**: Smooth CSS custom cubic-out easing numbers that count up aggregates (present staff, late entries, trust scores) upon dashboard mounting.
*   **Obsidian Glassmorphism Theme**: Curated sleek dark mode featuring premium `#09090b` obsidian colors, harmonic gradient spot glow backdrops, and JetBrains Mono monospace font tables.

---

## 🗺️ Project Architecture & Data Flow

GeoShield AI enforces a strict multi-layer zero-trust data pipeline from the user's browser telemetry directly to the PostgreSQL audit database.

```mermaid
sequenceDiagram
    autonumber
    actor Employee as 🧑‍💼 Employee Browser
    participant Map as 🗺️ React Leaflet Deck
    participant API as 🛡️ Express API Gateway
    participant Haversine as 📐 Haversine Engine
    database DB as 🗄️ PostgreSQL Database
 
    Employee->>Map: 1. Request Coordinates Acquisition
    Map->>Employee: 2. Capture Browser GPS Telemetry
    Map->>Map: 3. Render Geofence Circle Bounds (Client-side Check)
    Employee->>API: 4. Submit Punch Transaction Request (POST /api/attendance/check-in)
    Note over API: Attaches JWT Header & coordinates payload
    API->>Haversine: 5. Verify Distance Against Office Landmark Centroid
    alt Coordinates are inside Radius Bounds (e.g. <= 200m)
        Haversine-->>API: Success (Distance verified)
        API->>DB: 6a. Commit Ledger Punch Record (State: PRESENT/ON_TIME)
        API-->>Employee: 7a. Response: Success Toast ("Check-in Complete")
    else Coordinates are outside Radius Bounds
        Haversine-->>API: Failure (Distance drifted/Spoofed)
        API->>DB: 6b. Log Blocked Anomaly Alert (Track Drift Meters)
        API-->>Employee: 7b. Response: 403 Forbidden Toast ("Geofence Verification Failed")
    end
```

### 🗂️ Project Workspace Directory Layout

```
GeoShield/
├── backend/
│   ├── src/
│   │   ├── config/            # Database pool setup & PostgreSQL schemas
│   │   ├── controllers/       # Security & Attendance transaction handlers
│   │   ├── middleware/        # JWT Authentication guards
│   │   ├── routes/            # REST API Endpoint declarations
│   │   ├── seed.ts            # Dynamic dynamic relative weekday database seeder
│   │   └── server.ts          # Core Express initialization
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/        # Leaflet Map, Animated Counters, Toast Stack, Skeletons
│   │   ├── context/           # AuthContext & ToastContext providers
│   │   ├── hooks/             # Geolocation browser bindings
│   │   ├── pages/             # Login, Punch Page, Dashboard, Reports
│   │   ├── services/          # Axios API communication Client
│   │   ├── App.tsx            # Routes configurations
│   │   ├── index.css          # Design system typography & custom CSS glass cards
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
├── screenshots/               # High-resolution dashboard pre-views
│   ├── roster_dashboard.png
│   ├── insights_feed.png
│   └── geofence_settings.png
└── README.md                  # This file
```

---

## 🛠️ Local Installation & Development Setup

### 📋 Prerequisites
*   **Node.js**: `v18.x` or higher installed
*   **NPM**: `v9.x` or higher installed
*   **PostgreSQL**: Local running instance or cloud database URI

---

### 1️⃣ Database Setup & Backend Initialization
Open your terminal in the `backend/` directory:

```bash
# Navigate to the backend directory
cd backend

# Install project dependencies
npm install

# Run backend seed script to populate PostgreSQL database tables with high-fidelity telemetry
npx tsx src/seed.ts

# Launch development API server
npm run dev
```

*The API server will launch at: **`http://localhost:5000`***

---

### 2️⃣ Frontend Client Initialization
Open a second terminal inside the `frontend/` directory:

```bash
# Navigate to the frontend directory
cd frontend

# Install client packages
npm install

# Start Vite hot-reloading development server
npm run dev
```

*The React Client will spin up at: **`http://localhost:5173`***

---

## 🔐 Environment Variables Configuration

To run GeoShield AI securely in development and staging environments, configure the following `.env` templates in the respective directories:

### Backend Configuration File (`backend/.env`)
Create a file named `.env` in the `backend/` root directory:
```env
PORT=5000
JWT_SECRET=super_secret_geoshield_cryptographic_verification_key_1337

# PostgreSQL Connection Variables
PGHOST=localhost
PGUSER=postgres
PGPASSWORD=your_postgres_password
PGDATABASE=geoshield
PGPORT=5432

# Or unified database connection string:
# DATABASE_URL=postgresql://postgres:password@localhost:5432/geoshield
```

### Frontend Configuration File (`frontend/.env`)
Create a file named `.env` in the `frontend/` root directory:
```env
VITE_API_URL=http://localhost:5000
```

---

## 📐 Secure API Endpoints Registry

| Category | HTTP Verb | Endpoint | Authentication Guard | Payload Schema / Action |
| :--- | :--- | :--- | :--- | :--- |
| **Auth** | `POST` | `/api/auth/register` | Open Access | Registers a new employee profile in the DB |
| **Auth** | `POST` | `/api/auth/login` | Open Access | Verifies profile password and returns active JWT token |
| **Auth** | `GET` | `/api/auth/me` | JWT Guarded | Pulls currently authenticated session information |
| **Settings**| `GET` | `/api/settings/office` | JWT Guarded | Fetches office geofencing centroids & radius configuration |
| **Settings**| `PUT` | `/api/settings/office` | Admin JWT | Updates office coordinates, allowed radius, and late thresholds |
| **Punch** | `POST` | `/api/attendance/check-in` | Employee JWT | Validates browser coordinates (Haversine) & writes check-in row |
| **Punch** | `POST` | `/api/attendance/check-out`| Employee JWT | Validates browser coordinates (Haversine) & writes check-out row |
| **Punch** | `GET` | `/api/attendance/history` | Employee JWT | Pulls historical check-in roster calendar logs |
| **Admin** | `GET` | `/api/admin/attendance/today` | Admin JWT | Compiles today's active workforce attendance metrics |
| **Admin** | `GET` | `/api/admin/insights/feed` | Admin JWT | Compiles rich real-time security drifts & out-of-zone blocks |
| **Admin** | `GET` | `/api/admin/reports/monthly` | Admin JWT | Compiles payroll-ready compliance timesheets |

---

## 🧪 Seeding & Sandbox Credentials

To enable seamless hackathon audits and live evaluations, the database is pre-seeded with multiple roles and dynamic, relative weekday profiles. You can click the quick-login sandbox panels on the login screen to sign in instantly.

### 🧑‍💻 Roster Credentials Ledger

#### 1. System Root Administrator (Full access to all panels, charts, and reports)
*   **Email**: `admin@geoshield.ai`
*   **Password**: `admin123`
*   **Role**: `admin`

#### 2. Standard Office Employee (Full access to Map deck and Punch actions)
*   **Email**: `employee1@geoshield.ai`
*   **Password**: `employee123`
*   **Role**: `employee`

---

## 📸 Project Interface Previews

### 1. Live Workforce Roster Dashboard
Displays registered staff aggregates, timing distribution curves, and on-time vs. late ratios without empty states.
![Workforce Roster Dashboard Preview](./screenshots/roster_dashboard.png)

### 2. Geo-Attendance Analytics & Telemetry Audits
Real-time workforce audit stream tracking coordinates drifts (Marcus Wright) and geofence-blocked out-of-zone checks (David Lightman).
![Geo-Attendance Analytics Preview](./screenshots/insights_feed.png)

### 3. Interactive Geofence Settings & Landmark Configurator
Draggable Leaflet marker and real-time geofence circle preview synchronizing GPS telemetry directly to the PostgreSQL database.
![Geofence Settings Preview](./screenshots/geofence_settings.png)

---

## ☁️ Staging & Production Deployment Guidelines

To deploy GeoShield AI in high-scale staging environments:

### 1️⃣ Frontend Client Deployment (Vercel)
1. Initialize a new project on **Vercel** linked to your repository.
2. Set the framework option to **Vite**.
3. Configure the environment variable:
   *   `VITE_API_URL` ➡️ `https://your-backend-service.railway.app`
4. Deploy the build.

### 2️⃣ Backend REST Service Deployment (Render / Railway / Heroku)
1. Initialize a Node.js web-service project.
2. Provide the build start commands:
   *   Build Command: `npm install && npm run build`
   *   Start Command: `node dist/server.js`
3. Configure environment variables in the host control panel:
   *   `PORT` ➡️ `5000`
   *   `JWT_SECRET` ➡️ `your-production-secret-key`
   *   `PGHOST`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`, `PGPORT` ➡️ *(Target production database pool)*
   *   `OFFICE_LATITUDE` & `OFFICE_LONGITUDE` ➡️ *(Target office centroid coordinates)*
   *   `OFFICE_RADIUS_METERS` ➡️ `200` *(Desired geofence boundary radius)*

---

## 👥 Hackathon Team Contributions

*   **Lead AI Architect & Core Dev**: *Antigravity* — Engineered server-side geofence validations, Haversine engines, PostgreSQL database schema pools, Recharts integrations, loading skeletons, and visual systems polish.
*   **Product Advisor**: *Shahid* — Conducted UI validation, core requirements audit, security threat model adjustments, and evaluation alignment.

---

*GeoShield AI © 2026. Made with ❤️ for high-integrity workforce telemetry verification.*
