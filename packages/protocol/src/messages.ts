export type UIActionType = 'tool' | 'prompt' | 'link' | 'intent' | 'notify' | 'resize';
export type ParentActionType = 'listTools' | 'callTool' | 'queryDOM' | 'click' | 'enterText';

type GenericActionMessage = {
  messageId?: string;
};

export type GenericMessageData = {
  type: string;
  payload: unknown;
};
export type UIActionResizeMessage = {
  type: 'resize';
  payload: {
    width: number;
    height: number;
  };
};
export type UIActionToolCallMessage = {
  type: 'tool';
  payload: {
    toolName: string;
    params: Record<string, unknown>;
  };
};

export type UIActionPromptMessage = {
  type: 'prompt';
  payload: {
    prompt: string;
  };
};

export type UIActionLinkMessage = {
  type: 'link';
  payload: {
    url: string;
  };
};

export type UIActionIntentMessage = {
  type: 'intent';
  payload: {
    intent: string;
    params: Record<string, unknown>;
  };
};

export type UIActionNotificationMessage = {
  type: 'notify';
  payload: {
    message: string;
  };
};

// Parent Actions 

export type AgentActionListTools = {
    type: "listTools",
    payload: {},
}

export type AgentActionCallTool = {
    type: "callTool",
    // Stolen directly from MCP
    payload: {
        [x: string]: unknown;
        name: string;
        _meta?: {
            [x: string]: unknown;
            progressToken?: string | number | undefined;
        } | undefined;
        arguments?: {
            [x: string]: unknown;
        } | undefined;
    }
}

export type AgentActionQueryDOM = {
    type: "queryDom",
    payload: {
        selector?: string;
    }
}

export type AgentActionClick = {
    type: "click",
    payload: {
        selector: string;
    }
}

export type AgentActionEnterText = {
    type: "enterText",
    payload: {
        selector: string;
        text: string;
    }
}

export type UIActionMessage =
  | UIActionToolCallMessage
  | UIActionPromptMessage
  | UIActionLinkMessage
  | UIActionIntentMessage
  | UIActionNotificationMessage
  | UIActionResizeMessage

export type AgentActionMessage =
  | AgentActionListTools
  | AgentActionCallTool
  | AgentActionQueryDOM
  | AgentActionClick
  | AgentActionEnterText;