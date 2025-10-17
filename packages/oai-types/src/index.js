/** Legacy events */
export const SET_GLOBALS_EVENT_TYPE = "webplus:set_globals";
export class SetGlobalsEvent extends CustomEvent {
    constructor() {
        super(...arguments);
        this.type = SET_GLOBALS_EVENT_TYPE;
    }
}
/** OpenAI Apps SDK events */
export const OPENAI_SET_GLOBALS_EVENT_TYPE = "openai:set_globals";
export class OpenAiSetGlobalsEvent extends CustomEvent {
    constructor() {
        super(...arguments);
        this.type = OPENAI_SET_GLOBALS_EVENT_TYPE;
    }
}
export const TOOL_RESPONSE_EVENT_TYPE = "webplus:tool_response";
export class ToolResponseEvent extends CustomEvent {
    constructor() {
        super(...arguments);
        this.type = TOOL_RESPONSE_EVENT_TYPE;
    }
}
