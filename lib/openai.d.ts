import 'openai';

declare module 'openai' {
  namespace OpenAI {
    interface ChatCompletionMessageParam {
      role: 'system' | 'user' | 'assistant' | 'function' | 'tool';
      content: string;
      name?: string;
    }
  }
} 