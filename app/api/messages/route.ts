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

    // Create the pending message in the database (server-side)
    // This ensures the message exists before we try to update it
    let pendingMessage;
    try {
      // If client sent a pendingMessageId, use it instead of creating a new one
      if (pendingMessageId) {
        console.log(`Using client-provided pendingMessageId: ${pendingMessageId}`);
        // First check if the message already exists in the database
        const thread = await getThreadById(threadId);
        const existingMessage = thread?.messages.find(m => m.id === pendingMessageId);
        
        if (existingMessage) {
          console.log('Message already exists in database, using it');
          pendingMessage = existingMessage;
        } else {
          // Create the message with the provided ID
          pendingMessage = await addMessageToThread(threadId, {
            id: pendingMessageId, // Use the client-provided ID
            author: 'gpt',
            text: '',
            timestamp: Date.now(),
            status: 'pending'
          });
        }
      } else {
        // Create a new message with a server-generated ID
        pendingMessage = await addMessageToThread(threadId, {
          author: 'gpt',
          text: '',
          timestamp: Date.now(),
          status: 'pending'
        });
      }

      // Emit the pending message to the client
      if (io) {
        io.emit('gpt_response', {
          threadId,
          message: pendingMessage,
        });
      }
    } catch (error) {
      console.error('Error creating pending message:', error);
      return NextResponse.json({ error: 'Failed to create pending message' }, { status: 500 });
    }

    // Queue the task of generating a GPT response
    const taskId = `chat-${threadId}-${nanoid(6)}`;
    
    queue.enqueue(taskId, async () => {
      try {
        // Get updated thread with the new user message
        const updatedThread = await getThreadById(threadId);
        if (!updatedThread) return;
        
        // Update the pending message status to generating
        try {
          await updateMessageStatus(threadId, pendingMessage.id, 'generating');
          
          // Emit status update
          if (io) {
            io.emit('message_status', {
              threadId,
              messageId: pendingMessage.id,
              status: 'generating',
            });
          }
        } catch (error) {
          console.error('Error updating message status to generating:', error);
        }
        
        // Generate GPT response
        try {
          const gptResponseText = await generateChatResponse(updatedThread.messages);
          
          // Update GPT message to completed status with the response text
          try {
            const gptMessage = await updateMessageStatus(threadId, pendingMessage.id, 'completed', gptResponseText);
            
            // Get updated thread for summarization
            const finalThread = await getThreadById(threadId);
            if (!finalThread) return;
            
            // Generate summary for this thread
            const summary = await generateThreadSummary(finalThread);
            await updateThreadSummary(threadId, summary);
            
            // Emit socket events for real-time updates - only if we successfully updated the message
            if (io && gptMessage) {
              // Emit GPT response after the message is fully updated
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
          } catch (updateError) {
            console.error('Error updating message to completed status:', updateError);
            throw updateError; // Re-throw to be caught by outer catch block
          }
        } catch (error: any) {
          console.error('Error generating GPT response:', error);
          
          // Capture the error message to display to the user
          const errorMessage = error?.message || 'Error generating response';
          
          try {
            // Check if message has already been updated to completed (in case of a race condition)
            const thread = await getThreadById(threadId);
            const messageToUpdate = thread?.messages.find(m => m.id === pendingMessage.id);
            
            // Only update to error if not already completed
            if (messageToUpdate && messageToUpdate.status !== 'completed') {
              // Update message status to error
              await updateMessageStatus(threadId, pendingMessage.id, 'error', '', errorMessage);
              
              // Emit error status
              if (io) {
                io.emit('message_status', {
                  threadId,
                  messageId: pendingMessage.id,
                  status: 'error',
                  error: errorMessage
                });
                
                // Also send the error message in the response
                io.emit('gpt_response', {
                  threadId,
                  message: {
                    id: pendingMessage.id,
                    author: 'gpt',
                    text: '',
                    error: errorMessage,
                    timestamp: Date.now(),
                    status: 'error'
                  },
                });
              }
            }
          } catch (updateError) {
            console.error('Error updating message status to error:', updateError);
          }
        }
      } catch (error: any) {
        console.error('Error processing chat task:', error);
        // Capture the error message
        const errorMessage = error?.message || 'Error processing chat task';
        
        try {
          // Update message status to error
          await updateMessageStatus(threadId, pendingMessage.id, 'error', '', errorMessage);
          
          if (io) {
            io.emit('message_status', {
              threadId, 
              messageId: pendingMessage.id,
              status: 'error',
              error: errorMessage
            });
            
            // Send error message
            io.emit('gpt_response', {
              threadId,
              message: {
                id: pendingMessage.id,
                author: 'gpt',
                text: '',
                error: errorMessage,
                timestamp: Date.now(),
                status: 'error'
              },
            });
          }
        } catch (updateError) {
          console.error('Error updating message status to error:', updateError);
        }
      }
    });
    
    return NextResponse.json({ success: true, taskId, message: userMessage, pendingMessageId: pendingMessage.id });
  } catch (error) {
    console.error('Error handling /api/messages:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}  
