import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.squarespace-cdn.com" },
    ],
  },
  async redirects() {
    return [
      {
        source: "/store/p/:slug",
        destination: "/product/:slug",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
