import { describe, it, expect } from 'vitest'
import { cosineSimilarity, searchChunks, keywordSearch } from '../src/retrieval.js'
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
})
