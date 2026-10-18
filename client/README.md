# SkillBridge AI frontend

The React/Vite student and admin interface lives in this directory. For complete setup, API environment variables, security notes, and separate Vercel deployment instructions, see the [repository README](../README.md).

## Local development

```bash
npm install
npm run dev
```

Vite proxies `/api` requests to `http://localhost:5000` while developing. Start the API from `../server` in another terminal.

## Build and lint

```bash
npm run build
npm run lint
```

Vercel uses this folder as the project root. Set `VITE_API_URL` to the deployed API origin followed by `/api`; the value is public in the generated frontend bundle and must not contain secrets.
