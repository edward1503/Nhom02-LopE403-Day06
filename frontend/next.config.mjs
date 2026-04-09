/** @type {import('next').NextConfig} */
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000';

const nextConfig = {
  allowedDevOrigins: ['169.254.83.107'],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${BACKEND_URL}/api/:path*`,
      },
      {
        source: '/data/:path*',
        destination: `${BACKEND_URL}/data/:path*`,
      },
    ];
  },
};

export default nextConfig;
