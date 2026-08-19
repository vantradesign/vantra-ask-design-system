import { describe, it, expect } from 'vitest'
import { cosineSimilarity, searchChunks, keywordSearch, levenshteinDistance, buildVocabulary } from '../src/retrieval.js'
import type { EmbeddedChunk } from '../src/retrieval.js'
import type { TokenChunk } from '../src/types.js'

function makeChunk(path: string, text: string, category = 'test'): TokenChunk {
  return { path, text, value: text, type: undefined, category }
}

function makeEmbedded(chunk: TokenChunk, embedding: number[]): EmbeddedChunk {
  return { chunk, embedding: new Float32Array(embedding) }
}

describe('cosineSimilarity', () => {
  it('returns 1 for identical normalized vectors', () => {
    const a = new Float32Array([0.6, 0.8])
    expect(cosineSimilarity(a, a)).toBeCloseTo(1, 5)
  })

  it('returns 0 for orthogonal vectors', () => {
    const a = new Float32Array([1, 0])
    const b = new Float32Array([0, 1])
    expect(cosineSimilarity(a, b)).toBeCloseTo(0, 5)
  })

  it('returns -1 for opposite vectors', () => {
    const a = new Float32Array([1, 0])
    const b = new Float32Array([-1, 0])
    expect(cosineSimilarity(a, b)).toBeCloseTo(-1, 5)
  })

  it('handles different-length vectors (uses min length)', () => {
    const a = new Float32Array([1, 0, 0])
    const b = new Float32Array([1, 0])
    expect(cosineSimilarity(a, b)).toBeCloseTo(1, 5)
  })

  it('handles zero vectors', () => {
    const a = new Float32Array([0, 0])
    const b = new Float32Array([1, 0])
    expect(cosineSimilarity(a, b)).toBeCloseTo(0, 5)
  })

  it('handles empty vectors', () => {
    const a = new Float32Array([])
    const b = new Float32Array([])
    expect(cosineSimilarity(a, b)).toBe(0)
  })
})

describe('searchChunks', () => {
  it('returns top-k most similar chunks', () => {
    const chunks: EmbeddedChunk[] = [
      makeEmbedded(makeChunk('a', 'a'), [1, 0, 0]),
      makeEmbedded(makeChunk('b', 'b'), [0, 1, 0]),
      makeEmbedded(makeChunk('c', 'c'), [0.9, 0.1, 0]),
    ]

    const query = new Float32Array([1, 0, 0])
    const results = searchChunks(query, chunks, 2)

    expect(results).toHaveLength(2)
    expect(results[0]!.chunk.path).toBe('a')
    expect(results[1]!.chunk.path).toBe('c')
  })

  it('returns all chunks when k > length', () => {
    const chunks: EmbeddedChunk[] = [
      makeEmbedded(makeChunk('a', 'a'), [1, 0]),
    ]

    const query = new Float32Array([1, 0])
    const results = searchChunks(query, chunks, 5)

    expect(results).toHaveLength(1)
  })

  it('returns empty array for empty chunks', () => {
    const query = new Float32Array([1, 0])
    const results = searchChunks(query, [], 5)

    expect(results).toEqual([])
  })

  it('sorts by descending similarity', () => {
    const chunks: EmbeddedChunk[] = [
      makeEmbedded(makeChunk('low', 'low'), [0, 1, 0]),
      makeEmbedded(makeChunk('high', 'high'), [1, 0, 0]),
      makeEmbedded(makeChunk('mid', 'mid'), [0.7, 0.7, 0]),
    ]

    const query = new Float32Array([1, 0, 0])
    const results = searchChunks(query, chunks, 3)

    expect(results[0]!.chunk.path).toBe('high')
    expect(results[0]!.score).toBeGreaterThan(results[1]!.score)
    expect(results[1]!.score).toBeGreaterThan(results[2]!.score)
  })
})

