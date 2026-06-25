# Auditie Audit and Compliance

Auditie is a compliance management app for projects, evidence repositories, templates, generated documents, audit logs, users, and Google Drive repository sync.

## Project Structure

```text
src/
  app/                         React app shell, auth context, layout, and routes
  features/
    projects/                  Project list and project detail workflows
    templates/                 Template automation and bulk generation UI
  index.css                    Global styles
  main.tsx                     Frontend bootstrap

server/
  api/
    auth/                      Authentication routes
    audit/                     Audit log routes
    documents/                 Document and generated-document routes
    projects/                  Project and lifecycle routes
    register/                  Register upload routes
    repository/                Repository and Google Drive routes/utilities
    templates/                 Template routes
    users/                     User management routes
  integrations/
    google-drive/              Google Drive OAuth, file, and webhook helpers
  middleware/                  Express authentication and authorization middleware
  services/                    Shared backend services

prisma/
  migrations/                  Database migrations
  schema.prisma                Prisma schema
  seed.ts                      Seed script

scripts/
  api/                         API smoke/test scripts
  maintenance/                 One-off repository recovery and maintenance scripts

types/                         Local TypeScript declarations
server.ts                      Express/Vite server entrypoint
vite.config.ts                 Vite configuration
```

Runtime folders such as `data/`, `uploads/`, `generated/`, `repository/`, `dist/`, local databases, logs, credentials, and cookies are intentionally ignored by git.

## Run Locally

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env` and fill in required environment values.
3. Generate Prisma client:
   ```bash
   npx prisma generate
   ```
4. Start the app:
   ```bash
   npm run dev
   ```

If the project path contains `&` on Windows, npm command shims may fail. Rename the parent folder or run tools directly through Node, for example:

```bash
node ./node_modules/typescript/bin/tsc --noEmit
node ./node_modules/vite/bin/vite.js build
```

## Build

```bash
npm run build
```
# -Auditie---Audit-Compliance-Management-Platform
