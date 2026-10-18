# SkillBridge AI

SkillBridge is a MERN learning platform for students and administrators. It combines skill assessments and progression, course recommendations, personalized learning paths, YouTube lessons and quizzes, PDF study resources, AI document Q&A, generated practice quizzes, analytics, and profile management.

## Repository layout

```text
client/   React 19 + Vite frontend
server/   Express 5 API, MongoDB/Mongoose models, AI and learning services
```

The frontend calls the API through `client/src/api/client.js`. In local development Vite proxies `/api` to `http://localhost:5000`. In production set `VITE_API_URL` to the API origin plus `/api` (for example `https://your-api.vercel.app/api`).

## Requirements

- Node.js 20 or newer (the API declares Node.js 18 or newer).
- npm.
- MongoDB, either local or a hosted MongoDB deployment.
- Optional provider credentials for Gemini/OpenAI, Hugging Face embeddings, and Cloudinary file storage.

## Local development

1. Install API dependencies and create a local environment file:

   ```powershell
   cd server
   npm install
   Copy-Item .env.example .env
   ```

2. Set `MONGO_URI` and a unique local `JWT_SECRET` in `server/.env`. Add provider keys only for integrations you want to use. The example uses local MongoDB and fallback AI providers.

3. Start the API:

   ```powershell
   npm run dev
   ```

4. In a second terminal, start the frontend:

   ```powershell
   cd client
   npm install
   npm run dev
   ```

5. Open the Vite URL, usually `http://localhost:5173`. The API health endpoint is `http://localhost:5000/api/health`.

The `server/package.json` currently has a `seed` script pointing to `src/seed/seed.js`, but that file is not present. `src/seed/users.seed.js` is only a sanitized data fixture; it does not create accounts. Do not rely on default/demo credentials.

## Environment variables

Configure these in `server/.env` locally and in the backend Vercel project's Environment Variables for deployment. Never put server secrets in the client project or in variables prefixed with `VITE_`.

| Variable | Required | Purpose |
| --- | --- | --- |
| `NODE_ENV` | Production | Set to `production` for deployment. |
| `MONGO_URI` | Yes | MongoDB connection string. Use a hosted database reachable by Vercel and restrict its network/user access. |
| `JWT_SECRET` | Yes | Long, random signing secret. Generate a different value for each environment. |
| `CLIENT_URL` | Yes | Exact deployed frontend origin allowed by API CORS, without a path. |
| `PORT` | Local only | API port; defaults to `5000`. Vercel manages its own listener. |
| `JWT_EXPIRES_IN` | No | JWT lifetime; defaults to `7d`. |
| `LLM_PROVIDER` | No | `gemini`, `openai`, or `fallback`. |
| `GOOGLE_API_KEY`, `GEMINI_MODEL` | Optional | Gemini provider credentials and model. |
| `OPENAI_API_KEY`, `OPENAI_MODEL` | Optional | OpenAI provider credentials and model. |
| `EMBEDDING_PROVIDER`, `EMBEDDING_MODEL`, `HUGGINGFACE_API_KEY` | Optional | Document embedding provider configuration. |
| `VECTOR_DB`, `MONGODB_VECTOR_INDEX`, `MONGODB_VECTOR_PATH` | Optional | Vector-search configuration. MongoDB Atlas vector search must be configured for hosted retrieval. |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Optional | Persistent storage for uploaded PDFs and profile photos. Keep the API secret server-side. |
| `MAX_FILE_SIZE` | No | General upload limit in bytes; defaults to 20 MiB. |
| `ASSESSMENT_IMPORT_MAX_FILE_SIZE`, `ASSESSMENT_IMPORT_MAX_ROWS` | No | Assessment import limits. |
| `QUIZ_REVIEW_THRESHOLD`, `QUIZ_ADVANCE_THRESHOLD` | No | Quiz recommendation thresholds. |
| `IGOT_ADAPTER` | No | Integration adapter selection; defaults to `mock`. |
| `UPLOAD_DIR`, `LOG_LEVEL` | No | Local upload directory and log level. Do not depend on local disk persistence in serverless deployments. |

The frontend only needs `VITE_API_URL` when deployed separately from the API. Set it at build time in the client Vercel project. Vite embeds `VITE_*` values in public JavaScript bundles, so never put API keys, database credentials, or JWT secrets in them.

## Deploy to Vercel

Deploy the client and API as **two Vercel projects** from the same repository, each with its own Root Directory. The repository contains a Vercel config in each package folder.

### API project

