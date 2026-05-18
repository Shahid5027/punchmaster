# ANTIGRAVITY AI — MASTER BUILD PROMPT

## ROLE

You are a senior full-stack engineer, product designer, and UI/UX architect.

Build a COMPLETE production-grade application called:

# GeoShield AI

### Smart Geo Attendance & Workforce Insights Platform

The project must feel:

* modern
* polished
* premium
* realistic
* deployable
* enterprise-grade

NOT like a basic student CRUD project.

---

# IMPORTANT HACKATHON RULES

STRICTLY FOLLOW:

Frontend:

* React + Vite ONLY

Backend:

* Node.js + Express ONLY

Database:

* PostgreSQL or MySQL ONLY

Authentication:

* JWT

Maps:

* Leaflet + OpenStreetMap

Geolocation:

* Browser Geolocation API ONLY

Distance validation:

* Haversine formula MUST run on server side

DO NOT USE:

* Next.js
* Flask
* FastAPI
* Firebase as primary DB
* MongoDB
* Django

The application must fully comply with the hackathon module document.

---

# CORE IDEA

GeoShield AI is a smart geo attendance platform that:

* validates attendance using geofencing
* tracks employee check-ins/check-outs
* calculates working hours
* detects late arrivals
* provides admin analytics
* adds intelligent attendance insights

The system should also provide lightweight intelligent features like:

* attendance confidence scoring
* unusual location detection
* repeated failed check-in analysis
* suspicious attendance patterns

Keep all intelligence features practical and believable.

---

# PRIMARY PRIORITIES

1. Functional core features
2. Clean architecture
3. Modern professional UI
4. Responsive design
5. Proper geofence validation
6. Smooth UX
7. Polished dashboards
8. Realistic innovation

---

# REQUIRED FEATURES

## Authentication

* Login page
* JWT authentication
* Employee/Admin roles

## Employee Features

* Check-in
* Check-out
* Browser geolocation capture
* Attendance history
* Monthly attendance summary
* Working hour tracking
* Late arrival detection

## Admin Features

* Employee attendance overview
* Today's attendance
* Geofence settings
* Office radius configuration
* Reports
* CSV export
* Late arrivals monitoring

## Backend Validations

* Prevent duplicate check-ins
* Prevent checkout before check-in
* Validate coordinates
* Server-side Haversine validation
* Server-side working hours calculation
* Attendance audit logs

---

# INNOVATION FEATURES

Implement AFTER core functionality works.

## Attendance Confidence Score

Generate confidence levels for attendance validity.

Example:

* 98% Normal
* 71% Unusual location
* 42% Suspicious pattern

## Smart Insights

Generate readable analytics like:

* “Most employees checked in between 8:50–9:15 AM.”
* “Repeated failed check-ins detected outside office radius.”

## Location Pattern Analysis

Detect:

* repeated out-of-zone attempts
* unusual check-in timing
* suspicious attendance patterns

## Activity Feed

Show:

* successful check-ins
* failed attempts
* late arrivals
* unusual activity

Keep all features business-oriented and realistic.

---

# UI / UX STYLE

STYLE:
Modern Enterprise SaaS

Inspired by:

* Linear
* Stripe
* Notion
* Deel
* Rippling

Use:

* clean layouts
* premium spacing
* smooth animations
* responsive cards
* elegant charts
* polished forms
* modern dashboards

Avoid:

* cyberpunk aesthetics
* fake hacker themes
* military dashboards
* excessive neon
* overdramatic visuals

---

# DESIGN RULES

Use:

* dark neutral backgrounds
* restrained accent colors
* soft shadows
* subtle borders
* smooth hover states
* modern typography
* readable analytics

Avoid:

* Bootstrap-style layouts
* excessive gradients
* overcomplicated animations
* flashy unrealistic UI

The app should feel like a real HR-tech SaaS product.

---

# REQUIRED SCREENS

1. Login Page
2. Employee Dashboard
3. Check-in / Check-out Page
4. Attendance History
5. Admin Dashboard
6. Office Settings
7. Reports Page

---

# MAP FEATURES

Implement:

* office geofence circle
* employee punch marker
* location validation visualization
* check-in success/failure feedback

Use:

* Leaflet
* OpenStreetMap

Avoid paid APIs.

---

# DATABASE DESIGN

Create proper PostgreSQL schema for:

## users

## office_settings

## attendance

## attendance_logs

## attendance_insights

Include:

* relationships
* indexes
* timestamps
* audit logs

---

# API REQUIREMENTS

Implement:

* auth routes
* attendance routes
* admin routes
* reports routes
* settings routes

Use:

* modular architecture
* proper status codes
* validation middleware
* JWT middleware

---

# RESPONSIVENESS

The platform must work smoothly on:

* mobile
* tablet
* desktop

Requirements:

* touch-friendly UI
* responsive tables
* adaptive cards
* readable typography
* mobile-first behavior

---

# TECH STACK

Frontend:

* React + Vite
* TypeScript
* TailwindCSS
* Framer Motion
* Recharts

Backend:

* Node.js
* Express

Database:

* PostgreSQL

Deployment:

* Vercel (frontend)
* Render (backend)
* Neon PostgreSQL

Everything must support FREE hosting.

---

# DEVELOPMENT STRATEGY

DO NOT generate the entire project at once.

Generate in phases:

Phase 1:

* architecture
* folder structure
* dependency setup

Phase 2:

* authentication
* database schema

Phase 3:

* attendance system
* geofence validation

Phase 4:

* dashboards
* reports

Phase 5:

* attendance insights
* confidence scoring

Phase 6:

* UI polish
* responsiveness
* animations

---

# IMPORTANT IMPLEMENTATION RULES

Generate:

* REAL implementation-ready code
* modular components
* production-style architecture
* reusable UI components
* clean folder structure

Do NOT generate:

* pseudo-code
* placeholder-only implementations
* fake backend logic

---

# MOST IMPORTANT RULE

The project should feel:

* practical
* believable
* polished
* deployable
* professionally designed

NOT:

* fake futuristic
* overdramatic
* gimmicky
* cyberpunk concept art

Build a real modern workforce SaaS application.
s