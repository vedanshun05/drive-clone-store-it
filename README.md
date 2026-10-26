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

The Appwrite project needs a database, a users table (`fullName`, `email`,
`avatar`, `accountId`), a files table (`type`, `name`, `url`, `extension`,
`size`, `owner`, `accountId`, `users`, `bucketFileId`), and a storage bucket.
`owner` is a relationship to the users table and `users` is an email string array.
Create the indexes required by Appwrite for the file filters and sort columns.
The server API key needs account/session, row read/write, and file read/write access.
Keep `NEXT_APPWRITE_SECRET_KEY` server-side; never prefix it with `NEXT_PUBLIC_`.

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

Use https://storeit.vedanshu.dev as the public URL. The old repository homepage,
`https://drive-clone-store-it.vercel.app`, returned Vercel's
`DEPLOYMENT_NOT_FOUND` on inspection. This is a missing hosting alias, before
Next.js routing runs. To restore that URL, add it to this project's domains in
Vercel and assign it to the current production deployment. A successful production
health check is `/` redirecting to `/sign-in`, with `/sign-in` and `/sign-up`
returning HTTP 200.

Uploads currently pass through Server Actions and are limited to **4 MB per
file**, leaving room beneath Vercel's 4.5 MB request limit. Increasing
`serverActions.bodySizeLimit` cannot increase Vercel's platform limit. Supporting
larger files requires a direct-to-storage upload flow.
