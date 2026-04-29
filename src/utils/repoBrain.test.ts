import { describe, expect, test } from 'bun:test'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { clearRepoBrainCache, getRepoBrainDigest } from './repoBrain.js'

describe('repo brain', () => {
  test('builds a capped digest from local repo signals', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'repo-brain-'))
    try {
      mkdirSync(join(dir, 'src', 'components'), { recursive: true })
      writeFileSync(
        join(dir, 'package.json'),
        JSON.stringify({
          scripts: { build: 'bun build', test: 'bun test', typecheck: 'tsc' },
          dependencies: { react: 'latest', ink: 'latest' },
          devDependencies: { typescript: 'latest' },
        }),
      )
      writeFileSync(join(dir, 'src', 'main.tsx'), 'export {}')
      writeFileSync(join(dir, 'src', 'components', 'App.tsx'), 'export {}')
      writeFileSync(join(dir, 'README.md'), '# Test')

      clearRepoBrainCache()
      const digest = await getRepoBrainDigest(dir)
      expect(digest).toBeTruthy()
      expect(digest!.length).toBeLessThanOrEqual(720)
      expect(digest).toContain('Repo brain')
      expect(digest).toContain('scripts build/test/typecheck')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  test('can be disabled', async () => {
    process.env.NEURON_REPO_BRAIN = '0'
    clearRepoBrainCache()
    expect(await getRepoBrainDigest(process.cwd())).toBeNull()
    delete process.env.NEURON_REPO_BRAIN
  })
})

