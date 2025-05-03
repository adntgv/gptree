import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { queue } from '@/lib/queue';
import { generateChatResponse, generateThreadSummary } from '@/lib/gpt';
import { getThreadById, addMessageToThread, updateThreadSummary, updateMessageStatus } from '@/lib/db';
 

// For Next.js to properly register this as an API route
export const dynamic = 'force-dynamic';


export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, threadId, pendingMessageId } = body;

    // Check for required fields
    if (!message || !threadId) {
      let errorMessage = 'Missing required fields:';
      if (!message) errorMessage += ' message';
      if (!threadId) errorMessage += ' threadId';
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    // Get the thread
    const thread = await getThreadById(threadId);
    if (!thread) {
      console.error(`Thread not found with ID: ${threadId}. Make sure the thread exists.`);
      return NextResponse.json({ 
        error: `Thread not found with ID: ${threadId}. Please make sure you create the thread first through the /api/threads endpoint.` 
      }, { status: 404 });
    }
    
    // Save the user message to the thread
    const userMessage = await addMessageToThread(threadId, {
      author: 'user',
      text: message,
      timestamp: Date.now(),
      status: 'completed',
    });
    
    // Emit socket event for the user message
    const { io } = global as any;
    if (io) {
      io.emit('user_message_saved', {
        threadId,
        message: userMessage,
      });
    }

    // Queue the task of generating a GPT response
    const taskId = `chat-${threadId}-${nanoid(6)}`;
    
    queue.enqueue(taskId, async () => {
      try {
        // Get updated thread with the new user message
        const updatedThread = await getThreadById(threadId);
        if (!updatedThread) return;
        
        // If the client sent a pendingMessageId, update it or create a new GPT message
        let gptMessage;
        
        if (pendingMessageId) {
          // Update the existing pending message's status and content
          gptMessage = await updateMessageStatus(threadId, pendingMessageId, 'generating');
          
          // Emit status update
          if (io) {
            io.emit('message_status', {
              threadId,
              messageId: pendingMessageId,
              status: 'generating',
            });
          }
        }
        
        // Generate GPT response
        try {
          const gptResponseText = await generateChatResponse(updatedThread.messages);
          
          // Update or add GPT message
          if (pendingMessageId) {
            // Update the existing message
            gptMessage = await updateMessageStatus(threadId, pendingMessageId, 'completed', gptResponseText);
          } else {
            // Add a new message (fallback if no pendingMessageId)
            gptMessage = await addMessageToThread(threadId, {
              author: 'gpt',
              text: gptResponseText,
              timestamp: Date.now(),
              status: 'completed',
            });
          }
          
          // Get updated thread for summarization
          const finalThread = await getThreadById(threadId);
          if (!finalThread) return;
          
          // Generate summary for this thread
          const summary = await generateThreadSummary(finalThread);
          await updateThreadSummary(threadId, summary);
          
          // Emit socket events for real-time updates
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
          console.error('Error generating GPT response:', error);
          
          // Update message status to error if there was a pendingMessageId
          if (pendingMessageId) {
            await updateMessageStatus(threadId, pendingMessageId, 'error');
            
            // Emit error status
            if (io) {
              io.emit('message_status', {
                threadId,
                messageId: pendingMessageId,
                status: 'error',
              });
            }
          }
        }
      } catch (error) {
        console.error('Error processing chat task:', error);
        // Mark message as error if provided
        if (pendingMessageId) {
          await updateMessageStatus(threadId, pendingMessageId, 'error');
          
          if (io) {
            io.emit('message_status', {
              threadId, 
              messageId: pendingMessageId,
              status: 'error',
            });
          }
        }
      }
    });
    
    return NextResponse.json({ success: true, taskId, message: userMessage });
  } catch (error) {
    console.error('Error handling /api/messages:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}  