1. Import the repository and set **Root Directory** to `server`.
2. Use the Express framework preset (Vercel can detect the Express app in `src/server.js`). Keep the default npm install/build settings; there is no separate API compile step.
3. Add production environment values listed above. At minimum configure `NODE_ENV=production`, `MONGO_URI`, `JWT_SECRET`, and `CLIENT_URL`.
4. Set `CLIENT_URL` to the exact production client origin, for example `https://your-client.vercel.app`.
5. Deploy and confirm `https://your-api.vercel.app/api/health` responds successfully.

`src/server.js` exports the Express application for Vercel and connects MongoDB during serverless instance initialization. For local runs it retains the existing `npm start`/`npm run dev` listener behavior. The MongoDB provider must allow connections from the deployed function environment.

### Client project

1. Create a second Vercel project from the same repository and set **Root Directory** to `client`.
2. Set the `VITE_API_URL` environment variable to `https://your-api.vercel.app/api` (replace with the API deployment origin).
3. Deploy. `client/vercel.json` builds with `npm run build`, publishes `dist`, and rewrites deep links to `index.html` for React Router.
4. If the client deployment URL changes, update the API project's `CLIENT_URL` and redeploy the API.

The Vercel Functions configuration sets the API function maximum duration to 60 seconds. The effective maximum depends on the Vercel plan and account settings.

### Deployment constraints to review

- Vercel Function request and response bodies have a 4.5 MB maximum. Some current upload settings permit larger files (for example 5–20 MB), so those uploads can be rejected by Vercel before the API receives them. Keep requests under Vercel's limit or implement browser-to-Cloudinary direct uploads for larger files.
- Function filesystems are temporary. Configure Cloudinary for persistent PDFs and photos; do not use local `server/uploads` as production storage.
- MongoDB vector search and optional LLM/embedding integrations need their own hosted service configuration and network access.
- The existing forgot-password backend creates and hashes a one-hour token but does not send email. In development the API returns a reset token; production intentionally does not. Production password recovery therefore needs an email provider before users can receive reset links.
- Validate your selected Vercel plan's function duration and bundle limits against AI and document processing workload.

## Application areas

- Student dashboard, profile, skills, skill-gap analysis, learning path, and progress analytics.
- Skill assessments with mastery progression, secure scoring, history, and admin authoring/import.
- Course recommendations and YouTube lesson catalog, lesson progress, and quizzes.
- Study-resource library with PDF preview/download and admin management.
- AI assistant with document uploads, retrieval-augmented answers, and generated practice quizzes.
- Admin employee, assessment, report, YouTube resource, and study-resource management.

## API overview

All API routes are mounted under `/api`. Examples include:

| Area | Route prefix |
| --- | --- |
| Health | `/api/health` |
| Authentication | `/api/auth` |
| Employees and skills | `/api/employees`, `/api/skills` |
| Assessments | `/api/assessments` |
| Courses and recommendations | `/api/courses`, `/api/recommendations` |
| Learning path and YouTube | `/api/learning-path`, `/api/youtube-learning` |
| Documents and assistant | `/api/documents`, `/api/assistant` |
| Quizzes and analytics | `/api/quiz`, `/api/analytics` |
| Study resources | `/api/study-resources` |
| Admin and reports | `/api/admin`, `/api/reports` |

Protected routes require the bearer token managed by the existing authentication context. Role restrictions are enforced by API middleware.

## Security and data review

- `.env`, `.env.*`, local Vercel metadata, logs, and uploaded files are ignored by Git. `.env.example` is the only environment template intended for source control.
- `server/.env` exists locally but is ignored and is not tracked. Do not commit it or paste its values into issues or deployment logs.
- Realistic-looking example identities and the shared hardcoded sample password were replaced with synthetic `example.com` fixture data; there are no default account credentials in the repository.
- Client-side `VITE_*` values are public. All provider keys, Cloudinary secrets, MongoDB credentials, and JWT secrets belong only in the server environment.
- Password reset tokens are hashed before database storage and expire after one hour. Production responses must remain generic; configure email delivery before enabling production recovery.
- Do not deploy with the development JWT fallback, expose MongoDB publicly, or use a privileged database account. Rotate any credential that has ever been committed or shared.
- The health endpoint reports provider names, not credentials. Uploaded documents and user records are handled by the API; do not log their contents or include real production data in sample fixtures.

## Scripts and checks

Frontend (`client`):

```bash
npm run dev
npm run build
npm run lint
```

Backend (`server`):

```bash
npm run dev
npm start
npm test
```

Backend tests use Node's built-in test runner. The current seed script target is missing, as noted above.
