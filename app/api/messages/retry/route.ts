import { NextRequest, NextResponse } from 'next/server';
import { queue } from '@/lib/queue';
import { generateChatResponse, generateThreadSummary } from '@/lib/gpt';
import { getThreadById, updateMessageStatus } from '@/lib/db';
import { nanoid } from 'nanoid';

// For Next.js to properly register this as an API route
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { threadId, messageId } = body;

    // Check for required fields
    if (!messageId || !threadId) {
      let errorMessage = 'Missing required fields:';
      if (!messageId) errorMessage += ' messageId';
      if (!threadId) errorMessage += ' threadId';
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    // Get the thread
    const thread = await getThreadById(threadId);
    if (!thread) {
      return NextResponse.json({ 
        error: `Thread not found with ID: ${threadId}` 
      }, { status: 404 });
    }
    
    // Find the message to retry
    const messageToRetry = thread.messages.find(m => m.id === messageId);
    if (!messageToRetry) {
      return NextResponse.json({ 
        error: `Message not found with ID: ${messageId}` 
      }, { status: 404 });
    }
    
    // Check if it's a GPT message in error state
    if (messageToRetry.author !== 'gpt' || messageToRetry.status !== 'error') {
      return NextResponse.json({ 
        error: `Message is not a GPT message in error state: ${messageId}` 
      }, { status: 400 });
    }
    
    // Update message status to generating
    await updateMessageStatus(threadId, messageId, 'generating');
    
    // Emit status update
    const { io } = global as any;
    if (io) {
      io.emit('message_status', {
        threadId,
        messageId,
        status: 'generating',
      });
    }

    // Queue the task of regenerating the GPT response
    const taskId = `retry-${threadId}-${nanoid(6)}`;
    
    queue.enqueue(taskId, async () => {
      try {
        // Generate GPT response
        const gptResponseText = await generateChatResponse(thread.messages.filter(m => m.id !== messageId));
        
        // Update the message with the generated text
        try {
          const updatedMessage = await updateMessageStatus(threadId, messageId, 'completed', gptResponseText);
          
          // Emit socket event for the updated message only if successfully updated
          if (io && updatedMessage) {
            io.emit('gpt_response', {
              threadId,
              message: updatedMessage,
            });
          }
          
          // Update thread summary
          const updatedThread = await getThreadById(threadId);
          if (updatedThread) {
            const summary = await generateThreadSummary(updatedThread);
            
            // Emit summary update
            if (io) {
              io.emit('thread_summary', {
                threadId,
                summary,
              });
            }
          }
        } catch (updateError) {
          console.error('Error updating message to completed status:', updateError);
          throw updateError; // Re-throw to be caught by outer catch block
        }
      } catch (error: any) {
        console.error('Error regenerating GPT response:', error);
        
        // Update message status to error
        try {
          // Check if message has already been updated to completed (in case of a race condition)
          const currentThread = await getThreadById(threadId);
          const messageToUpdate = currentThread?.messages.find(m => m.id === messageId);
          
          // Only update to error if not already completed
          if (messageToUpdate && messageToUpdate.status !== 'completed') {
            const errorMessage = error?.message || 'Failed to generate response';
            await updateMessageStatus(
              threadId, 
              messageId, 
              'error', 
              '', 
              errorMessage
            );
            
            // Emit error status
            if (io) {
              io.emit('message_status', {
                threadId,
                messageId,
                status: 'error',
                error: errorMessage
              });
            }
          }
        } catch (updateError) {
          console.error('Error updating message status to error:', updateError);
        }
      }
    });
    
    return NextResponse.json({ success: true, taskId });
  } catch (error) {
    console.error('Error handling message retry:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 