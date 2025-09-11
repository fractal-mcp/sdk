import React, { useState, memo } from 'react';
import JsxParser from 'react-jsx-parser';
import { FractalComponent } from './component';
import { FractalFrameEvent } from './shared';

export interface FractalDefinition {
  component: { html: string };
  data: unknown;
  toolName?: string;
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