import { dirname, join } from 'path'

export const PREFERRED_PROJECT_CONFIG_DIR = '.neuron'
export const LEGACY_PROJECT_CONFIG_DIR = '.claude'
export const PROJECT_CONFIG_DIR_NAMES = [
  PREFERRED_PROJECT_CONFIG_DIR,
  LEGACY_PROJECT_CONFIG_DIR,
] as const

export const PRIMARY_PROJECT_INSTRUCTION_FILE = 'AGENTS.md'
export const FALLBACK_PROJECT_INSTRUCTION_FILE = 'NEURON.md'
export const LEGACY_FALLBACK_PROJECT_INSTRUCTION_FILE = 'CLAUDE.md'
export const LOCAL_PROJECT_INSTRUCTION_FILE = 'NEURON.local.md'
export const LEGACY_LOCAL_PROJECT_INSTRUCTION_FILE = 'CLAUDE.local.md'

export function pickPreferredExistingPath(
  paths: string[],
  existsSync: (path: string) => boolean,
): string {
  return paths.find(path => existsSync(path)) ?? paths[0]!
}

export function getProjectInstructionFilePaths(dir: string): string[] {
  return [
    join(dir, PRIMARY_PROJECT_INSTRUCTION_FILE),
    join(dir, FALLBACK_PROJECT_INSTRUCTION_FILE),
    join(dir, LEGACY_FALLBACK_PROJECT_INSTRUCTION_FILE),
  ]
}

export function getProjectInstructionFilePath(
  dir: string,
  existsSync: (path: string) => boolean,
): string {
  return pickPreferredExistingPath(
    getProjectInstructionFilePaths(dir),
    existsSync,
  )
}

export function getLocalInstructionFilePaths(dir: string): string[] {
  return [
    join(dir, LOCAL_PROJECT_INSTRUCTION_FILE),
    join(dir, LEGACY_LOCAL_PROJECT_INSTRUCTION_FILE),
  ]
}

export function getLocalInstructionFilePath(
  dir: string,
  existsSync: (path: string) => boolean,
): string {
  return pickPreferredExistingPath(getLocalInstructionFilePaths(dir), existsSync)
}

export function getProjectConfigSubdirPaths(
  dir: string,
  subdir: string,
): string[] {
  return PROJECT_CONFIG_DIR_NAMES.map(configDir => join(dir, configDir, subdir))
}

export function getProjectNestedInstructionFilePaths(dir: string): string[] {
  return [
    join(
      dir,
      PREFERRED_PROJECT_CONFIG_DIR,
      FALLBACK_PROJECT_INSTRUCTION_FILE,
    ),
    join(
      dir,
      LEGACY_PROJECT_CONFIG_DIR,
      LEGACY_FALLBACK_PROJECT_INSTRUCTION_FILE,
    ),
  ]
}

export function getProjectNestedInstructionFilePath(
  dir: string,
  existsSync: (path: string) => boolean,
): string {
  return pickPreferredExistingPath(
    getProjectNestedInstructionFilePaths(dir),
    existsSync,
  )
}

export function getProjectRulesDirPaths(dir: string): string[] {
  return getProjectConfigSubdirPaths(dir, 'rules')
}

export function hasProjectInstructionFile(
  dir: string,
  existsSync: (path: string) => boolean,
): boolean {
  return getProjectInstructionFilePaths(dir).some(path => existsSync(path))
}

export function findProjectInstructionFilePathInAncestors(
  startDir: string,
  existsSync: (path: string) => boolean,
): string | null {
  let currentDir = startDir

  while (true) {
    if (hasProjectInstructionFile(currentDir, existsSync)) {
      return getProjectInstructionFilePath(currentDir, existsSync)
    }

    const parentDir = dirname(currentDir)
    if (parentDir === currentDir) {
      return null
    }

    currentDir = parentDir
  }
}

export function isProjectInstructionFileName(name: string): boolean {
  return (
    name === PRIMARY_PROJECT_INSTRUCTION_FILE ||
    name === FALLBACK_PROJECT_INSTRUCTION_FILE ||
    name === LEGACY_FALLBACK_PROJECT_INSTRUCTION_FILE
  )
}

export function isLocalInstructionFileName(name: string): boolean {
  return (
    name === LOCAL_PROJECT_INSTRUCTION_FILE ||
    name === LEGACY_LOCAL_PROJECT_INSTRUCTION_FILE
  )
}
