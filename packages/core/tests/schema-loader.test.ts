import { describe, it, expect } from 'vitest'
import { detectFormat, flattenTokens } from '../src/schema-loader.js'
import dtcgTokens from './fixtures/tokens-dtcg.json'
import sdTokens from './fixtures/tokens-sd.json'
import plainTokens from './fixtures/tokens-plain.json'

describe('detectFormat', () => {
  it('detects DTCG format ($value)', () => {
    expect(detectFormat(dtcgTokens)).toBe('dtcg')
  })

  it('detects Style Dictionary format (value)', () => {
    expect(detectFormat(sdTokens)).toBe('style-dictionary')
  })

  it('detects plain JSON format', () => {
    expect(detectFormat(plainTokens)).toBe('plain')
  })

  it('returns plain for empty object', () => {
    expect(detectFormat({})).toBe('plain')
  })

  it('detects DTCG with deeply nested tokens', () => {
    const deep = {
      level1: {
        level2: {
          level3: {
            token: { $value: '#fff', $type: 'color' },
          },
        },
      },
    }
    expect(detectFormat(deep)).toBe('dtcg')
  })
})

describe('flattenTokens', () => {
  describe('DTCG format', () => {
    it('flattens all tokens', () => {
      const chunks = flattenTokens(dtcgTokens)
      expect(chunks.length).toBeGreaterThan(0)
    })

    it('produces correct paths', () => {
      const chunks = flattenTokens(dtcgTokens)
      const paths = chunks.map((c) => c.path)

      expect(paths).toContain('color.primary')
      expect(paths).toContain('color.secondary')
      expect(paths).toContain('color.background.default')
      expect(paths).toContain('spacing.xs')
      expect(paths).toContain('typography.fontFamily.heading')
    })

    it('extracts values correctly', () => {
      const chunks = flattenTokens(dtcgTokens)
      const primary = chunks.find((c) => c.path === 'color.primary')

      expect(primary).toBeDefined()
      expect(primary!.value).toBe('#0066cc')
      expect(primary!.type).toBe('color')
      expect(primary!.category).toBe('color')
    })

    it('produces human-readable text', () => {
      const chunks = flattenTokens(dtcgTokens)
      const primary = chunks.find((c) => c.path === 'color.primary')

      expect(primary!.text).toBe('color primary — color.primary (color) = #0066cc')
    })

    it('assigns correct categories from top-level keys', () => {
      const chunks = flattenTokens(dtcgTokens)
      const categories = [...new Set(chunks.map((c) => c.category))]

      expect(categories).toContain('color')
      expect(categories).toContain('spacing')
      expect(categories).toContain('typography')
    })

    it('counts the right number of tokens', () => {
      const chunks = flattenTokens(dtcgTokens)
      // 5 colors + 5 spacings + 5 typography = 15
      expect(chunks).toHaveLength(15)
    })
  })

  describe('Style Dictionary format', () => {
    it('flattens all tokens', () => {
      const chunks = flattenTokens(sdTokens)
      expect(chunks.length).toBeGreaterThan(0)
    })

    it('extracts values correctly', () => {
      const chunks = flattenTokens(sdTokens)
      const primary = chunks.find((c) => c.path === 'color.primary')

      expect(primary).toBeDefined()
      expect(primary!.value).toBe('#0066cc')
      expect(primary!.type).toBe('color')
    })

    it('counts the right number of tokens', () => {
      const chunks = flattenTokens(sdTokens)
      // 2 colors + 2 spacings = 4
      expect(chunks).toHaveLength(4)
    })
  })

  describe('plain JSON format', () => {
    it('flattens all tokens', () => {
      const chunks = flattenTokens(plainTokens)
      expect(chunks.length).toBeGreaterThan(0)
    })

    it('extracts primitive values', () => {
      const chunks = flattenTokens(plainTokens)
      const primary = chunks.find((c) => c.path === 'color.primary')

      expect(primary).toBeDefined()
      expect(primary!.value).toBe('#0066cc')
      expect(primary!.type).toBeUndefined()
    })

    it('handles nested plain values', () => {
      const chunks = flattenTokens(plainTokens)
      const bgDefault = chunks.find((c) => c.path === 'color.background.default')

      expect(bgDefault).toBeDefined()
      expect(bgDefault!.value).toBe('#ffffff')
    })

    it('counts the right number of tokens', () => {
      const chunks = flattenTokens(plainTokens)
      // 2 colors + 2 bg colors + 3 spacings = 7
      expect(chunks).toHaveLength(7)
    })
  })

  describe('edge cases', () => {
    it('returns empty array for empty object', () => {
      expect(flattenTokens({})).toEqual([])
    })

    it('skips $-prefixed keys in DTCG', () => {
      const schema = {
        $description: 'Should be skipped',
        color: {
          primary: { $value: '#f00', $type: 'color' },
        },
      }
      const chunks = flattenTokens(schema)
      const paths = chunks.map((c) => c.path)

      expect(paths).not.toContain('$description')
      expect(paths).toContain('color.primary')
    })

    it('handles mixed nesting depths', () => {
      const schema = {
        shallow: { $value: '1', $type: 'number' },
        deep: {
          nested: {
            token: { $value: '2', $type: 'number' },
          },
        },
      }
      const chunks = flattenTokens(schema)
      expect(chunks).toHaveLength(2)
      expect(chunks.map((c) => c.path)).toEqual(['shallow', 'deep.nested.token'])
    })

    it('inherits $type from parent group in DTCG', () => {
      const schema = {
        color: {
          $type: 'color',
          primary: { $value: '#f00' },
          secondary: { $value: '#0f0', $type: 'custom' },
        },
      }
      const chunks = flattenTokens(schema)
      const primary = chunks.find((c) => c.path === 'color.primary')
      const secondary = chunks.find((c) => c.path === 'color.secondary')

      expect(primary!.type).toBe('color')
      expect(secondary!.type).toBe('custom')
    })

    it('includes $description in chunk text', () => {
      const schema = {
        color: {
          primary: {
            $value: '#f00',
            $type: 'color',
            $description: 'Primary brand colour.',
          },
        },
      }
      const chunks = flattenTokens(schema)
      const primary = chunks.find((c) => c.path === 'color.primary')

      expect(primary!.text).toBe('color primary — color.primary (color) = #f00 — Primary brand colour.')
    })

    it('omits description separator when no $description', () => {
      const schema = {
        color: {
          primary: { $value: '#f00', $type: 'color' },
        },
      }
      const chunks = flattenTokens(schema)
      const primary = chunks.find((c) => c.path === 'color.primary')

      expect(primary!.text).toBe('color primary — color.primary (color) = #f00')
    })
  })

  describe('reference resolution', () => {
    it('resolves DTCG reference values to the target value', () => {
      const schema = {
        color: {
          $type: 'color',
          primitive: {
            blue: { $value: '#0f62fe' },
          },
          semantic: {
            brand: { $value: '{color.primitive.blue}', $description: 'Brand colour.' },
          },
        },
      }
      const chunks = flattenTokens(schema)
      const brand = chunks.find((c) => c.path === 'color.semantic.brand')

      expect(brand!.value).toBe('#0f62fe')
      expect(brand!.text).toContain('#0f62fe')
      expect(brand!.text).toContain('Brand colour.')
    })

    it('resolves chained references', () => {
      const schema = {
        color: {
          $type: 'color',
          raw: { $value: '#ff0000' },
          alias: { $value: '{color.raw}' },
          alias2: { $value: '{color.alias}' },
        },
      }
      const chunks = flattenTokens(schema)
      const alias2 = chunks.find((c) => c.path === 'color.alias2')

      expect(alias2!.value).toBe('#ff0000')
    })

    it('keeps original value when reference target is missing', () => {
      const schema = {
        color: {
          $type: 'color',
          broken: { $value: '{color.nonexistent}' },
        },
      }
      const chunks = flattenTokens(schema)
      const broken = chunks.find((c) => c.path === 'color.broken')

      expect(broken!.value).toBe('{color.nonexistent}')
    })
  })
})
