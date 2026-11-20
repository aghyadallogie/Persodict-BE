# Persodict API

Backend for Persodict, a personal translation dictionary. A user signs in, picks the languages they care about, and translates a phrase: the API translates it with DeepL into English plus each chosen language, stores it, and returns their history.

NestJS 11, Prisma 6 on MongoDB, passport-jwt. Deployed on Vercel at `https://persodict-be.vercel.app`. Routes live at the root (there is no `/api` prefix); `/api` is only the Swagger UI.

## Setup

```bash
npm install            # also runs `prisma generate`
npm run start:dev      # needs a .env with the variables below
```

### Environment variables

| Variable | Required | What it is |
|---|---|---|
| `DATABASE_URL` | yes | MongoDB connection string |
| `JWT_SECRET` | yes | Signs login tokens. The app refuses to start without it, and there is no fallback |
| `DEEPL_AUTH_KEY` | yes | DeepL API key (free-tier endpoint) used for translations |
| `GOOGLE_WEB_CLIENT_ID` | for Google sign-in | The **Web** OAuth client ID. Google ID tokens must be issued for it |
| `PORT` | no | Defaults to 3000 |

## Routes

| Route | Auth | Purpose |
|---|---|---|
| `POST /auth/register`, `POST /auth/login` | no | Email and password. Returns `{ id, email, token }` |
| `POST /auth/google` | no | Body `{ idToken }`. Same response as login; finds or creates the user by verified email |
| `GET /auth/me` | yes | The logged-in user's id and email, from the token |
| `GET /settings`, `POST /settings` | yes | The user's languages (`POST` replaces them) |
| `GET /phrases` | yes | The user's phrases, oldest first |
| `POST /phrases/translate` | yes | Translates and saves a phrase. Limited to 10 per minute per user; saves nothing if any language fails |
| `DELETE /phrases/:phraseId` | yes | Deletes one of the user's phrases |
| `GET /health` | no | `{ status: "ok" }` |

Authenticated routes expect `Authorization: Bearer <token>`.

## Scripts

```bash
npm run start:dev   # watch mode
npm run build       # compile to dist/
npm test            # unit tests (jest)
npm run lint
npx tsc --noEmit    # typecheck
```

## Database

Prisma does not create MongoDB indexes when the app starts or builds. After changing `prisma/schema.prisma` (for example the `Phrase.authorId` index), run:

```bash
npx prisma db push
```

## Releases

Every push to `main` runs `.github/workflows/pipeline.yaml`: install, tests, then `standard-version` bumps the version, updates `CHANGELOG.md`, tags it and creates a GitHub release. Pull before you push, since that release commit lands on `main`.

## Archived: AWS / EKS setup

The app was first deployed on AWS (EKS, Terraform, ArgoCD, ECR) as a proof of concept, then moved to Vercel. That work is kept as commented-out reference in [`docs/aws-eks-reference`](docs/aws-eks-reference). The `Dockerfile` and `compose.yaml` in the root are left over from it and are not used for deployment.
