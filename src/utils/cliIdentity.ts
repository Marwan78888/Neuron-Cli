export function getCliBinaryName(): string {
  return MACRO.PACKAGE_URL === '@anthropic-ai/claude-code'
    ? 'claude'
    : 'neuron'
}

export function getCliDisplayName(): string {
  return getCliBinaryName() === 'claude' ? 'Claude Code' : 'Neuron'
}

export function formatCliCommand(args = ''): string {
  return [getCliBinaryName(), args].filter(Boolean).join(' ')
}

export function getCliExecutableName(platform = process.platform): string {
  return platform.startsWith('win32')
    ? `${getCliBinaryName()}.exe`
    : getCliBinaryName()
}

export function getLegacyClaudeExecutableName(
  platform = process.platform,
): string {
  return platform.startsWith('win32') ? 'claude.exe' : 'claude'
}
