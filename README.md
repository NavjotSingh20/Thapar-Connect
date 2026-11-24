# Thapar Connect

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.3-brightgreen.svg)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3.4-38bdf8.svg)](https://tailwindcss.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791.svg)](https://www.postgresql.org/)

**Thapar Connect** is a production-quality, responsive web application exclusively built for the **Thapar Institute of Engineering and Technology (TIET)** campus community. It delivers closed-campus cab pooling with spatial distance matching, a student marketplace with seller privacy protection, and real-time one-to-one STOMP WebSocket chat.

---

## 🏛️ System Architecture

```
                       +----------------------------------------+
                       |           Client Browsers              |
                       | (Desktop, Mobile PWA 360px - 1440px+)  |
                       +-------------------+--------------------+
                                           |
                                  HTTP / WebSocket
                                           v
                       +-------------------+--------------------+
                       |           Nginx / Vite                 |
                       |    (Port 3000 / 80 / Reverse Proxy)    |
                       +---------+--------------------+---------+
                                 |                    |
                         /api/v1 |                    | /ws
                                 v                    v
+--------------------------------+--------------------+-------------------------+
|                               Spring Boot 3.3 Backend                         |
|                                                                               |
|  +--------------------+  +----------------------+  +-----------------------+  |
|  | Google OAuth2 Auth |  | Cab Pooling Service  |  |  Marketplace Service  |  |
|  | (@thapar.edu only) |  | (Haversine Distance) |  |  (Image Validation)   |  |
|  +--------------------+  +----------------------+  +-----------------------+  |
|                                                                               |
|  +--------------------+  +----------------------+  +-----------------------+  |
|  | WebSocket STOMP    |  | Safety & Moderation  |  |  Payment Skeleton     |  |
|  | (Thread Isolation) |  | (Block & Report)     |  |  (NoOp Extensibility) |  |
|  +--------------------+  +----------------------+  +-----------------------+  |
|                                                                               |
|  +-------------------------------------------------------------------------+  |
|  |                     Spring Data JPA & Flyway Migrations                 |  |
|  +-------------------------------------------------------------------------+  |
+------------------------------------+------------------------------------------+
                                     |
                                     v
                       +-------------+--------------+
                       |    PostgreSQL 16 Database   |
                       |   (11 Relational Tables,   |
                       |    Indexes, Foreign Keys)  |
                       +----------------------------+
```

---

## 📂 Repository Layout

```
Thapar-Connect/
├── .env.example              # Environment variables template
├── docker-compose.yml        # Multi-container orchestration (PostgreSQL, Backend, Frontend)
├── README.md                 # Project documentation & quickstart
├── backend/                  # Java 21 / Spring Boot 3.3 layered backend
│   ├── pom.xml               # Maven configuration with Spring Boot dependencies
│   ├── mvnw / mvnw.cmd       # Maven wrapper binaries
│   ├── Dockerfile            # Multi-stage production container build (Temurin 21 JRE, layered JAR)
│   └── src/
│       ├── main/java/com/thaparconnect/backend/
│       │   ├── config/       # Security, OpenAPI, WebSocket, CORS configs
│       │   ├── auth/         # Google OAuth & JWT token management
│       │   ├── users/        # User profile & onboarding gate
│       │   ├── cabs/         # Cab pooling & Haversine spatial search
│       │   ├── marketplace/  # Listings, image storage & privacy controls
│       │   ├── chat/         # STOMP WebSocket messaging & thread isolation
│       │   ├── safety/       # Report, block & admin moderation
│       │   ├── storage/      # Pluggable storage (Local, Cloudinary)
│       │   ├── payments/     # PaymentService & NoOpPaymentService skeleton
│       │   └── common/       # GlobalExceptionHandler, ApiException
│       └── main/resources/
│           ├── application.yml
│           └── db/migration/ # Flyway V1 & V2 schema migrations
├── frontend/                 # React 18 + TypeScript + Vite + Tailwind CSS PWA
│   ├── package.json          # Frontend dependencies & scripts
│   ├── vite.config.ts        # Vite configuration with proxy and aliases
│   ├── tailwind.config.js    # Thapar maroon (#800000) & gold palette
│   ├── Dockerfile            # Multi-stage container build (Node 20 + Nginx Alpine)
│   ├── nginx.conf            # Nginx SPA & reverse proxy configuration
│   ├── public/               # Static assets & PWA manifest
│   └── src/                  # App components, layouts, pages, types
└── e2e/                      # Opaque-box E2E test suite (Playwright / Vitest)
    ├── package.json          # Vitest runner scripts
    └── src/                  # Tiers 1-4 end-to-end integration test scenarios
```

---

## 🚀 Quickstart

### Option 1: Docker Compose (Recommended)

1. Clone the repository and navigate to root:
   ```bash
   cd Thapar-Connect
   ```

2. Copy the sample environment file:
   ```bash
   cp .env.example .env
   ```

3. Launch all services with container healthchecks:
   ```bash
   docker compose up --build
   ```

4. Access the applications:
   - **Frontend Web UI**: `http://localhost:3000`
   - **Backend REST API**: `http://localhost:8080/api/v1`
   - **Swagger / OpenAPI Documentation**: `http://localhost:8080/swagger-ui.html`
   - **Spring Actuator Health**: `http://localhost:8080/actuator/health`

---

### Option 2: Local Development Mode

#### Prerequisites
- **Java**: OpenJDK 21 LTS (`java -version`)
- **Node.js**: Node 20 LTS (`node -v`) & npm 10+ (`npm -v`)
- **PostgreSQL**: 16 (`psql` or Docker container)

#### Step 1: Start PostgreSQL
```bash
docker run --name thapar_postgres \
  -e POSTGRES_DB=thapar_connect \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  -d postgres:16-alpine
```

#### Step 2: Run Backend
```bash
cd backend
./mvnw spring-boot:run
```
*(On Windows PowerShell: `.\mvnw.cmd spring-boot:run`)*

#### Step 3: Run Frontend
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## ⚙️ Configuration & Environment Variables

| Variable | Description | Default |
|---|---|---|
| `DB_HOST` | PostgreSQL hostname | `localhost` (or `postgres` in Docker) |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_NAME` | Database name | `thapar_connect` |
| `DB_USER` | Database user | `postgres` |
| `DB_PASSWORD` | Database password | `postgres` |
| `SERVER_PORT` | Spring Boot server port | `8080` |
| `JWT_SECRET` | Secret key for HMAC-SHA256 JWT signing (min 256 bits) | `404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970` |
| `JWT_ACCESS_EXPIRATION_MS` | Access token lifetime in milliseconds | `900000` (15 min) |
| `JWT_REFRESH_EXPIRATION_MS` | Refresh token lifetime in milliseconds | `604800000` (7 days) |
| `GOOGLE_CLIENT_ID` | OAuth2 Client ID for `@thapar.edu` verification | `mock-google-client-id.apps.googleusercontent.com` |
| `ALLOW_MOCK_TOKENS` | Enable mock tokens for automated tests | `false` |
| `APP_CORS_ALLOWED_ORIGINS` | Allowed CORS origins (comma-separated) | `http://localhost:3000,http://localhost:5173,http://localhost` |
| `STORAGE_PROVIDER` | Pluggable storage provider (`LOCAL`, `CLOUDINARY`) | `LOCAL` |
| `STORAGE_LOCAL_DIR` | Directory for uploaded media files | `uploads` |
| `FRONTEND_PORT` | Exposed port for web frontend | `3000` |
| `BACKEND_PORT` | Exposed port for REST API | `8080` |

---

## 🧪 Testing

### Backend Unit & Integration Tests
```bash
cd backend
./mvnw test
```
*(178 tests covering Auth, Cabs, Marketplace, Chat STOMP, Safety, and Payments)*

### Frontend Build & Lint Verification
```bash
cd frontend
npm run lint
npm run build
```

### End-to-End (E2E) Test Suite
```bash
cd e2e
npm install
npm test
```
To run E2E tests against the Docker stack:
```bash
cd e2e
API_BASE_URL=http://localhost:3000/api/v1 WS_URL=ws://localhost:3000/ws npm test
```

---

## 🎨 Brand Guidelines & Logo Replacement

- **Primary Brand Maroon**: `#800000` (Core Thapar Maroon)
- **Deep Maroon**: `#4A0404` (Header background & dark mode contrast)
- **Gold Accent**: `#D4AF37` / `#B8860B` (Badges & active indicators)
- **Official Crest Replacement**: See [`frontend/src/assets/README.md`](frontend/src/assets/README.md) for step-by-step instructions on updating `thapar-logo.png` with official institutional assets.
