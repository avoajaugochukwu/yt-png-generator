import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@napi-rs/canvas'],
  experimental: {
    proxyClientMaxBodySize: "1gb",
  },
};

export default nextConfig;
