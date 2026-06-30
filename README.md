# LifePilot AI

Your AI-powered life operating system — finances, planning, journaling, goals, habits, notes, location timeline, and an AI assistant that knows your whole life context. Mobile-first (iOS + Android) built on Expo + React Native, backed by a Hono/Drizzle API with Better Auth.

## Features

- **Dashboard** — daily snapshot: net cash flow, today's schedule, tasks, active goals, AI insight of the day.
- **Money** — income/expense tracking, categories, budgets, finance reports, AI spending analysis.
- **Plan** — reminders (with priority), alarms, weekly timetable, calendar.
- **Life hub**
  - **Smart Diary** — journaling with moods & tags.
  - **Goals** — daily → 5-year targets with progress tracking.
  - **Habits** — streaks, daily check-ins, 7-day analytics.
  - **Notes** — folders, tags, favorites, search (markdown-friendly).
  - **Timeline & Places** — GPS location history, reverse-geocoded, travel distance stats.
  - **Reports** — daily/weekly/monthly/yearly summaries across finance, productivity, travel.
- **AI Assistant** — chat that injects your real life data as context to give grounded answers.
- **Global search** — across transactions, diary, notes, goals, reminders, places.
- **Settings** — dark/light theme, currency, PIN lock, biometric unlock, location tracking toggle.

## Stack

- **Mobile:** Expo (expo-router), React Native, react-query, react-native-svg charts, phosphor icons.
- **API/Web:** Hono on Bun, Drizzle ORM (SQLite/libSQL), Better Auth (bearer tokens on mobile).
- **AI:** Vercel AI SDK via gateway (`openai/gpt-5.4-mini`) with per-user life context.
- **Monorepo:** Turborepo — `packages/web` (API + web), `packages/mobile`, `packages/desktop`.

## Project layout

```
packages/
  web/      # Hono API + React web client (single Bun server)
    src/api/index.ts        # all routes
    src/api/database/        # schema.ts, auth-schema.ts
    src/api/agent/gateway.ts # AI model + buildUserContext
  mobile/   # Expo app
    app/                    # expo-router routes
      (auth)/sign-in.tsx
      (tabs)/               # index, money, plan, life, ai
      diary | goals | habits | notes | timeline | reports | search | settings .tsx
    lib/                    # api.ts, auth.ts, hooks.ts, theme.tsx, format.ts
    components/             # ui.tsx, charts.tsx, ErrorBoundary.tsx
```

## Run locally

```bash
# from repo root
bun install

# 1) API + web (port 4200) — required for the mobile app to talk to
bun run start          # pm2-managed, or: bun run dev

# 2) Mobile (Metro on 8081)
bun run dev:mobile
```

The mobile app reads its API base URL from `app.json` → `expo.extra.apiUrl`.
For local device testing, point it at your machine's LAN IP (e.g. `http://192.168.x.x:4200/`)
or set `EXPO_PUBLIC_API_URL`.

## Database

```bash
bun run db:push      # push schema (already applied)
bun run db:studio    # inspect
```

## Type-check & build

```bash
cd packages/mobile && bunx tsc --noEmit   # 0 errors
bun run build                             # turbo build (web + desktop)
cd packages/mobile && bunx expo export --platform ios   # full bundle smoke test
```

See `DEPLOY.md` for shipping to the App Store / Play Store.
