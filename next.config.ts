import type { NextConfig } from "next";

const nextConfig: NextConfig = {

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },

  serverExternalPackages: [
    "pdf-parse",
    "@napi-rs/canvas",
  ],

};

export default nextConfig;