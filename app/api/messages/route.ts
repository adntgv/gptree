import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { queue } from '@/lib/queue';
import { generateChatResponse, generateThreadSummary } from '@/lib/gpt';
import { getThreadById, addMessageToThread, updateThreadSummary } from '@/lib/db';
 

// For Next.js to properly register this as an API route
export const dynamic = 'force-dynamic';


export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, threadId } = body;

    // Check for required fields
    if (!message || !threadId) {
      let errorMessage = 'Missing required fields:';
      if (!message) errorMessage += ' message';
      if (!threadId) errorMessage += ' threadId';
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    // --------------- TODO: Implement your message handling logic here ---------------
    console.log('Received message:', message, 'for thread:', threadId);
     
      // No need to read the body again
  
      // Get the thread
      const thread = await getThreadById(threadId);
      if (!thread) {
        console.error(`Thread not found with ID: ${threadId}. Make sure the thread exists.`);
        return NextResponse.json({ 
          error: `Thread not found with ID: ${threadId}. Please make sure you create the thread first through the /api/threads endpoint.` 
        }, { status: 404 });
      }
  
      // Queue the task of generating a GPT response
      const taskId = `chat-${threadId}-${nanoid(6)}`;
      
      queue.enqueue(taskId, async () => {
        try {
          // Generate GPT response
          const gptResponseText = await generateChatResponse(thread.messages);
          
          // Add GPT message to thread
          const gptMessage = await addMessageToThread(threadId, {
            author: 'gpt',
            text: gptResponseText,
            timestamp: Date.now(),
          });
          
          // Get updated thread for summarization
          const updatedThread = await getThreadById(threadId);
          if (!updatedThread) return;
          
          // Generate summary for this thread
          const summary = await generateThreadSummary(updatedThread);
          await updateThreadSummary(threadId, summary);
          
          // Emit socket events for real-time updates
          const { io } = global as any;
          if (io) {
            // Emit GPT response
            io.emit('gpt_response', {
              threadId,
              message: gptMessage,
            });
            
            // Emit summary update
            io.emit('thread_summary', {
              threadId,
              summary,
            });
          }
        } catch (error) {
          console.error('Error processing chat task:', error);
        }
      });
      
      return NextResponse.json({ success: true, taskId });
    // Example: Send message to backend service, process it, etc.
    // const processedResponse = await someService.handleMessage(message);
    // --------------- END TODO -----------------------------------------------------
  } catch (error) {
    console.error('Error handling /api/messages:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}  
