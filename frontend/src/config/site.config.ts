export const siteConfig = {
  // Set NEXT_PUBLIC_API_BASE_URL in your environment to point to your backend origin, e.g. "http://localhost:8080".
  // If unset, it falls back to same-origin (""), so requests go to "/api/...".
  domain: process.env.NEXT_PUBLIC_API_BASE_URL ?? "",
} as const;
