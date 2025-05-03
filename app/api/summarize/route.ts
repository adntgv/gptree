import { NextRequest, NextResponse } from 'next/server';
import { queue } from '@/lib/queue';
import { generateThreadSummary } from '@/lib/gpt';
import { getThreadById, updateThreadSummary } from '@/lib/db';
import { nanoid } from 'nanoid';

export async function POST(req: NextRequest) {
  try {
    const { threadId } = await req.json();

    if (!threadId) {
      return NextResponse.json({ error: 'Missing threadId' }, { status: 400 });
    }

    // Get the thread
    const thread = await getThreadById(threadId);
    if (!thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }

    // Queue the summarization task
    const taskId = `summarize-${threadId}-${nanoid(6)}`;
    
    queue.enqueue(taskId, async () => {
      try {
        // Generate summary for this thread
        const summary = await generateThreadSummary(thread);
        await updateThreadSummary(threadId, summary);
        
        // Emit socket event for real-time updates
        const { io } = global as any;
        if (io) {
          // Emit summary update
          io.emit('thread_summary', {
            threadId,
            summary,
          });
        }
      } catch (error) {
        console.error('Error processing summarization task:', error);
      }
    });
    
    return NextResponse.json({ success: true, taskId });
  } catch (error) {
    console.error('Error in summarize API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 