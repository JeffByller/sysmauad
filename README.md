# SysMauad

## Overview

**SysMauad** is a container‑based application that combines a PostgreSQL database, a Node.js/TypeScript backend API, a React + Vite frontend, an Evolution API (WhatsApp integration), and an Nginx reverse‑proxy. All services are orchestrated with Docker Compose, making local development and deployment straightforward.

## Services

| Service | Description | Ports | Key Env Variables |
|---------|-------------|-------|-------------------|
| `postgres` | PostgreSQL 16 (Alpine) – stores application data | `5432` | `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` |
| `evolution-api` | Evolution API – WhatsApp integration layer | `8080` | `SERVER_URL`, `DOCKER_ENV`, `DATABASE_ENABLED` |
| `backend` | Node.js + TypeScript API – core business logic | `3001` | `PORT`, `DATABASE_URL`, `EVOLUTION_API_URL` |
| `frontend` | Vite‑React SPA – UI for the system | Served via Nginx on `8000` (internal) | – |
| `nginx` | Reverse‑proxy exposing the frontend (`80`) and routing API requests to the backend (`3001`) |

## Quick Start

```bash
# Clone the repository (if not already done)
git clone <repo‑url>
cd sysmauad

# Build and start all containers
docker compose up --build -d
```

The services will be reachable at:
- **Frontend**: http://localhost (served by Nginx)
- **Backend API**: http://localhost:3001
- **Evolution API**: http://localhost:8080
- **PostgreSQL**: localhost:5432 (use any PostgreSQL client)

## Development

### Backend

```bash
# Watch TypeScript sources and restart on changes
cd backend
npm install
npm run dev   # usually runs ts-node-dev or nodemon
```

### Frontend

```bash
cd frontend
npm install
npm run dev   # Vite development server on http://localhost:5173
```

### Database

```bash
# Open a psql shell inside the container
docker exec -it sysmauad-postgres psql -U $POSTGRES_USER $POSTGRES_DB
```

## Custom Antigravity Skills

The repository ships with a few handy Antigravity skills (see the `custom/skills/sysmauad_dev` folder) that streamline common tasks:
- **`/start-dev`** – Starts all services in dev mode (hot‑reload backend & frontend).
- **`/logs <service>`** – Shows the latest logs of a specified Docker service.
- **`/db-shell`** – Opens an interactive `psql` shell inside the PostgreSQL container.
- **`/restart <service>`** – Restarts a given service without tearing down the whole stack.

These skills can be invoked directly from the Antigravity IDE or the CLI (`agy`).

## License

MIT – feel free to fork, modify, and use this project as a reference for container‑based full‑stack applications.
