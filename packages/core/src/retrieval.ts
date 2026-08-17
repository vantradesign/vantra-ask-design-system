import type { TokenChunk } from './types.js'
import { AssistantError } from './types.js'

/** A chunk with its precomputed embedding vector. */
export interface EmbeddedChunk {
  chunk: TokenChunk
  embedding: Float32Array
}

/** Result of a similarity search. */
export interface SearchResult {
  chunk: TokenChunk
  score: number
}

/**
 * Embed an array of token chunks using the all-MiniLM-L6-v2 model
 * via @huggingface/transformers.
 *
 * The model is imported dynamically so it tree-shakes if unused.
 */
export async function embedChunks(chunks: TokenChunk[]): Promise<EmbeddedChunk[]> {
  const pipeline = await getEmbeddingPipeline()
  const texts = chunks.map((c) => c.text)

  try {
    const output = await pipeline(texts, {
      pooling: 'mean',
      normalize: true,
    })

    const embeddings: EmbeddedChunk[] = []
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]!
      const vec = output[i]
      const embedding = new Float32Array(vec.data as ArrayLike<number>)
      embeddings.push({ chunk, embedding })
    }

    return embeddings
  } catch (error) {
    throw new AssistantError(
      'embedding-failed',
      `Failed to embed chunks: ${error instanceof Error ? error.message : String(error)}`,
      error,
    )
  }
}

/**
 * Embed a single query string using the same pipeline.
 */
export async function embedQuery(query: string): Promise<Float32Array> {
  const pipeline = await getEmbeddingPipeline()

  try {
    const output = await pipeline([query], {
      pooling: 'mean',
      normalize: true,
    })

    return new Float32Array(output[0].data as ArrayLike<number>)
  } catch (error) {
    throw new AssistantError(
      'embedding-failed',
      `Failed to embed query: ${error instanceof Error ? error.message : String(error)}`,
      error,
    )
  }
}

/**
 * Cosine similarity between two normalized vectors.
 * When vectors are already L2-normalized, cosine similarity = dot product.
 */
export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dot = 0
  const len = Math.min(a.length, b.length)
  for (let i = 0; i < len; i++) {
    dot += (a[i] ?? 0) * (b[i] ?? 0)
  }
  return dot
}

/**
 * Find the top-k most relevant chunks for a query embedding.
 */
export function searchChunks(
  queryEmbedding: Float32Array,
  embeddedChunks: EmbeddedChunk[],
  topK: number,
): SearchResult[] {
  const scored = embeddedChunks.map((ec) => ({
    chunk: ec.chunk,
    score: cosineSimilarity(queryEmbedding, ec.embedding),
  }))

  scored.sort((a, b) => b.score - a.score)

  return scored.slice(0, topK)
}

/**
 * Fall back to keyword search over token paths/text when embeddings fail.
 */
export function keywordSearch(
  query: string,
  chunks: TokenChunk[],
  topK: number,
): SearchResult[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean)

  const scored = chunks.map((chunk) => {
    const text = chunk.text.toLowerCase()
    const path = chunk.path.toLowerCase()
    let score = 0

    for (const term of terms) {
      if (path.includes(term)) score += 2
      if (text.includes(term)) score += 1
    }

    return { chunk, score }
  })

  scored.sort((a, b) => b.score - a.score)

  return scored.filter((r) => r.score > 0).slice(0, topK)
}

// --- Pipeline singleton ---

type EmbeddingPipeline = (
  texts: string[],
  options: { pooling: string; normalize: boolean },
// eslint-disable-next-line @typescript-eslint/no-explicit-any
) => Promise<any>

let pipelineInstance: EmbeddingPipeline | null = null

async function getEmbeddingPipeline(): Promise<EmbeddingPipeline> {
  if (pipelineInstance) return pipelineInstance

  try {
    const { pipeline } = await import('@huggingface/transformers')
    const pipe = await pipeline(
      'feature-extraction',
      'Xenova/all-MiniLM-L6-v2',
    )
    pipelineInstance = pipe as unknown as EmbeddingPipeline
    return pipelineInstance
  } catch (error) {
    throw new AssistantError(
      'embedding-failed',
      `Failed to load embedding model: ${error instanceof Error ? error.message : String(error)}`,
      error,
    )
  }
}

/**
 * Reset the pipeline singleton (used during destroy).
 */
export function resetEmbeddingPipeline(): void {
  pipelineInstance = null
}
