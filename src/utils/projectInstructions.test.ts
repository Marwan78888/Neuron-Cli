import { describe, expect, test } from 'bun:test'

import {
  FALLBACK_PROJECT_INSTRUCTION_FILE,
  getLocalInstructionFilePath,
  getProjectInstructionFilePath,
  getProjectNestedInstructionFilePath,
} from './projectInstructions.js'

describe('project instruction path selection', () => {
  test('defaults to AGENTS.md when no root instruction file exists', () => {
    const selected = getProjectInstructionFilePath('/repo', () => false)

    expect(selected).toBe('/repo/AGENTS.md')
  })

  test('loads NEURON.md when it exists', () => {
    const selected = getProjectInstructionFilePath(
      '/repo',
      path => path === `/repo/${FALLBACK_PROJECT_INSTRUCTION_FILE}`,
    )

    expect(selected).toBe('/repo/NEURON.md')
  })

  test('falls back to legacy CLAUDE.md when needed', () => {
    const selected = getProjectInstructionFilePath(
      '/repo',
      path => path === '/repo/CLAUDE.md',
    )

    expect(selected).toBe('/repo/CLAUDE.md')
  })

  test('prefers .neuron/NEURON.md for nested project instructions', () => {
    const selected = getProjectNestedInstructionFilePath(
      '/repo',
      path => path === '/repo/.neuron/NEURON.md',
    )

    expect(selected).toBe('/repo/.neuron/NEURON.md')
  })

  test('falls back to legacy local instruction file names', () => {
    const selected = getLocalInstructionFilePath(
      '/repo',
      path => path === '/repo/CLAUDE.local.md',
    )

    expect(selected).toBe('/repo/CLAUDE.local.md')
  })
})
