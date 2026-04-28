import { afterEach, expect, mock, test } from 'bun:test'
import * as fsPromises from 'fs/promises'
import { homedir } from 'os'
import { join } from 'path'

const originalEnv = { ...process.env }
const originalMacro = (globalThis as Record<string, unknown>).MACRO

afterEach(() => {
  process.env = { ...originalEnv }
  ;(globalThis as Record<string, unknown>).MACRO = originalMacro
  mock.restore()
})

async function importFreshInstallCommand() {
  return import(`../commands/install.tsx?ts=${Date.now()}-${Math.random()}`)
}

async function importFreshInstaller() {
  return import(`./nativeInstaller/installer.ts?ts=${Date.now()}-${Math.random()}`)
}

async function mockEnvPlatform(platform: 'darwin' | 'win32') {
  const actualEnvModule = await import(`../utils/env.js?ts=${Date.now()}-${Math.random()}`)
  mock.module('../utils/env.js', () => ({
    ...actualEnvModule,
    env: {
      ...actualEnvModule.env,
      platform,
    },
  }))
}

test('install command displays ~/.local/bin/neuron on non-Windows', async () => {
  await mockEnvPlatform('darwin')

  const { getInstallationPath } = await importFreshInstallCommand()

  expect(getInstallationPath()).toBe('~/.local/bin/neuron')
})

test('install command displays neuron.exe path on Windows', async () => {
  await mockEnvPlatform('win32')

  const { getInstallationPath } = await importFreshInstallCommand()

  expect(getInstallationPath()).toBe(
    join(homedir(), '.local', 'bin', 'neuron.exe').replace(/\//g, '\\'),
  )
})

test('cleanupNpmInstallations removes both neuron and legacy claude local install dirs', async () => {
  const removedPaths: string[] = []
  ;(globalThis as Record<string, unknown>).MACRO = {
    PACKAGE_URL: '@gitlawb/neuron',
  }

  mock.module('fs/promises', () => ({
    ...fsPromises,
    rm: async (path: string) => {
      removedPaths.push(path)
    },
  }))

  mock.module('./execFileNoThrow.js', () => ({
    execFileNoThrowWithCwd: async () => ({
      code: 1,
      stderr: 'npm ERR! code E404',
    }),
  }))

  mock.module('./envUtils.js', () => ({
    getClaudeConfigHomeDir: () => join(homedir(), '.neuron'),
    isEnvTruthy: (value: string | undefined) => value === '1',
  }))

  const { cleanupNpmInstallations } = await importFreshInstaller()
  await cleanupNpmInstallations()

  expect(removedPaths).toContain(join(homedir(), '.neuron', 'local'))
  expect(removedPaths).toContain(join(homedir(), '.claude', 'local'))
})
