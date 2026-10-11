import type { NextConfig } from "next";

// Baseline security headers for every route (SENTINEL F-07). HSTS is safe here
// because Cloudflare terminates TLS and redirects http->https for this host;
// it is only emitted when the public origin is https (production), so the local
// http harness is unaffected. `camera=(self)` is required because the card
// scanner uses getUserMedia. A nonce/hash CSP needs Next.js inline bootstrap
// work and is intentionally left to a follow-up (report-only first).
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(self), geolocation=(), microphone=(), payment=()",
  },
];
if ((process.env["PUBLIC_APP_ORIGIN"] ?? "").startsWith("https://"))
  securityHeaders.push({
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  });

const config: NextConfig = {
  poweredByHeader: false,
  devIndicators: false,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
    ];
  },
};

export default config;
