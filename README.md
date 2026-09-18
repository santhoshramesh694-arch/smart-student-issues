# Smart Campus Issue & Resource Management System

A production-grade, full-stack campus governance and facility tracking web application engineered to solve real-world university maintenance challenges. Built with a decoupled architecture featuring role-based portals for **Students**, **Staff Technicians**, and **Administrators**, real-time lifecycle tracking, empirical **Campus Problem Analytics**, and end-to-end security compliance.

---

## 1. Project Abstract (Final Year Project)

Universities and college campuses frequently encounter maintenance grievances spanning electrical outages, plumbing ruptures, Wi-Fi access point degradation, classroom audio-visual failures, and laboratory computer crashes. Traditional complaint channels rely on fragmented logbooks, manual paperwork, and untracked phone calls, resulting in lack of accountability, missed SLAs, and recurring infrastructure breakdowns.

The **Smart Campus Issue & Resource Management System** resolves these deficits through an enterprise 3-tier web architecture. Students can file grievances in under 30 seconds with photo evidence, physical location mapping, and automated tracking code assignment. Campus administrators dispatch work orders to specialized technicians based on active workloads. Technicians execute physical inspections, log status transitions, and submit photographic proof of completion. Upon resolution, students evaluate service quality through a rating system. Simultaneously, a **Campus Problem Analytics Engine** clusters issues by physical zone and taxonomy, empowering university leadership with data-driven predictive maintenance insights.

---

## 2. Project Objectives

1. **Eliminate Operational Latency**: Replace legacy complaint logbooks with a sub-second RESTful issue submission and dispatch pipeline.
2. **Ensure Complete Governance Transparency**: Implement an immutable status transition history (`issue_updates`) and a security audit trail (`audit_logs`) recording every administrative and operational action.
3. **Data-Driven Preventive Maintenance**: Provide a proprietary Campus Problem Analytics engine that discovers high-frequency co-occurrence patterns (e.g. repeated electrical trips in Block A or Wi-Fi packet drops in Block B).
4. **Enforce Role-Based Access Control (RBAC)**: Maintain strict authorization boundaries between Students, Maintenance Technicians, and Campus Leadership using JWT and bcrypt.
5. **Production-Ready SaaS UI/UX**: Deliver responsive, accessible, mobile-first interfaces with Chart.js visualizations, toast notifications, and zero frontend framework dependencies.

---

## 3. Technology Stack

### Frontend
- **HTML5 & CSS3**: Semantic page structures, SEO metadata, Open Graph & Twitter Cards, CSS custom properties.
- **Vanilla JavaScript (ES6+)**: Zero framework bloat (no React/Angular/Vue); utilizes native DOM APIs, async/await, Fetch API, and modular architecture.
- **Bootstrap 5.3.3**: Responsive grid layout, modals, dropdowns, and offcanvas navigation.
- **Chart.js 4.4**: Hardware-accelerated canvas visualizations (Doughnut, Pie, Line, Bar, Polar Area).
- **Font Awesome 6.5**: Professional vector iconography for categories, statuses, and dashboards.

### Backend
- **Node.js & Express.js**: High-throughput non-blocking asynchronous RESTful API server.
- **JWT (JSON Web Tokens)**: Stateless token-based authentication with expiration controls.
- **bcryptjs**: Salted cryptographic password hashing (work factor 10).
- **Multer**: Secure multipart/form-data disk storage engine with MIME whitelist filtering and 5MB size limits.
- **CORS & Express Middlewares**: Centralized error interceptor, security headers, and input sanitization.

### Database
- **MySQL / MariaDB**: Relational schema normalized to 3rd Normal Form (3NF).
- **InnoDB Engine**: Foreign key constraints, cascade rules, ACID transactional safety, and index optimization (`idx_issues_status`, `idx_issues_block`, etc.).

---

## 4. System Architecture & Entity-Relationship Model

