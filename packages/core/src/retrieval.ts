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

/** Optional progress callback for embedding. */
export type EmbeddingProgressCallback = (loaded: number, total: number) => void

/** Yield to the browser so the UI stays responsive between batches. */
function yieldToMain(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

const EMBED_BATCH_SIZE = 16

/**
 * Embed an array of token chunks using the all-MiniLM-L6-v2 model
 * via @huggingface/transformers.
 *
 * Processes in batches of 16 with yields between batches to keep the
 * browser responsive. Accepts an optional progress callback.
 *
 * The model is imported dynamically so it tree-shakes if unused.
 */
export async function embedChunks(
  chunks: TokenChunk[],
  onProgress?: EmbeddingProgressCallback,
): Promise<EmbeddedChunk[]> {
  const pipeline = await getEmbeddingPipeline()
  const embeddings: EmbeddedChunk[] = []

  try {
    for (let start = 0; start < chunks.length; start += EMBED_BATCH_SIZE) {
      const end = Math.min(start + EMBED_BATCH_SIZE, chunks.length)
      const batch = chunks.slice(start, end)
      const texts = batch.map((c) => c.text)

      const output = await pipeline(texts, {
        pooling: 'mean',
        normalize: true,
      })

      for (let i = 0; i < batch.length; i++) {
        const chunk = batch[i]!
        const vec = output[i]
        const embedding = new Float32Array(vec.data as ArrayLike<number>)
        embeddings.push({ chunk, embedding })
      }

      onProgress?.(end, chunks.length)

      // Yield to browser between batches so the UI stays responsive
      if (end < chunks.length) {
        await yieldToMain()
      }
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

// ── Levenshtein fuzzy matching ──────────────────────────────────────────────

/**
 * Classic Levenshtein edit distance between two strings.
 * Counts insertions, deletions, and substitutions.
 */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m

  // Single-row DP — only need previous row + current value
  const row = Array.from({ length: n + 1 }, (_, i) => i)

  for (let i = 1; i <= m; i++) {
    let prev = i
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      const cur = Math.min(
        row[j]! + 1,      // deletion
        prev + 1,          // insertion
        row[j - 1]! + cost // substitution
      )
      row[j - 1] = prev
      prev = cur
    }
    row[n] = prev
  }

  return row[n]!
}

/**
 * Maximum edit distance allowed for a term of the given length.
 * Short words require exact matches to avoid false positives.
 */
function maxDistance(termLength: number): number {
  if (termLength < 4) return 0  // too short — exact only
  if (termLength <= 5) return 1 // e.g. "colir" → "color"
  return 2                      // e.g. "typograpy" → "typography"
}

/**
 * Build a set of unique lowercased segments from all token chunk paths.
 * Used as the vocabulary for fuzzy matching.
 */
export function buildVocabulary(chunks: TokenChunk[]): Set<string> {
  const vocab = new Set<string>()
  for (const chunk of chunks) {
    for (const segment of chunk.path.toLowerCase().split('.')) {
      vocab.add(segment)
    }
  }
  return vocab
}

/**
 * Find the closest vocabulary match for a term using Levenshtein distance.
 * Returns the matching word if within the allowed edit distance, or null.
 * Prefers exact matches and picks the shortest-distance candidate.
 */
function fuzzyMatch(term: string, vocabulary: Set<string>): string | null {
  if (vocabulary.has(term)) return null // already exact — no expansion needed

  const threshold = maxDistance(term.length)
  if (threshold === 0) return null // too short for fuzzy matching

  let best: string | null = null
  let bestDist = threshold + 1

  for (const word of vocabulary) {
    // Skip words with length difference > threshold (can't be within distance)
    if (Math.abs(word.length - term.length) > threshold) continue

    const dist = levenshteinDistance(term, word)
    if (dist > 0 && dist < bestDist) {
      best = word
      bestDist = dist
    }
  }

  return best
}

/**
 * Semantic synonyms — maps a search term to additional terms that represent
 * the same concept in design-token naming conventions.
 * Helps bridge the gap between user queries ("status colors") and actual
 * token paths (color.semantic.interactive.success/warning/error/info).
 */
const QUERY_SYNONYMS: Record<string, string[]> = {
  status: ['success', 'warning', 'error', 'info'],
  feedback: ['success', 'warning', 'error', 'info'],
  alert: ['warning', 'error', 'info'],
  state: ['hover', 'active', 'focus', 'disabled', 'selected'],
  elevation: ['shadow'],
  depth: ['shadow'],
  round: ['radius'],
  rounded: ['radius'],
}

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been',
  'do', 'does', 'did', 'has', 'have', 'had', 'will', 'would',
  'can', 'could', 'should', 'may', 'might', 'shall',
  'i', 'we', 'you', 'he', 'she', 'it', 'they',
  'my', 'your', 'his', 'her', 'its', 'our', 'their',
  'this', 'that', 'these', 'those',
  'what', 'which', 'who', 'whom', 'where', 'when', 'how', 'why',
  'and', 'or', 'but', 'not', 'no', 'if', 'then',
  'of', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'from',
  'about', 'into', 'as', 'up', 'out',
  'used', 'using', 'available', 'defined', 'exist',
])

