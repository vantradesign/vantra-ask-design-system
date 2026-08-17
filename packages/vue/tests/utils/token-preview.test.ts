import { describe, it, expect } from 'vitest'
import {
  detectPreviewType,
  parseTokenPreviews,
  renderPreviewsHtml,
  type TokenPreview,
} from '../../src/utils/token-preview'

describe('detectPreviewType', () => {
  // --- Color detection ---
  it('detects hex 6-digit color', () => {
    expect(detectPreviewType('color.ink', '#001619')).toBe('color')
  })

  it('detects hex 3-digit color', () => {
    expect(detectPreviewType('color.primary', '#f00')).toBe('color')
  })

  it('detects hex 8-digit color (with alpha)', () => {
    expect(detectPreviewType('color.overlay', '#001619cc')).toBe('color')
  })

  it('detects rgba() color', () => {
    expect(detectPreviewType('color.rule', 'rgba(0, 22, 25, 0.12)')).toBe('color')
  })

  it('detects rgb() color', () => {
    expect(detectPreviewType('color.primary', 'rgb(0, 102, 204)')).toBe('color')
  })

  it('detects hsl() color', () => {
    expect(detectPreviewType('color.accent', 'hsl(210, 100%, 40%)')).toBe('color')
  })

  it('detects oklch() color', () => {
    expect(detectPreviewType('color.brand', 'oklch(0.6 0.2 250)')).toBe('color')
  })

  it('detects color even when path has no color hint', () => {
    expect(detectPreviewType('brand.accent', '#021f94')).toBe('color')
  })

  // --- Font family detection ---
  it('detects font family by path', () => {
    expect(
      detectPreviewType(
        'typography.fontFamily.display',
        "'Bricolage Grotesque', ui-sans-serif, system-ui, sans-serif",
      ),
    ).toBe('fontFamily')
  })

  it('detects font-family with hyphenated path', () => {
    expect(
      detectPreviewType('font-family.body', 'Inter, sans-serif'),
    ).toBe('fontFamily')
  })

  // --- Font size detection ---
  it('detects font size with px', () => {
    expect(detectPreviewType('typography.fontSize.2xl', '30px')).toBe('fontSize')
  })

  it('detects font size with rem', () => {
    expect(detectPreviewType('typography.fontSize.md', '1.0625rem')).toBe('fontSize')
  })

  it('detects font-size with hyphenated path', () => {
    expect(detectPreviewType('font-size.lg', '20px')).toBe('fontSize')
  })

  // --- Font weight detection ---
  it('detects font weight 700', () => {
    expect(detectPreviewType('typography.fontWeight.bold', '700')).toBe('fontWeight')
  })

  it('detects font weight 400', () => {
    expect(detectPreviewType('typography.fontWeight.regular', '400')).toBe('fontWeight')
  })

  it('does not detect non-standard weight values', () => {
    expect(detectPreviewType('typography.fontWeight.custom', '450')).toBeNull()
  })

  // --- Shadow detection ---
  it('detects shadow token', () => {
    expect(
      detectPreviewType('shadow.md', '0 4px 8px rgba(0, 22, 25, 0.08)'),
    ).toBe('shadow')
  })

  it('does not detect shadow when value does not start with number', () => {
    expect(detectPreviewType('shadow.name', 'subtle-shadow')).toBeNull()
  })

  // --- Border radius detection ---
  it('detects border radius with px', () => {
    expect(detectPreviewType('borderRadius.full', '9999px')).toBe('borderRadius')
  })

  it('detects border radius zero', () => {
    expect(detectPreviewType('borderRadius.none', '0')).toBe('borderRadius')
  })

  // --- Opacity detection ---
  it('detects opacity decimal', () => {
    expect(detectPreviewType('opacity.disabled', '0.4')).toBe('opacity')
  })

  it('detects opacity at bounds', () => {
    expect(detectPreviewType('opacity.full', '1')).toBe('opacity')
    expect(detectPreviewType('opacity.none', '0')).toBe('opacity')
  })

  it('does not detect opacity > 1', () => {
    expect(detectPreviewType('opacity.invalid', '1.5')).toBeNull()
  })

  // --- Dimension / spacing detection ---
  it('detects spacing dimension', () => {
    expect(detectPreviewType('spacing.lg', '24px')).toBe('dimension')
  })

  it('detects gap dimension', () => {
    expect(detectPreviewType('layout.gap.md', '16px')).toBe('dimension')
  })

  it('does not detect dimension for unrelated paths', () => {
    expect(detectPreviewType('focus.ring-width', '2px')).toBeNull()
  })

  // --- Null for unknown ---
  it('returns null for z-index values', () => {
    expect(detectPreviewType('zIndex.modal', '1200')).toBeNull()
  })

  it('returns null for duration values', () => {
    expect(detectPreviewType('motion.duration.fast', '200ms')).toBeNull()
  })

  it('returns null for easing values', () => {
    expect(
      detectPreviewType('motion.easing.default', 'cubic-bezier(0.4, 0, 0.2, 1)'),
    ).toBeNull()
  })
})

