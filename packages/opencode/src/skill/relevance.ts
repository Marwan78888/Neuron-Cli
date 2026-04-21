import type { Info } from "./index"

const STOPWORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "but",
  "if",
  "then",
  "for",
  "from",
  "of",
  "to",
  "in",
  "on",
  "at",
  "by",
  "with",
  "as",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "can",
  "could",
  "should",
  "would",
  "will",
  "may",
  "might",
  "this",
  "that",
  "these",
  "those",
  "i",
  "you",
  "he",
  "she",
  "it",
  "we",
  "they",
  "me",
  "my",
  "your",
  "our",
  "their",
  "some",
  "any",
  "all",
  "no",
  "not",
  "so",
  "than",
  "what",
  "when",
  "where",
  "why",
  "how",
  "which",
  "please",
  "just",
  "make",
  "want",
  "need",
  "need",
  "help",
])

export interface Scored {
  skill: Info
  score: number
  matched: string[]
}

function tokens(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .flatMap((t) => {
      if (!t) return []
      if (t.length < 3) return []
      if (STOPWORDS.has(t)) return []
      return [t]
    })
}

function uniq(list: string[]) {
  return [...new Set(list)]
}

export function score(skill: Info, queryTokens: Set<string>) {
  const nameTokens = uniq(tokens(skill.name))
  const descTokens = uniq(tokens(skill.description))
  const matched: string[] = []
  let total = 0
  for (const t of nameTokens) {
    if (queryTokens.has(t)) {
      total += 3
      matched.push(t)
    }
  }
  for (const t of descTokens) {
    if (queryTokens.has(t)) {
      total += 1
      if (!matched.includes(t)) matched.push(t)
    }
  }
  return { skill, score: total, matched }
}

export function rank(skills: Info[], query: string): Scored[] {
  const queryTokens = new Set(tokens(query))
  if (queryTokens.size === 0) return []
  return skills
    .map((s) => score(s, queryTokens))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
}

export function recommended(skills: Info[], query: string, limit = 3): Scored[] {
  return rank(skills, query).slice(0, limit)
}

export * as SkillRelevance from "./relevance"