/** Result of keywordSearchWithTotal — includes total match count for truncation hints. */
export interface KeywordSearchResult {
  results: SearchResult[]
  totalMatches: number
}

export function keywordSearch(
  query: string,
  chunks: TokenChunk[],
  topK: number,
): SearchResult[] {
  return keywordSearchWithTotal(query, chunks, topK).results
}

export function keywordSearchWithTotal(
  query: string,
  chunks: TokenChunk[],
  topK: number,
): KeywordSearchResult {
  const rawTerms = query.toLowerCase().split(/[\s.]+/)
    .map((t) => t.replace(/[^\w#-]/g, ''))
    .filter((t) => t.length > 0 && !STOP_WORDS.has(t))

  // Build vocabulary from token paths for fuzzy matching
  const vocabulary = buildVocabulary(chunks)

  // Basic plural stemming: 'colors' → 'color', 'fonts' → 'font'
  // Then expand with fuzzy matches and semantic synonyms.
  const terms = rawTerms.flatMap((t) => {
    const stems = t.length > 3 && t.endsWith('s') ? [t, t.slice(0, -1)] : [t]
    const expanded: string[] = []
    for (const s of stems) {
      expanded.push(s)
      // Fuzzy match against token vocabulary (handles typos + spelling variants)
      const fuzzy = fuzzyMatch(s, vocabulary)
      if (fuzzy && !expanded.includes(fuzzy)) expanded.push(fuzzy)
      // Semantic synonym expansion (status → success/warning/error/info)
      const synonyms = QUERY_SYNONYMS[s]
      if (synonyms) {
        for (const syn of synonyms) {
          if (!expanded.includes(syn)) expanded.push(syn)
        }
      }
    }
    return expanded
  })

  const scored = chunks.map((chunk) => {
    const text = chunk.text.toLowerCase()
    const path = chunk.path.toLowerCase()
    const segments = path.split('.')
    let score = 0

    for (const term of terms) {
      // Exact segment match (e.g. "fontfamily" matches segment "fontfamily")
      if (segments.some((s) => s === term)) {
        score += 3
      } else if (path.includes(term)) {
        score += 2
      }
      if (text.includes(term)) score += 1
    }

    return { chunk, score }
  })

  scored.sort((a, b) => b.score - a.score)

  const matches = scored.filter((r) => r.score > 0)

  // Only count matches that score at least 75% of the best score as primary.
  // This avoids inflating totalMatches with weak partial matches (e.g. "blue
  // colors" should count the ~10 blue tokens, not all 50+ color tokens).
  const bestScore = matches[0]?.score ?? 0
  const qualityThreshold = bestScore * 0.75
  const primaryMatches = matches.filter((r) => r.score >= qualityThreshold)

  return { results: primaryMatches.slice(0, topK), totalMatches: primaryMatches.length }
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
