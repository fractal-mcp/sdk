import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useRef, memo } from 'react';
import { FractalFrame, callMcpTool } from "@fractal-mcp/render";
const MemoizedFractalFrame = memo(FractalFrame);
const App = () => {
    const [serverUrl, setServerUrl] = useState('');
    const [args, setArgs] = useState('');
    const [tool, setTool] = useState('');
    const [result, setResult] = useState('');
    const [testDataToRender, setTestDataToRender] = useState();
    const [frames, setFrames] = useState([]);
    const [frameMode, setFrameMode] = useState('replace');
    const [frameKey, setFrameKey] = useState(0);
    const framesEndRef = useRef(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [toolOptions, setToolOptions] = useState([]);
    const [toolsLoading, setToolsLoading] = useState(false);
    const [showToolsPanel, setShowToolsPanel] = useState(false);
    const initialLoadRef = useRef(true);
    useEffect(() => {
        framesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [frames]);
    useEffect(() => {
        setFrames([]);
        setTestDataToRender(undefined);
        setFrameKey((k) => k + 1);
    }, [frameMode]);
    useEffect(() => {
        if (!initialLoadRef.current)
            return;
        initialLoadRef.current = false;
        // Parse query parameters from URL
        const urlParams = new URLSearchParams(window.location.search);
        // Decode base64 query parameters
        try {
            const serverUrlParam = urlParams.get('serverUrl');
            if (serverUrlParam) {
                setServerUrl(atob(serverUrlParam));
            }
            const argsParam = urlParams.get('args');
            if (argsParam) {
                setArgs(atob(argsParam));
            }
            const toolParam = urlParams.get('tool');
            if (toolParam) {
                setTool(atob(toolParam));
            }
        }
        catch (error) {
            console.error('Error decoding query parameters:', error);
        }
    }, []);
    // Fetch available tools whenever serverUrl changes
    useEffect(() => {
        if (!serverUrl.trim()) {
            setToolOptions([]);
            setTool('');
            return;
        }
        const controller = new AbortController();
        const fetchTools = async () => {
            setToolsLoading(true);
            try {
                const resp = await fetch('/api/list-tools', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ serverUrl: serverUrl.trim() }),
                    signal: controller.signal,
                });
                if (resp.ok) {
                    const data = await resp.json();
                    setToolOptions(Array.isArray(data.tools) ? data.tools : []);
                    setTool('');
                }
                else {
                    setToolOptions([]);
                }
            }
            catch (err) {
                if (!(err instanceof DOMException && err.name === 'AbortError')) {
                    console.error('Failed to list tools:', err);
                    setToolOptions([]);
                }
            }
            finally {
                setToolsLoading(false);
            }
        };
        fetchTools();
        return () => controller.abort();
    }, [serverUrl]);
    // Update URL without triggering rerender
    const updateUrlParams = () => {
        const params = new URLSearchParams();
        if (serverUrl.trim())
            params.set('serverUrl', btoa(serverUrl.trim()));
        if (tool.trim())
            params.set('tool', btoa(tool.trim()));
        if (args.trim())
            params.set('args', btoa(args.trim()));
        const newUrl = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
        window.history.replaceState({}, '', newUrl);
    };
    // Make MCP call directly using the SDK
    const onSave = async () => {
        // Clear previous results
        setResult('');
        setError('');
        // Validate inputs
        if (!serverUrl.trim()) {
            setError('Server URL is required');
            return;
        }
        if (!tool.trim()) {
            setError('Tool name is required');
            return;
        }
        // Update URL with current values
        updateUrlParams();
        setLoading(true);
        try {
            // Parse arguments
            let parsedArgs = {};
            if (args.trim()) {
                try {
                    parsedArgs = JSON.parse(args);
                }
                catch (parseError) {
                    setError('Invalid JSON in arguments field');
                    setLoading(false);
                    return;
                }
            }
            // Use the Vite proxy endpoint instead of direct MCP connection
            console.log('🔗 Calling MCP via proxy endpoint');
            const response = await fetch('/api/proxy', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    serverUrl: serverUrl.trim(),
                    toolName: tool.trim(),
                    arguments: parsedArgs || {},
                }),
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const data = await response.json();
            if (data.error) {
                throw new Error(data.error);
            }
            console.log('📋 Tool result:', data.result);
            const mcpResult = data.result;
            if (frameMode === 'append') {
                setFrames([{ component: mcpResult.component.html, data: mcpResult.data }]);
            }
            else {
                setTestDataToRender({
                    component: mcpResult.component.html,
                    data: mcpResult.data,
                });
            }
            // Display result
            setResult(JSON.stringify(mcpResult.content, null, 2));
        }
        catch (err) {
            console.error('Error:', err);
            const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
            setError(errorMessage);
        }
        finally {
            setLoading(false);
        }
    };
    const appendFrameOnRouterEvent = async (toolName, toolArgs) => {
        try {
            const mcpResult = await callMcpTool(toolName, toolArgs);
            setFrames(prev => [
                ...prev,
                { component: mcpResult.result.component.html, data: mcpResult.result.data }
            ]);
            return mcpResult;
        }
        catch (err) {
            console.error('Error in appendFrameOnRouterEvent:', err);
        }
    };
    return (_jsxs("div", { style: {
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            display: 'flex',
            gap: '2rem',
            padding: '2rem',
            backgroundColor: '#f8fafc',
            minHeight: '100vh'
        }, children: [_jsx("div", { style: { flex: 1 }, children: _jsxs("div", { style: {
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        padding: '2rem',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }, children: [_jsxs("div", { style: { textAlign: 'center', marginBottom: '2rem' }, children: [_jsx("h1", { style: {
                                        color: '#1e293b',
                                        fontSize: '2.5rem',
                                        marginBottom: '0.5rem',
                                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent'
                                    }, children: "\uD83D\uDE80 Fractal MCP Client" }), _jsx("p", { style: { color: '#64748b', fontSize: '1.1rem' }, children: "Test your MCP tools with a beautiful interface" })] }), frameMode === 'replace' && testDataToRender && (_jsxs("div", { style: {
                                padding: '1.5rem',
                                backgroundColor: '#f0fdf4',
                                borderRadius: '8px',
                                border: '1px solid #bbf7d0',
                                marginBottom: '1.5rem'
                            }, children: [_jsx("h3", { style: { color: '#166534', marginBottom: '1rem', fontSize: '1.2rem' }, children: "\u2705 MCP Response" }), _jsx("pre", { style: {
                                        backgroundColor: '#ffffff',
                                        padding: '1rem',
                                        borderRadius: '6px',
                                        fontSize: '0.875rem',
                                        overflow: 'auto',
                                        margin: 0,
                                        border: '1px solid #d1d5db',
                                        fontFamily: 'Monaco, Consolas, "Courier New", monospace',
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-word'
                                    }, children: _jsx(MemoizedFractalFrame, { jsx: "<Frac id={'test_component_01'}/>", map: {
                                            "test_component_01": {
                                                component: { html: testDataToRender.component },
                                                data: testDataToRender.data
                                            },
                                        } }, frameKey) })] })), frameMode === 'append' && frames.length > 0 && (_jsxs("div", { style: {
                                padding: '1.5rem',
                                backgroundColor: '#f0fdf4',
                                borderRadius: '8px',
                                border: '1px solid #bbf7d0',
                                marginBottom: '1.5rem',
                                maxHeight: '60vh',
                                overflowY: 'auto'
                            }, children: [frames.map((frame, idx) => (_jsx("div", { style: { marginBottom: '0.5rem' }, children: _jsx(MemoizedFractalFrame, { jsx: `<Frac id={'frame_${idx}'} />`, map: { [`frame_${idx}`]: { component: { html: frame.component }, data: frame.data } } }) }, idx))), _jsx("div", { ref: framesEndRef })] })), error && (_jsxs("div", { style: {
                                padding: '1.5rem',
                                backgroundColor: '#fef2f2',
                                borderRadius: '8px',
                                border: '1px solid #fecaca',
                                marginBottom: '1.5rem'
                            }, children: [_jsx("h3", { style: { color: '#dc2626', marginBottom: '0.5rem', fontSize: '1.1rem' }, children: "\u274C Error" }), _jsx("pre", { style: {
                                        color: '#dc2626',
                                        fontSize: '0.875rem',
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-word',
                                        margin: 0
                                    }, children: error })] })), !loading && !error && !result && (_jsxs("div", { style: {
                                padding: '1.5rem',
                                backgroundColor: '#f0f9ff',
                                borderRadius: '8px',
                                border: '1px solid #bae6fd',
                                textAlign: 'center'
                            }, children: [_jsx("h3", { style: { color: '#0c4a6e', marginBottom: '1rem', fontSize: '1.2rem' }, children: "\u2728 Ready to test MCP tools!" }), _jsx("p", { style: { color: '#0369a1' }, children: "Fill in the form on the right and click \"Save & Call\" to test your MCP server." })] }))] }) }), _jsx("div", { style: { width: '400px' }, children: _jsxs("div", { style: {
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        padding: '2rem',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        height: 'fit-content'
                    }, children: [_jsx("h2", { style: {
                                color: '#1e293b',
                                fontSize: '1.5rem',
                                marginBottom: '1.5rem',
                                borderBottom: '2px solid #e2e8f0',
                                paddingBottom: '0.5rem'
                            }, children: "\uD83D\uDD27 MCP Tool Tester" }), _jsxs("div", { style: { display: 'grid', gap: '1.5rem' }, children: [_jsxs("div", { children: [_jsx("label", { style: {
                                                display: 'block',
                                                marginBottom: '0.5rem',
                                                fontWeight: '600',
                                                color: '#374151'
                                            }, children: "Server URL *" }), _jsx("input", { type: "text", value: serverUrl, onChange: (e) => setServerUrl(e.target.value), placeholder: "http://localhost:3100", style: {
                                                width: '100%',
                                                padding: '0.75rem',
                                                border: '1px solid #d1d5db',
                                                borderRadius: '6px',
                                                fontSize: '0.875rem',
                                                fontFamily: 'inherit'
                                            } })] }), _jsxs("div", { children: [_jsx("label", { style: {
                                                display: 'block',
                                                marginBottom: '0.5rem',
                                                fontWeight: '600',
                                                color: '#374151'
                                            }, children: "Tool Name *" }), toolsLoading && (_jsx("div", { style: { fontSize: '0.875rem', color: '#64748b' }, children: "Loading tools..." })), !toolsLoading && (_jsxs("select", { value: tool, onChange: (e) => setTool(e.target.value), disabled: toolOptions.length === 0, style: {
                                                width: '100%',
                                                padding: '0.5rem',
                                                border: '1px solid #d1d5db',
                                                borderRadius: '6px',
                                                fontSize: '0.875rem',
                                                fontFamily: 'inherit'
                                            }, children: [_jsx("option", { value: "", children: toolOptions.length ? 'Select a tool' : 'Enter server URL first' }), toolOptions.map((t) => (_jsx("option", { value: t.name, children: t.name }, t.name)))] }))] }), _jsxs("div", { children: [_jsx("label", { style: {
                                                display: 'block',
                                                marginBottom: '0.5rem',
                                                fontWeight: '600',
                                                color: '#374151'
                                            }, children: "Arguments (JSON)" }), _jsx("textarea", { value: args, onChange: (e) => setArgs(e.target.value), placeholder: '{"location": "San Francisco"}', rows: 6, style: {
                                                width: '100%',
                                                padding: '0.75rem',
                                                border: '1px solid #d1d5db',
                                                borderRadius: '6px',
                                                fontSize: '0.875rem',
                                                fontFamily: 'Monaco, Consolas, "Courier New", monospace',
                                                resize: 'vertical'
                                            } })] }), _jsxs("div", { children: [_jsx("label", { style: {
                                                display: 'block',
                                                marginBottom: '0.5rem',
                                                fontWeight: '600',
                                                color: '#374151'
                                            }, children: "Frame Mode" }), _jsxs("select", { value: frameMode, onChange: (e) => setFrameMode(e.target.value), style: {
                                                width: '100%',
                                                padding: '0.5rem',
                                                border: '1px solid #d1d5db',
                                                borderRadius: '6px',
                                                fontSize: '0.875rem',
                                                fontFamily: 'inherit'
                                            }, children: [_jsx("option", { value: "replace", children: "Replace" }), _jsx("option", { value: "append", children: "Append" })] })] }), _jsx("div", { style: { display: 'grid', gap: '0.75rem', marginTop: '1rem' }, children: _jsx("button", { type: "button", onClick: onSave, disabled: loading, style: {
                                            padding: '0.75rem 1.5rem',
                                            backgroundColor: loading ? '#9ca3af' : '#10b981',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '6px',
                                            cursor: loading ? 'not-allowed' : 'pointer',
                                            fontSize: '0.875rem',
                                            fontWeight: '500'
                                        }, children: loading ? '⏳ Calling...' : '🚀 Save & Call' }) })] })] }) }), _jsx("div", { style: { width: showToolsPanel ? '400px' : 'auto' }, children: showToolsPanel ? (_jsxs("div", { style: {
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        padding: '2rem',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        height: 'fit-content',
                        maxHeight: '80vh',
                        overflowY: 'auto',
                        position: 'relative'
                    }, children: [_jsx("button", { type: "button", onClick: () => setShowToolsPanel(false), style: {
                                position: 'absolute',
                                top: '0.5rem',
                                right: '0.5rem',
                                border: 'none',
                                background: 'transparent',
                                cursor: 'pointer',
                                fontSize: '1rem'
                            }, children: "\u2716" }), _jsx("h2", { style: {
                                color: '#1e293b',
                                fontSize: '1.5rem',
                                marginBottom: '1rem',
                                borderBottom: '2px solid #e2e8f0',
                                paddingBottom: '0.5rem'
                            }, children: "\uD83D\uDCDC Introspected Tools" }), _jsx("pre", { style: {
                                backgroundColor: '#f9fafb',
                                border: '1px solid #d1d5db',
                                borderRadius: '6px',
                                padding: '1rem',
                                fontSize: '0.75rem',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word'
                            }, children: JSON.stringify(toolOptions, null, 2) })] })) : (_jsx("button", { type: "button", onClick: () => setShowToolsPanel(true), style: {
                        padding: '0.5rem 1rem',
                        backgroundColor: '#e5e7eb',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.875rem'
                    }, children: "\uD83D\uDCDC Show Tools" })) })] }));
};
export default App;
