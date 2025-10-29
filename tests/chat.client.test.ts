import "@ideadesignmedia/config.js"

import assert from "node:assert/strict"
import { test } from "node:test"

import { resolveConfig } from "../src/config"
import { createChatClient, Message } from "../src/chat"
import { createHttpClient } from "../src/http"
import type { ChatCompletionsFunctionTool, MessagePayload } from "../src/types"

const ensureApiCredentials = (): void => {
  const key = process.env.OPEN_AI_API_KEY ?? process.env.OPEN_AI_SECRET
  assert.ok(key, "OPEN_AI_API_KEY (or OPEN_AI_SECRET) must be defined in config.json")
}

test(
  "chatCompletion executes a tool call and completes after supplying tool output",
  { timeout: 180_000 },
  async () => {
    ensureApiCredentials()

    const config = resolveConfig()
    const chat = createChatClient(createHttpClient(config))

    const timeTool: ChatCompletionsFunctionTool = {
      type: "function",
      function: {
        name: "current_time",
        description: "Returns the current time as an ISO 8601 string.",
        parameters: {
          type: "object",
          properties: {},
          required: []
        }
      }
    }

    const baseMessages = [
      Message("You are helpful and use your tools to help satisfy requests", "system"),
      Message("What time is it?", "user")
    ]

    const initial = await chat.chatCompletion(baseMessages, 1, undefined, {
      model: "gpt-4o-mini",
      tools: [timeTool],
      tool_choice: 'auto'
    })

    assert.ok(initial.choices.length > 0, "expected at least one chat choice")
    const toolChoice = initial.choices[0]
    assert.ok(toolChoice.message, "expected assistant message in first choice")
    const toolCalls = toolChoice.message?.tool_calls ?? []
    assert.ok(toolCalls.length > 0, "expected assistant to request a tool call")
    const finishReason = toolChoice.finish_reason
    assert.ok(
      finishReason === "tool_calls" || finishReason === "stop",
      `expected finish_reason to be tool_calls or stop, received ${finishReason ?? "undefined"}`
    )

    const assistantToolMessage = Message(null, "assistant", toolCalls) as unknown as MessagePayload
    const toolCallId = toolCalls[0]?.id ?? ""
    assert.notEqual(toolCallId, "", "tool call id must be present")

    const toolResult = new Date().toISOString()
    const toolResponse = {
      role: "tool",
      content: toolResult,
      tool_call_id: toolCallId
    } as MessagePayload

    const followUpMessages = [
      ...baseMessages,
      assistantToolMessage,
      toolResponse
    ] as MessagePayload[]

    const followUp = await chat.chatCompletion(followUpMessages, 1, undefined, {
      model: "gpt-4o-mini",
      tools: [timeTool],
      tool_choice: "none"
    })

    assert.ok(followUp.choices.length > 0, "expected follow-up chat choice")
    const assistantReply = followUp.choices[0]?.message?.content ?? ""
    assert.ok(assistantReply.length > 0, "assistant reply should not be empty after tool response")
  }
)