describe('keywordSearch', () => {
  const chunks: TokenChunk[] = [
    makeChunk('color.primary', 'color.primary = #0066cc', 'color'),
    makeChunk('color.secondary', 'color.secondary = #6b7280', 'color'),
    makeChunk('spacing.sm', 'spacing.sm = 8px', 'spacing'),
    makeChunk('spacing.md', 'spacing.md = 16px', 'spacing'),
    makeChunk('typography.heading', 'typography.heading = Inter', 'typography'),
  ]

  it('finds chunks matching query terms', () => {
    const results = keywordSearch('color primary', chunks, 5)

    expect(results.length).toBeGreaterThan(0)
    expect(results[0]!.chunk.path).toBe('color.primary')
  })

  it('prefers path matches over text matches', () => {
    const results = keywordSearch('spacing', chunks, 5)

    expect(results).toHaveLength(2)
    expect(results.every((r) => r.chunk.category === 'spacing')).toBe(true)
  })

  it('limits to top-k results', () => {
    const results = keywordSearch('color', chunks, 1)

    expect(results).toHaveLength(1)
  })

  it('returns empty array when no matches', () => {
    const results = keywordSearch('nonexistent', chunks, 5)

    expect(results).toEqual([])
  })

  it('is case-insensitive', () => {
    const results = keywordSearch('COLOR PRIMARY', chunks, 5)

    expect(results.length).toBeGreaterThan(0)
    expect(results[0]!.chunk.path).toBe('color.primary')
  })

  it('handles empty query', () => {
    const results = keywordSearch('', chunks, 5)

    expect(results).toEqual([])
  })

  it('handles empty chunks array', () => {
    const results = keywordSearch('color', [], 5)

    expect(results).toEqual([])
  })

  it('splits dot-separated terms to match partial paths', () => {
    const dotChunks: TokenChunk[] = [
      makeChunk('color.ink-faint', 'color.ink-faint (color) = #626e70', 'color'),
      makeChunk('color.primary', 'color.primary (color) = #0066cc', 'color'),
    ]
    const results = keywordSearch('color.faint', dotChunks, 5)

    expect(results.length).toBeGreaterThan(0)
    expect(results[0]!.chunk.path).toBe('color.ink-faint')
  })

  it('strips trailing punctuation from query terms', () => {
    const results = keywordSearch('color?', chunks, 5)

    expect(results.length).toBeGreaterThan(0)
    expect(results[0]!.chunk.path).toContain('color')
  })

  it('filters stop words from query', () => {
    const results = keywordSearch('what is the color?', chunks, 5)

    // Only 'color' should be used as a search term
    expect(results.length).toBeGreaterThan(0)
    expect(results.every((r) => r.chunk.category === 'color')).toBe(true)
  })

  it('fuzzy-matches British "colour" against American "color" in paths', () => {
    const results = keywordSearch('What colour tokens are available?', chunks, 5)

    expect(results.length).toBeGreaterThan(0)
    expect(results.every((r) => r.chunk.category === 'color')).toBe(true)
  })

  it('fuzzy-matches American "gray" against British "grey" in paths', () => {
    const greyChunks: TokenChunk[] = [
      makeChunk('color.grey.50', 'color.grey.50 = #8d8d8d', 'color'),
      makeChunk('spacing.md', 'spacing.md = 16px', 'spacing'),
    ]

    const results = keywordSearch('gray', greyChunks, 5)

    expect(results.length).toBeGreaterThan(0)
    expect(results[0]!.chunk.path).toBe('color.grey.50')
  })

  it('fuzzy-matches typo "colir" against "color"', () => {
    const results = keywordSearch('colir primary', chunks, 5)

    expect(results.length).toBeGreaterThan(0)
    expect(results[0]!.chunk.path).toBe('color.primary')
  })

  it('fuzzy-matches missing letter "colr" against "color"', () => {
    const results = keywordSearch('colr', chunks, 5)

    expect(results.length).toBeGreaterThan(0)
    expect(results.every((r) => r.chunk.category === 'color')).toBe(true)
  })

  it('fuzzy-matches "spacng" against "spacing"', () => {
    const results = keywordSearch('spacng', chunks, 5)

    expect(results.length).toBeGreaterThan(0)
    expect(results.every((r) => r.chunk.category === 'spacing')).toBe(true)
  })

  it('does not fuzzy-match very short terms (< 4 chars)', () => {
    const tinyChunks: TokenChunk[] = [
      makeChunk('color.red', 'color.red = #f00', 'color'),
      makeChunk('spacing.md', 'spacing.md = 16px', 'spacing'),
    ]

    // "rd" is too short for fuzzy matching — should not match "red"
    const results = keywordSearch('rd', tinyChunks, 5)
    expect(results).toEqual([])
  })

  it('gives higher score for exact segment matches', () => {
    const segChunks: TokenChunk[] = [
      makeChunk('typography.fontFamily.display', 'typography.fontFamily.display = Inter', 'typography'),
      makeChunk('typography.fontSize.md', 'typography.fontSize.md = 17px', 'typography'),
    ]

    const results = keywordSearch('fontFamily', segChunks, 5)

    // fontFamily.display has an exact segment match, fontSize.md does not
    expect(results.length).toBeGreaterThan(0)
    expect(results[0]!.chunk.path).toBe('typography.fontFamily.display')
  })
})

