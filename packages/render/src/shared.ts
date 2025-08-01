const FRACTAL_REGISTRY_URL = "http://localhost:3000/api/proxy";

export const callMcpTool = async (toolName: string, toolArgs: unknown) => {
    const res = await fetch(FRACTAL_REGISTRY_URL + "/" + "", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ toolName, arguments: toolArgs })
  });
  
  return await res.json();
};