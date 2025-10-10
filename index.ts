import OpenAIClient, * as runtime from './src'

export * from './src'
export { default } from './src'

// Provide CommonJS consumers with a direct class export without `.default`.
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  const cjsExports = Object.assign(OpenAIClient, runtime, { default: OpenAIClient })
  module.exports = cjsExports
}
