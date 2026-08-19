import type { SearchResult } from './retrieval.js'

const DEFAULT_SYSTEM_PROMPT = `You are a design-token assistant. Answer using ONLY the CONTEXT below. Use markdown: \`inline code\` for token names, fenced code blocks (\`\`\`css) for code snippets and token values. Be brief. Do not invent tokens.`

/** Map T-shirt size names to sort weights. */
const SIZE_ORDER: Record<string, number> = {
  'xs': 1, 'sm': 2, 'md': 3, 'lg': 4, 'xl': 5,
  '2xl': 6, '3xl': 7, '4xl': 8, '5xl': 9, '6xl': 10,
  '7xl': 11, '8xl': 12, '9xl': 13,
}

/**
 * Sort two token paths with:
 * 1. Shared prefix compared naturally (locale + numeric)
 * 2. Last segment compared by T-shirt size order if both are known sizes,
 *    otherwise by natural locale comparison (handles numeric suffixes too).
 */
function sortTokenPaths(a: string, b: string): number {
  const aParts = a.split('.')
  const bParts = b.split('.')
  const len = Math.min(aParts.length, bParts.length)

  for (let i = 0; i < len; i++) {
    const sa = aParts[i]!
    const sb = bParts[i]!
    if (sa === sb) continue

    const wa = SIZE_ORDER[sa]
    const wb = SIZE_ORDER[sb]
    if (wa !== undefined && wb !== undefined) return wa - wb

    return sa.localeCompare(sb, undefined, { numeric: true })
  }

  return aParts.length - bParts.length
}

/**
 * Format retrieved token chunks directly as a readable answer.
 * Used as the primary response path — bypasses the LLM for instant,
 * accurate, deterministic answers from keyword-matched results.
 */
export function formatDirectAnswer(results: SearchResult[], totalMatches?: number): string {
  if (results.length === 0) {
    return 'No matching design tokens found for that query.'
  }

  // Sort by path with natural ordering + T-shirt size ordering
  const sorted = [...results].sort((a, b) => sortTokenPaths(a.chunk.path, b.chunk.path))

  const tokenLines = sorted.map((r) => {
    const c = r.chunk
    const value = typeof c.value === 'string' ? c.value : JSON.stringify(c.value)
    return `  ${c.path}: ${value};`
  })

  const descriptions = sorted
    .filter((r) => r.chunk.text.split(' — ').length >= 3)
    .map((r) => {
      const c = r.chunk
      const parts = c.text.split(' — ')
      const desc = parts.slice(2).join(' — ')
      return `- \`${c.path}\` — ${desc}`
    })

  let answer = 'Here are the matching design tokens:\n\n'
  answer += '```css\n' + tokenLines.join('\n') + '\n```'

  if (descriptions.length > 0) {
    answer += '\n\n' + descriptions.join('\n')
  }

  const total = totalMatches ?? results.length
  if (total > results.length) {
    answer += `\n\n> Showing ${results.length} of ${total} matching tokens. Try a more specific query to narrow results.`
  }

  return answer
}

/**
 * Build the full system prompt with retrieved context chunks.
 */
export function buildSystemPrompt(
  results: SearchResult[],
  customPrefix?: string,
): string {
  const prefix = customPrefix ?? DEFAULT_SYSTEM_PROMPT

  if (results.length === 0) {
    return `${prefix}\n\nCONTEXT:\nNo relevant tokens were found. Tell the user you don't have information about that in the current token set.`
  }

  const context = results
    .map((r) => r.chunk.text)
    .join('\n')

  return `${prefix}\n\nCONTEXT (design tokens available):\n${context}`
}

/**
 * Derive suggested starter questions from the categories present in chunks.
 */
export function deriveSuggestedQuestions(
  categories: string[],
): string[] {
  const unique = [...new Set(categories)]
  const suggestions: string[] = []

  const categoryQuestions: Record<string, string> = {
    color: 'What are the status colors?',
    colour: 'What are the status colors?',
    colors: 'What are the status colors?',
    colours: 'What are the status colors?',
    spacing: 'What are the semantic spacing tokens?',
    space: 'What are the semantic spacing tokens?',
    typography: 'What heading styles are defined?',
    font: 'What heading styles are defined?',
    fonts: 'What heading styles are defined?',
    size: 'What are the icon sizes?',
    sizes: 'What are the icon sizes?',
    borderRadius: 'What border radius for buttons?',
    radius: 'What border radius for buttons?',
    shadow: 'What shadow for a raised card?',
    shadows: 'What shadow for a raised card?',
    breakpoint: 'What are the breakpoints?',
    breakpoints: 'What are the breakpoints?',
    opacity: 'What opacity for disabled states?',
    motion: 'What is the default transition duration?',
    animation: 'What is the default transition duration?',
    zIndex: 'What z-index for modals?',
  }

  for (const category of unique) {
    const normalised = category.toLowerCase()
    const q = categoryQuestions[normalised]
    if (q && !suggestions.includes(q)) {
      suggestions.push(q)
    }
  }

  if (suggestions.length === 0 && unique.length > 0) {
    suggestions.push(`What tokens are available in the "${unique[0]}" category?`)
  }

  return suggestions.slice(0, 4)
}
