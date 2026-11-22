# EventHub: Campus Event Management System

![CI/CD](https://github.com/lowjiahui0127-prog/mal3020-event-management-system/actions/workflows/ci-cd.yml/badge.svg)

**Author:** Low Jia Hui (BSSE2509252)  
**Module:** MAL3020 Full-Stack Development

EventHub is a full-stack, distributed event management system developed for MAL3020 Assessment 2. It allows attendees to browse and register for events, while organisers can create and manage events and monitor registrations through real-time WebSocket updates.

## Features

| Role | What they can do |
| --- | --- |
| Visitor | Browse and search published events, view event details and live seat availability |
| Attendee | Sign up and log in, register for and cancel a registration, see upcoming, past and cancelled registrations |
| Organiser | Create, edit, publish, cancel and delete own events, view registered attendees and monitor registrations |
| System | JWT authentication, role-based access and ownership checks, no overbooking under concurrent requests, WebSocket updates, zero-downtime blue-green deployment |

## Technology Stack

| Layer | Technology |
| --- | --- |
| Frontend | Angular 22, TypeScript, signals, RxJS |
| Backend | Node.js 24, Express 5, WebSocket (ws) |
| Database | MongoDB 8 with Mongoose 9 |
| Security | JWT, bcrypt (`bcryptjs`), role-based access |
| Containers | Docker, Docker Compose, Nginx |
| Tests | Jest and supertest, Vitest, Playwright |
| CI/CD | GitHub Actions, GitHub Container Registry |

## Quick start (Docker)

### Prerequisites
- Git
- Docker Desktop (includes Docker Compose)

### Run the Application

```bash
git clone https://github.com/lowjiahui0127-prog/mal3020-event-management-system.git
cd mal3020-event-management-system

cp .env.example .env  # Open .env and set JWT_SECRET to a long random string

docker compose up -d --build --wait
docker compose run --rm backend-blue npm run seed:demo
```

Open **http://localhost:8080**.

### Demo accounts

| Role | Email | Password |
| --- | --- | --- |
| Organiser | `organiser@eventhub.test` | `Organiser123!` |
| Attendee | `attendee@eventhub.test` | `Attendee123!` |
| Other attendees | `student1@eventhub.test` to `student40@eventhub.test` | `Attendee123!` |

These are fictional demo accounts. `seed:demo` resets the demo organiser's events and registrations every time it runs. Do not use `docker compose down -v` unless you want to delete the database.

## Real-Time WebSocket Demonstration

1. Open **Browser 1** and log in as the Organiser. Keep the **Dashboard** open.
2. Open **Browser 2** (or a private/incognito window) and log in as an Attendee.
3. Register for an event, such as **"Practical Cybersecurity & Ethical Hacking Talk"**.
4. Observe the Organiser Dashboard update its registration count and recent registrations without refreshing the page.

## Access from Other Computers

EventHub can be accessed by other computers on the same local network.

1. Start the Docker application on the host computer.
2. Find the host computer's local IP address using `ipconfig`.
3. Allow inbound access to port `8080` through the host firewall.
4. Open **`http://<HOST-IP>:8080`** on another computer connected to the same network.

## Tests

| What | Command | Notes |
| --- | --- | --- |
| Backend (unit and integration, real MongoDB) | `cd backend && npm test` | Needs `MONGO_URI_TEST` in `backend/.env` (see `backend/.env.example`) |
| Backend lint | `cd backend && npm run lint` | ESLint |
| Frontend (unit and component) | `cd frontend && npm test -- --watch=false` | Vitest |
| End to end (system) | `cd e2e && npx playwright test` | Needs the Docker stack and demo data running |
| Rollover test | `bash scripts/rollover-test.sh` | Builds the images, replaces the back end while sending requests, rolls back |

The same checks run on every push in GitHub Actions (`.github/workflows/ci-cd.yml`). Test plans and results are in [`docs/testing/`](docs/testing/).

## CI/CD and zero-downtime deployment

```
push -> backend-ci + frontend-ci -> e2e -> docker (images + rollover test) -> publish to GHCR -> manual approval -> deploy
```

New back-end versions replace the running one using a blue-green rollover:

```bash
docker build -t eventhub-backend:v2 ./backend
bash scripts/deploy.sh eventhub-backend:v2 2.0.0     # start beside the old one, check, switch, drain, stop the old one
bash scripts/deploy.sh rollback                      # go back to the previous version
```

After the first deployment use `deploy.sh` instead of `docker compose up`.

## Project structure

```
backend/     Express API: src/{routes,controllers,middleware,models,realtime,seed,utils}, tests/
frontend/    Angular app: src/app/{pages,components,services,guards,interceptors,models,utils}, nginx/
e2e/         Playwright system tests
scripts/     deploy.sh (blue-green rollover), rollover-test.sh
docs/        design diagrams, testing evidence
docker-compose.yml, .github/workflows/ci-cd.yml
```

## Credits

Poster photos are from Unsplash (see `frontend/public/posters/CREDITS.md`). All events, names and registrations in the demo data are fictional.
