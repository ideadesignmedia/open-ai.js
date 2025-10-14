#!/usr/bin/env node
const { spawn } = require('node:child_process')

const args = process.argv.slice(2)
if (args.length === 0) {
  console.error('Usage: run-test-with-timeout [--timeout=<ms>] <command> [args...]')
  process.exit(1)
}

let timeoutMs = 30_000
if (args[0] && args[0].startsWith('--timeout=')) {
  const value = Number.parseInt(args[0].split('=')[1], 10)
  if (!Number.isNaN(value) && value > 0) {
    timeoutMs = value
  }
  args.shift()
} else if (args[0] === '--timeout') {
  const value = Number.parseInt(args[1], 10)
  if (!Number.isNaN(value) && value > 0) {
    timeoutMs = value
  }
  args.splice(0, 2)
}

if (args.length === 0) {
  console.error('Missing command to execute after timeout argument')
  process.exit(1)
}

const command = args[0]
const commandArgs = args.slice(1)

console.log(`[timeout-runner] Launching: ${command} ${commandArgs.join(' ')} (timeout: ${timeoutMs}ms)`)
const child = spawn(command, commandArgs, { stdio: 'inherit', env: process.env, shell: false })
let timedOut = false

const sendSignal = signal => {
  if (!child.killed) {
    try {
      child.kill(signal)
    } catch (error) {
      console.error(`[timeout-runner] Failed to send ${signal}:`, error.message)
    }
  }
}

const timeoutTimer = setTimeout(() => {
  timedOut = true
  console.error(`[timeout-runner] Command exceeded ${timeoutMs}ms; sending SIGINT`)
  sendSignal('SIGINT')
  const forceTimer = setTimeout(() => {
    if (!child.killed) {
      console.error('[timeout-runner] Process still alive after SIGINT; sending SIGTERM')
      if (!child.kill('SIGTERM')) {
        console.error('[timeout-runner] SIGTERM unsupported; forcing SIGKILL')
        sendSignal('SIGKILL')
      }
    }
  }, 5_000)
  child.once('exit', () => clearTimeout(forceTimer))
}, timeoutMs)

const forwardSignal = signal => {
  console.log(`[timeout-runner] Forwarding ${signal} to child process`)
  sendSignal(signal)
}

const signalHandlers = {
  SIGINT: () => forwardSignal('SIGINT'),
  SIGTERM: () => forwardSignal('SIGTERM'),
  SIGHUP: () => forwardSignal('SIGHUP')
}
for (const [signal, handler] of Object.entries(signalHandlers)) {
  process.on(signal, handler)
}

const cleanup = () => {
  clearTimeout(timeoutTimer)
  for (const [signal, handler] of Object.entries(signalHandlers)) {
    process.off(signal, handler)
  }
}

child.once('exit', (code, signal) => {
  cleanup()
  if (timedOut) {
    console.error('[timeout-runner] Command timed out')
    process.exit(code === 0 ? 1 : code ?? 1)
  }
  if (signal) {
    const exitCode = 128 + (signal === 'SIGINT' ? 2 : signal === 'SIGTERM' ? 15 : 0)
    process.exit(exitCode || 1)
  } else {
    process.exit(code ?? 0)
  }
})

child.on('error', error => {
  cleanup()
  console.error('[timeout-runner] Failed to start child process:', error.message)
  process.exit(1)
})