describe('levenshteinDistance', () => {
  it('returns 0 for identical strings', () => {
    expect(levenshteinDistance('color', 'color')).toBe(0)
  })

  it('returns string length for empty vs non-empty', () => {
    expect(levenshteinDistance('', 'abc')).toBe(3)
    expect(levenshteinDistance('abc', '')).toBe(3)
  })

  it('returns 0 for two empty strings', () => {
    expect(levenshteinDistance('', '')).toBe(0)
  })

  it('counts single substitution', () => {
    expect(levenshteinDistance('color', 'colir')).toBe(1)
  })

  it('counts single deletion', () => {
    expect(levenshteinDistance('color', 'colr')).toBe(1)
  })

  it('counts single insertion', () => {
    expect(levenshteinDistance('color', 'collor')).toBe(1)
  })

  it('counts multiple edits', () => {
    expect(levenshteinDistance('colour', 'color')).toBe(1) // delete 'u'
    expect(levenshteinDistance('grey', 'gray')).toBe(1)    // substitute 'e' → 'a'
  })

  it('handles longer words', () => {
    expect(levenshteinDistance('typography', 'typograpy')).toBe(1)
    expect(levenshteinDistance('borderRadius', 'bordrRadius')).toBe(1)
  })
})

describe('buildVocabulary', () => {
  it('extracts unique lowercased segments from chunk paths', () => {
    const chunks: TokenChunk[] = [
      makeChunk('color.primary', 'color.primary = #0066cc'),
      makeChunk('color.secondary', 'color.secondary = #6b7280'),
      makeChunk('spacing.sm', 'spacing.sm = 8px'),
    ]

    const vocab = buildVocabulary(chunks)

    expect(vocab).toContain('color')
    expect(vocab).toContain('primary')
    expect(vocab).toContain('secondary')
    expect(vocab).toContain('spacing')
    expect(vocab).toContain('sm')
    expect(vocab.size).toBe(5)
  })

  it('returns empty set for empty chunks', () => {
    const vocab = buildVocabulary([])
    expect(vocab.size).toBe(0)
  })

  it('lowercases all segments', () => {
    const chunks: TokenChunk[] = [
      makeChunk('Typography.FontFamily.Display', 'test'),
    ]

    const vocab = buildVocabulary(chunks)

    expect(vocab).toContain('typography')
    expect(vocab).toContain('fontfamily')
    expect(vocab).toContain('display')
    expect(vocab).not.toContain('Typography')
  })
})
