# StoreIt

A file storage dashboard built with Next.js 16, React 19, and Appwrite TablesDB.

**Live app: [storeit.vedanshu.dev](https://storeit.vedanshu.dev)**

## Local setup

Use Node.js 22 or newer and npm:

```bash
npm ci
cp .env.example .env.local
# Fill in the Appwrite values in .env.local.
npm run dev
```

Open http://localhost:3000. Sign up and verify the email code to access the dashboard.

## Appwrite backend setup

Create an Appwrite project in the console, then put its API endpoint, project ID,
and a setup API key in `.env.local`. Keep the resource IDs from `.env.example`
unless you need different names. List the exact setup and runtime key scopes with:

```bash
npm run backend:setup -- --scopes
```

Create the database, users/files tables, owner relationship, query indexes, and
private storage bucket:

```bash
npm run backend:setup -- --apply
npm run backend:setup
```

The first command creates missing resources and waits for schema jobs to finish.
It is safe to rerun after an interrupted setup. The second command checks the
schema and app query shapes without creating anything. Neither creates user
accounts or uploads files. Incompatible existing permissions/schema cause an
error rather than being silently changed.

For separate keys, place the temporary provisioning key in `APPWRITE_SETUP_KEY`
in `.env.local`. The setup script prefers that key; keep it out of Vercel.
After setup, use a server key with only `sessions.write`, `rows.read`, `rows.write`,
`files.read`, and `files.write` in `NEXT_APPWRITE_SECRET_KEY`. The broader setup key
is only needed for provisioning. Keep keys server-side; never prefix them with
`NEXT_PUBLIC_` or commit `.env.local`.

Tables and the bucket have no direct client permissions. File links use
`/api/files/[fileId]`, which checks the signed-in owner or shared email before
reading storage. Revoking a share takes effect on subsequent requests. HTML and
SVG files download as attachments; private image previews bypass Next.js image
optimization so requests carry the browser's session cookie.

## Verification

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm start
```

The build downloads Google Fonts and needs network access. Tests mock Appwrite and
do not modify production accounts or files.

## Vercel deployment

Import this repository as a **Next.js** project, with `master` as the production
branch, the repository root as the root directory, `npm run build` as the build
command, and the default Next.js output directory. Add every variable from
`.env.example` in the Vercel environment settings before deploying.

This app needs a Node.js runtime for Appwrite and Server Actions. It cannot be
deployed as a static export or a directory of static assets.

Use https://storeit.vedanshu.dev as the public URL.
https://drive-clone-store-it.vercel.app is also assigned to this project's
production environment. If a hostname returns Vercel's `DEPLOYMENT_NOT_FOUND`,
check its project domain assignment: that error occurs before Next.js routing
runs. A successful production health check is `/` redirecting to `/sign-in`,
with `/sign-in` and `/sign-up` returning HTTP 200.

Uploads currently pass through Server Actions and are limited to **4 MB per
file**, leaving room beneath Vercel's 4.5 MB request limit. Increasing
`serverActions.bodySizeLimit` cannot increase Vercel's platform limit. Supporting
larger files requires a direct-to-storage upload flow.
