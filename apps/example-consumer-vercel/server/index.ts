import express from 'express';
import type { Response } from 'express';
import cors from 'cors';
import { streamText,generateText, UIMessage, convertToCoreMessages } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { FractalSDK } from '@fractal-mcp/client';
import { FractalVercel, cleanMessages } from '@fractal-mcp/vercel-connector';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY!,
});


const systemMessage = `
You are a helpful assistant. Help the user with their questions. 
You have access to the Fractal tool registry, which provides you the ability to search for different tools. When you encounter a question that requires information from the internet, search for a tool first on fractal.

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
  console.log("HI HERE 1!!");
  const { messages } = req.body;
  const processedMessages = cleanMessages(messages, ["renderLayout", "renderComponent"]);
  // console.log(JSON.stringify(processedMessages, null, 2))

  const fractalVercel = await getFractalVercel();
  
  // Check if this is a data message and handle it with FractalVercel
  // This is important because it allows your server to respond to navigation
  // and other events coming from the fractal components
  const wasHandled = await fractalVercel.handleDataMessage(processedMessages, res);
  
  if (!wasHandled) {
    const tools = await fractalVercel.getTools();
    // console.log(tools)

  const result = streamText({
    model: google("gemini-2.5-flash"),
    system: systemMessage,
    messages: convertToCoreMessages(processedMessages),
    temperature: 0.0,
    maxSteps: 10,
    maxRetries: 3,
    tools,
  });
  // console.log("RESULT")
  // console.log(await result)
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