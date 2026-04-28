import chalk from 'chalk'
import { isLocalProviderUrl, resolveProviderRequest } from '../services/api/providerConfig.js'
import { getLocalOpenAICompatibleProviderLabel } from '../utils/providerDiscovery.js'
import { getSettings_DEPRECATED } from '../utils/settings/settings.js'
import { parseUserSpecifiedModel } from '../utils/model/model.js'
import { containsExactZaiGlmModelId, isZaiBaseUrl } from '../utils/zaiProvider.js'

declare const MACRO: { VERSION: string; DISPLAY_VERSION?: string }

// ─── Design Tokens ───────────────────────────────────────────────────────────

const NEURON_GRADIENT = [
  '#FFFFFF', // White (Primary)
  '#F9FAFB', // Gray 50
  '#F3F4F6', // Gray 100
  '#E5E7EB', // Gray 200
  '#D1D5DB', // Gray 300
  '#FFFFFF', // White as primary
]

const COLORS = {
  accent: '#FFFFFF',
  dim: '#9CA3AF',
  border: '#374151',
  success: '#10B981',
  cream: '#F3F4F6'
}

const LOGO_NEURON = [
  '  ███╗  ██╗███████╗██╗   ██╗██████╗  ██████╗ ███╗  ██╗',
  '  ████╗ ██║██╔════╝██║   ██║██╔══██╗██╔═══██╗████╗ ██║',
  '  ██╔██╗██║█████╗  ██║   ██║██████╔╝██║   ██║██╔██╗██║',
  '  ██║╚████║██╔══╝  ██║   ██║██╔══██╗██║   ██║██║╚████║',
  '  ██║ ╚███║███████╗╚██████╔╝██║  ██║╚██████╔╝██║ ╚███║',
  '  ╚═╝  ╚══╝╚══════╝ ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚══╝',
]

// ─── Utilities ───────────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return [r, g, b]
}

function lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t)
}

function getGradientColor(t: number): string {
  const stops = NEURON_GRADIENT
  const s = t * (stops.length - 1)
  const i = Math.floor(s)
  if (i >= stops.length - 1) return stops[stops.length - 1]
  
  const c1 = hexToRgb(stops[i])
  const c2 = hexToRgb(stops[i + 1])
  const r = lerp(c1[0], c2[0], s - i)
  const g = lerp(c1[1], c2[1], s - i)
  const b = lerp(c1[2], c2[2], s - i)
  
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}

// ─── Provider detection ───────────────────────────────────────────────────────

