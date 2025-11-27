# dial4inclusion server

TypeScript/Express API that powers authentication and complaint management for Dial4Inclusion. The API exposes endpoints for users to sign up, log in, and file complaints, while admins can review and update complaint statuses.

## Stack

- Express + TypeScript
- PostgreSQL (Supabase) via the `postgres` driver
- JWT auth (`jsonwebtoken`)
- Validation with `zod`

## Getting started

```bash
cd /Users/ahmed/Desktop/code/teata/pwd/server
npm install
cp .env.example .env    # create and fill real secrets
npm run dev
```

### Environment

| Variable      | Description                                  |
| ------------- | -------------------------------------------- |
| `PORT`        | HTTP port (default 4000)                     |
| `DATABASE_URL`| Supabase/Postgres connection string          |
| `JWT_SECRET`  | Secret used to sign user tokens (>=20 chars) |
| `CORS_ORIGIN` | Optional allowed origin for browsers         |

## Database schema

Apply the SQL in `sql/schema.sql` (or translate into migrations) to provision the `users` and `complaints` tables inside Supabase/Postgres.

## Scripts

- `npm run dev` – restart-on-change dev server via `tsx`
- `npm run build` – type-check and emit JS to `dist/`
- `npm run start` – run compiled server
- `npm run lint` / `npm run format` – static analysis & formatting

## API outline

- `POST /api/auth/register` – sign up and receive JWT
- `POST /api/auth/login` – log in with email/password
- `GET /api/auth/me` – get profile (requires bearer token)
- `POST /api/complaints` – submit complaint (auth required)
- `GET /api/complaints` – list complaints; admins see all
- `PATCH /api/complaints/:id/status` – admin-only status change

Enhance these handlers with rate limiting, email notifications, or analytics as needed.

