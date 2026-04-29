import { existsSync, readFileSync } from 'fs'
import { basename, join } from 'path'
import { execFileNoThrowWithCwd } from './execFileNoThrow.js'

const MAX_FILES_TO_ANALYZE = 5000
const MAX_DIGEST_CHARS = 720

type RepoBrainCache = {
  cwd: string
  signature: string
  digest: string | null
}

let cache: RepoBrainCache | null = null

function clamp(value: string, maxChars = MAX_DIGEST_CHARS): string {
  const compact = value.replace(/\s+/g, ' ').trim()
  return compact.length > maxChars
    ? `${compact.slice(0, Math.max(0, maxChars - 1)).trimEnd()}…`
    : compact
}

function readJsonFile(path: string): unknown {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return null
  }
}

function topExtensions(files: string[]): string {
  const counts = new Map<string, number>()
  for (const file of files) {
    const name = basename(file)
    const dot = name.lastIndexOf('.')
    if (dot <= 0 || dot === name.length - 1) continue
    const ext = name.slice(dot + 1).toLowerCase()
    counts.set(ext, (counts.get(ext) ?? 0) + 1)
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([ext, count]) => `${ext}:${count}`)
    .join(', ')
}

function existing(files: Set<string>, candidates: string[]): string[] {
  return candidates.filter(file => files.has(file))
}

async function listRepoFiles(cwd: string): Promise<string[]> {
  const git = await execFileNoThrowWithCwd('git', ['ls-files'], {
    cwd,
    preserveOutputOnError: false,
  })
  const raw = git.stdout.trim()
  if (raw) return raw.split('\n').slice(0, MAX_FILES_TO_ANALYZE)

  const rg = await execFileNoThrowWithCwd('rg', ['--files'], {
    cwd,
    preserveOutputOnError: false,
  })
  return rg.stdout.trim().split('\n').filter(Boolean).slice(0, MAX_FILES_TO_ANALYZE)
}

function getPackageSignals(cwd: string): string[] {
  const pkg = readJsonFile(join(cwd, 'package.json')) as
    | { type?: string; scripts?: Record<string, string>; dependencies?: Record<string, string>; devDependencies?: Record<string, string> }
    | null
  if (!pkg) return []

  const deps = {
    ...pkg.dependencies,
    ...pkg.devDependencies,
  }
  const frameworks = [
    'react',
    'next',
    'vite',
    'ink',
    'commander',
    'typescript',
    'bun',
  ].filter(name => deps[name])
  const scripts = Object.keys(pkg.scripts ?? {})
    .filter(name => ['build', 'test', 'typecheck', 'lint', 'dev', 'start'].includes(name))
    .slice(0, 6)

  return [
    scripts.length ? `scripts ${scripts.join('/')}` : '',
    frameworks.length ? `stack ${frameworks.join('/')}` : '',
  ].filter(Boolean)
}

export async function getRepoBrainDigest(cwd: string): Promise<string | null> {
  if (process.env.NEURON_REPO_BRAIN === '0') return null

  const files = await listRepoFiles(cwd)
  if (files.length === 0) return null

  const fileSet = new Set(files)
  const signature = [
    files.length,
    files[0] ?? '',
    files[Math.floor(files.length / 2)] ?? '',
    files[files.length - 1] ?? '',
    existsSync(join(cwd, 'package.json')) ? readFileSync(join(cwd, 'package.json'), 'utf8').length : 0,
  ].join('|')

  if (cache?.cwd === cwd && cache.signature === signature) {
    return cache.digest
  }

  const entrypoints = existing(fileSet, [
    'src/main.tsx',
    'src/main.ts',
    'src/index.ts',
    'src/App.tsx',
    'app/page.tsx',
    'pages/index.tsx',
    'main.go',
    'pyproject.toml',
    'Cargo.toml',
  ]).slice(0, 4)
  const docs = existing(fileSet, ['README.md', 'AGENTS.md', 'NEURON.md', 'DESIGN.md', 'PRODUCT.md'])
  const dirs = ['src/components', 'src/screens', 'src/tools', 'src/utils', 'tests', 'test', '__tests__'].filter(dir =>
    files.some(file => file.startsWith(`${dir}/`)),
  )
  const packageSignals = getPackageSignals(cwd)
  const extSummary = topExtensions(files)

  const parts = [
    `Repo brain: ${files.length >= MAX_FILES_TO_ANALYZE ? `${MAX_FILES_TO_ANALYZE}+` : files.length} tracked files`,
    extSummary ? `types ${extSummary}` : '',
    packageSignals.join('; '),
    entrypoints.length ? `entrypoints ${entrypoints.join(', ')}` : '',
    dirs.length ? `areas ${dirs.slice(0, 6).join(', ')}` : '',
    docs.length ? `docs ${docs.join(', ')}` : '',
    'Use this as a routing hint only; inspect files before making claims.',
  ].filter(Boolean)

  const digest = clamp(parts.join('. '))
  cache = { cwd, signature, digest }
  return digest
}

export function clearRepoBrainCache(): void {
  cache = null
}
