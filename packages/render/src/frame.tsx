import React, { useState, memo } from 'react';
import JsxParser from 'react-jsx-parser';
import { FractalComponent } from './component';
import { FractalUIEvent } from '@fractal-mcp/shared-ui';

export interface FractalDefinition {
  component: { html: string };
  data: unknown;
  toolName?: string;
}

export type FractalFrameEvent = FractalUIEvent & {
  toolName?: string;
  componentId: string;
}

export interface FractalFrameProps {
  jsx: string;
  map: Record<string, FractalDefinition>;
  onEvent?: (event: FractalFrameEvent) => void;
}

export const FractalFrame = memo(function FractalFrame({ 
  jsx, 
  map, 
  onEvent 
}: FractalFrameProps) {

  // State for dynamic map updates when routerReplaceFrame is used
  const [dynamicMap, setDynamicMap] = useState<Record<string, FractalDefinition>>(map);
  const [dynamicJsx, setDynamicJsx] = useState(jsx);

  const Frac = ({ id }: { id: string }): React.ReactElement => {
    const def = dynamicMap[id];
    if (!def) {
      return <div style={{ color: 'red' }}>Unknown fractal {id}</div>;
    }
    return (
      <FractalComponent
        srcDoc={def.component.html}
        onEvent={(event) => {
          onEvent?.({ ...event, toolName: def.toolName, componentId: id })
        }}
      />
    );
  };

  // Create a wrapper that satisfies JsxParser's type requirements
  const FracWrapper = (props: any) => <Frac {...props} />;

  return (
    <JsxParser
      components={{ Frac: FracWrapper }}
      jsx={dynamicJsx}
    />
  );
});

// Helper function to render layout tool invocations
export function renderLayout(toolInvocation: any, onEvent: (event: FractalFrameEvent) => void) {
  const result = toolInvocation.result;
  if (result && result.data && result.data.componentToolOutputs && result.data.layout) {
    return (
      <div className="mt-4">
        <FractalFrame
          jsx={result.data.layout}
          map={result.data.componentToolOutputs}
          onEvent={onEvent}
        />
      </div>
    );
  }
  return null;
}

// Alternative renderLayout implementation that renders as a single component
export function renderLayoutAsComponent(toolInvocation: any, onEvent: (event: FractalFrameEvent) => void) {
  if (toolInvocation.state === "result") {
    const componentId = Object.keys(
      toolInvocation.result.data.componentToolOutputs
    )[0];
    const obj = (toolInvocation.result.data.componentToolOutputs as any)[
      componentId
    ];
    const html = obj?.component?.html || "";
    const toolName = obj?.toolName || "";
    
    return (
      <div className="mt-4">
        <FractalComponent
          onEvent={(event: any) => {
            onEvent({
              ...event,
              componentId,
              toolName,
            });
          }}
          srcDoc={html}
        />
      </div>
    );
  }
  return null;
}