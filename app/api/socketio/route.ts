import { NextResponse } from 'next/server';

export const GET = async (req: Request) => {
  // Socket.io connections will be handled by the custom server
  // This route just ensures Next.js doesn't return 404 for Socket.io polling
  return new NextResponse('Socket.io endpoint', { status: 200 });
};

export const POST = async (req: Request) => {
  // Socket.io connections will be handled by the custom server
  return new NextResponse('Socket.io endpoint', { status: 200 });
};
