import type { TokenChunk, TokenFormat } from './types.js'

/**
 * Detect the token format of a JSON object.
 *
 * - DTCG: values have `$value` and optionally `$type`
 * - Style Dictionary: values have `value` and optionally `type` (no `$` prefix)
 * - Plain: nested objects with primitive leaf values
 */
export function detectFormat(schema: Record<string, unknown>): TokenFormat {
  const sample = findLeafNodes(schema, 3)

  for (const node of sample) {
    if (typeof node === 'object' && node !== null) {
      if ('$value' in node) return 'dtcg'
      if ('value' in node && !('$value' in node)) return 'style-dictionary'
    }
  }

  return 'plain'
}

/**
 * Flatten a design token JSON into chunks suitable for embedding.
 * Handles DTCG, Style Dictionary, and plain nested formats.
 */
export function flattenTokens(schema: Record<string, unknown>): TokenChunk[] {
  const format = detectFormat(schema)
  const chunks: TokenChunk[] = []

  walkTokenTree(schema, [], format, chunks, undefined)

  return chunks
}

function walkTokenTree(
  node: Record<string, unknown>,
  path: string[],
  format: TokenFormat,
  chunks: TokenChunk[],
  inheritedType: string | undefined,
): void {
  // DTCG $type inheritance: groups can set $type for all children
  const groupType = typeof node['$type'] === 'string' ? node['$type'] : inheritedType

  for (const [key, value] of Object.entries(node)) {
    if (key.startsWith('$')) continue

    const currentPath = [...path, key]

    if (isTokenNode(value, format)) {
      const tokenValue = extractValue(value as Record<string, unknown>, format)
      const tokenType = extractType(value as Record<string, unknown>, format) ?? groupType
      const description = extractDescription(value as Record<string, unknown>, format)
      const category = currentPath[0] ?? 'unknown'
      const pathStr = currentPath.join('.')
      const text = formatChunkText(pathStr, tokenValue, tokenType, description)

      chunks.push({
        path: pathStr,
        text,
        value: tokenValue,
        type: tokenType,
        category,
      })
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      walkTokenTree(value as Record<string, unknown>, currentPath, format, chunks, groupType)
    } else if (isPrimitiveValue(value)) {
      const category = currentPath[0] ?? 'unknown'
      const pathStr = currentPath.join('.')
      const text = formatChunkText(pathStr, value, undefined, undefined)

      chunks.push({
        path: pathStr,
        text,
        value,
        type: undefined,
        category,
      })
    }
  }
}

function isTokenNode(value: unknown, format: TokenFormat): boolean {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }

  const obj = value as Record<string, unknown>

  switch (format) {
    case 'dtcg':
      return '$value' in obj
    case 'style-dictionary':
      return 'value' in obj
    case 'plain':
      return false
  }
}

function extractValue(node: Record<string, unknown>, format: TokenFormat): unknown {
  switch (format) {
    case 'dtcg':
      return node['$value']
    case 'style-dictionary':
      return node['value']
    case 'plain':
      return node
  }
}

function extractType(node: Record<string, unknown>, format: TokenFormat): string | undefined {
  switch (format) {
    case 'dtcg':
      return typeof node['$type'] === 'string' ? node['$type'] : undefined
    case 'style-dictionary':
      return typeof node['type'] === 'string' ? node['type'] : undefined
    case 'plain':
      return undefined
  }
}

function extractDescription(node: Record<string, unknown>, format: TokenFormat): string | undefined {
  switch (format) {
    case 'dtcg':
      return typeof node['$description'] === 'string' ? node['$description'] : undefined
    case 'style-dictionary':
      return typeof node['description'] === 'string' ? node['description'] : undefined
    case 'plain':
      return undefined
  }
}

function formatChunkText(
  path: string,
  value: unknown,
  type: string | undefined,
  description: string | undefined,
): string {
  const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value)
  const parts = [path]
  if (type) parts.push(`(${type})`)
  parts.push('=')
  parts.push(valueStr)
  if (description) parts.push(`— ${description}`)
  return parts.join(' ')
}

function isPrimitiveValue(value: unknown): boolean {
  return typeof value === 'string'
    || typeof value === 'number'
    || typeof value === 'boolean'
}

/**
 * Find up to `limit` leaf nodes in the tree to sample the format.
 */
function findLeafNodes(obj: Record<string, unknown>, limit: number): unknown[] {
  const results: unknown[] = []

  function walk(node: unknown): void {
    if (results.length >= limit) return
    if (typeof node !== 'object' || node === null || Array.isArray(node)) return

    const record = node as Record<string, unknown>

    if ('$value' in record || 'value' in record) {
      results.push(record)
      return
    }

    for (const value of Object.values(record)) {
      if (results.length >= limit) return
      if (typeof value === 'object' && value !== null) {
        walk(value)
      }
    }
  }

  walk(obj)
  return results
}
