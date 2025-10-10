import { useWidgetProps, useWidgetState, useWebplusGlobal } from "@fractal-mcp/oai-hooks";

interface HelloProps {
  name: string;
  timestamp?: string;
}

interface HelloState {
  clickCount: number;
}

export default function HelloWidget() {
  // Use the webplus hook from oai-hooks package
  const theme = useWebplusGlobal("theme");
  
  // Get props passed from the server
  const props = useWidgetProps<HelloProps>({
    name: "World",
    timestamp: new Date().toISOString()
  });

  // Manage widget state
  const [state, setState] = useWidgetState<HelloState>({
    clickCount: 0
  });

  const handleClick = () => {
    setState({
      clickCount: state.clickCount + 1
    });
  };

  return (
    <div 
      style={{
        padding: "24px",
        borderRadius: "8px",
        backgroundColor: theme === "dark" ? "#1a1a1a" : "#ffffff",
        color: theme === "dark" ? "#ffffff" : "#000000",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
        fontFamily: "system-ui, -apple-system, sans-serif"
      }}
    >
      <h2 style={{ margin: "0 0 16px 0" }}>Hello Widget</h2>
      <p style={{ margin: "0 0 12px 0" }}>
        Hello, <strong>{props.name}</strong>!
      </p>
      {props.timestamp && (
        <p style={{ 
          fontSize: "12px", 
          color: theme === "dark" ? "#888" : "#666",
          margin: "0 0 16px 0"
        }}>
          Created at: {new Date(props.timestamp).toLocaleTimeString()}
        </p>
      )}
      <button
        onClick={handleClick}
        style={{
          padding: "8px 16px",
          borderRadius: "4px",
          border: "none",
          backgroundColor: "#0066cc",
          color: "#ffffff",
          cursor: "pointer",
          fontWeight: "500"
        }}
      >
        Clicked {state.clickCount} times
      </button>
    </div>
  );
}