export function detectProvider(modelOverride?: string): { name: string; model: string; baseUrl: string; isLocal: boolean } {
  const useGemini = process.env.NEURON_USE_GEMINI === '1' || process.env.NEURON_USE_GEMINI === 'true'
  const useGithub = process.env.NEURON_USE_GITHUB === '1' || process.env.NEURON_USE_GITHUB === 'true'
  const useOpenAI = process.env.NEURON_USE_OPENAI === '1' || process.env.NEURON_USE_OPENAI === 'true'
  const useMistral = process.env.NEURON_USE_MISTRAL === '1' || process.env.NEURON_USE_MISTRAL === 'true'

  if (useGemini) {
    const model = modelOverride || process.env.GEMINI_MODEL || 'gemini-2.0-flash'
    const baseUrl = process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai'
    return { name: 'Google Gemini', model, baseUrl, isLocal: false }
  }

  if (useMistral) {
    const model = modelOverride || process.env.MISTRAL_MODEL || 'devstral-latest'
    const baseUrl = process.env.MISTRAL_BASE_URL || 'https://api.mistral.ai/v1'
    return { name: 'Mistral', model, baseUrl, isLocal: false }
  }

  if (useGithub) {
    const model = modelOverride || process.env.OPENAI_MODEL || 'github:copilot'
    const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.githubcopilot.com'
    return { name: 'GitHub Copilot', model, baseUrl, isLocal: false }
  }

  if (useOpenAI) {
    const rawModel = modelOverride || process.env.OPENAI_MODEL || 'gpt-4o'
    const resolvedRequest = resolveProviderRequest({
      model: rawModel,
      baseUrl: process.env.OPENAI_BASE_URL,
    })
    const baseUrl = resolvedRequest.baseUrl
    const isLocal = isLocalProviderUrl(baseUrl)
    let name = 'OpenAI'
    if (process.env.NVIDIA_NIM) name = 'NVIDIA NIM'
    else if (process.env.MINIMAX_API_KEY) name = 'MiniMax'
    else if (resolvedRequest.transport === 'codex_responses' || baseUrl.includes('chatgpt.com/backend-api/codex')) name = 'Codex'
    else if (/openrouter/i.test(baseUrl)) name = 'OpenRouter'
    else if (/together/i.test(baseUrl)) name = 'Together AI'
    else if (/groq/i.test(baseUrl)) name = 'Groq'
    else if (/azure/i.test(baseUrl)) name = 'Azure OpenAI'
    else if (/nvidia/i.test(baseUrl)) name = 'NVIDIA NIM'
    else if (/api\.kimi\.com/i.test(baseUrl)) name = 'Moonshot AI - Kimi Code'
    else if (/moonshot/i.test(baseUrl)) name = 'Moonshot AI - API'
    else if (/deepseek/i.test(baseUrl)) name = 'DeepSeek'
    else if (isZaiBaseUrl(baseUrl)) name = 'Z.AI - GLM'
    else if (/mistral/i.test(baseUrl)) name = 'Mistral'
    else if (isLocal) name = getLocalOpenAICompatibleProviderLabel(baseUrl)

    let displayModel = resolvedRequest.resolvedModel
    if (resolvedRequest.reasoning?.effort) {
      displayModel = `${displayModel} (${resolvedRequest.reasoning.effort})`
    }

    return { name, model: displayModel, baseUrl, isLocal }
  }

  const settings = getSettings_DEPRECATED() || {}
  const modelSetting = modelOverride || settings.model || process.env.ANTHROPIC_MODEL || process.env.CLAUDE_MODEL || 'claude-sonnet-4-6'
  const resolvedModel = parseUserSpecifiedModel(modelSetting)
  const baseUrl = process.env.ANTHROPIC_BASE_URL ?? 'https://api.anthropic.com'
  return { name: 'Anthropic', model: resolvedModel, baseUrl, isLocal: false }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function printStartupScreen(modelOverride?: string): void {
  if (process.env.CI || !process.stdout.isTTY) return

  const p = detectProvider(modelOverride)
  const width = 64
  const out: string[] = []

  out.push('')

  // Logo with Gradient
  LOGO_NEURON.forEach((line, i) => {
    const t = LOGO_NEURON.length > 1 ? i / (LOGO_NEURON.length - 1) : 0
    const color = getGradientColor(t)
    out.push('   ' + chalk.hex(color)(line))
  })

  out.push('')
  
  // Tagline
  const tagline = `✦ Any model. Every tool. Zero limits. ✦`
  const innerWidth = width - 4
  const padding = Math.max(0, Math.floor((innerWidth - tagline.length) / 2))
  out.push('  ' + ' '.repeat(padding) + chalk.hex(COLORS.accent).bold(tagline))
  out.push('')

  // Box elements
  const border = chalk.hex(COLORS.border)
  const top = border('\u2554' + '\u2550'.repeat(width - 2) + '\u2557')
  const bottom = border('\u255a' + '\u2550'.repeat(width - 2) + '\u255d')
  const separator = border('\u2560' + '\u2550'.repeat(width - 2) + '\u2563')

  out.push(top)
  
  const drawRow = (label: string, value: string, valueColor: string = COLORS.cream) => {
    const lbl = chalk.hex(COLORS.dim)(label.padEnd(10))
    const val = chalk.hex(valueColor)(value)
    const rawLen = label.padEnd(10).length + value.length + 2
    const pad = Math.max(0, width - 2 - rawLen)
    out.push(border('\u2502 ') + lbl + val + ' '.repeat(pad) + border('\u2502'))
  }

  drawRow('Provider', p.name, p.isLocal ? COLORS.success : COLORS.accent)
  drawRow('Model', p.model)
  
  const ep = p.baseUrl.length > 40 ? p.baseUrl.slice(0, 37) + '...' : p.baseUrl
  drawRow('Endpoint', ep)

  out.push(separator)

  // Status line
  const statusColor = p.isLocal ? COLORS.success : COLORS.accent
  const statusIcon = chalk.hex(statusColor)('\u25cf')
  const statusText = chalk.hex(COLORS.dim)(p.isLocal ? 'local' : 'cloud')
  const helpText = chalk.hex(COLORS.dim)('Ready \u2014 type ') + chalk.hex(COLORS.accent)('/help') + chalk.hex(COLORS.dim)(' to begin')
  
  const statusRaw = ` \u25cf ${p.isLocal ? 'local' : 'cloud'}    Ready \u2014 type /help to begin`
  const statusPad = Math.max(0, width - 2 - statusRaw.length)
  
  out.push(border('\u2502 ') + statusIcon + ' ' + statusText + '    ' + helpText + ' '.repeat(statusPad) + border('\u2502'))
  
  out.push(bottom)

  // Version Footer
  const version = `neuron v${MACRO.DISPLAY_VERSION ?? MACRO.VERSION}`
  out.push('  ' + chalk.hex(COLORS.dim)(version))
  out.push('')

  process.stdout.write(out.join('\n') + '\n')
}
