import { compile } from "json-schema-to-typescript";

// ---------- helpers --------------------------------------------------------
const toPascal = (s: string) =>
  s.split(/[-_]/).map(w => w[0].toUpperCase() + w.slice(1)).join("");

const getInputName  = (tool: string) => `${toPascal(tool)}Input`;
const getOutputName = (tool: string) => `${toPascal(tool)}Output`;

/**
 * tools.json  ➜  mcp.tools.generated.ts  (string content)
 *
 * File contains:
 *   • one Input / Output interface per tool
 *   • an aggregated ToolMap  { [name]: { input; output } }
 */
export async function generateToolTypes(toolSchemas: any[]): Promise<string> {

  const typeDefs: string[] = [];     // all interface blocks
  const mapLines: string[] = [];     // ToolMap lines

  for (const tool of toolSchemas) {
    const inName  = getInputName(tool.name);
    const outName = getOutputName(tool.name);

    // compile JSON-Schema → TS interface
    typeDefs.push(await compile(tool.inputSchema,  inName,  { bannerComment: "" }));
    typeDefs.push(await compile(tool.outputSchema, outName, { bannerComment: "" }));

    // add one entry to the ToolMap
    mapLines.push(`  ${tool.name}: { input: ${inName}; output: ${outName} };`);
  }

  return [
    "/* AUTO-GENERATED — DO NOT EDIT */",
    "",
    typeDefs.join("\n"),                               // interfaces
    "",
    "export interface ToolMap {",
    mapLines.join("\n"),
    "}",
    ""
  ].join("\n");
}
