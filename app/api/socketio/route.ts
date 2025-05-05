import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

// This route is needed for Socket.IO to work properly with Next.js App Router
export async function GET(req: NextRequest) {
  // Return a 200 response to acknowledge the socket connection
  return new Response(null, { status: 200 });
}

export async function POST(req: NextRequest) {
  // Handle socket.io POST requests
  return new Response(null, { status: 200 });
}
