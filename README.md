# Money Tracker

React + Vite frontend and Express + MongoDB API in one project. In production both are served by Vercel from the same domain.

## Local setup

Requires Node 26 (`nvm use` picks it up from `.nvmrc`).

```bash
npm install
cp .env.example .env   # then fill in the values
npm run dev
```

`npm run dev` starts the app on http://localhost:5173 and the API on port 5001. Vite proxies `/api` to the API.

## Environment variables

| Name | Purpose |
| --- | --- |
| `MONGODB_URI` | MongoDB connection string |
| `MONGODB_DB` | Database name (optional, overrides the one in the URI) |
| `ACCESS_TOKEN_SECRET` | Signs access tokens |
| `REFRESH_TOKEN_SECRET` | Signs refresh tokens |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | Push notifications. Generate with `npx web-push generate-vapid-keys` |
| `VAPID_SUBJECT` | Contact for the push service, e.g. `mailto:you@example.com` |
| `CRON_SECRET` | Protects the daily notification job. Vercel sends it to the job automatically |
| `BRANDFETCH_CLIENT_ID` | Logo search and logos, from developers.brandfetch.com. The server hands it to the browser at runtime |
| `BRANDFETCH_API_KEY` | Brand colors for cards (secret, server only, optional) |

Set the same values in the Vercel project. Never prefix them with `VITE_`, because that exposes them to the browser.

## Notifications

Notifications are web push only, sent to devices where the user turned them on. Large expense alerts go out when the expense is saved. The daily reminder and weekly summary come from `/api/cron/notifications`, which Vercel Cron runs once a day (`vercel.json`, in UTC). On iPhone the app must be added to the Home Screen first.

## Structure

- `src/`: frontend
- `server/`: API (`app.js` defines the Express app, `dev.js` runs it locally)
- `api/index.js`: Vercel function that serves the same Express app

## Notes

- UI primitives live in `src/components/ui.jsx`, screens in `src/screens`, and shared data and formatting in `src/data/AppData.jsx`.
- The theme (colors, fonts, breakpoints) is in `src/index.css`.
- `xlsx` is installed from the SheetJS CDN because the npm release is outdated and has known vulnerabilities.
