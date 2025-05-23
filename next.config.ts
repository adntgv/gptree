/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/socketio/:path*',
        destination: '/api/socketio',
      },
    ];
  },
}

module.exports = nextConfig
