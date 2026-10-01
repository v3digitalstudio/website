import { networkInterfaces } from "node:os";
import type { NextConfig } from "next";

const nextConfig = {
  ...(process.env.NODE_ENV === "development"
    ? {
        allowedDevOrigins: Object.values(networkInterfaces()).flatMap(
          (addresses) =>
            (addresses ?? [])
              .filter(
                (address) => address.family === "IPv4" && !address.internal,
              )
              .map((address) => address.address),
        ),
        rewrites: async () => [
          {
            source: "/api/:path*",
            destination: "http://127.0.0.1:8788/api/:path*",
          },
        ],
      }
    : {}),
  adapterPath: require.resolve("./adapters/cloudflare.mts"),
  poweredByHeader: false,
  reactStrictMode: true,
  images: { unoptimized: true },
} satisfies NextConfig;

export default nextConfig;
