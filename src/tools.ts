import type {
  ChatCompletionsFunctionTool,
  ChatToolParametersSchema,
  JsonSchema,
  ToolSchemaProperties
} from './types'

/**
 * Defines an object schema with precise property typing for tool parameters.
 */
const defineObjectSchema = <
  TProps extends ToolSchemaProperties,
  TRequired extends readonly (keyof TProps & string)[] | undefined = undefined,
  TAdditional extends boolean | JsonSchema | undefined = false
>(schema: ChatToolParametersSchema<TProps, TRequired, TAdditional>) => schema

/**
 * Defines a chat function tool while preserving the parameter schema's types.
 */
const defineFunctionTool = <
  TSchema extends ChatToolParametersSchema
>(
  tool: ChatCompletionsFunctionTool<TSchema>
) => tool

export { defineFunctionTool, defineObjectSchema }
