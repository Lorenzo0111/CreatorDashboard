import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Release files are posted through a server action. Vercel caps request bodies at 4.5 MB
      // regardless of this value; larger files are published from a URL instead.
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;
