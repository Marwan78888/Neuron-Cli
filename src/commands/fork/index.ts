import type { ContentBlockParam } from '@anthropic-ai/sdk/resources/messages.js'
import type { Command } from '../../commands.js'
import { isForkSubagentEnabled } from '../../tools/AgentTool/forkSubagent.js'

function buildForkPrompt(args: string): string {
  const directive = args.trim()

  if (!directive) {
    throw new Error('Usage: /fork <task>')
  }

  return directive
}

const fork: Command = {
  type: 'prompt',
  name: 'fork',
  description:
    'Run a task in a forked worker that inherits the current conversation context',
  argumentHint: '<task>',
  progressMessage: 'forking task',
  contentLength: 0,
  source: 'builtin',
  isEnabled: () => isForkSubagentEnabled(),
  context: 'fork',
  async getPromptForCommand(args): Promise<ContentBlockParam[]> {
    return [{ type: 'text', text: buildForkPrompt(args) }]
  },
}

export default fork
