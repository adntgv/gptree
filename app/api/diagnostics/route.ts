import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';

// For Next.js to properly register this as an API route
export const dynamic = 'force-dynamic';

// This route is for debugging socket issues
export async function GET(req: NextRequest) {
  const { io } = global as any;
  
  const diagnostics = {
    socketServerInitialized: !!io,
    connectedClients: io ? io.sockets.sockets.size : 0,
    timestamp: new Date().toISOString()
  };
  
  return NextResponse.json(diagnostics);
}

// Test socket communication
export async function POST(req: NextRequest) {
  try {
    const { io } = global as any;
    
    if (!io) {
      return NextResponse.json({
        error: 'Socket server not initialized',
        success: false
      }, { status: 500 });
    }
    
    const testId = nanoid(6);
    const testPayload = {
      testId,
      message: `Test message from server ${testId}`,
      timestamp: Date.now()
    };
    
    // Broadcast a test message to all clients
    io.emit('test_message', testPayload);
    
    return NextResponse.json({
      success: true,
      messageSent: true,
      testId,
      clientCount: io.sockets.sockets.size,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error in diagnostics route:', error);
    return NextResponse.json({
      error: 'Internal server error',
      success: false,
      errorDetails: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 