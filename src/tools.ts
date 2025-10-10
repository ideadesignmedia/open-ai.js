import type {
  ChatCompletionsFunctionTool,
  ChatToolParametersSchema
} from './types'

/**
 * Defines an object schema with precise property typing for tool parameters.
 */
const defineObjectSchema = <TSchema extends ChatToolParametersSchema>(schema: TSchema) => schema

/**
 * Defines a chat function tool while preserving the parameter schema's types.
 */
const defineFunctionTool = <TSchema extends ChatToolParametersSchema>(
  tool: ChatCompletionsFunctionTool<TSchema>
) => tool

export { defineFunctionTool, defineObjectSchema }
