# Team Task Manager

A full-stack web app for project management with role-based access control.

## Live URL
https://team-task-manager-frontend.railway.app

## Tech Stack
- **Frontend:** React 18 + Vite + Recharts + React Query + React Hook Form
- **Backend:** Node.js + Express + Prisma ORM
- **Database:** PostgreSQL (Neon — serverless cloud)
- **Deployment:** Railway

## Features
- JWT authentication with refresh tokens (HttpOnly cookies)
- Role-based access: System Admin, Project Admin, Member
- Project creation and team management
- Task lifecycle: TODO → IN_PROGRESS → IN_REVIEW → DONE
- Kanban board UI per project
- Dashboard with overdue alerts and status charts
- Admin panel: user list + global stats
- Zod validation on all API inputs

## Local Development

```bash
# 1. Clone repo
git clone https://github.com/your-username/team-task-manager
cd team-task-manager

# 2. Backend setup
cd backend && npm install
cp .env.example .env   # Fill in DATABASE_URL and JWT secrets
npx prisma migrate dev --name init
node prisma/seed.js    # Creates test users
npm run dev            # Starts on http://localhost:5000

# 3. Frontend setup (new terminal)
cd frontend && npm install
npm run dev            # Starts on http://localhost:5173
```

## API Documentation
Base URL: `https://your-backend.railway.app/api/v1`

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | /auth/signup | No | Create account |
| POST | /auth/login | No | Login |
| POST | /auth/refresh | Cookie | Refresh access token |
| GET | /projects | Yes | List my projects |
| POST | /projects | Yes | Create project |
| GET | /projects/:id | Member | Project detail + tasks |
| POST | /projects/:id/members | Admin | Add member by email |
| GET | /projects/:id/tasks | Member | List tasks (filterable) |
| POST | /projects/:id/tasks | Member | Create task |
| PATCH | /tasks/:id/status | Assignee/Admin | Update task status |
| GET | /tasks/dashboard | Yes | Aggregated dashboard |
| GET | /admin/users | System Admin | All users |

## Test Credentials
- **Admin:** admin@test.com / password123
- **Member:** member@test.com / password123

## Environment Variables (Backend)
```
DATABASE_URL=postgresql://...neon.tech/dbname?sslmode=require
JWT_SECRET=<64-char random string>
JWT_REFRESH_SECRET=<different 64-char random string>
PORT=5000
NODE_ENV=production
FRONTEND_URL=https://your-frontend.railway.app
```