### Architecture Diagram
```
[ Client Browser / Mobile ]
   ├── Public Pages (SEO Optimized Landing, About, Services, FAQ, Contact)
   ├── Student Portal (Report Issue, Photo Upload, Live Timeline, 5-Star Feedback)
   ├── Staff Portal (Assigned Task Queue, In-Progress Transition, Resolve Proof)
   └── Admin Portal (Control Center, Staff Dispatch, Campus Problem Analytics, Audit Trail)
             │
             │ HTTPS / Fetch API (Bearer JWT / Multipart FormData)
             ▼
[ Node.js + Express.js Server (Port 5000) ]
   ├── Middlewares: CORS • JWT Auth Guard • Role Guard • Multer Upload • Error Interceptor
   ├── Controllers: Auth • Issues • Users • Categories • Dashboard • Feedback • AuditLogs
   └── Services: Notification Dispatcher • Governance Audit Logger
             │
             │ Parameterized Prepared Queries (mysql2/promise Pool)
             ▼
[ MySQL Database: smart_campus_db ]
   ├── users ───────────────┬─── students
   │                        └─── staff
   ├── categories ────────────── issues ─────┬─── issue_updates
   │                                         ├─── feedback
   └── notifications ◄───────────────────────┴─── audit_logs
```

---

## 5. Database Schema Specifications

### Database Name: `smart_campus_db`

1. **`users`**: User account credentials, roles (`student`, `staff`, `admin`), profile details, and active status.
2. **`students`**: Foreign key to `users`, roll number (UK), department, semester, hostel block, room number.
3. **`staff`**: Foreign key to `users`, employee ID (UK), department, designation, specialization.
4. **`categories`**: 11 default campus categories (Electrical, Plumbing, Wi-Fi, Labs, Classrooms, Hostel, Library, Cleanliness, Security, Transportation, Other) with FontAwesome icons.
5. **`issues`**: Primary tracking entity with tracking code (`ISS-YYYY-XXXX`), foreign keys to student, category, and assigned staff, location, zone, priority, status, image URL, and resolution notes.
6. **`issue_updates`**: Immutable timeline log tracking previous status, new status, timestamp, and updater identity.
7. **`feedback`**: Post-resolution student satisfaction rating (1 to 5 stars) and qualitative commentary.
8. **`notifications`**: Targeted user alerts triggered upon creation, assignment, status change, and resolution.
9. **`audit_logs`**: Administrative governance trail tracking logins, modifications, and deletions with IP addresses.

---

## 6. Installation & Quickstart Guide

### Prerequisites
- **Node.js** (v18.0.0 or later, tested on v24.19.0 LTS)
- **MySQL Server** (v8.0+ or MariaDB 10.4+, e.g. via XAMPP)
- **Git**

### Step 1: Clone Repository
```bash
git clone https://github.com/your-username/smart-campus-management-system.git
cd smart-campus-management-system
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Configure Environment Variables
Copy `.env.example` to `.env` and verify database credentials:
```env
PORT=5000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=smart_campus_db

