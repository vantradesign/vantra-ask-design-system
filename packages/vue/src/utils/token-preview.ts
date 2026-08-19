// ── WCAG contrast helpers (self-contained, no external deps) ──────────────

interface Rgb { r: number; g: number; b: number }
interface Hsl { h: number; s: number; l: number }

const HEX_NORM_RE = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i

function hexToRgb(hex: string): Rgb | null {
  const raw = hex.trim().replace(/^#/, '')
  if (!HEX_NORM_RE.test(raw)) return null
  const full = raw.length === 3
    ? raw.split('').map(c => c + c).join('')
    : raw
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  }
}

function rgbToHsl({ r, g, b }: Rgb): Hsl {
  const rn = r / 255, gn = g / 255, bn = b / 255
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn)
  const delta = max - min
  const l = (max + min) / 2
  if (delta === 0) return { h: 0, s: 0, l: l * 100 }
  const s = delta / (1 - Math.abs(2 * l - 1))
  let h: number
  if (max === rn) h = ((gn - bn) / delta) % 6
  else if (max === gn) h = (bn - rn) / delta + 2
  else h = (rn - gn) / delta + 4
  h *= 60
  if (h < 0) h += 360
  return { h, s: s * 100, l: l * 100 }
}

function relativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex)
  if (!rgb) return 0
  const ch = (v: number) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * ch(rgb.r) + 0.7152 * ch(rgb.g) + 0.0722 * ch(rgb.b)
}

function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a), lb = relativeLuminance(b)
  const lighter = Math.max(la, lb), darker = Math.min(la, lb)
  return (lighter + 0.05) / (darker + 0.05)
}

function bestTextOn(hex: string): string {
  return contrastRatio('#ffffff', hex) >= contrastRatio('#000000', hex)
    ? '#ffffff' : '#000000'
}

export interface WcagCheck {
  label: string
  threshold: number
  passes: boolean
}

export function wcagChecksOnWhite(hex: string): WcagCheck[] {
  const ratio = contrastRatio(hex, '#ffffff')
  return [
    { label: 'AA Normal', threshold: 4.5, passes: ratio >= 4.5 },
    { label: 'AA Large', threshold: 3, passes: ratio >= 3 },
    { label: 'AAA', threshold: 7, passes: ratio >= 7 },
  ]
}

/** Preview type for a design token value. */
export type PreviewType =
  | 'color'
  | 'fontFamily'
  | 'fontSize'
  | 'fontWeight'
  | 'typography'
  | 'dimension'
  | 'shadow'
  | 'borderRadius'
  | 'opacity'

/** A parsed token with its detected preview type. */
export interface TokenPreview {
  path: string
  value: string
  type: PreviewType
}

