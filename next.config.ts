import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Which build is running (src/lib/build.ts): shown in Settings and in a
  // <meta name="deadeye-build"> on every page, so a test run can prove which
  // build it checked. Baked in at build time; Vercel sets the VERCEL_* values.
  env: {
    BUILD_SHA: (process.env.VERCEL_GIT_COMMIT_SHA ?? "").slice(0, 7) || "local",
    BUILD_ENV: process.env.VERCEL_ENV ?? "local",
    BUILD_TIME: new Date().toISOString(),
  },
};

export default nextConfig;
