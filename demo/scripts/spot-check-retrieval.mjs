#!/usr/bin/env node
/**
 * Spot-check retrieval quality for the demo token set.
 * Tests 25+ natural-language queries against keyword search,
 * verifying that the expected tokens appear in the top results.
 *
 * Run: node demo/scripts/spot-check-retrieval.mjs
 */

import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { flattenTokens, keywordSearch } from '@vantra-design/ask-design-system'

const __dirname = dirname(fileURLToPath(import.meta.url))
const INPUT = resolve(__dirname, '..', 'src', 'sample-tokens.json')
const tokens = JSON.parse(readFileSync(INPUT, 'utf8'))

const chunks = flattenTokens(tokens)
console.log(`Flattened ${chunks.length} chunks from ${INPUT}\n`)

const TOP_K = 5

/**
 * Each query specifies:
 * - q: natural language question
 * - expect: array of path substrings that MUST appear in top-K results
 */
const QUERIES = [
  // Primitive color
  { q: 'What blue colors are available?', expect: ['color.primitive.blue'] },
  { q: 'Show me the red color palette', expect: ['color.primitive.red'] },
  { q: 'What shade of green is at step 50?', expect: ['color.primitive.green.50'] },

  // Semantic color
  { q: 'What is the primary brand color?', expect: ['color.semantic.brand'] },
  { q: 'Error text color', expect: ['color.semantic.text.error'] },
  { q: 'What color is used for disabled text?', expect: ['color.semantic.text.disabled'] },
  { q: 'Focus ring color', expect: ['focus.ring-color'] },
  { q: 'What is the success notification background?', expect: ['support.success'] },

  // Typography
  { q: 'What font family is used for code?', expect: ['font-family.mono'] },
  { q: 'Heading 1 text style', expect: ['typography.semantic.heading-01'] },
  { q: 'What is the default body font size?', expect: ['font-size.md'] },
  { q: 'Bold font weight value', expect: ['font-weight.bold'] },
  { q: 'Line height for body text', expect: ['line-height.normal'] },

  // Spacing
  { q: 'What spacing sizes are available?', expect: ['spacing.primitive'] },
  { q: 'Default content padding', expect: ['spacing.semantic.inset'] },
  { q: 'Stack spacing for forms', expect: ['spacing.semantic.stack'] },

  // Border & shadow
  { q: 'Border radius for buttons', expect: ['border.radius'] },
  { q: 'What shadow is used for modals?', expect: ['shadow'] },

  // Motion
  { q: 'Animation duration for fast transitions', expect: ['motion.duration'] },
  { q: 'What easing curve is used for enter animations?', expect: ['motion.easing'] },

  // Layout
  { q: 'Breakpoint for tablets', expect: ['layout.breakpoint'] },
  { q: 'Z-index for tooltips', expect: ['layout.z-index.tooltip'] },
  { q: 'Grid column count for desktop', expect: ['layout.columns'] },

  // Component tokens
  { q: 'Button primary background color', expect: ['component.button'] },
  { q: 'Input field focus border color', expect: ['component.input'] },
  { q: 'Checkbox disabled state', expect: ['component.checkbox'] },
  { q: 'Modal z-index', expect: ['component.modal'] },
  { q: 'Tooltip font size', expect: ['component.tooltip'] },
  { q: 'Tag dismiss icon color', expect: ['component.tag'] },
  { q: 'Tab selected text color', expect: ['component.tabs'] },
  { q: 'Navigation active border', expect: ['component.nav'] },
  { q: 'Data table header background', expect: ['component.data-table'] },
  { q: 'Toggle switch on color', expect: ['component.toggle'] },
  { q: 'Select dropdown menu shadow', expect: ['component.select'] },
  { q: 'Notification error background', expect: ['component.notification'] },

  // New components
  { q: 'Radio button checked border', expect: ['component.radio'] },
  { q: 'Avatar size for profile', expect: ['component.avatar'] },
  { q: 'Progress bar fill color', expect: ['component.progress-bar'] },
  { q: 'Accordion expand animation', expect: ['component.accordion'] },
  { q: 'Card border radius', expect: ['component.card'] },
  { q: 'Breadcrumb separator color', expect: ['component.breadcrumb'] },
  { q: 'Pagination active page style', expect: ['component.pagination'] },
  { q: 'Badge notification count background', expect: ['component.badge'] },
  { q: 'Divider thickness', expect: ['component.divider'] },
  { q: 'Link hover underline color', expect: ['component.link'] },
  { q: 'Skeleton loading animation', expect: ['component.skeleton'] },
]

let passed = 0
let failed = 0

for (const { q, expect: expectedPaths } of QUERIES) {
  const results = keywordSearch(q, chunks, TOP_K)
  const resultPaths = results.map((r) => r.chunk.path)

  const allFound = expectedPaths.every((exp) =>
    resultPaths.some((rp) => rp.includes(exp))
  )

  if (allFound) {
    passed++
    console.log(`✓ "${q}"`)
    console.log(`  → ${resultPaths.slice(0, 3).join(', ')}`)
  } else {
    failed++
    const missing = expectedPaths.filter((exp) =>
      !resultPaths.some((rp) => rp.includes(exp))
    )
    console.log(`✗ "${q}"`)
    console.log(`  Missing: ${missing.join(', ')}`)
    console.log(`  Got: ${resultPaths.join(', ')}`)
  }
}

console.log(`\n${passed}/${QUERIES.length} queries passed (${failed} failed)`)
process.exit(failed > 0 ? 1 : 0)
