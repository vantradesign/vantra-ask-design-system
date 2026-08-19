import { describe, it, expect } from 'vitest'
import {
  detectPreviewType,
  parseTokenPreviews,
  renderPreviewsHtml,
  wcagChecksOnWhite,
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

  // --- Composite typography detection ---
  it('detects composite typography with fontSize JSON', () => {
    expect(
      detectPreviewType(
        'typography.semantic.heading-01',
        '{"fontSize":"{typography.font-size.6xl}","fontWeight":"{typography.font-weight.bold}","lineHeight":"{typography.line-height.tight}"}',
      ),
    ).toBe('typography')
  })

  it('does not detect typography for plain JSON without fontSize', () => {
    expect(detectPreviewType('some.token', '{"foo":"bar"}')).toBeNull()
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

  it('renders color preview as card with color block, HSL, and WCAG checks', () => {
    const previews: TokenPreview[] = [
      { path: 'color.ink', value: '#001619', type: 'color' },
    ]

    const html = renderPreviewsHtml(previews)

    expect(html).toContain('ads-previews')
    expect(html).toContain('ads-preview--color-card')
    expect(html).toContain('ads-preview__color-block')
    expect(html).toContain('background:#001619')
    expect(html).toContain('color.ink')
    // HSL values
    expect(html).toContain('ads-preview__hsl')
    expect(html).toMatch(/H:\d+ S:\d+ L:\d+/)
    // WCAG checks
    expect(html).toContain('ads-preview__checks')
    expect(html).toContain('AA Normal')
    expect(html).toContain('AA Large')
    expect(html).toContain('AAA')
  })

  it('renders WCAG pass/fail classes for color checks', () => {
    // Dark color — should pass AA on white
    const dark: TokenPreview[] = [
      { path: 'color.ink', value: '#001619', type: 'color' },
    ]
    const darkHtml = renderPreviewsHtml(dark)
    expect(darkHtml).toContain('ads-preview__check--pass')

    // Light color — should fail AA Normal on white
    const light: TokenPreview[] = [
      { path: 'color.paper', value: '#f5f2f3', type: 'color' },
    ]
    const lightHtml = renderPreviewsHtml(light)
    expect(lightHtml).toContain('ads-preview__check--fail')
  })

  it('renders composite typography card with live-size sample', () => {
    const previews: TokenPreview[] = [
      {
        path: 'typography.semantic.heading-01',
        value: '{"fontSize":"{typography.font-size.6xl}","fontWeight":"{typography.font-weight.bold}","lineHeight":"{typography.line-height.tight}"}',
        type: 'typography',
      },
    ]

    const html = renderPreviewsHtml(previews)

    expect(html).toContain('ads-preview--typography-card')
    expect(html).toContain('ads-preview__type-sample')
    expect(html).toContain('font-size:clamp(12px,3.75rem,64px)')
    expect(html).toContain('font-weight:700')
    expect(html).toContain('line-height:1.125')
    expect(html).toContain('Aa')
    expect(html).toContain('ads-preview__type-info')
    expect(html).toContain('3.75rem bold /1.125')
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

  it('renders shadow preview as card with elevated surface', () => {
    const previews: TokenPreview[] = [
      { path: 'shadow.md', value: '0 4px 8px rgba(0, 22, 25, 0.08)', type: 'shadow' },
    ]

    const html = renderPreviewsHtml(previews)

    expect(html).toContain('ads-preview--shadow-card')
    expect(html).toContain('ads-preview__shadow-stage')
    expect(html).toContain('ads-preview__shadow-surface')
    expect(html).toContain('box-shadow:0 4px 8px rgba(0, 22, 25, 0.08)')
    expect(html).toContain('ads-preview__shadow-info')
  })

  it('renders dimension preview as spacing card with skeleton', () => {
    const previews: TokenPreview[] = [
      { path: 'spacing.lg', value: '24px', type: 'dimension' },
    ]

    const html = renderPreviewsHtml(previews)

    expect(html).toContain('ads-preview--dimension-card')
    expect(html).toContain('ads-preview__spacing-skeleton')
    expect(html).toContain('ads-preview__skeleton-block')
    expect(html).toContain('ads-preview__spacing-gap')
    expect(html).toContain('height:24px')
    expect(html).toContain('ads-preview__spacing-info')
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

describe('wcagChecksOnWhite', () => {
  it('returns all passing for a very dark color', () => {
    const checks = wcagChecksOnWhite('#000000')
    expect(checks).toHaveLength(3)
    expect(checks.every(c => c.passes)).toBe(true)
  })

  it('returns all failing for white on white', () => {
    const checks = wcagChecksOnWhite('#ffffff')
    expect(checks.every(c => !c.passes)).toBe(true)
  })

  it('returns correct thresholds', () => {
    const checks = wcagChecksOnWhite('#001619')
    expect(checks[0]!.threshold).toBe(4.5)
    expect(checks[1]!.threshold).toBe(3)
    expect(checks[2]!.threshold).toBe(7)
  })
})
