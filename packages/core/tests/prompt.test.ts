import { describe, it, expect } from 'vitest'
import { buildSystemPrompt, deriveSuggestedQuestions } from '../src/prompt.js'
import type { SearchResult } from '../src/retrieval.js'
import type { TokenChunk } from '../src/types.js'

function makeResult(path: string, text: string, score: number): SearchResult {
  const chunk: TokenChunk = {
    path,
    text,
    value: text,
    type: undefined,
    category: path.split('.')[0] ?? 'unknown',
  }
  return { chunk, score }
}

describe('buildSystemPrompt', () => {
  it('includes context from search results', () => {
    const results: SearchResult[] = [
      makeResult('color.primary', 'color.primary (color) = #0066cc', 0.9),
      makeResult('color.secondary', 'color.secondary (color) = #6b7280', 0.8),
    ]

    const prompt = buildSystemPrompt(results)

    expect(prompt).toContain('CONTEXT:')
    expect(prompt).toContain('color.primary (color) = #0066cc')
    expect(prompt).toContain('color.secondary (color) = #6b7280')
  })

  it('includes default system prompt prefix', () => {
    const results: SearchResult[] = [
      makeResult('color.primary', 'color.primary = #f00', 0.9),
    ]

    const prompt = buildSystemPrompt(results)

    expect(prompt).toContain('design system assistant')
    expect(prompt).toContain('Do not invent tokens')
  })

  it('uses custom prefix when provided', () => {
    const results: SearchResult[] = [
      makeResult('color.primary', 'color.primary = #f00', 0.9),
    ]

    const prompt = buildSystemPrompt(results, 'Custom instructions here.')

    expect(prompt).toContain('Custom instructions here.')
    expect(prompt).not.toContain('design system assistant')
  })

  it('handles empty results', () => {
    const prompt = buildSystemPrompt([])

    expect(prompt).toContain('CONTEXT:')
    expect(prompt).toContain('No relevant tokens found')
  })
})

describe('deriveSuggestedQuestions', () => {
  it('derives questions from known categories', () => {
    const questions = deriveSuggestedQuestions(['color', 'spacing', 'typography'])

    expect(questions.length).toBeGreaterThan(0)
    expect(questions.length).toBeLessThanOrEqual(4)
  })

  it('returns at most 4 questions', () => {
    const categories = ['color', 'spacing', 'typography', 'shadow', 'borderRadius', 'opacity']
    const questions = deriveSuggestedQuestions(categories)

    expect(questions.length).toBeLessThanOrEqual(4)
  })

  it('deduplicates synonym categories', () => {
    const questions = deriveSuggestedQuestions(['color', 'colors', 'colours'])

    const uniqueQuestions = [...new Set(questions)]
    expect(questions.length).toBe(uniqueQuestions.length)
  })

  it('generates a fallback question for unknown categories', () => {
    const questions = deriveSuggestedQuestions(['customCategory'])

    expect(questions).toHaveLength(1)
    expect(questions[0]).toContain('customCategory')
  })

  it('returns empty array for empty categories', () => {
    const questions = deriveSuggestedQuestions([])

    expect(questions).toEqual([])
  })

  it('handles case-insensitive category matching', () => {
    const questions = deriveSuggestedQuestions(['Color', 'SPACING'])

    // The function normalises to lowercase — Color → color → match
    // SPACING → spacing → match
    expect(questions.length).toBeGreaterThan(0)
  })
})
