/** Preview type for a design token value. */
export type PreviewType =
  | 'color'
  | 'fontFamily'
  | 'fontSize'
  | 'fontWeight'
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
      case 'color':
        return (
          `<div class="ads-preview ads-preview--color">` +
          `<span class="ads-preview__swatch" style="background:${cssVal}" aria-hidden="true"></span>` +
          `<span class="ads-preview__label">${label}</span>` +
          `<span class="ads-preview__value">${esc(p.value)}</span>` +
          `</div>`
        )

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
          `<div class="ads-preview ads-preview--shadow">` +
          `<span class="ads-preview__label">${label}</span>` +
          `<span class="ads-preview__shadow-sample" style="box-shadow:${cssVal}"></span>` +
          `</div>`
        )

      case 'dimension':
        return (
          `<div class="ads-preview ads-preview--dimension">` +
          `<span class="ads-preview__label">${label}</span>` +
          `<span class="ads-preview__dim-bar" style="width:${cssVal}"></span>` +
          `<span class="ads-preview__value">${esc(p.value)}</span>` +
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
