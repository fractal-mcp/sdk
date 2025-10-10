import { useWidgetProps, useWidgetState, useWebplusGlobal } from "@fractal-mcp/oai-hooks";
import "./styles.css";

interface HelloProps extends Record<string, unknown> {
  name: string;
  timestamp?: string;
}

interface HelloState extends Record<string, unknown> {
  clickCount: number;
}

export default function HelloWidget() {
  console.log("HelloWidget rendered");
  const theme = "dark";
  // // Use the webplus hook from oai-hooks package
  // const theme = useWebplusGlobal("theme");
  
  // // Get props passed from the server
  const props = useWidgetProps<HelloProps>({
    name: "World",
    timestamp: new Date().toISOString()
  });

  // // Manage widget state
  const [state, setState] = useWidgetState<HelloState>({
    clickCount: 0
  });
  console.log("props", props);
  console.log("state", state);

  const handleClick = () => {
    console.log("handleClick");
    setState({
      clickCount: state.clickCount + 1
    });
  };
  
  console.log("Returning HelloWidget");
  // theme = "light";
  return (
    <div 
      className={`
        p-6 rounded-lg shadow-md font-sans
        ${theme === "dark" 
          ? "bg-zinc-900 text-white" 
          : "bg-white text-black"
        }
      `}
    >
      <h2 className="text-2xl font-bold mb-4">
        Hello Widget
      </h2>
      
      {/* <p className="mb-3">
        Hello, <strong className="font-semibold">{props.name}</strong>!
      </p>
       */}
      {/* {props.timestamp && (
        <p className={`
          text-xs mb-4
          ${theme === "dark" ? "text-zinc-400" : "text-zinc-600"}
        `}>
          Created at: {new Date(props.timestamp).toLocaleTimeString()}
        </p>
      )} */}
      
      <button
        onClick={handleClick}
        className="
          px-4 py-2 rounded 
          bg-blue-600 hover:bg-blue-700 
          text-white font-medium 
          cursor-pointer transition-colors
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        "
      >
        Clicked {state["clickCount"] || 0} times
      </button>
    </div>
  );
}