const COLOR_HEX_RE = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i
const COLOR_FN_RE = /^(?:rgba?|hsla?|oklch|oklab|lab|lch)\(/i
const DIMENSION_RE = /^-?[\d.]+(?:px|rem|em)$/
const WEIGHT_RE = /^[1-9]00$/

/**
 * Detect the visual preview type for a token based on its path and value.
 * Returns null if no preview is applicable.
 */
export function detectPreviewType(path: string, value: string): PreviewType | null {
  const p = path.toLowerCase()

  // Color values — hex, rgb(), hsl(), oklch(), etc.
  if (COLOR_HEX_RE.test(value) || COLOR_FN_RE.test(value)) return 'color'

  // Composite typography — JSON with fontSize property
  if (value.startsWith('{') && value.includes('"fontSize"')) return 'typography'

  // Shadow — path hint + value starts with a number (offset)
  if (p.includes('shadow') && /^\d/.test(value)) return 'shadow'

  // Font family — path hint
  if (p.includes('fontfamily') || p.includes('font-family')) return 'fontFamily'

  // Font weight — path hint + numeric 100–900
  if ((p.includes('fontweight') || p.includes('font-weight')) && WEIGHT_RE.test(value)) {
    return 'fontWeight'
  }

  // Font size — path hint + dimension value
  if ((p.includes('fontsize') || p.includes('font-size')) && DIMENSION_RE.test(value)) {
    return 'fontSize'
  }

  // Border radius — path hint + dimension or zero
  if (p.includes('radius') && (DIMENSION_RE.test(value) || value === '0')) return 'borderRadius'

  // Opacity — path hint + decimal 0–1
  if (p.includes('opacity')) {
    const num = parseFloat(value)
    if (!isNaN(num) && num >= 0 && num <= 1) return 'opacity'
  }

  // Spacing / dimension — dimension value + spacing-related path
  if (DIMENSION_RE.test(value) && (p.includes('spacing') || p.includes('gap'))) {
    return 'dimension'
  }

  return null
}

/**
 * Parse CSS code block content (from formatDirectAnswer output) and extract
 * tokens that can be visually previewed.
 *
 * Expects lines in the format `  path: value;` as produced by the core.
 */
export function parseTokenPreviews(codeContent: string): TokenPreview[] {
  const previews: TokenPreview[] = []

  for (const line of codeContent.split('\n')) {
    // Match formatDirectAnswer format: `  token.path: value;`
    const match = line.match(/^\s+([\w./-]+):\s*(.+);$/)
    if (!match) continue

    const path = match[1]!
    // Unescape HTML entities that renderMarkdown's initial escape may have introduced
    const rawValue = match[2]!
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')

    const type = detectPreviewType(path, rawValue)
    if (type) {
      previews.push({ path, value: rawValue, type })
    }
  }

  return previews
}

/** Strip characters that could break out of a CSS style-attribute value. */
function sanitizeCss(value: string): string {
  return value.replace(/[{}\\]/g, '')
}

/** HTML-escape text for safe insertion. */
function esc(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// ── Composite typography reference resolver ────────────────────────────────

const FONT_SIZE_SCALE: Record<string, string> = {
  'xs': '0.75rem', 'sm': '0.875rem', 'md': '1rem', 'lg': '1.125rem',
  'xl': '1.25rem', '2xl': '1.5rem', '3xl': '1.875rem', '4xl': '2.25rem',
  '5xl': '3rem', '6xl': '3.75rem',
}

const FONT_WEIGHT_SCALE: Record<string, string> = {
  'thin': '100', 'extralight': '200', 'light': '300', 'regular': '400',
  'normal': '400', 'medium': '500', 'semibold': '600', 'bold': '700',
  'extrabold': '800', 'black': '900',
}

const LINE_HEIGHT_SCALE: Record<string, string> = {
  'tight': '1.125', 'snug': '1.25', 'normal': '1.5',
  'relaxed': '1.625', 'loose': '2',
}

/**
 * Resolve a typography token reference like `{typography.font-size.6xl}` to
 * a CSS value by extracting the last path segment and looking it up in the
 * known scale. Falls back to a raw CSS value if not a reference.
 */
function resolveTypographyRef(ref: string, scale: Record<string, string>): string | null {
  if (!ref) return null
  // Direct CSS value (e.g. "1rem", "700")
  if (!ref.startsWith('{')) return ref
  // Extract last segment: "{typography.font-size.6xl}" → "6xl"
  const lastDot = ref.lastIndexOf('.')
  if (lastDot < 0) return null
  const key = ref.slice(lastDot + 1, -1)  // strip trailing }
  return scale[key] ?? null
}

interface ParsedTypography {
  fontSize: string | null
  fontWeight: string | null
  lineHeight: string | null
  summary: string
}

function parseCompositeTypography(value: string): ParsedTypography | null {
  try {
    const obj = JSON.parse(value) as Record<string, string>
    if (!obj.fontSize) return null
    const fontSize = resolveTypographyRef(obj.fontSize ?? '', FONT_SIZE_SCALE)
    const fontWeight = resolveTypographyRef(obj.fontWeight ?? '', FONT_WEIGHT_SCALE)
    const lineHeight = resolveTypographyRef(obj.lineHeight ?? '', LINE_HEIGHT_SCALE)

    const parts: string[] = []
    if (fontSize) parts.push(fontSize)
    if (fontWeight) {
      const weightName = Object.entries(FONT_WEIGHT_SCALE).find(([, v]) => v === fontWeight)?.[0]
      parts.push(weightName ?? fontWeight)
    }
    if (lineHeight) parts.push(`/${lineHeight}`)

    return { fontSize, fontWeight, lineHeight, summary: parts.join(' ') }
  } catch {
    return null
  }
}

/**
 * Render an array of token previews as an HTML string.
 * Returns empty string if no previews to render.
 */
export function renderPreviewsHtml(previews: TokenPreview[]): string {
  if (previews.length === 0) return ''

  const items = previews.map((p) => {
    const label = esc(p.path)
    const cssVal = sanitizeCss(p.value)

    switch (p.type) {
      case 'color': {
        const rgb = hexToRgb(p.value)
        const hsl = rgb ? rgbToHsl(rgb) : null
        const textColor = hexToRgb(p.value) ? bestTextOn(p.value) : '#ffffff'
        const ratio = contrastRatio(p.value, '#ffffff')
        const checks = wcagChecksOnWhite(p.value)
        const bestLevel = checks.find(c => c.label === 'AAA')?.passes ? 'AAA'
          : checks.find(c => c.label === 'AA Normal')?.passes ? 'AA' : '—'
        const hslText = hsl
          ? `H:${Math.round(hsl.h)} S:${Math.round(hsl.s)} L:${Math.round(hsl.l)}`
          : ''
        const checksHtml = checks.map(c =>
          `<span class="ads-preview__check ${c.passes ? 'ads-preview__check--pass' : 'ads-preview__check--fail'}">` +
          `<span aria-hidden="true">${c.passes ? '✓' : '✕'}</span> ${esc(c.label)} ${c.threshold}:1</span>`
        ).join('')

        return (
          `<div class="ads-preview ads-preview--color-card">` +
          `<div class="ads-preview__color-block" style="background:${cssVal};color:${textColor}" aria-hidden="true">` +
          `<span class="ads-preview__level">${bestLevel} ${ratio.toFixed(2)}:1</span>` +
          `</div>` +
          `<div class="ads-preview__color-info">` +
          `<span class="ads-preview__label">${label}</span>` +
          `<span class="ads-preview__value">${esc(p.value)}</span>` +
          (hslText ? `<span class="ads-preview__hsl">${hslText}</span>` : '') +
          `</div>` +
          `<div class="ads-preview__checks">${checksHtml}</div>` +
          `</div>`
        )
      }

      case 'typography': {
        const typo = parseCompositeTypography(p.value)
        if (!typo || !typo.fontSize) {
          return (
            `<div class="ads-preview ads-preview--font">` +
            `<span class="ads-preview__label">${label}</span>` +
            `<span class="ads-preview__value">${esc(p.value)}</span>` +
            `</div>`
          )
        }
        const sizeStyle = `font-size:clamp(12px,${typo.fontSize},64px)`
        const weightStyle = typo.fontWeight ? `;font-weight:${typo.fontWeight}` : ''
        const lhStyle = typo.lineHeight ? `;line-height:${typo.lineHeight}` : ''
        return (
          `<div class="ads-preview ads-preview--typography-card">` +
          `<div class="ads-preview__type-sample" style="${sizeStyle}${weightStyle}${lhStyle}" aria-hidden="true">` +
          `Aa</div>` +
          `<div class="ads-preview__type-info">` +
          `<span class="ads-preview__label">${label}</span>` +
          `<span class="ads-preview__value">${esc(typo.summary)}</span>` +
          `</div>` +
          `</div>`
        )
      }

      case 'fontFamily':
        return (
          `<div class="ads-preview ads-preview--font">` +
          `<span class="ads-preview__label">${label}</span>` +
          `<span class="ads-preview__font-sample" style="font-family:${cssVal}">` +
          `The quick brown fox jumps over the lazy dog</span>` +
          `</div>`
        )

      case 'fontSize':
        return (
          `<div class="ads-preview ads-preview--size">` +
          `<span class="ads-preview__label">${label}</span>` +
          `<span class="ads-preview__size-sample" style="font-size:clamp(11px,${cssVal},56px)">Aa</span>` +
          `</div>`
        )

      case 'fontWeight':
        return (
          `<div class="ads-preview ads-preview--weight">` +
          `<span class="ads-preview__label">${label}</span>` +
          `<span class="ads-preview__weight-sample" style="font-weight:${cssVal}">Aa</span>` +
          `</div>`
        )

      case 'shadow':
        return (
          `<div class="ads-preview ads-preview--shadow-card">` +
          `<div class="ads-preview__shadow-stage" aria-hidden="true">` +
          `<div class="ads-preview__shadow-surface" style="box-shadow:${cssVal}"></div>` +
          `</div>` +
          `<div class="ads-preview__shadow-info">` +
          `<span class="ads-preview__label">${label}</span>` +
          `<span class="ads-preview__value">${esc(p.value)}</span>` +
          `</div>` +
          `</div>`
        )

      case 'dimension':
        return (
          `<div class="ads-preview ads-preview--dimension-card">` +
          `<div class="ads-preview__spacing-skeleton" aria-hidden="true">` +
          `<div class="ads-preview__skeleton-block"></div>` +
          `<div class="ads-preview__skeleton-block ads-preview__skeleton-block--short"></div>` +
          `<div class="ads-preview__spacing-gap" style="height:${cssVal}">` +
          `<span class="ads-preview__spacing-indicator"></span>` +
          `</div>` +
          `<div class="ads-preview__skeleton-block"></div>` +
          `<div class="ads-preview__skeleton-block ads-preview__skeleton-block--medium"></div>` +
          `</div>` +
          `<div class="ads-preview__spacing-info">` +
          `<span class="ads-preview__label">${label}</span>` +
          `<span class="ads-preview__value">${esc(p.value)}</span>` +
          `</div>` +
          `</div>`
        )

      case 'borderRadius':
        return (
          `<div class="ads-preview ads-preview--radius">` +
          `<span class="ads-preview__label">${label}</span>` +
          `<span class="ads-preview__radius-sample" style="border-radius:${cssVal}"></span>` +
          `</div>`
        )

      case 'opacity':
        return (
          `<div class="ads-preview ads-preview--opacity">` +
          `<span class="ads-preview__label">${label}</span>` +
          `<span class="ads-preview__opacity-sample">` +
          `<span style="opacity:${cssVal}"></span>` +
          `</span>` +
          `</div>`
        )
    }
  })

  return `<div class="ads-previews" role="group" aria-label="Token previews">${items.join('')}</div>`
}
