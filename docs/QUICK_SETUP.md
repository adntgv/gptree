# GPTree Quick Setup Guide

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- OpenAI API key

## Installation Steps

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/gptree.git
   cd gptree
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env.local` file in the root directory with the following content:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   PORT=3000
   ```

4. Create data directory (if not already present):
   ```bash
   mkdir -p data
   ```

5. Start development server:
   ```bash
   npm run dev
   ```

6. Access the application:
   Open your browser and navigate to [http://localhost:3000](http://localhost:3000)

## Configuration Options

### Custom Port

To run the application on a different port, update the PORT variable in your `.env.local` file.

### OpenAI Model

By default, the application uses "gpt-4o" for responses. To change this:

1. Open `lib/gpt.ts`
2. Locate the model parameter in the OpenAI API calls
3. Change the model to your preferred one (e.g., "gpt-3.5-turbo")

## Data Storage

The application stores all chat data in:
```
/data/gptree-data.json
```

To back up your data, simply copy this file to a safe location.

## Troubleshooting

### Socket Connection Issues
If you experience connection issues between the client and server:

1. Check browser console for errors
2. Ensure the server is running on the expected port
3. Verify that your firewall isn't blocking the connection

### OpenAI API Issues
If responses from GPT aren't coming through:

1. Verify your API key is valid and has available credits
2. Check for rate limit errors in the server logs
3. Ensure you have billing enabled on your OpenAI account

### Database Issues
If the application can't read or write to the database:

1. Check if the `/data` directory exists and is writable
2. Verify that the JSON file is properly formatted
3. Try creating a fresh data file by renaming/removing the existing one

## Running in Production

For production deployment:

1. Build the application:
   ```bash
   npm run build
   ```

2. Start the production server:
   ```bash
   npm run start
   ```

## Additional Resources

- [Project Documentation](./PROJECT_DOCUMENTATION.md)
- [Next.js Documentation](https://nextjs.org/docs)
- [OpenAI API Documentation](https://platform.openai.com/docs/api-reference)
- [Socket.IO Documentation](https://socket.io/docs/v4/) 