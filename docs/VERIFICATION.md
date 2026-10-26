# Deployment verification

**Date:** 26 October 2026

**Original walkthrough revision:** `987db22`

**Primary site:** https://storeit.vedanshu.dev

**Alternate hostname:** https://drive-clone-store-it.vercel.app

This record describes an actual production walkthrough in Chromium and isolated automated regression tests. It is a scoped verification record, not a guarantee that every browser, file format, or failure condition has been tested.

## Findings resolved

| Finding                                                                                        | Resolution                                                                                                                                                                                              |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The original Vercel hostname returned `DEPLOYMENT_NOT_FOUND`.                                  | Restored the hostname assignment to the production project.                                                                                                                                             |
| Authentication could not reach OTP because Appwrite resources were blocked.                    | Confirmed the old project had been permanently deleted; provisioned and verified a replacement project, private bucket, tables, relationship, and indexes. Updated Vercel configuration and redeployed. |
| Private native media previews were blocked by response CSP.                                    | Allowed the required native media and image rendering while blocking uploaded scripts; executable HTML/SVG formats remain attachments.                                                                  |
| Saving a reopened Share dialog could restore a removed recipient.                              | Separated newly entered addresses from the current shared list; verified removal followed by an empty save stays removed after reload.                                                                  |
| Keyboard activation of Download did not start a download.                                      | Used a native download link within the menu; verified Enter downloads the expected bytes and filename.                                                                                                  |
| Mobile navigation, search, focus styling, timestamps, and storage visualization needed polish. | Added mobile search and drawer dismissal, accessible control labels and focus states, consistent UTC dates, and correct usage-angle calculation.                                                        |

## Live checks

The owner completed account registration and OTP verification manually. Subsequent checks used that authenticated session. No additional accounts were created and no test messages were sent.

Four disposable fixtures were uploaded through the interface: text (68 bytes), PNG (99 bytes), WAV (1,644 bytes), and binary (20 bytes), totaling **1,831 bytes**. They were renamed to the sample filenames shown in the screenshots.

| Area                      | Result                                                                                                                                                                        |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Authentication            | Registration and OTP verification completed; authenticated dashboard loaded. Session cookie was HTTP-only, Secure, and SameSite=Strict.                                       |
| Upload and classification | All four uploads completed and appeared in their expected Documents, Images, Media, and Others categories.                                                                    |
| File delivery             | All four authenticated previews/downloads returned the original bytes. Responses used private, non-cacheable headers.                                                         |
| Native previews           | PNG loaded; WAV reached a playable ready state with its expected 0.1-second duration and no console errors.                                                                   |
| Download accessibility    | Keyboard Enter on the Download menu item produced `Project brief.txt` with matching contents.                                                                                 |
| Renaming and details      | Renamed all four files; reopening Rename showed the current name. File details displayed consistent UTC dates.                                                                |
| Sharing controls          | Added a reserved dummy address, preserved it on an unchanged save, removed it, and confirmed an empty subsequent save did not restore it.                                     |
| Search                    | Keyboard result selection, Escape dismissal, clearing search, and preserving query/sort parameters passed. Mobile search also navigated to the expected category and results. |
| Sorting                   | All six interface options rendered successfully. Real backend queries verified ascending/descending ordering by name, size, and creation time across the four fixtures.       |
| Access boundaries         | Anonymous file requests returned 401; anonymous direct storage reads were denied. A real metadata query with a different owner and an unshared email returned zero rows.      |
| Mobile navigation         | Drawer opened, navigation selected the correct category, and drawer closed afterward.                                                                                         |
| Responsive layout         | File page checked at widths of 320, 375, 390, 768, 1024, and 1440 CSS pixels; document width did not exceed viewport width.                                                   |
| Browser errors            | No page errors or console errors during the final authenticated mobile, sharing, and screenshot walkthrough.                                                                  |

## Cleanup and final public checks

All four disposable fixtures were deleted through the deployed interface. Follow-up API checks found **zero fixture metadata rows**, and all four storage objects returned 404. The dashboard returned to its empty state. Sign-out cleared the session cookie, and opening a private file page redirected to sign-in.

Both production hostnames returned the expected root redirect and successful sign-in, sign-up, robots, and sitemap responses. Authentication pages include noindex metadata; robots disallows crawling the private application.

## Automated checks

- TypeScript passed. ESLint exited successfully with zero errors and 147 non-blocking Tailwind class-order/formatting warnings, including generated UI components.
- **50 regression cases passed:** server actions/authentication (22), private file route (12), file utilities (10), backend setup (6).
- Production build passed with Next.js 16.2.9. The build requires access to Google Fonts for Geist; a sandboxed attempt failed to fetch the font, and the network-enabled build succeeded.
- Read-only backend verification passed for columns, indexes, permissions, relationships, bucket configuration, and application query shapes.
- Vercel reported the application revision deployed successfully.

The test command runs four test-file entry points; running those files directly reports the 50 individual cases. Expected mocked error logs in failure-path tests do not indicate live production failures.

## Screenshots

- [Desktop dashboard](images/dashboard-desktop.png)
- [Mobile files](images/mobile-files.png)
- [Sign-in page](images/sign-in-desktop.png)

Screenshots were taken from the deployed application with disposable sample files. Account details were hidden for the authenticated captures. The sign-in screenshot uses an anonymous context with an empty form.

## Scope and remaining work

