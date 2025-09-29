# HOw we gonna redo this?

The most important libraries to resdo are:
1) bundler

2) react hook / messaging for mcp support  
    - ability to register a tool
    - ability to

3) vercel connector from mcp ui to
- handle intents and shit

[thot: its up to the user to do good checkpointing]


# 2025-09-20 on an international flight and we're gonna redo everything 

[12:47] Pulled the mcp ui types into a file locally, removed duplicate types, commented out the remote dom stuff
- Up next: Define interfaces for each library. Spend 15-20 min sketching a complete example.
    - mcp server that defines tools that are also MCP servers
        - thought [resolved]: why do we need components to be MCPs? Why can't the component resource tyoes be defined, and the backend MCP defines the operations on them? This would lead to too much coordination, and would lead to tools in context when they don't need to be. Only connect to MCP servers when they become relebvant
    - sketch out bundling interface (outputs html first wih no data rendering, expects initialData)
- Bundling
    - bundle accepts an entrypoint path and outputs 
        - an html
        - a directory path with an html file in it.
        - later, a template html
[1:10] might have to break soon

[1:54] goal is to set up a good test environment using playwright
    1. Basic HTML validation
        - simple html page, test that some text is there.
    2. Basic React app validation
        - run react app, test that some text is there.
    3. 