describe('parseTokenPreviews', () => {
  it('parses a single color token line', () => {
    const content = '  color.ink: #001619;'
    const previews = parseTokenPreviews(content)

    expect(previews).toEqual([
      { path: 'color.ink', value: '#001619', type: 'color' },
    ])
  })

  it('parses multiple token lines', () => {
    const content = [
      '  color.ink: #001619;',
      '  typography.fontFamily.display: \'Bricolage Grotesque\', sans-serif;',
      '  typography.fontSize.2xl: 30px;',
    ].join('\n')

    const previews = parseTokenPreviews(content)

    expect(previews).toHaveLength(3)
    expect(previews[0]!.type).toBe('color')
    expect(previews[1]!.type).toBe('fontFamily')
    expect(previews[2]!.type).toBe('fontSize')
  })

  it('skips non-previewable tokens', () => {
    const content = [
      '  zIndex.modal: 1200;',
      '  color.primary: #0066cc;',
    ].join('\n')

    const previews = parseTokenPreviews(content)

    expect(previews).toHaveLength(1)
    expect(previews[0]!.type).toBe('color')
  })

  it('returns empty array for non-token content', () => {
    const content = 'body { color: red; }'
    expect(parseTokenPreviews(content)).toEqual([])
  })

  it('unescapes HTML entities in values', () => {
    const content = '  color.rule: rgba(0, 22, 25, 0.12);'
    const previews = parseTokenPreviews(content)

    expect(previews).toHaveLength(1)
    expect(previews[0]!.value).toBe('rgba(0, 22, 25, 0.12)')
  })

  it('handles empty input', () => {
    expect(parseTokenPreviews('')).toEqual([])
  })
})

describe('renderPreviewsHtml', () => {
  it('returns empty string for empty array', () => {
    expect(renderPreviewsHtml([])).toBe('')
  })

  it('renders color preview with swatch', () => {
    const previews: TokenPreview[] = [
      { path: 'color.ink', value: '#001619', type: 'color' },
    ]

    const html = renderPreviewsHtml(previews)

    expect(html).toContain('ads-previews')
    expect(html).toContain('ads-preview--color')
    expect(html).toContain('ads-preview__swatch')
    expect(html).toContain('background:#001619')
    expect(html).toContain('color.ink')
  })

  it('renders font family preview with sample text', () => {
    const previews: TokenPreview[] = [
      { path: 'typography.fontFamily.display', value: "'Bricolage Grotesque', sans-serif", type: 'fontFamily' },
    ]

    const html = renderPreviewsHtml(previews)

    expect(html).toContain('ads-preview--font')
    expect(html).toContain('ads-preview__font-sample')
    expect(html).toContain("font-family:'Bricolage Grotesque', sans-serif")
    expect(html).toContain('The quick brown fox')
  })

  it('renders font size preview with Aa sample', () => {
    const previews: TokenPreview[] = [
      { path: 'typography.fontSize.2xl', value: '30px', type: 'fontSize' },
    ]

    const html = renderPreviewsHtml(previews)

    expect(html).toContain('ads-preview--size')
    expect(html).toContain('font-size:clamp(11px,30px,56px)')
    expect(html).toContain('>Aa<')
  })

  it('renders font weight preview', () => {
    const previews: TokenPreview[] = [
      { path: 'typography.fontWeight.bold', value: '700', type: 'fontWeight' },
    ]

    const html = renderPreviewsHtml(previews)

    expect(html).toContain('ads-preview--weight')
    expect(html).toContain('font-weight:700')
    expect(html).toContain('>Aa<')
  })

  it('renders shadow preview', () => {
    const previews: TokenPreview[] = [
      { path: 'shadow.md', value: '0 4px 8px rgba(0, 22, 25, 0.08)', type: 'shadow' },
    ]

    const html = renderPreviewsHtml(previews)

    expect(html).toContain('ads-preview--shadow')
    expect(html).toContain('box-shadow:0 4px 8px rgba(0, 22, 25, 0.08)')
  })

  it('renders dimension preview with bar', () => {
    const previews: TokenPreview[] = [
      { path: 'spacing.lg', value: '24px', type: 'dimension' },
    ]

    const html = renderPreviewsHtml(previews)

    expect(html).toContain('ads-preview--dimension')
    expect(html).toContain('ads-preview__dim-bar')
    expect(html).toContain('width:24px')
  })

  it('renders border radius preview', () => {
    const previews: TokenPreview[] = [
      { path: 'borderRadius.full', value: '9999px', type: 'borderRadius' },
    ]

    const html = renderPreviewsHtml(previews)

    expect(html).toContain('ads-preview--radius')
    expect(html).toContain('border-radius:9999px')
  })

  it('renders opacity preview', () => {
    const previews: TokenPreview[] = [
      { path: 'opacity.disabled', value: '0.4', type: 'opacity' },
    ]

    const html = renderPreviewsHtml(previews)

    expect(html).toContain('ads-preview--opacity')
    expect(html).toContain('opacity:0.4')
  })

  it('renders multiple previews in one group', () => {
    const previews: TokenPreview[] = [
      { path: 'color.ink', value: '#001619', type: 'color' },
      { path: 'color.blue', value: '#021f94', type: 'color' },
    ]

    const html = renderPreviewsHtml(previews)

    expect(html).toContain('role="group"')
    expect(html).toContain('aria-label="Token previews"')
    // Both swatches present
    expect(html).toContain('#001619')
    expect(html).toContain('#021f94')
  })

  it('escapes HTML in paths and values', () => {
    const previews: TokenPreview[] = [
      { path: 'color.<script>', value: '#ff0000', type: 'color' },
    ]

    const html = renderPreviewsHtml(previews)

    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('sanitizes CSS values by stripping dangerous chars from style attributes', () => {
    const previews: TokenPreview[] = [
      { path: 'color.hack', value: '#ff0000}body{display:none', type: 'color' },
    ]

    const html = renderPreviewsHtml(previews)

    // The style attribute should have curly braces stripped
    expect(html).toContain('background:#ff0000bodydisplay:none')
    // But the display value is safely escaped and shown as-is
    expect(html).toContain('ads-preview__value')
  })
})
