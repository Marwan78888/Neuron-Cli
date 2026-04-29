const MAX_PERSONALITY_CHARS = 360

function clamp(value: string, maxChars: number): string {
  const compact = value.replace(/\s+/g, ' ').trim()
  return compact.length > maxChars
    ? `${compact.slice(0, Math.max(0, maxChars - 1)).trimEnd()}…`
    : compact
}

export function getPersonalityLayer(): string | null {
  if (process.env.NEURON_PERSONALITY_LAYER === '0') return null

  return clamp(
    [
      'Personality layer: warm, concise, curious, and senior-engineer steady.',
      'Be decisive once context is clear; ask only when risk or ambiguity matters.',
      'Keep explanations humane and compact; make the user feel capable.',
    ].join(' '),
    MAX_PERSONALITY_CHARS,
  )
}

