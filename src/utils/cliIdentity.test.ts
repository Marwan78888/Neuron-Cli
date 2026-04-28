import { afterEach, expect, test } from 'bun:test'

const originalMacro = (globalThis as Record<string, unknown>).MACRO

afterEach(() => {
  ;(globalThis as Record<string, unknown>).MACRO = originalMacro
})

async function importFreshCliIdentity() {
  return import(`./cliIdentity.ts?ts=${Date.now()}-${Math.random()}`)
}

test('returns neuron branding for the Neuron npm package', async () => {
  ;(globalThis as Record<string, unknown>).MACRO = {
    PACKAGE_URL: '@gitlawb/neuron',
  }

  const { formatCliCommand, getCliBinaryName, getCliDisplayName } =
    await importFreshCliIdentity()

  expect(getCliBinaryName()).toBe('neuron')
  expect(getCliDisplayName()).toBe('Neuron')
  expect(formatCliCommand('--help')).toBe('neuron --help')
})

test('returns claude branding for the upstream package', async () => {
  ;(globalThis as Record<string, unknown>).MACRO = {
    PACKAGE_URL: '@anthropic-ai/claude-code',
  }

  const { formatCliCommand, getCliBinaryName, getCliDisplayName } =
    await importFreshCliIdentity()

  expect(getCliBinaryName()).toBe('claude')
  expect(getCliDisplayName()).toBe('Claude Code')
  expect(formatCliCommand('doctor')).toBe('claude doctor')
})
