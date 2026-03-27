import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['@napi-rs/canvas'],
  experimental: {
    proxyClientMaxBodySize: "1gb",
  },
};

export default nextConfig;
