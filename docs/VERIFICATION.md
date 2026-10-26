# Deployment verification

**Date:** 26 October 2026

**Application revision:** `987db22`

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

- Sharing controls, server authorization regression tests, and real database query behavior were checked. **A second recipient's authenticated browser session was not exercised.**
- Live upload samples were small. Oversize rejection is covered by automated tests; large transfers, concurrent users, interrupted requests, and storage exhaustion were not load-tested.
- A 4 MiB per-file limit is enforced. The 2 GiB dashboard denominator is a reference value, not an enforced per-account quota.
- This walkthrough is not a penetration test or a measured Lighthouse/Core Web Vitals audit. Browser coverage was Chromium; Safari, Firefox, and assistive-technology testing remain useful follow-ups.
- Review Appwrite retention/billing settings and establish backups, abuse controls, quota accounting, and monitoring before broader public use.
- Original artwork provenance remains incomplete; see [third-party notices](../THIRD_PARTY_NOTICES.md) before redistributing those visuals.
