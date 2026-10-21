import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactCompiler: true,
  logging: { serverFunctions: false },
  allowedDevOrigins: process.env.PORTLESS_URL ? [new URL(process.env.PORTLESS_URL).hostname] : [],
  serverExternalPackages: ['graphql'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: process.env.S3_ENDPOINT ? process.env.S3_ENDPOINT.replace(/^https?:\/\//, '').replace(/:\d+$/, '') : '/',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;