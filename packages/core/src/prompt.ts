import type { SearchResult } from './retrieval.js'

const DEFAULT_SYSTEM_PROMPT = `You are a design system assistant. Answer questions using ONLY the following design token data. If the answer is not in the data, say so. Do not invent tokens that don't exist.

Rules:
- Be concise and specific.
- Reference token paths using inline code (e.g. \`color.primary\`).
- When listing tokens, format them as a readable list.
- If the user asks about something not in the data, say "I don't have information about that in the current token set."
`

/**
 * Build the full system prompt with retrieved context chunks.
 */
export function buildSystemPrompt(
  results: SearchResult[],
  customPrefix?: string,
): string {
  const prefix = customPrefix ?? DEFAULT_SYSTEM_PROMPT

  if (results.length === 0) {
    return `${prefix}\n\nCONTEXT:\nNo relevant tokens found for this query.`
  }

  const context = results
    .map((r) => r.chunk.text)
    .join('\n')

  return `${prefix}\n\nCONTEXT:\n${context}`
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
    color: 'What colour tokens are available?',
    colour: 'What colour tokens are available?',
    colors: 'What colour tokens are available?',
    colours: 'What colour tokens are available?',
    spacing: 'What is the spacing scale?',
    space: 'What is the spacing scale?',
    typography: 'Which fonts are used for headings?',
    font: 'Which fonts are used for headings?',
    fonts: 'Which fonts are used for headings?',
    size: 'What sizing tokens are available?',
    sizes: 'What sizing tokens are available?',
    borderRadius: 'What border radius values are defined?',
    radius: 'What border radius values are defined?',
    shadow: 'What shadow tokens are defined?',
    shadows: 'What shadow tokens are defined?',
    breakpoint: 'What breakpoints are defined?',
    breakpoints: 'What breakpoints are defined?',
    opacity: 'What opacity values are available?',
    motion: 'What motion/animation tokens exist?',
    animation: 'What motion/animation tokens exist?',
    zIndex: 'What z-index layers are defined?',
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
