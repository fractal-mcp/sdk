Welcome to fractal! 

# What is fractal? 

Fractal transforms text-based AI agents into rich, interactive visual experiences. Instead of traditional chatbots that return plain text responses, Fractal enables MCP (Model Context Protocol) servers to return beautiful, functional UI components that render as interactive interfaces.

**The core innovation:** Rather than forcing agents to describe interfaces in plain text, Fractal allows them to provide complete UI components that users can interact with directly. For example, instead of saying "The weather is sunny with a temperature of 72°F", an agent can return an interactive weather card with icons, animations, and controls.

Fractal provides:
- **Component Registry**: Public and private registries for sharing and discovering UI components
- **MCP Integration**: Seamless integration with the Model Context Protocol
- **Rich SDKs**: Easy-to-use development kits for both providers and consumers
- **Real-time Rendering**: Components render instantly in compatible chat applications

[DEMONSTRATION: See the interactive examples at https://fractalmcp.com/]
[LINK TO LANDING PAGE: https://fractalmcp.com/]

# What can fractal do for you?

Do either of these describe you?

**🎨 Building a chat application?**  
*"I am building a chat application and would like to provide rich visual experiences directly in chat!"*  
→ [**Consumer Documentation**](./3_consumer.md) - Learn how to integrate Fractal into your chat app

**🔧 Building a service or tool?**  
*"I am building something else, and would like users to be able to interact with my service directly in chat!"*  
→ [**Provider Documentation**](./2_provider.md) - Learn how to expose your service through Fractal


## Concepts

**MCP (Model Context Protocol)** - The Model Context Protocol is a standardized way for AI agents to connect to external tools and services. In the traditional MCP approach, servers return raw JSON data that agents must describe in plain text. Fractal extends MCP by enabling servers to return complete UI components instead of just data, transforming how agents interact with users.

**Provider** - A service that exposes tools and/or UI components via MCP. Providers are the backend in the Fractal ecosystem. Instead of returning plain JSON responses, Fractal providers return rich UI components (like weather cards, charts, or interactive forms) that can be rendered directly in chat applications. Providers can share components in the public registry or keep them private.

**Consumer** - A user-facing agent or chat application that connects to the Fractal MCP proxy. Consumers are the frontend in the Fractal ecosystem. They integrate Fractal's Agent SDK to display the rich UI components returned by providers, transforming basic text-based interactions into visual, interactive experiences for end users.

## CLI reference

→ [**CLI Documentation**](./4_cli.md) - Complete reference for the Fractal CLI toolkit

## API reference 

### fractal-mcp/mcp
### fractal-mcp/composer
### fractal-mcp/bundle

### fractal-mcp/render
### fractal-mcp/client

### fractal-mcp/cli
- nothing here, see cli refernece 

## Examples

**[apps/example-provider-weather](../apps/example-provider-weather)**
- Uses a real weather API
- Complete provider implementation with UI components

**[apps/example-consumer-vercel](../apps/example-consumer-vercel)**
- Vercel deployment example
- Shows how to connect to fractal
- Demonstrates integration with Vercel package