#!/usr/bin/env node
/**
 * Validates the demo token set for:
 * 1. Referential integrity — every {reference} resolves to a real token
 * 2. Naming lint — all token paths are kebab-case with consistent prefixes
 * 3. No duplicate paths
 * 4. All tokens have a description
 *
 * Run: node demo/scripts/validate-tokens.mjs
 * Exit code 0 = pass, 1 = fail (for CI)
 */

import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const INPUT = resolve(__dirname, '..', 'src', 'sample-tokens.json')

const tokens = JSON.parse(readFileSync(INPUT, 'utf8'))

// ─── Collect all tokens ─────────────────────────────────────────────

/** @type {Map<string, { value: unknown, description?: string }>} */
const tokenMap = new Map()
const errors = []
const warnings = []

function walk(node, path = []) {
  for (const [key, value] of Object.entries(node)) {
    if (key.startsWith('$')) continue
    const currentPath = [...path, key]
    const pathStr = currentPath.join('.')

    if (typeof value === 'object' && value !== null && '$value' in value) {
      // It's a token leaf
      tokenMap.set(pathStr, {
        value: value.$value,
        description: value.$description,
      })
    } else if (typeof value === 'object' && value !== null) {
      walk(value, currentPath)
    }
  }
}

walk(tokens)

console.log(`Found ${tokenMap.size} tokens\n`)

// ─── 1. Referential integrity ───────────────────────────────────────

// Matches DTCG references like {color.semantic.text.primary} — must start with a letter
// and contain only lowercase letters, digits, dots, and hyphens.
const REF_PATTERN = /\{([a-z][a-z0-9.\-]+)\}/g
let brokenRefCount = 0

/** Extract all reference strings from a value (handles string or composite object) */
function extractRefs(val) {
  const refs = []
  if (typeof val === 'string') {
    let match
    REF_PATTERN.lastIndex = 0
    while ((match = REF_PATTERN.exec(val)) !== null) refs.push(match[1])
  } else if (typeof val === 'object' && val !== null) {
    for (const v of Object.values(val)) {
      refs.push(...extractRefs(v))
    }
  }
  return refs
}

for (const [path, token] of tokenMap) {
  for (const refPath of extractRefs(token.value)) {
    if (!tokenMap.has(refPath)) {
      errors.push(`BROKEN REF: "${path}" references "{${refPath}}" which does not exist`)
      brokenRefCount++
    }
  }
}

console.log(`Reference checks: ${brokenRefCount === 0 ? '✓ all references resolve' : `✗ ${brokenRefCount} broken references`}`)

// ─── 2. Naming lint (kebab-case) ────────────────────────────────────

const KEBAB_SEGMENT = /^[a-z0-9]+(-[a-z0-9]+)*$/
let namingIssues = 0

for (const path of tokenMap.keys()) {
  const segments = path.split('.')
  for (const seg of segments) {
    // Allow numeric segments like "10", "100", "2xl"
    if (/^\d+$/.test(seg)) continue
    if (/^\d+[a-z]+$/.test(seg)) continue // e.g., "2xl"

    if (!KEBAB_SEGMENT.test(seg)) {
      errors.push(`NAMING: "${path}" has non-kebab-case segment "${seg}"`)
      namingIssues++
    }
  }
}

console.log(`Naming lint: ${namingIssues === 0 ? '✓ all paths are kebab-case' : `✗ ${namingIssues} naming issues`}`)

// ─── 3. Duplicate check ────────────────────────────────────────────

// tokenMap inherently deduplicates, but let's verify by counting during walk
let totalWalked = 0
const pathsSeen = new Set()
let dupes = 0

function walkForDupes(node, path = []) {
  for (const [key, value] of Object.entries(node)) {
    if (key.startsWith('$')) continue
    const currentPath = [...path, key]
    const pathStr = currentPath.join('.')

    if (typeof value === 'object' && value !== null && '$value' in value) {
      totalWalked++
      if (pathsSeen.has(pathStr)) {
        errors.push(`DUPLICATE: "${pathStr}" appears more than once`)
        dupes++
      }
      pathsSeen.add(pathStr)
    } else if (typeof value === 'object' && value !== null) {
      walkForDupes(value, currentPath)
    }
  }
}

walkForDupes(tokens)
console.log(`Duplicate check: ${dupes === 0 ? '✓ no duplicates' : `✗ ${dupes} duplicates`}`)

// ─── 4. Description coverage ────────────────────────────────────────

let missingDesc = 0

for (const [path, token] of tokenMap) {
  if (!token.description || token.description.trim().length === 0) {
    warnings.push(`MISSING DESC: "${path}" has no description`)
    missingDesc++
  }
}

console.log(`Descriptions: ${missingDesc === 0 ? '✓ all tokens have descriptions' : `⚠ ${missingDesc} tokens missing descriptions`}`)

// ─── 5. Tier structure check ────────────────────────────────────────

let primitiveCount = 0
let semanticCount = 0
let componentCount = 0
let otherCount = 0

for (const [path] of tokenMap) {
  if (path.includes('.primitive.') || path.startsWith('opacity.') || path.startsWith('focus.') || path.startsWith('layout.')) {
    primitiveCount++
  } else if (path.includes('.semantic.') || path.startsWith('color.semantic.') || path.startsWith('typography.semantic.') || path.startsWith('spacing.semantic.') || path.startsWith('shadow.semantic.') || path.startsWith('border.width.') || path.startsWith('border.radius.') || path.startsWith('motion.')) {
    semanticCount++
  } else if (path.startsWith('component.')) {
    componentCount++
  } else {
    otherCount++
  }
}

console.log(`\nTier breakdown:`)
console.log(`  Primitive:  ${primitiveCount}`)
console.log(`  Semantic:   ${semanticCount}`)
console.log(`  Component:  ${componentCount}`)
console.log(`  Other:      ${otherCount}`)

// ─── 6. Component coverage check ────────────────────────────────────

const components = new Set()
for (const path of tokenMap.keys()) {
  if (path.startsWith('component.')) {
    const comp = path.split('.')[1]
    components.add(comp)
  }
}

console.log(`\nComponents covered (${components.size}): ${[...components].sort().join(', ')}`)

// ─── Summary ────────────────────────────────────────────────────────

console.log('')

if (errors.length > 0) {
  console.error('ERRORS:')
  for (const e of errors) console.error(`  ${e}`)
}

if (warnings.length > 0) {
  console.warn('\nWARNINGS:')
  for (const w of warnings) console.warn(`  ${w}`)
}

const passed = errors.length === 0
console.log(`\n${passed ? '✓ PASS' : '✗ FAIL'} — ${tokenMap.size} tokens, ${errors.length} errors, ${warnings.length} warnings`)
process.exit(passed ? 0 : 1)
