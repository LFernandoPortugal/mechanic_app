import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // Deployed on Vercel — Next.js runs natively (no static export needed).
  // Auto-deploy is triggered on every push to the main branch via GitHub integration.
};

export default nextConfig;
