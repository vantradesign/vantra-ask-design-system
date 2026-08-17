import type { SearchResult } from './retrieval.js'

const DEFAULT_SYSTEM_PROMPT = `You are a design-token assistant. Answer using ONLY the CONTEXT below. Use markdown: \`inline code\` for token names, fenced code blocks (\`\`\`css) for code snippets and token values. Be brief. Do not invent tokens.`

/**
 * Format retrieved token chunks directly as a readable answer.
 * Used as the primary response path — bypasses the LLM for instant,
 * accurate, deterministic answers from keyword-matched results.
 */
export function formatDirectAnswer(results: SearchResult[]): string {
  if (results.length === 0) {
    return 'No matching design tokens found for that query.'
  }

  const tokenLines = results.map((r) => {
    const c = r.chunk
    const value = typeof c.value === 'string' ? c.value : JSON.stringify(c.value)
    return `  ${c.path}: ${value};`
  })

  const descriptions = results
    .filter((r) => r.chunk.text.includes(' — '))
    .map((r) => {
      const c = r.chunk
      const desc = c.text.split(' — ')[1]
      return `- \`${c.path}\` — ${desc}`
    })

  let answer = 'Here are the matching design tokens:\n\n'
  answer += '```css\n' + tokenLines.join('\n') + '\n```'

  if (descriptions.length > 0) {
    answer += '\n\n' + descriptions.join('\n')
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
