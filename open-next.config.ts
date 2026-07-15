import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Default config (in-memory incremental cache). The app is largely dynamic
// (root layout is force-dynamic), so an R2 incremental cache isn't required
// for the first deploy. Add `incrementalCache: r2IncrementalCache` later if
// you introduce ISR and create an R2 bucket + NEXT_INC_CACHE_R2_BUCKET binding.
export default defineCloudflareConfig();
