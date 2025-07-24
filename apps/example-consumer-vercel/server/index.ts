import express from 'express';
import type { Response } from 'express';
import cors from 'cors';
import { streamText, UIMessage, convertToCoreMessages } from 'ai';
import { openai } from '@ai-sdk/openai';
import { FractalSDK } from '@fractal-mcp/client';
import { FractalVercel, cleanMessages } from '@fractal-mcp/vercel-connector';
import dotenv from 'dotenv';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const systemMessage = `
You are a helpful assistant. Help the user with their questions. 

You have access to the Fractal tool registry, which provides you the ability to search for different tools. When you encounter a question that requires information from the internet, search for a tool first on fractal.

Some of these tools are "component" tools. These tools return a JSX component template (and some data to fill into the component). When you receive component tools, you should lay them out using the renderLayout tool. When using this tool, always wrap your components in a div container. Use tailwind css classes to style your components.
The component templates you receive should largely remain unchanged, but you can add classes to the components to style them.

When you make tool calls, you will sometimes receive a snippet of JSX back, such as <Component dataRef="some-unique-data-id" />.
You can include this in the jsx you render in the renderLayout tool, and it will display the data that the user asked for.

How to use renderLayout tool:
- The renderLayout tool accepts a snippet of JSX and returns a snippet of html. This html is visible to the user in their browser in the form of a nicely styled UI component.
- If you have called renderLayout, then you should follow up with a only a very brief message to the user.
- Do not summarize the components that you see in the renderLayout tool. Do not return jsx or html in your response. Leave this to the renderLayout tool.

IMPORTANT: 
- Users will be able to see the components from the tools ONLY if you render them using the renderLayout tool.

`;

let fractalClient: FractalSDK | null = null;
let fractalVercel: FractalVercel | null = null;
async function getFractalVercel() {
  if (!fractalVercel) {
    fractalClient = new FractalSDK({ apiKey: process.env.FRACTAL_CONSUMER_KEY! })
    await fractalClient.connect();
    fractalVercel = new FractalVercel(fractalClient);
  }
  return fractalVercel;
}

app.post('/api/chat', async (req, res) => {
  const { messages } = req.body;
  const processedMessages = cleanMessages(messages, ["renderLayout", "renderComponent"]);
  console.log(processedMessages)

  const fractalVercel = await getFractalVercel();
  
  // Check if this is a data message and handle it with FractalVercel
  // This is important because it allows your server to respond to navigation
  // and other events coming from the fractal components
  const wasHandled = await fractalVercel.handleDataMessage(processedMessages, res);
  
  if (!wasHandled) {
    const tools = await fractalVercel.getTools();

  const result = streamText({
    model: openai('gpt-4.1'),
    system: systemMessage,
    messages: convertToCoreMessages(processedMessages),
    temperature: 0.0,
    maxSteps: 10,
    maxRetries: 3,
    tools,
  });
  result.pipeDataStreamToResponse(res);
  }
});

const port = process.env.PORT ? parseInt(process.env.PORT) : 3001;
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

// # One-liner using npx (no install):
// npx -y @vercel/ncc build \
//   apps/provider-weather/server/index.ts \
//   -o apps/provider-weather/dist \
//   --target node20 --minify\