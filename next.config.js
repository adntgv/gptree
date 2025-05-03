/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/socketio/:path*',
        destination: '/api/socketio',
      },
      {
        source: '/api/chat',
        destination: '/api/chat',
      },
    ];
  },
}

module.exports = nextConfig
