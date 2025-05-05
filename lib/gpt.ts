import OpenAI from 'openai';
import { Message, Thread } from './types';

const model = 'gpt-4o-mini';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateChatResponse(messages: Message[]): Promise<string> {
  let retryCount = 0;
  const maxRetries = 2;
  
  while (retryCount <= maxRetries) {
    try {
      if (!messages || messages.length === 0) {
        throw new Error('Messages array cannot be empty');
      }
      
      const formattedMessages = messages.map(msg => {
        let role: 'user' | 'assistant' | 'system' = 'user';
        
        if (msg.author === 'gpt') {
          role = 'assistant';
        } else if (msg.author === 'system') {
          role = 'system';
        }
        
        return {
          role,
          content: msg.text,
        };
      });

      const response = await openai.chat.completions.create({
        model,
        messages: formattedMessages,
        temperature: 0.7,
        max_tokens: 1000,
      });

      return response.choices[0].message.content || '';
    } catch (error: any) {
      console.error(`Error generating chat response (attempt ${retryCount + 1}/${maxRetries + 1}):`, error);
      
      // If we've reached the max retries, throw a more detailed error
      if (retryCount === maxRetries) {
        const errorMessage = error?.message || 'Unknown error occurred when generating response';
        throw new Error(`Failed to generate response after ${maxRetries + 1} attempts: ${errorMessage}`);
      }
      
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
      retryCount++;
    }
  }
  
  // This should never be reached due to the error throw in the last retry, but TypeScript needs it
  throw new Error('Failed to generate response');
}

export async function generateThreadSummary(thread: Thread): Promise<string> {
  try {
    const messagesContent = thread.messages
      .map(msg => `${msg.author.toUpperCase()}: ${msg.text}`)
      .join('\n');

    const response = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system' as const,
          content: 'Summarize the following conversation in 2-3 bullet points. Be concise but capture key insights.'
        },
        {
          role: 'user' as const,
          content: messagesContent
        }
      ],
      temperature: 0.7,
      max_tokens: 200,
    });

    return response.choices[0].message.content || '';
  } catch (error) {
    console.error('Error generating thread summary:', error);
    throw error;
  }
}

export async function generateThreadTitle(thread: Thread): Promise<string> {
  try {
    const firstFewMessages = thread.messages.slice(0, 3);
    const messagesContent = firstFewMessages
      .map(msg => `${msg.author.toUpperCase()}: ${msg.text}`)
      .join('\n');

    const response = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system' as const,
          content: 'Generate a short, descriptive title (5-7 words max) for this conversation.'
        },
        {
          role: 'user' as const,
          content: messagesContent
        }
      ],
      temperature: 0.7,
      max_tokens: 30,
    });

    return response.choices[0].message.content || '';
  } catch (error) {
    console.error('Error generating thread title:', error);
    throw error;
  }
} 