import cjsModule from './dist/index.js';

const defaultExport = cjsModule?.default ?? cjsModule;

const {
  OpenAIClient: NamedOpenAIClient = defaultExport,
  Message,
  defineFunctionTool,
  defineObjectSchema,
  McpClient,
  McpServer,
  JsonRpcError,
  createMockMcpServer,
  startMockMcpServer,
  UnifiedLLMClient
} = cjsModule;

export const OpenAIClient = NamedOpenAIClient;
export {
  Message,
  defineFunctionTool,
  defineObjectSchema,
  McpClient,
  McpServer,
  JsonRpcError,
  createMockMcpServer,
  startMockMcpServer,
  UnifiedLLMClient
};

export default defaultExport;