JWT_SECRET=campus_jwt_super_secret_key_2026_secure_fyp
JWT_EXPIRES_IN=7d
```

### Step 4: Initialize & Seed Database
Run the automated database setup script. This creates `smart_campus_db`, applies `database/schema.sql`, and seeds initial categories, demo users, sample issues, updates, and audit logs:
```bash
npm run db:setup
```

### Step 5: Start the Application Server
```bash
npm start
```
The application will be live at **http://localhost:5000**.

---

## 7. Demonstration Accounts

| Role | Email | Password | Scope & Responsibilities |
|---|---|---|---|
| **Campus Admin** | `admin@smartcampus.edu` | `Admin@123` | Executive KPIs, Analytics, Staff Dispatch, Master Issues, Audit Trail |
| **Staff (IT)** | `staff.it@smartcampus.edu` | `Staff@123` | Systems & Network tasks, In-Progress transitions, Resolution proof |
| **Staff (Electrical)** | `staff.electrical@smartcampus.edu` | `Staff@123` | Power lines, substation breakers, lab electrical hazards |
| **Staff (Plumbing)** | `staff.plumbing@smartcampus.edu` | `Staff@123` | Restroom leaks, valves, hostel water heaters |
| **Student (Alex)** | `student1@smartcampus.edu` | `Student@123` | Grievance submission, photo upload, live tracking, 5-star review |

*Note: The login screen features one-click "Quick-Fill" buttons for instant evaluation.*

---

## 8. RESTful API Documentation

### Authentication (`/api/auth`)
- `POST /api/auth/register`: Register student account with roll number and hostel info.
- `POST /api/auth/login`: Authenticate credentials, return signed JWT and user profile.
- `GET /api/auth/me`: Fetch authenticated session details and role profile.
- `PUT /api/auth/profile`: Update contact number, hostel room, or personal details.
- `PUT /api/auth/password`: Securely change account password.

### Issues Management (`/api/issues`)
- `GET /api/issues`: List issues (scoped by role, filter by status, priority, category, zone, search).
- `POST /api/issues`: Create grievance with Multer image upload (Student).
- `GET /api/issues/:id`: Detailed issue view with lifecycle timeline and feedback.
- `PUT /api/issues/:id`: Update issue details (Student if pending, Admin anytime).
- `DELETE /api/issues/:id`: Delete issue with audit log recording (Admin).
- `PUT /api/issues/:id/status`: Advance issue status and record timeline entry (Staff / Admin).
- `PUT /api/issues/:id/assign`: Assign or reassign issue to staff member (Admin).
- `POST /api/issues/:id/resolve`: Mark resolved with resolution notes & proof image (Staff).

### Dashboard & Analytics (`/api/dashboard`)
- `GET /api/dashboard/admin`: Executive stats, 4 Chart.js datasets, and hotspot summary.
- `GET /api/dashboard/student`: Student KPI counters and recent reported tickets.
- `GET /api/dashboard/staff`: Staff assigned tasks, active backlog, and workload stats.
- `GET /api/dashboard/campus-analytics`: In-depth Campus Problem Analytics co-occurrence matrix and zone turnaround metrics.

### System Services
- `GET /api/notifications` | `PUT /api/notifications/read-all`: Real-time user alert feed.
- `POST /api/feedback` | `GET /api/feedback/summary`: Post-resolution 5-star ratings and admin summary.
- `GET /api/audit-logs`: Paginated compliance and governance audit records.

---

## 9. Automated Testing Suite

The project includes an end-to-end integration test suite verifying the complete application workflow:
```bash
npm test
```
**Test Coverage Includes:**
- Server health check response
- Multi-role JWT login and authentication verification
- Student registration transaction
- Issue creation with metadata
- Administrative staff assignment
- Technician status advancement (`assigned` $\to$ `in_progress`)
- Technician resolution report submission
- Student 5-star feedback rating
- Campus Problem Analytics calculation
- Governance audit trail insertion
- In-app notification delivery and read status updates

---

## 10. Module Breakdown

1. **Authentication & RBAC Module**: Handles password hashing, JWT generation, session persistence, and server/client route protection.
2. **Issue Lifecycle Engine**: Manages the complete ticket lifecycle from `pending` $\to$ `assigned` $\to$ `in_progress` $\to$ `resolved` $\to$ `closed`, logging every state transition in `issue_updates`.
3. **Multer Media Pipeline**: Sanitizes uploaded files, verifies MIME types (`image/jpeg`, `image/png`, `image/webp`), and enforces 5MB size ceilings.
4. **Campus Problem Analytics Engine**: Groups incidents across campus zones and failure taxonomies to surface recurring infrastructure deficits.
5. **Notification & Feedback Loop**: Dispatches in-app alerts on state transitions and gathers student satisfaction ratings upon ticket completion.
6. **Governance Audit Module**: Logs user logins, assignments, priority overrides, and record deletions with user IDs, IP addresses, and timestamps.
7. **SEO & Public Portal Module**: Implements semantic HTML5, schema markup, XML sitemap, and robots.txt for public campus visibility.

---

## 11. Production Deployment Guide

### Deployment on Ubuntu VPS (e.g. AWS EC2, DigitalOcean, Linode)
1. **System Packages**:
   ```bash
   sudo apt update && sudo apt install -y nodejs npm mysql-server nginx
   ```
2. **MySQL Setup**:
   ```bash
   sudo mysql -e "CREATE DATABASE smart_campus_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
   ```
3. **Process Management with PM2**:
   ```bash
   npm install -g pm2
   pm2 start backend/server.js --name "smart-campus"
   pm2 startup && pm2 save
   ```
4. **Nginx Reverse Proxy Configuration**:
   ```nginx
   server {
       listen 80;
       server_name campus.yourdomain.edu;

       location / {
           proxy_pass http://127.0.0.1:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```
5. **SSL Certificate**:
   ```bash
   sudo apt install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d campus.yourdomain.edu
   ```

---

## 12. Resume & Portfolio Bullet Points

- **Full-Stack Architecture**: Architected an enterprise 3-tier campus facility tracking system supporting Students, Technicians, and Administrators using Node.js, Express, MySQL, and Vanilla JavaScript (ES6+).
- **Relational Database Design**: Designed a 3NF normalized MySQL database with 9 interconnected tables, foreign key constraints, and multi-column indexes for fast filtering across thousands of records.
- **Data Analytics Engine**: Developed a proprietary Campus Problem Analytics feature utilizing SQL aggregations and Chart.js to identify recurring maintenance hotspots by zone and category.
- **Security & RBAC**: Implemented stateless JWT authentication with bcrypt salted password hashing, role-based route guards, and Multer MIME-type sanitization to protect against unauthorized access and malicious uploads.
- **End-to-End Governance**: Engineered an immutable state transition timeline and comprehensive audit logging system capturing administrative actions, IP addresses, and operational payloads.

---

## 13. Viva / Interview Questions & Answers

### Q1: Why did you choose Vanilla JavaScript instead of React or Angular?
**Answer**: Using Vanilla JavaScript ES6+ demonstrates deep mastery of core web fundamentals: native DOM manipulation, the Fetch API, asynchronous programming with `async/await`, custom state management, and web component architecture without relying on third-party abstractions. It also results in zero build step overhead and lightweight runtime performance.

### Q2: How does the system prevent SQL Injection?
**Answer**: All database interactions use `mysql2/promise` with parameterized prepared statements (`execute('SELECT * FROM users WHERE email = ?', [email])`). Query parameters are sent separately from the SQL statement template, preventing untrusted input from modifying query semantics.

### Q3: How is password security implemented?
**Answer**: Passwords are never stored in plain text. When a user registers or updates their password, `bcryptjs` hashes the password with a cryptographic salt and work factor of 10. During authentication, `bcrypt.compare` securely verifies the candidate password in constant time to prevent timing attacks.

### Q4: Explain the purpose of the `issue_updates` table.
**Answer**: The `issue_updates` table functions as an immutable audit log for the ticket lifecycle. Whenever a status changes (`pending` $\to$ `assigned` $\to$ `in_progress` $\to$ `resolved`), a new record is inserted with the previous status, new status, user ID of the actor, remarks, and a timestamp. This powers the visual timeline in the UI and prevents disputes regarding technician response times.

### Q5: What makes Campus Problem Analytics different from simple ticket counts?
**Answer**: Standard ticketing counts only show total volume. The Campus Problem Analytics engine computes co-occurrence frequencies between physical locations (Blocks, Labs, Hostels) and issue categories, calculating the percentage of a zone's total failures attributed to a single cause. For example, if 70% of issues in Computer Lab 2 are hardware crashes, the system flags it as a systemic failure requiring capital component replacement rather than continuous individual repairs.

---

## 14. Future Enhancements

1. **Automated WhatsApp / SMS Gateway**: Integration with Twilio or Meta WhatsApp Business API for instant mobile alert dispatches.
2. **AI Grievance Triage**: Automatic category and priority assignment using Natural Language Processing (NLP) models.
3. **Campus GIS Map Integration**: Interactive Leaflet / Google Maps overlays visualizing geographic heatmaps of active campus breakdowns.
4. **IoT Sensor Ingestion**: MQTT broker integration allowing smart water level sensors and electrical circuit breakers to automatically file grievance tickets before physical human detection.