- Sharing controls, server authorization regression tests, and real database query behavior were checked. **The project owner subsequently confirmed successful file sharing with another signed-in user.** This is owner-reported verification; the original automated walkthrough did not log in as that second account.
- Live upload samples were small. Oversize rejection is covered by automated tests; large transfers, concurrent users, interrupted requests, and storage exhaustion were not load-tested.
- A 4 MiB per-file limit is enforced. The 2 GiB dashboard denominator is a reference value, not an enforced per-account quota.
- This walkthrough is not a penetration test or a measured Lighthouse/Core Web Vitals audit. Browser coverage was Chromium; Safari, Firefox, and assistive-technology testing remain useful follow-ups.
- Review Appwrite retention/billing settings and establish backups, abuse controls, quota accounting, and monitoring before broader public use.
- Original artwork provenance remains incomplete; see [third-party notices](../THIRD_PARTY_NOTICES.md) before redistributing those visuals.

## Follow-up: sharing notifications and name-only renaming

The project owner confirmed sharing works with another signed-in account. A private notification inbox now records new shares, supports unread counts and read acknowledgement, and checks the current file sharing list before showing each entry. Polling runs every 30 seconds in visible tabs, on returning to the tab, and on manual refresh. Existing shares are not backfilled, and no email or OS push messages are sent.

The rename dialog now exposes only the base name and shows the extension as a read-only suffix. Extensionless files keep their full editable name. Server-side extension preservation continues to apply.

The expanded regression suite contains **78 cases**, including new notification authentication, recipient ownership, unchanged-share deduplication, re-share reset, revoked/deleted-file filtering, pagination, failure ordering, and base-name extraction checks.

## Follow-up: shared-file views and performance

The dashboard's recent uploads query now selects only the signed-in owner's files. Incoming shares have their own dashboard section and `/shared` sidebar page. Category pages support All files, My files, and Shared with me filters independently of sorting; query and sort parameters are preserved when changing the filter. The server applies the visibility constraints using the authenticated identity.

Baseline production measurements found navigation taking 1,811–3,274 ms over six transitions and search suggestions taking 1,791–2,293 ms over three queries. Vercel response headers showed US East (`iad1`) execution while Appwrite is in Singapore. Search used a 300 ms debounce followed by an authenticated backend request for every query, and repeated identity lookups added backend round trips.

The fix uses Singapore Functions (`sin1`), request-scoped identity deduplication, automatic partial route prefetching, a loading boundary, and 30-second per-browser route reuse. File preview links use native anchors to avoid unnecessary route prefetches. Fuse.js computes suggestions from a private, session-memory metadata index instead of sending each query to the server. Selecting a fuzzy match navigates using its actual filename so the server's exact substring filter still finds the intended file.

The application was upgraded to Next.js 16.4.3, with compatible dependency security fixes and the shadcn CLI moved to development dependencies. The new error boundary uses the installed version's `retry` API. Dependency audit reported zero vulnerabilities after the update.

The local production build was exercised in Chromium with disposable files and a temporary audit-owner profile. Checks passed for notification unread/read persistence, unchanged-share behavior, re-sharing, revoked access, actual UI sharing creating an unread notification, dashboard separation of owned/shared files, shared-only filtering combined with sorting, read-only recipient actions, fuzzy-match navigation, and extension-preserving renaming. Mobile notification controls and category filters were checked from 320 to 1440 pixels with no horizontal overflow. The final walkthrough recorded no browser console or page errors. All temporary files, metadata, notification rows, and the audit profile were removed afterward; no additional authentication account or outgoing email was created.

The first live follow-up found cached page switches at 35–43 ms and warm local search at 8–9 ms without a query POST, but eagerly prefetching every sidebar page caused a 5,139 ms first-navigation spike. Explicit full-route prefetching was removed to avoid that startup burst; the loading boundary and 30-second client reuse remain. The Shared files navigation icon also received a monochrome, correctly scaled version of the existing three-node share symbol, without changing the action-menu artwork.

Background search-index and notification reads were moved to authenticated, non-cacheable GET endpoints (`/api/search` and `/api/notifications`). This keeps periodic reads out of Next.js's Server Action queue, while sharing and read acknowledgements continue to use guarded Server Actions. Six additional regression cases cover the new endpoints' authentication, private cache headers, and safe outage responses.

### Final deployed measurements

Application revision: `08c5fe5`. The final check used the same Chromium session, deployment hostname, and two disposable file fixtures as the baseline. Measurements include automation overhead and describe this small account workload, rather than a load test or Core Web Vitals score.

| Interaction                                    | Before                                         | After                                      |
| ---------------------------------------------- | ---------------------------------------------- | ------------------------------------------ |
| First navigation to another page               | 1,811–3,274 ms across the baseline transitions | 465 ms to Media; 810 ms to Dashboard       |
| Revisit with the browser route cache populated | 1,859–3,153 ms in the baseline second pass     | 24–39 ms                                   |
| Suggestions after the metadata index is ready  | 1,791–2,293 ms across three queries            | 6–8 ms across three queries                |
| Requests issued for each measured search query | One Server Action POST                         | Zero query requests; matching runs locally |
| Server execution region from response headers  | `iad1` (US East)                               | `sin1` (Singapore)                         |

The metadata index still needs one authenticated background fetch initially; the 6–8 ms figure describes subsequent local matching. First page loads and uncached data remain network-dependent. The eager-prefetch spike did not recur in the final navigation sample after the startup burst and background Action queue contention were removed. All performance fixtures and their temporary owner profile were cleaned up.

The project description is set on GitHub. Current validation comprises **78 regression cases across seven test files**, a successful Next.js 16.4.3 production build, TypeScript, zero ESLint errors, and a zero-vulnerability dependency audit. Original style warnings are documented separately above. The shared navigation icon was visually checked against the deployed sidebar, using the same three-node symbol at the navigation's monochrome color and scale. Its three nodes are filled, inheriting the same gray inactive and white selected appearance as the other navigation icons.
