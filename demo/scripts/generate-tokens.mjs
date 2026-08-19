#!/usr/bin/env node
/**
 * Generates a large, realistic "Acme Design System" demo token set
 * in DTCG format for the ask-design-system demo.
 *
 * Run: node demo/scripts/generate-tokens.mjs
 * Output: demo/src/sample-tokens.json
 */

import { writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUTPUT = resolve(__dirname, '..', 'src', 'sample-tokens.json')

// ─── Color Ramps (Carbon-inspired, 10 steps per hue) ───────────────

const RAMPS = {
  blue:      ['#edf5ff','#d0e2ff','#a6c8ff','#78a9ff','#4589ff','#0f62fe','#0043ce','#002d9c','#001d6c','#001141'],
  teal:      ['#d9fbfb','#9ef0f0','#3ddbd9','#08bdba','#009d9a','#007d79','#005d5d','#004144','#022b30','#081a1c'],
  green:     ['#defbe6','#a7f0ba','#6fdc8c','#42be65','#24a148','#198038','#0e6027','#044317','#022d0d','#071908'],
  yellow:    ['#fcf4d6','#fddc69','#f1c21b','#d2a106','#b28600','#8e6a00','#684e00','#483700','#302400','#1c1500'],
  orange:    ['#fff2e8','#ffd8a8','#ffb784','#ff832b','#eb6200','#ba4e00','#8a3800','#5e2900','#3e1a00','#231000'],
  red:       ['#fff1f1','#ffd7d9','#ffb3b8','#ff8389','#fa4d56','#da1e28','#a2191f','#750e13','#520408','#2d0709'],
  magenta:   ['#fff0f7','#ffd6e8','#ffafd2','#ff7eb6','#ee5396','#d02670','#9f1853','#740937','#510224','#2a0a18'],
  purple:    ['#f6f2ff','#e8daff','#d4bbff','#be95ff','#a56eff','#8a3ffc','#6929c4','#491d8b','#31135e','#1c0f30'],
  cyan:      ['#e5f6ff','#bae6ff','#82cfff','#33b1ff','#1192e8','#0072c3','#00539a','#003a6d','#012749','#061727'],
  'warm-gray':['#f7f3f2','#e5e0df','#cac5c4','#ada8a8','#8f8b8b','#726e6e','#565151','#3c3838','#272525','#171414'],
  'cool-gray':['#f2f4f8','#dde1e6','#c1c7cd','#a2a9b0','#878d96','#697077','#4d5358','#343a3f','#21272a','#121619'],
  gray:      ['#f4f4f4','#e0e0e0','#c6c6c6','#a8a8a8','#8d8d8d','#6f6f6f','#525252','#393939','#262626','#161616'],
}

const STEP_LABELS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]

const HUE_DESC = {
  blue:       'Blue hue ramp. Primary brand and interactive colour family.',
  teal:       'Teal hue ramp. Used for data visualisation accents and secondary interactive elements.',
  green:      'Green hue ramp. Used for success states, positive indicators, and nature-related contexts.',
  yellow:     'Yellow hue ramp. Used for warning states, cautionary indicators, and attention-drawing elements.',
  orange:     'Orange hue ramp. Used for alert states and warm accent elements.',
  red:        'Red hue ramp. Used for error states, destructive actions, and critical alerts.',
  magenta:    'Magenta hue ramp. Used for expressive accents, highlights, and creative contexts.',
  purple:     'Purple hue ramp. Used for visited links, premium features, and decorative accents.',
  cyan:       'Cyan hue ramp. Used for informational states and cool accent elements.',
  'warm-gray':'Warm gray ramp with a slight red undertone. Used for backgrounds and neutral surfaces in warm palettes.',
  'cool-gray':'Cool gray ramp with a slight blue undertone. Used for backgrounds and neutral surfaces in cool palettes.',
  gray:       'Pure neutral gray ramp. Used for borders, disabled states, and structural UI elements.',
}

function stepDesc(hue, stepIdx) {
  const lightness = stepIdx < 3 ? 'light' : stepIdx < 5 ? 'mid-light' : stepIdx < 7 ? 'mid-dark' : 'dark'
  const step = STEP_LABELS[stepIdx]
  const wcag = step >= 60 ? 'Passes WCAG AA contrast on white backgrounds.' : 'Use on dark backgrounds for sufficient contrast.'
  return `${hue.charAt(0).toUpperCase() + hue.slice(1)} at step ${step}. A ${lightness} shade suitable for ${
    step <= 20 ? 'tinted backgrounds and subtle fills' :
    step <= 40 ? 'hover states and decorative borders' :
    step <= 60 ? 'primary interactive elements and icons' :
    step <= 80 ? 'text on light backgrounds and active states' :
    'high-contrast text and dark-mode surfaces'
  }. ${wcag}`
}

// ─── Build token tree ───────────────────────────────────────────────

const tokens = {}

// ── 1. Color Primitives ─────────────────────────────────────────────

tokens.color = { $type: 'color' }
tokens.color.primitive = { $description: 'Raw colour values. Reference these via semantic tokens, not directly in components.' }

// Add black/white
tokens.color.primitive.white = { $value: '#ffffff', $description: 'Pure white. Base for light-theme backgrounds and text on dark surfaces.' }
tokens.color.primitive.black = { $value: '#000000', $description: 'Pure black. Base for dark-theme backgrounds and highest-contrast text.' }

for (const [hue, values] of Object.entries(RAMPS)) {
  tokens.color.primitive[hue] = { $description: HUE_DESC[hue] }
  for (let i = 0; i < values.length; i++) {
    tokens.color.primitive[hue][STEP_LABELS[i]] = {
      $value: values[i],
      $description: stepDesc(hue, i),
    }
  }
}

// ── 2. Color Semantic ───────────────────────────────────────────────

const SEM_COLORS = {
  background: {
    $description: 'Page and region background colours.',
    default:  ['{color.primitive.white}', '#ffffff', 'Default page background. The base canvas for all content.'],
    subtle:   ['{color.primitive.cool-gray.10}', '#f2f4f8', 'Subtle background for secondary regions, sidebars, and alternating table rows.'],
    inverse:  ['{color.primitive.gray.100}', '#161616', 'Inverse background for dark sections, footer, and high-contrast containers.'],
    brand:    ['{color.primitive.blue.60}', '#0f62fe', 'Brand-coloured background for hero sections and promotional banners.'],
    overlay:  ['rgba(22, 22, 22, 0.5)', null, 'Semi-transparent overlay for modal backdrops and focus-trapping layers.'],
    hover:    ['{color.primitive.cool-gray.10}', '#f2f4f8', 'Hover state background for interactive rows and list items.'],
    active:   ['{color.primitive.cool-gray.20}', '#dde1e6', 'Active/pressed state background for interactive rows and list items.'],
    selected: ['{color.primitive.blue.10}', '#edf5ff', 'Selected state background for chosen items in lists, tables, and tree views.'],
    disabled: ['{color.primitive.gray.10}', '#f4f4f4', 'Background for disabled containers and inactive regions.'],
  },
  surface: {
    $description: 'Elevated surface colours for cards, panels, popovers, and modals.',
    default:  ['{color.primitive.white}', '#ffffff', 'Default surface. Cards, panels, and content containers at the base elevation.'],
    raised:   ['{color.primitive.white}', '#ffffff', 'Raised surface with shadow. Dropdowns, menus, and floating elements.'],
    overlay:  ['{color.primitive.white}', '#ffffff', 'Overlay surface for modals, dialogs, and side panels.'],
    sunken:   ['{color.primitive.cool-gray.10}', '#f2f4f8', 'Sunken surface for wells, inset regions, and code blocks.'],
  },
  text: {
    $description: 'Text and foreground colours for readability and hierarchy.',
    primary:      ['{color.primitive.gray.100}', '#161616', 'Primary text colour. Headings, body copy, and labels. Highest readability.'],
    secondary:    ['{color.primitive.gray.70}', '#525252', 'Secondary text for supporting content, captions, and metadata.'],
    placeholder:  ['{color.primitive.gray.50}', '#8d8d8d', 'Placeholder text in empty form fields. Meets WCAG AA for large text only.'],
    disabled:     ['{color.primitive.gray.30}', '#c6c6c6', 'Disabled text. Used with disabled backgrounds for reduced emphasis.'],
    'on-color':   ['{color.primitive.white}', '#ffffff', 'Text on coloured backgrounds (brand, interactive, status). Ensures contrast.'],
    inverse:      ['{color.primitive.white}', '#ffffff', 'Text on inverse/dark backgrounds. Headers and body in dark sections.'],
    link:         ['{color.primitive.blue.60}', '#0f62fe', 'Default link colour. Underlined text linking to another page or resource.'],
    'visited-link': ['{color.primitive.purple.60}', '#8a3ffc', 'Visited link colour. Indicates previously followed navigation.'],
  },
  border: {
    $description: 'Border colours for containers, dividers, and interactive outlines.',
    default:      ['{color.primitive.gray.30}', '#c6c6c6', 'Default border for cards, inputs, and container edges.'],
    subtle:       ['{color.primitive.gray.20}', '#e0e0e0', 'Subtle border for dividers, table cell borders, and low-emphasis separators.'],
    strong:       ['{color.primitive.gray.50}', '#8d8d8d', 'Strong border for high-emphasis containers and active inputs.'],
    interactive:  ['{color.primitive.blue.60}', '#0f62fe', 'Interactive border for focused or selected form elements.'],
    disabled:     ['{color.primitive.gray.20}', '#e0e0e0', 'Disabled border for inactive inputs and containers.'],
    error:        ['{color.primitive.red.60}', '#da1e28', 'Error border for invalid form fields and error states.'],
    success:      ['{color.primitive.green.60}', '#198038', 'Success border for validated form fields and positive states.'],
    warning:      ['{color.primitive.yellow.50}', '#b28600', 'Warning border for cautionary form fields and alerts.'],
    info:         ['{color.primitive.blue.50}', '#4589ff', 'Informational border for info banners and helper states.'],
    inverse:      ['{color.primitive.gray.80}', '#393939', 'Border colour on inverse/dark surfaces.'],
  },
  icon: {
    $description: 'Icon fill colours for system icons and pictograms.',
    primary:      ['{color.primitive.gray.100}', '#161616', 'Primary icon colour. Default for navigation icons and UI pictograms.'],
    secondary:    ['{color.primitive.gray.70}', '#525252', 'Secondary icon colour for supporting icons and non-critical indicators.'],
    disabled:     ['{color.primitive.gray.30}', '#c6c6c6', 'Disabled icon colour. Reduced emphasis for inactive controls.'],
    'on-color':   ['{color.primitive.white}', '#ffffff', 'Icon colour on coloured backgrounds. Buttons, badges, and status pills.'],
    interactive:  ['{color.primitive.blue.60}', '#0f62fe', 'Interactive icon colour for clickable icons and action triggers.'],
    success:      ['{color.primitive.green.60}', '#198038', 'Success icon for check marks, confirmations, and positive states.'],
    warning:      ['{color.primitive.yellow.60}', '#8e6a00', 'Warning icon for alert triangles and cautionary indicators.'],
    error:        ['{color.primitive.red.60}', '#da1e28', 'Error icon for cross marks, failures, and critical indicators.'],
    info:         ['{color.primitive.blue.50}', '#4589ff', 'Informational icon for info circles and helper indicators.'],
  },
  interactive: {
    $description: 'Colours for interactive elements: buttons, links, toggles.',
    primary:        ['{color.primitive.blue.60}', '#0f62fe', 'Primary interactive colour. Default state for primary buttons, toggles, and selection indicators.'],
    'primary-hover':['{color.primitive.blue.70}', '#0043ce', 'Primary interactive hover. Darkened for visual feedback on mouse-over.'],
    'primary-active':['{color.primitive.blue.80}',  '#002d9c', 'Primary interactive active/pressed state.'],
    secondary:        ['{color.primitive.gray.80}',  '#393939', 'Secondary interactive colour. Default for secondary buttons and less prominent actions.'],
    'secondary-hover':['{color.primitive.gray.70}',  '#525252', 'Secondary interactive hover state.'],
    'secondary-active':['{color.primitive.gray.60}', '#6f6f6f', 'Secondary interactive active/pressed state.'],
    danger:           ['{color.primitive.red.60}',    '#da1e28', 'Danger interactive colour. Destructive or irreversible actions.'],
    'danger-hover':   ['{color.primitive.red.70}',    '#a2191f', 'Danger interactive hover. Darkened red for delete/remove hover feedback.'],
    'danger-active':  ['{color.primitive.red.80}',    '#750e13', 'Danger interactive active/pressed state.'],
  },
  support: {
    $description: 'Semantic support colours for status communication: success, warning, error, informational.',
    success:      ['{color.primitive.green.60}', '#198038', 'Success colour for positive outcomes, confirmations, and completion indicators.'],
    warning:      ['{color.primitive.yellow.50}', '#b28600', 'Warning colour for cautionary messages and non-blocking alerts.'],
    error:        ['{color.primitive.red.60}', '#da1e28', 'Error colour for failures, validation errors, and destructive alerts.'],
    info:         ['{color.primitive.blue.50}', '#4589ff', 'Informational colour for tips, guidance, and neutral status messages.'],
    'success-subtle': ['{color.primitive.green.10}', '#defbe6', 'Subtle success background for inline notifications and banners.'],
    'warning-subtle': ['{color.primitive.yellow.10}', '#fcf4d6', 'Subtle warning background for inline notifications and banners.'],
    'error-subtle':   ['{color.primitive.red.10}', '#fff1f1', 'Subtle error background for inline notifications and banners.'],
    'info-subtle':    ['{color.primitive.blue.10}', '#edf5ff', 'Subtle informational background for inline notifications and banners.'],
  },
  focus: {
    $description: 'Focus ring colours for keyboard accessibility.',
    outline:  ['{color.primitive.blue.60}', '#0f62fe', 'Focus outline colour. Visible ring for keyboard-navigated elements. Meets WCAG 2.2 focus-visible requirements.'],
    inset:    ['{color.primitive.white}', '#ffffff', 'Inner focus ring (halo). Creates a two-tone focus indicator for contrast on any background.'],
  },
  brand: {
    $description: 'Brand identity colours for logos, marketing, and themed sections.',
    primary:   ['{color.primitive.blue.60}', '#0f62fe', 'Primary brand colour. The signature blue for logos, hero CTAs, and brand expressions.'],
    secondary: ['{color.primitive.teal.50}', '#009d9a', 'Secondary brand colour. Complementary teal for accents and brand pairings.'],
    tertiary:  ['{color.primitive.purple.50}', '#a56eff', 'Tertiary brand colour. Purple for premium features and creative sections.'],
  },
  highlight: {
    $description: 'Highlight colours for search results, selection, and emphasis.',
    default: ['{color.primitive.yellow.20}', '#fddc69', 'Default highlight for search-result matches and text selection.'],
    hover:   ['{color.primitive.yellow.10}', '#fcf4d6', 'Hover highlight for selectable search results and filter chips.'],
  },
  skeleton: {
    $description: 'Colours for skeleton/loading placeholder patterns.',
    background: ['{color.primitive.cool-gray.10}', '#f2f4f8', 'Skeleton background. Static base for shimmer loading animations.'],
    element:    ['{color.primitive.cool-gray.20}', '#dde1e6', 'Skeleton foreground. Animated shimmer stripe colour.'],
  },
}

tokens.color.semantic = { $description: 'Role-based colour aliases. Always reference these instead of primitives in application code.' }

for (const [group, entries] of Object.entries(SEM_COLORS)) {
  tokens.color.semantic[group] = {}
  if (entries.$description) {
    tokens.color.semantic[group].$description = entries.$description
  }
  for (const [name, spec] of Object.entries(entries)) {
    if (name.startsWith('$')) continue
    const [ref, resolved, desc] = spec
    const fullDesc = resolved ? `${desc} Resolved value: ${resolved}.` : desc
    tokens.color.semantic[group][name] = { $value: ref, $description: fullDesc }
  }
}

// ── 3. Typography ───────────────────────────────────────────────────

tokens.typography = {}

tokens.typography['font-family'] = {
  $type: 'fontFamily',
  $description: 'Available typeface stacks for headings, body, and code.',
  sans:  { $value: "'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif", $description: "Primary sans-serif typeface. Used for body text, UI labels, and most content. Designed for on-screen readability." },
  serif: { $value: "'IBM Plex Serif', Georgia, 'Times New Roman', serif", $description: "Serif typeface for editorial content, pull quotes, and long-form articles." },
  mono:  { $value: "'IBM Plex Mono', 'Fira Code', 'Courier New', monospace", $description: "Monospaced typeface for code snippets, terminal output, and technical data." },
}

const FONT_SIZES = [
  ['xs',  '0.75rem', 'Extra-small text (12px). Fine print, legal copy, and compact labels.'],
  ['sm',  '0.875rem', 'Small text (14px). Captions, helper text, and secondary labels.'],
  ['md',  '1rem', 'Base body text (16px). Paragraphs, list items, and form labels.'],
  ['lg',  '1.125rem', 'Large body text (18px). Lead paragraphs and emphasized content.'],
  ['xl',  '1.25rem', 'Extra-large text (20px). Sub-headings and prominent labels.'],
  ['2xl', '1.5rem', 'Display small (24px). Section headings and card titles.'],
  ['3xl', '1.875rem', 'Display medium (30px). Page headings and feature titles.'],
  ['4xl', '2.25rem', 'Display large (36px). Hero headings and primary page titles.'],
  ['5xl', '3rem', 'Display extra-large (48px). Marketing headlines and splash screens.'],
  ['6xl', '3.75rem', 'Display jumbo (60px). Billboard text and oversized hero headings.'],
]

tokens.typography['font-size'] = { $type: 'dimension', $description: 'Font size scale in rem, based on 16px root.' }
for (const [name, val, desc] of FONT_SIZES) {
  tokens.typography['font-size'][name] = { $value: val, $description: desc }
}

const FONT_WEIGHTS = [
  ['light', '300', 'Light weight. For large display text where a delicate appearance is desired.'],
  ['regular', '400', 'Regular weight. Default for body text and UI labels.'],
  ['medium', '500', 'Medium weight. Slightly bolder for emphasis in compact spaces.'],
  ['semibold', '600', 'Semibold weight. For sub-headings, table headers, and navigation items.'],
  ['bold', '700', 'Bold weight. For headings, CTAs, and strong emphasis.'],
]

tokens.typography['font-weight'] = { $description: 'Font weight scale from light to bold.' }
for (const [name, val, desc] of FONT_WEIGHTS) {
  tokens.typography['font-weight'][name] = { $value: val, $description: desc }
}

const LINE_HEIGHTS = [
  ['tight', '1.125', 'Tight line height. For headings and display text where vertical space is limited.'],
  ['snug', '1.25', 'Snug line height. For sub-headings and medium-length titles.'],
  ['normal', '1.5', 'Normal line height. Default for body text. Balances readability and density.'],
  ['relaxed', '1.625', 'Relaxed line height. For long-form reading and accessibility-sensitive contexts.'],
  ['loose', '2', 'Loose line height. For single-line labels with generous vertical padding.'],
]

tokens.typography['line-height'] = { $description: 'Line height scale for vertical rhythm and readability.' }
for (const [name, val, desc] of LINE_HEIGHTS) {
  tokens.typography['line-height'][name] = { $value: val, $description: desc }
}

const LETTER_SPACINGS = [
  ['tighter', '-0.02em', 'Tighter tracking. For large display headings where letters should optically close.'],
  ['tight', '-0.01em', 'Tight tracking. For headings and sub-headings.'],
  ['normal', '0em', 'Normal tracking. Default for body text.'],
  ['wide', '0.025em', 'Wide tracking. For all-caps labels, badges, and overline text.'],
  ['wider', '0.05em', 'Wider tracking. For spaced-out small-caps and brand wordmarks.'],
]

tokens.typography['letter-spacing'] = { $description: 'Letter spacing (tracking) scale.' }
for (const [name, val, desc] of LETTER_SPACINGS) {
  tokens.typography['letter-spacing'][name] = { $value: val, $description: desc }
}

// Composite type tokens (semantic tier for typography)
const TYPE_TOKENS = [
  ['heading-01', { fontSize: '{typography.font-size.6xl}', fontWeight: '{typography.font-weight.bold}', lineHeight: '{typography.line-height.tight}', letterSpacing: '{typography.letter-spacing.tighter}' }, 'Display heading level 1 (60px bold). Page hero headings and splash titles.'],
  ['heading-02', { fontSize: '{typography.font-size.5xl}', fontWeight: '{typography.font-weight.bold}', lineHeight: '{typography.line-height.tight}', letterSpacing: '{typography.letter-spacing.tighter}' }, 'Display heading level 2 (48px bold). Section hero headings.'],
  ['heading-03', { fontSize: '{typography.font-size.4xl}', fontWeight: '{typography.font-weight.bold}', lineHeight: '{typography.line-height.snug}', letterSpacing: '{typography.letter-spacing.tight}' }, 'Heading level 3 (36px bold). Primary page titles and feature headings.'],
  ['heading-04', { fontSize: '{typography.font-size.3xl}', fontWeight: '{typography.font-weight.semibold}', lineHeight: '{typography.line-height.snug}', letterSpacing: '{typography.letter-spacing.tight}' }, 'Heading level 4 (30px semibold). Section headings and card group titles.'],
  ['heading-05', { fontSize: '{typography.font-size.2xl}', fontWeight: '{typography.font-weight.semibold}', lineHeight: '{typography.line-height.snug}' }, 'Heading level 5 (24px semibold). Card titles and sub-section headings.'],
  ['heading-06', { fontSize: '{typography.font-size.xl}', fontWeight: '{typography.font-weight.semibold}', lineHeight: '{typography.line-height.normal}' }, 'Heading level 6 (20px semibold). Minor headings, list group titles.'],
  ['body-01', { fontSize: '{typography.font-size.md}', fontWeight: '{typography.font-weight.regular}', lineHeight: '{typography.line-height.normal}' }, 'Default body text (16px regular). Paragraphs, descriptions, and general content.'],
  ['body-02', { fontSize: '{typography.font-size.lg}', fontWeight: '{typography.font-weight.regular}', lineHeight: '{typography.line-height.relaxed}' }, 'Large body text (18px regular). Lead paragraphs and featured descriptions.'],
  ['body-compact-01', { fontSize: '{typography.font-size.sm}', fontWeight: '{typography.font-weight.regular}', lineHeight: '{typography.line-height.normal}' }, 'Compact body text (14px regular). Dense lists, table cells, and sidebar content.'],
  ['body-compact-02', { fontSize: '{typography.font-size.md}', fontWeight: '{typography.font-weight.regular}', lineHeight: '{typography.line-height.snug}' }, 'Compact body text (16px regular, snug). Data-dense layouts with reduced line height.'],
  ['label-01', { fontSize: '{typography.font-size.sm}', fontWeight: '{typography.font-weight.medium}', lineHeight: '{typography.line-height.tight}' }, 'Label text (14px medium). Form labels, chip text, and navigation items.'],
  ['label-02', { fontSize: '{typography.font-size.xs}', fontWeight: '{typography.font-weight.medium}', lineHeight: '{typography.line-height.tight}', letterSpacing: '{typography.letter-spacing.wide}' }, 'Small label/overline text (12px medium, wide tracking). Category tags, tab labels.'],
  ['caption-01', { fontSize: '{typography.font-size.xs}', fontWeight: '{typography.font-weight.regular}', lineHeight: '{typography.line-height.normal}' }, 'Caption text (12px regular). Image captions, timestamps, and helper text below form fields.'],
  ['code-01', { fontSize: '{typography.font-size.sm}', fontWeight: '{typography.font-weight.regular}', lineHeight: '{typography.line-height.relaxed}' }, 'Inline code text (14px regular, mono). Code snippets and terminal output. Pair with fontFamily.mono.'],
  ['legal-01', { fontSize: '{typography.font-size.xs}', fontWeight: '{typography.font-weight.regular}', lineHeight: '{typography.line-height.relaxed}' }, 'Legal/fine-print text (12px regular, relaxed). Terms, disclaimers, and footnotes.'],
]

tokens.typography.semantic = { $description: 'Composite type tokens bundling font size, weight, line height, and tracking into role-based presets.' }
for (const [name, composite, desc] of TYPE_TOKENS) {
  tokens.typography.semantic[name] = {
    $value: composite,
    $description: desc,
  }
}

// ── 4. Spacing ──────────────────────────────────────────────────────

const SPACE_SCALE = [
  ['01', '0.125rem', '2px. Micro spacing for tight icon gaps and hairline separators.'],
  ['02', '0.25rem',  '4px. Extra-small spacing for compact padding and icon-text gaps.'],
  ['03', '0.5rem',   '8px. Small spacing for internal padding and button icon gaps.'],
  ['04', '0.75rem',  '12px. Medium-small spacing for form field padding and list item gaps.'],
  ['05', '1rem',     '16px. Base spacing unit. Default padding, gap between related elements.'],
  ['06', '1.25rem',  '20px. Slightly above base. Padding for medium containers.'],
  ['07', '1.5rem',   '24px. Medium spacing for card padding and section gaps.'],
  ['08', '2rem',     '32px. Large spacing for section padding and major element gaps.'],
  ['09', '2.5rem',   '40px. Extra-large spacing for section breaks and hero padding.'],
  ['10', '3rem',     '48px. 2×Large spacing for page margins and major section gaps.'],
  ['11', '4rem',     '64px. 3×Large spacing for hero section padding and page-level gaps.'],
  ['12', '5rem',     '80px. Jumbo spacing for hero sections and splash layouts.'],
  ['13', '6rem',     '96px. Maximum spacing for full-bleed hero sections.'],
]

tokens.spacing = { $type: 'dimension', $description: 'Spacing scale based on a 0.25rem (4px) base unit.' }
tokens.spacing.primitive = { $description: 'Raw spacing values. Reference via semantic spacing tokens.' }
for (const [name, val, desc] of SPACE_SCALE) {
  tokens.spacing.primitive[name] = { $value: val, $description: desc }
}

// Semantic spacing
const SPACE_SEMANTIC = {
  inset: {
    $description: 'Equal padding on all four sides of a container.',
    xs: ['{spacing.primitive.02}', 'Extra-small inset (4px). Tight padding for tags, badges, and compact buttons.'],
    sm: ['{spacing.primitive.03}', 'Small inset (8px). Padding for input fields, small cards, and list items.'],
    md: ['{spacing.primitive.05}', 'Medium inset (16px). Default container padding for cards, panels, and modals.'],
    lg: ['{spacing.primitive.07}', 'Large inset (24px). Generous padding for large cards and feature sections.'],
    xl: ['{spacing.primitive.08}', 'Extra-large inset (32px). Roomy padding for hero sections and landing page blocks.'],
  },
  stack: {
    $description: 'Vertical spacing between stacked elements (margin-bottom or gap).',
    xs: ['{spacing.primitive.02}', 'Extra-small stack (4px). Gap between label and helper text.'],
    sm: ['{spacing.primitive.03}', 'Small stack (8px). Gap between related form fields.'],
    md: ['{spacing.primitive.05}', 'Medium stack (16px). Gap between content sections within a card.'],
    lg: ['{spacing.primitive.07}', 'Large stack (24px). Gap between distinct content blocks.'],
    xl: ['{spacing.primitive.10}', 'Extra-large stack (48px). Gap between major page sections.'],
  },
  inline: {
    $description: 'Horizontal spacing between inline elements (margin-right or gap).',
    xs: ['{spacing.primitive.02}', 'Extra-small inline (4px). Gap between icon and text in a button.'],
    sm: ['{spacing.primitive.03}', 'Small inline (8px). Gap between tag pills and inline actions.'],
    md: ['{spacing.primitive.05}', 'Medium inline (16px). Gap between toolbar actions and nav items.'],
    lg: ['{spacing.primitive.07}', 'Large inline (24px). Gap between card columns in a grid.'],
    xl: ['{spacing.primitive.08}', 'Extra-large inline (32px). Gap between major layout regions.'],
  },
  squish: {
    $description: 'Asymmetric padding: less vertical, more horizontal. For buttons and pills.',
    sm: ['{spacing.primitive.02}', 'Small squish vertical (4px). Pair with inline.sm for compact buttons.'],
    md: ['{spacing.primitive.03}', 'Medium squish vertical (8px). Pair with inline.md for standard buttons.'],
    lg: ['{spacing.primitive.04}', 'Large squish vertical (12px). Pair with inline.lg for large buttons.'],
  },
}

tokens.spacing.semantic = { $description: 'Role-based spacing tokens for consistent layout patterns.' }
for (const [group, entries] of Object.entries(SPACE_SEMANTIC)) {
  tokens.spacing.semantic[group] = {}
  if (entries.$description) tokens.spacing.semantic[group].$description = entries.$description
  for (const [name, spec] of Object.entries(entries)) {
    if (name.startsWith('$')) continue
    const [ref, desc] = spec
    tokens.spacing.semantic[group][name] = { $value: ref, $description: desc }
  }
}

// ── 5. Border ───────────────────────────────────────────────────────

tokens.border = { $description: 'Border width and radius tokens for containers, inputs, and interactive elements.' }

tokens.border.width = {
  $type: 'dimension',
  $description: 'Border width scale.',
  thin:    { $value: '1px', $description: 'Thin border (1px). Default for cards, inputs, and dividers.' },
  default: { $value: '1.5px', $description: 'Default border (1.5px). Slightly heavier for interactive elements at rest.' },
  thick:   { $value: '2px', $description: 'Thick border (2px). For focused inputs, active tabs, and selected items.' },
  thicker: { $value: '3px', $description: 'Thicker border (3px). For heavy emphasis, progress indicators, and underline navigation.' },
}

tokens.border.radius = {
  $type: 'dimension',
  $description: 'Border radius scale from sharp to fully rounded.',
  none: { $value: '0', $description: 'No radius. Sharp corners for minimal, editorial designs.' },
  sm:   { $value: '0.25rem', $description: 'Small radius (4px). Subtle rounding for buttons and inputs.' },
  md:   { $value: '0.5rem', $description: 'Medium radius (8px). Standard rounding for cards and containers.' },
  lg:   { $value: '0.75rem', $description: 'Large radius (12px). Generous rounding for modals and large cards.' },
  xl:   { $value: '1rem', $description: 'Extra-large radius (16px). Heavy rounding for panels and hero elements.' },
  full: { $value: '9999px', $description: 'Fully rounded (pill shape). For avatar circles, tag pills, and toggle handles.' },
}

// ── 6. Shadow / Elevation ───────────────────────────────────────────

tokens.shadow = { $type: 'shadow', $description: 'Elevation shadow scale. Higher numbers = more perceived depth.' }

tokens.shadow.primitive = {
  $description: 'Raw shadow values at fixed elevation levels.',
  '01': { $value: '0 1px 2px rgba(0,0,0,0.05)', $description: 'Elevation 1 (subtle). Barely visible lift for cards at rest.' },
  '02': { $value: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)', $description: 'Elevation 2. Light shadow for raised buttons and clickable cards.' },
  '03': { $value: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)', $description: 'Elevation 3. Medium shadow for dropdowns and menus.' },
  '04': { $value: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)', $description: 'Elevation 4. Pronounced shadow for floating panels and dialogs.' },
  '05': { $value: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)', $description: 'Elevation 5. Deep shadow for modals and side drawers.' },
  '06': { $value: '0 25px 50px -12px rgba(0,0,0,0.25)', $description: 'Elevation 6 (maximum). Ultra-deep shadow for full-screen overlays.' },
}

tokens.shadow.semantic = {
  $description: 'Role-based shadow aliases for common UI patterns.',
  raised:    { $value: '{shadow.primitive.02}', $description: 'Shadow for raised surfaces: cards, buttons, and selectable tiles.' },
  overlay:   { $value: '{shadow.primitive.04}', $description: 'Shadow for overlay surfaces: dropdowns, context menus, and popovers.' },
  sticky:    { $value: '{shadow.primitive.03}', $description: 'Shadow for sticky elements: fixed headers and bottom navigation bars.' },
  temporary: { $value: '{shadow.primitive.05}', $description: 'Shadow for temporary surfaces: modals, dialogs, and side panels.' },
  popout:    { $value: '{shadow.primitive.06}', $description: 'Shadow for popout surfaces: full-screen overlays and lightboxes.' },
}

// ── 7. Motion / Transition ──────────────────────────────────────────

tokens.motion = { $description: 'Duration and easing tokens for animations and transitions. Always respect prefers-reduced-motion.' }

tokens.motion.duration = {
  $type: 'duration',
  $description: 'Transition duration scale from instant to slow.',
  instant:     { $value: '50ms', $description: 'Instant (50ms). Colour changes, opacity toggles. Imperceptible delay.' },
  'fast-01':   { $value: '100ms', $description: 'Fast tier 1 (100ms). Micro-interactions: button feedback, icon swap.' },
  'fast-02':   { $value: '150ms', $description: 'Fast tier 2 (150ms). Small UI transitions: tooltip show, focus ring.' },
  'moderate-01': { $value: '200ms', $description: 'Moderate tier 1 (200ms). Standard transitions: menu open, tab switch.' },
  'moderate-02': { $value: '300ms', $description: 'Moderate tier 2 (300ms). Content transitions: card expand, accordion.' },
  'slow-01':   { $value: '400ms', $description: 'Slow tier 1 (400ms). Large transitions: modal enter, drawer slide.' },
  'slow-02':   { $value: '500ms', $description: 'Slow tier 2 (500ms). Complex choreography: page transition, multi-step animation.' },
}

tokens.motion.easing = {
  $description: 'Cubic-bezier easing curves for productive and expressive motion styles.',
  'productive-standard':  { $value: 'cubic-bezier(0.2, 0, 0.38, 0.9)', $description: 'Productive standard easing. Default for most UI transitions — efficient and unobtrusive.' },
  'productive-entrance':  { $value: 'cubic-bezier(0, 0, 0.38, 0.9)', $description: 'Productive entrance easing. For elements entering the viewport: fade-in, slide-in.' },
  'productive-exit':      { $value: 'cubic-bezier(0.2, 0, 1, 0.9)', $description: 'Productive exit easing. For elements leaving the viewport: fade-out, slide-out.' },
  'expressive-standard':  { $value: 'cubic-bezier(0.4, 0.14, 0.3, 1)', $description: 'Expressive standard easing. Playful, bouncy motion for marketing and creative contexts.' },
  'expressive-entrance':  { $value: 'cubic-bezier(0, 0, 0.3, 1)', $description: 'Expressive entrance easing. Dramatic entry for hero elements and celebration animations.' },
  'expressive-exit':      { $value: 'cubic-bezier(0.4, 0.14, 1, 1)', $description: 'Expressive exit easing. Energetic departure for dismissed elements.' },
}

// ── 8. Focus ────────────────────────────────────────────────────────

tokens.focus = { $description: 'Focus indicator tokens for keyboard navigation accessibility. Two-tone ring pattern ensures visibility on any background.' }

tokens.focus['ring-color']  = { $type: 'color', $value: '{color.semantic.focus.outline}', $description: 'Focus ring colour. The outer indicator ring visible during keyboard navigation. Matches the interactive blue.' }
tokens.focus['ring-width']  = { $type: 'dimension', $value: '2px', $description: 'Focus ring width. A 2px outline meets WCAG 2.2 focus indicator minimum area requirements.' }
tokens.focus['ring-offset'] = { $type: 'dimension', $value: '2px', $description: 'Focus ring offset. Gap between the element edge and the focus ring, creating a halo effect.' }
tokens.focus['inset-color'] = { $type: 'color', $value: '{color.semantic.focus.inset}', $description: 'Inner focus halo colour. White ring between the element and the outer focus ring for contrast.' }
tokens.focus['inset-width'] = { $type: 'dimension', $value: '1px', $description: 'Inner focus halo width. Thin white ring for two-tone focus visibility.' }
tokens.focus['outline-style'] = { $value: 'solid', $description: 'Focus ring outline style. Always solid for maximum visibility and consistency.' }

// ── 9. Layout / Grid ────────────────────────────────────────────────

tokens.layout = { $description: 'Layout, grid, breakpoint, and z-index tokens for responsive design.' }

tokens.layout.breakpoint = {
  $type: 'dimension',
  $description: 'Responsive breakpoints. Mobile-first: apply styles at and above each breakpoint.',
  sm:  { $value: '640px', $description: 'Small breakpoint (640px). Large phones in landscape and small tablets.' },
  md:  { $value: '768px', $description: 'Medium breakpoint (768px). Tablets in portrait and small laptops.' },
  lg:  { $value: '1024px', $description: 'Large breakpoint (1024px). Tablets in landscape and standard laptops.' },
  xl:  { $value: '1280px', $description: 'Extra-large breakpoint (1280px). Desktop monitors and wide laptops.' },
  '2xl': { $value: '1536px', $description: 'Double extra-large breakpoint (1536px). Large desktop monitors and ultrawide displays.' },
}

tokens.layout.container = {
  $type: 'dimension',
  $description: 'Maximum container widths per breakpoint tier.',
  sm:  { $value: '640px', $description: 'Small container max width (640px). Content within the sm breakpoint.' },
  md:  { $value: '768px', $description: 'Medium container max width (768px). Content within the md breakpoint.' },
  lg:  { $value: '1024px', $description: 'Large container max width (1024px). Content within the lg breakpoint.' },
  xl:  { $value: '1280px', $description: 'Extra-large container max width (1280px). Centered content on wide screens.' },
  '2xl': { $value: '1440px', $description: 'Maximum container width (1440px). Content max-width on ultrawide screens.' },
}

tokens.layout.columns = {
  $description: 'Column counts for responsive grid layouts.',
  sm: { $value: '4', $description: 'Small grid: 4 columns. Mobile and small tablet layouts.' },
  md: { $value: '8', $description: 'Medium grid: 8 columns. Tablet and narrow desktop layouts.' },
  lg: { $value: '12', $description: 'Large grid: 12 columns. Standard desktop layouts.' },
  xl: { $value: '16', $description: 'Extra-large grid: 16 columns. Wide desktop and dashboard layouts.' },
}

tokens.layout.gutter = {
  $type: 'dimension',
  $description: 'Grid gutter (gap) sizes between columns.',
  sm: { $value: '{spacing.primitive.05}', $description: 'Small gutter (16px). Compact layouts and mobile grids.' },
  md: { $value: '{spacing.primitive.07}', $description: 'Medium gutter (24px). Standard desktop grids.' },
  lg: { $value: '{spacing.primitive.08}', $description: 'Large gutter (32px). Spacious layouts and feature grids.' },
}

tokens.layout['z-index'] = {
  $description: 'Z-index stacking order. Use these tokens instead of arbitrary numbers.',
  base:       { $value: '0', $description: 'Base stacking level. Default for positioned elements.' },
  dropdown:   { $value: '1000', $description: 'Dropdown menus, select lists, and autocomplete panels.' },
  sticky:     { $value: '1100', $description: 'Sticky headers, fixed sidebars, and persistent navigation.' },
  fixed:      { $value: '1200', $description: 'Fixed position elements like floating action buttons.' },
  'modal-backdrop': { $value: '1300', $description: 'Modal backdrop overlay. Sits behind the modal content.' },
  modal:      { $value: '1400', $description: 'Modal dialog content. Above the backdrop.' },
  popover:    { $value: '1500', $description: 'Popover panels and context menus. Above modals when nested.' },
  tooltip:    { $value: '1600', $description: 'Tooltips. Highest interactive layer, always visible on hover/focus.' },
  toast:      { $value: '1700', $description: 'Toast notifications. Top-most layer for time-sensitive alerts.' },
}

// ── 10. Opacity ─────────────────────────────────────────────────────

tokens.opacity = {
  $description: 'Opacity tokens for disabled states, overlays, and hover feedback.',
  disabled: { $value: '0.4', $description: 'Disabled element opacity (40%). Reduces visual prominence of inactive controls.' },
  'hover-overlay': { $value: '0.08', $description: 'Hover overlay opacity (8%). Subtle darkening on interactive surfaces.' },
  'active-overlay': { $value: '0.12', $description: 'Active/pressed overlay opacity (12%). Slightly stronger than hover.' },
  backdrop: { $value: '0.5', $description: 'Backdrop overlay opacity (50%). For modal and drawer backdrops.' },
}

// ── 11. Component Tokens ────────────────────────────────────────────

const COMPONENTS = {
  button: {
    desc: 'Button component tokens. Covers primary, secondary, ghost, and danger variants across all interaction states.',
    variants: {
      primary: {
        'bg-default':      ['{color.semantic.interactive.primary}', 'Primary button default background. Solid blue call-to-action surface.'],
        'bg-hover':        ['{color.semantic.interactive.primary-hover}', 'Primary button hover background. Darkened blue on mouse-over.'],
        'bg-active':       ['{color.semantic.interactive.primary-active}', 'Primary button active/pressed background.'],
        'bg-disabled':     ['{color.semantic.background.disabled}', 'Primary button disabled background. Neutral inactive surface.'],
        'text-default':    ['{color.semantic.text.on-color}', 'Primary button text. White on blue for maximum contrast.'],
        'text-disabled':   ['{color.semantic.text.disabled}', 'Primary button disabled text. Low contrast on neutral background.'],
        'border-default':  ['transparent', 'Primary button border. Transparent — uses background colour only.'],
        'border-focus':    ['{color.semantic.focus.outline}', 'Primary button focus border.'],
        'icon-default':    ['{color.semantic.icon.on-color}', 'Primary button icon colour. White to match text.'],
      },
      secondary: {
        'bg-default':      ['{color.semantic.interactive.secondary}', 'Secondary button default background. Dark gray for prominent but non-primary actions.'],
        'bg-hover':        ['{color.semantic.interactive.secondary-hover}', 'Secondary button hover background.'],
        'bg-active':       ['{color.semantic.interactive.secondary-active}', 'Secondary button active/pressed background.'],
        'bg-disabled':     ['{color.semantic.background.disabled}', 'Secondary button disabled background.'],
        'text-default':    ['{color.semantic.text.on-color}', 'Secondary button text. White on dark gray.'],
        'text-disabled':   ['{color.semantic.text.disabled}', 'Secondary button disabled text.'],
        'border-default':  ['transparent', 'Secondary button border. Transparent — uses background colour.'],
        'border-focus':    ['{color.semantic.focus.outline}', 'Secondary button focus border.'],
        'icon-default':    ['{color.semantic.icon.on-color}', 'Secondary button icon colour.'],
      },
      ghost: {
        'bg-default':      ['transparent', 'Ghost button default background. Transparent for minimal visual weight.'],
        'bg-hover':        ['{color.semantic.background.hover}', 'Ghost button hover background. Subtle fill on hover.'],
        'bg-active':       ['{color.semantic.background.active}', 'Ghost button active background.'],
        'bg-disabled':     ['transparent', 'Ghost button disabled background. Remains transparent.'],
        'text-default':    ['{color.semantic.interactive.primary}', 'Ghost button text. Blue to indicate interactivity.'],
        'text-hover':      ['{color.semantic.interactive.primary-hover}', 'Ghost button hover text.'],
        'text-disabled':   ['{color.semantic.text.disabled}', 'Ghost button disabled text.'],
        'border-default':  ['transparent', 'Ghost button border. No visible border.'],
        'border-focus':    ['{color.semantic.focus.outline}', 'Ghost button focus border.'],
        'icon-default':    ['{color.semantic.interactive.primary}', 'Ghost button icon colour. Matches text.'],
      },
      danger: {
        'bg-default':      ['{color.semantic.interactive.danger}', 'Danger button default background. Red for destructive actions like delete.'],
        'bg-hover':        ['{color.semantic.interactive.danger-hover}', 'Danger button hover background.'],
        'bg-active':       ['{color.semantic.interactive.danger-active}', 'Danger button active/pressed background.'],
        'bg-disabled':     ['{color.semantic.background.disabled}', 'Danger button disabled background.'],
        'text-default':    ['{color.semantic.text.on-color}', 'Danger button text. White on red.'],
        'text-disabled':   ['{color.semantic.text.disabled}', 'Danger button disabled text.'],
        'border-default':  ['transparent', 'Danger button border. Transparent — uses background colour.'],
        'border-focus':    ['{color.semantic.focus.outline}', 'Danger button focus border.'],
        'icon-default':    ['{color.semantic.icon.on-color}', 'Danger button icon colour.'],
      },
    },
    sizing: {
      'padding-x-sm': ['{spacing.semantic.squish.sm}', 'Small button horizontal padding.'],
      'padding-y-sm': ['{spacing.primitive.02}', 'Small button vertical padding.'],
      'padding-x-md': ['{spacing.semantic.squish.md}', 'Medium button horizontal padding.'],
      'padding-y-md': ['{spacing.primitive.03}', 'Medium button vertical padding.'],
      'padding-x-lg': ['{spacing.semantic.squish.lg}', 'Large button horizontal padding.'],
      'padding-y-lg': ['{spacing.primitive.04}', 'Large button vertical padding.'],
      'border-radius': ['{border.radius.sm}', 'Button border radius. Subtle rounding.'],
      'border-width':  ['{border.width.thin}', 'Button border width.'],
      'font-size':     ['{typography.font-size.sm}', 'Button font size (14px).'],
      'font-weight':   ['{typography.font-weight.semibold}', 'Button font weight (semibold).'],
      'line-height':   ['{typography.line-height.tight}', 'Button line height. Tight for single-line labels.'],
      'icon-size-sm':  ['16px', 'Small button icon size.'],
      'icon-size-md':  ['20px', 'Medium button icon size.'],
      'icon-size-lg':  ['24px', 'Large button icon size.'],
      'gap':           ['{spacing.primitive.02}', 'Gap between button icon and label text.'],
    },
  },
  input: {
    desc: 'Text input and textarea component tokens. Covers default, focus, error, disabled, and read-only states.',
    variants: {
      color: {
        'bg-default':        ['{color.primitive.white}', 'Input default background. Clean white surface.'],
        'bg-hover':          ['{color.semantic.background.hover}', 'Input hover background. Subtle fill change.'],
        'bg-disabled':       ['{color.semantic.background.disabled}', 'Input disabled background. Muted gray.'],
        'bg-read-only':      ['{color.semantic.surface.sunken}', 'Input read-only background. Sunken to indicate non-editable.'],
        'text-default':      ['{color.semantic.text.primary}', 'Input text colour. Primary black for typed content.'],
        'text-placeholder':  ['{color.semantic.text.placeholder}', 'Input placeholder text colour. Muted gray.'],
        'text-disabled':     ['{color.semantic.text.disabled}', 'Input disabled text colour.'],
        'border-default':    ['{color.semantic.border.default}', 'Input default border. Visible gray outline.'],
        'border-hover':      ['{color.semantic.border.strong}', 'Input hover border. Stronger gray on mouse-over.'],
        'border-focus':      ['{color.semantic.border.interactive}', 'Input focus border. Blue to indicate active editing.'],
        'border-error':      ['{color.semantic.border.error}', 'Input error border. Red for validation failures.'],
        'border-success':    ['{color.semantic.border.success}', 'Input success/valid border. Green for confirmed valid input.'],
        'border-disabled':   ['{color.semantic.border.disabled}', 'Input disabled border. Faint gray.'],
        'label-default':     ['{color.semantic.text.primary}', 'Input label text colour.'],
        'label-disabled':    ['{color.semantic.text.disabled}', 'Input disabled label colour.'],
        'helper-default':    ['{color.semantic.text.secondary}', 'Input helper text colour. Secondary gray.'],
        'helper-error':      ['{color.semantic.support.error}', 'Input error helper text. Red for error messages.'],
        'icon-default':      ['{color.semantic.icon.secondary}', 'Input trailing/leading icon colour.'],
        'icon-error':        ['{color.semantic.icon.error}', 'Input error icon colour.'],
      },
    },
    sizing: {
      'padding-x':      ['{spacing.semantic.inset.sm}', 'Input horizontal padding (8px).'],
      'padding-y':      ['{spacing.primitive.03}', 'Input vertical padding (8px).'],
      'border-radius':  ['{border.radius.sm}', 'Input border radius (4px).'],
      'border-width':   ['{border.width.thin}', 'Input default border width.'],
      'border-width-focus': ['{border.width.thick}', 'Input focus border width (2px). Thicker for visibility.'],
      'font-size':      ['{typography.font-size.md}', 'Input text font size (16px). Prevents iOS zoom.'],
      'line-height':    ['{typography.line-height.normal}', 'Input text line height.'],
      'min-height':     ['2.5rem', 'Input minimum height (40px).'],
      'label-gap':      ['{spacing.semantic.stack.xs}', 'Gap between label and input field (4px).'],
      'helper-gap':     ['{spacing.semantic.stack.xs}', 'Gap between input field and helper text (4px).'],
    },
  },
  checkbox: {
    desc: 'Checkbox component tokens. Covers unchecked, checked, indeterminate, focus, and disabled states.',
    variants: {
      color: {
        'bg-unchecked':      ['{color.primitive.white}', 'Checkbox unchecked background. Empty white box.'],
        'bg-checked':        ['{color.semantic.interactive.primary}', 'Checkbox checked background. Blue filled box with checkmark.'],
        'bg-indeterminate':  ['{color.semantic.interactive.primary}', 'Checkbox indeterminate background. Blue with dash icon.'],
        'bg-disabled':       ['{color.semantic.background.disabled}', 'Checkbox disabled background.'],
        'border-unchecked':  ['{color.semantic.border.strong}', 'Checkbox unchecked border. Visible gray outline.'],
        'border-checked':    ['{color.semantic.interactive.primary}', 'Checkbox checked border. Matches background.'],
        'border-hover':      ['{color.semantic.interactive.primary-hover}', 'Checkbox hover border. Darkened blue preview.'],
        'border-focus':      ['{color.semantic.focus.outline}', 'Checkbox focus ring colour.'],
        'border-error':      ['{color.semantic.border.error}', 'Checkbox error border for required/unchecked validation.'],
        'border-disabled':   ['{color.semantic.border.disabled}', 'Checkbox disabled border.'],
        'check-color':       ['{color.semantic.icon.on-color}', 'Checkmark icon colour. White on blue background.'],
        'label-default':     ['{color.semantic.text.primary}', 'Checkbox label text colour.'],
        'label-disabled':    ['{color.semantic.text.disabled}', 'Checkbox disabled label colour.'],
      },
    },
    sizing: {
      'size':           ['1.25rem', 'Checkbox box size (20px).'],
      'border-radius':  ['{border.radius.sm}', 'Checkbox border radius (4px). Slightly rounded square.'],
      'border-width':   ['{border.width.default}', 'Checkbox border width.'],
      'label-gap':      ['{spacing.primitive.03}', 'Gap between checkbox and label text (8px).'],
      'focus-offset':   ['{focus.ring-offset}', 'Checkbox focus ring offset.'],
    },
  },
  modal: {
    desc: 'Modal/dialog component tokens. Covers the overlay backdrop, content surface, header, body, and footer regions.',
    variants: {
      color: {
        'backdrop':          ['{color.semantic.background.overlay}', 'Modal backdrop overlay colour. Semi-transparent dark.'],
        'surface':           ['{color.semantic.surface.overlay}', 'Modal content surface. White panel floating above backdrop.'],
        'header-text':       ['{color.semantic.text.primary}', 'Modal header/title text colour.'],
        'body-text':         ['{color.semantic.text.secondary}', 'Modal body text colour. Secondary for descriptions.'],
        'border':            ['{color.semantic.border.subtle}', 'Modal internal divider border between header, body, and footer.'],
        'close-icon':        ['{color.semantic.icon.secondary}', 'Modal close button icon colour.'],
        'close-icon-hover':  ['{color.semantic.icon.primary}', 'Modal close button hover icon colour.'],
      },
    },
    sizing: {
      'width-sm':        ['28rem', 'Small modal width (448px). Confirmations and simple dialogs.'],
      'width-md':        ['36rem', 'Medium modal width (576px). Forms and detail views.'],
      'width-lg':        ['48rem', 'Large modal width (768px). Complex forms and data tables.'],
      'padding':         ['{spacing.semantic.inset.lg}', 'Modal content padding (24px).'],
      'header-padding':  ['{spacing.semantic.inset.md}', 'Modal header padding (16px).'],
      'footer-padding':  ['{spacing.semantic.inset.md}', 'Modal footer padding (16px).'],
      'border-radius':   ['{border.radius.lg}', 'Modal border radius (12px).'],
      'shadow':          ['{shadow.semantic.temporary}', 'Modal shadow. Deep shadow for floating panel.'],
      'gap':             ['{spacing.semantic.stack.md}', 'Gap between modal sections (16px).'],
      'z-index':         ['{layout.z-index.modal}', 'Modal z-index stacking level.'],
    },
  },
  tooltip: {
    desc: 'Tooltip component tokens. Small floating labels that appear on hover or focus to explain UI elements.',
    variants: {
      color: {
        'bg':        ['{color.semantic.background.inverse}', 'Tooltip background. Dark surface for contrast against page.'],
        'text':      ['{color.semantic.text.inverse}', 'Tooltip text colour. White on dark background.'],
        'border':    ['{color.semantic.border.inverse}', 'Tooltip border. Subtle edge definition on dark surface.'],
      },
    },
    sizing: {
      'padding-x':      ['{spacing.primitive.03}', 'Tooltip horizontal padding (8px).'],
      'padding-y':      ['{spacing.primitive.02}', 'Tooltip vertical padding (4px).'],
      'border-radius':  ['{border.radius.sm}', 'Tooltip border radius (4px).'],
      'font-size':      ['{typography.font-size.xs}', 'Tooltip font size (12px). Compact label text.'],
      'max-width':      ['16rem', 'Tooltip max width (256px). Wraps for longer labels.'],
      'arrow-size':     ['6px', 'Tooltip arrow/caret size.'],
      'offset':         ['{spacing.primitive.02}', 'Tooltip offset from trigger element (4px).'],
      'shadow':         ['{shadow.semantic.overlay}', 'Tooltip shadow.'],
      'z-index':        ['{layout.z-index.tooltip}', 'Tooltip z-index stacking level.'],
    },
  },
  tag: {
    desc: 'Tag/badge component tokens. Compact labels for categories, statuses, and counts.',
    variants: {
      color: {
        'bg-default':    ['{color.semantic.surface.sunken}', 'Default tag background. Neutral gray for generic labels.'],
        'bg-blue':       ['{color.primitive.blue.10}', 'Blue tag background. Informational or category label.'],
        'bg-green':      ['{color.primitive.green.10}', 'Green tag background. Success or positive status.'],
        'bg-yellow':     ['{color.primitive.yellow.10}', 'Yellow tag background. Warning or pending status.'],
        'bg-red':        ['{color.primitive.red.10}', 'Red tag background. Error, critical, or removed status.'],
        'bg-purple':     ['{color.primitive.purple.10}', 'Purple tag background. Premium or special category.'],
        'bg-teal':       ['{color.primitive.teal.10}', 'Teal tag background. Data or metric category.'],
        'text-default':  ['{color.semantic.text.secondary}', 'Default tag text colour.'],
        'text-blue':     ['{color.primitive.blue.80}', 'Blue tag text colour.'],
        'text-green':    ['{color.primitive.green.80}', 'Green tag text colour.'],
        'text-yellow':   ['{color.primitive.yellow.80}', 'Yellow tag text colour.'],
        'text-red':      ['{color.primitive.red.80}', 'Red tag text colour.'],
        'text-purple':   ['{color.primitive.purple.80}', 'Purple tag text colour.'],
        'text-teal':     ['{color.primitive.teal.80}', 'Teal tag text colour.'],
        'border-default':['{color.semantic.border.subtle}', 'Default tag border.'],
        'close-icon':    ['{color.semantic.icon.secondary}', 'Tag dismiss/close icon colour.'],
        'close-icon-hover': ['{color.semantic.icon.primary}', 'Tag dismiss icon hover colour.'],
      },
    },
    sizing: {
      'padding-x':      ['{spacing.primitive.03}', 'Tag horizontal padding (8px).'],
      'padding-y':      ['{spacing.primitive.01}', 'Tag vertical padding (2px).'],
      'border-radius':  ['{border.radius.full}', 'Tag border radius (pill shape).'],
      'font-size':      ['{typography.font-size.xs}', 'Tag font size (12px).'],
      'font-weight':    ['{typography.font-weight.medium}', 'Tag font weight (medium).'],
      'gap':            ['{spacing.primitive.02}', 'Gap between tag text and dismiss icon (4px).'],
      'close-size':     ['12px', 'Tag dismiss icon size.'],
    },
  },
  tabs: {
    desc: 'Tab navigation component tokens. Horizontal or vertical tab sets for switching between views.',
    variants: {
      color: {
        'bg-default':        ['transparent', 'Tab default background. Transparent at rest.'],
        'bg-hover':          ['{color.semantic.background.hover}', 'Tab hover background.'],
        'bg-selected':       ['transparent', 'Selected tab background. Transparent — uses border indicator.'],
        'bg-disabled':       ['transparent', 'Disabled tab background.'],
        'text-default':      ['{color.semantic.text.secondary}', 'Tab default text colour. Secondary emphasis.'],
        'text-hover':        ['{color.semantic.text.primary}', 'Tab hover text colour. Promoted to primary.'],
        'text-selected':     ['{color.semantic.text.primary}', 'Selected tab text colour. Primary emphasis.'],
        'text-disabled':     ['{color.semantic.text.disabled}', 'Disabled tab text colour.'],
        'border-default':    ['{color.semantic.border.subtle}', 'Tab list bottom border. Continuous line beneath all tabs.'],
        'border-selected':   ['{color.semantic.interactive.primary}', 'Selected tab indicator border. Blue underline.'],
        'border-focus':      ['{color.semantic.focus.outline}', 'Tab focus indicator.'],
        'icon-default':      ['{color.semantic.icon.secondary}', 'Tab icon colour at rest.'],
        'icon-selected':     ['{color.semantic.icon.primary}', 'Selected tab icon colour.'],
      },
    },
    sizing: {
      'padding-x':       ['{spacing.semantic.inset.md}', 'Tab horizontal padding (16px).'],
      'padding-y':       ['{spacing.primitive.03}', 'Tab vertical padding (8px).'],
      'gap':             ['{spacing.primitive.01}', 'Gap between tabs (2px).'],
      'border-width':    ['{border.width.thick}', 'Selected tab indicator thickness (2px).'],
      'font-size':       ['{typography.font-size.sm}', 'Tab label font size (14px).'],
      'font-weight':     ['{typography.font-weight.semibold}', 'Selected tab font weight.'],
      'icon-size':       ['16px', 'Tab icon size.'],
      'icon-gap':        ['{spacing.primitive.02}', 'Gap between tab icon and label (4px).'],
    },
  },
  notification: {
    desc: 'Notification/toast component tokens. Inline or floating messages for success, warning, error, and info feedback.',
    variants: {
      color: {
        'bg-success':    ['{color.semantic.support.success-subtle}', 'Success notification background. Light green.'],
        'bg-warning':    ['{color.semantic.support.warning-subtle}', 'Warning notification background. Light yellow.'],
        'bg-error':      ['{color.semantic.support.error-subtle}', 'Error notification background. Light red.'],
        'bg-info':       ['{color.semantic.support.info-subtle}', 'Info notification background. Light blue.'],
        'text-success':  ['{color.primitive.green.90}', 'Success notification text colour. Dark green.'],
        'text-warning':  ['{color.primitive.yellow.90}', 'Warning notification text colour. Dark yellow.'],
        'text-error':    ['{color.primitive.red.90}', 'Error notification text colour. Dark red.'],
        'text-info':     ['{color.primitive.blue.90}', 'Info notification text colour. Dark blue.'],
        'icon-success':  ['{color.semantic.icon.success}', 'Success notification icon colour.'],
        'icon-warning':  ['{color.semantic.icon.warning}', 'Warning notification icon colour.'],
        'icon-error':    ['{color.semantic.icon.error}', 'Error notification icon colour.'],
        'icon-info':     ['{color.semantic.icon.info}', 'Info notification icon colour.'],
        'border-success':['{color.semantic.border.success}', 'Success notification accent border.'],
        'border-warning':['{color.semantic.border.warning}', 'Warning notification accent border.'],
        'border-error':  ['{color.semantic.border.error}', 'Error notification accent border.'],
        'border-info':   ['{color.semantic.border.info}', 'Info notification accent border.'],
        'close-icon':    ['{color.semantic.icon.secondary}', 'Notification dismiss button icon colour.'],
        'close-hover':   ['{color.semantic.icon.primary}', 'Notification dismiss button hover icon colour.'],
      },
    },
    sizing: {
      'padding':        ['{spacing.semantic.inset.md}', 'Notification content padding (16px).'],
      'border-radius':  ['{border.radius.md}', 'Notification border radius (8px).'],
      'border-width':   ['{border.width.thick}', 'Notification accent border width (left stripe).'],
      'icon-size':      ['20px', 'Notification status icon size.'],
      'gap':            ['{spacing.primitive.03}', 'Gap between icon and notification text (8px).'],
      'shadow':         ['{shadow.semantic.raised}', 'Toast notification shadow (floating variant).'],
      'z-index':        ['{layout.z-index.toast}', 'Toast notification z-index.'],
      'max-width':      ['28rem', 'Toast notification max width (448px).'],
    },
  },
  'data-table': {
    desc: 'Data table component tokens. Rows, headers, cell borders, sorting indicators, and row states.',
    variants: {
      color: {
        'header-bg':          ['{color.semantic.surface.sunken}', 'Table header background. Subtle gray to differentiate from body.'],
        'header-text':        ['{color.semantic.text.primary}', 'Table header text colour.'],
        'header-sort-icon':   ['{color.semantic.icon.secondary}', 'Table sort indicator icon colour.'],
        'header-sort-active': ['{color.semantic.icon.primary}', 'Active sort column icon colour.'],
        'row-bg-default':     ['{color.primitive.white}', 'Table row default background. White.'],
        'row-bg-hover':       ['{color.semantic.background.hover}', 'Table row hover background.'],
        'row-bg-selected':    ['{color.semantic.background.selected}', 'Table row selected background. Light blue.'],
        'row-bg-stripe':      ['{color.semantic.surface.sunken}', 'Table striped row background (alternating rows).'],
        'cell-text':          ['{color.semantic.text.primary}', 'Table cell text colour.'],
        'cell-text-secondary':['{color.semantic.text.secondary}', 'Table secondary cell text (metadata columns).'],
        'border':             ['{color.semantic.border.subtle}', 'Table cell and header border colour.'],
        'row-border':         ['{color.semantic.border.subtle}', 'Table row separator border.'],
      },
    },
    sizing: {
      'cell-padding-x':  ['{spacing.semantic.inset.md}', 'Table cell horizontal padding (16px).'],
      'cell-padding-y':  ['{spacing.primitive.04}', 'Table cell vertical padding (12px).'],
      'header-padding-y':['{spacing.primitive.03}', 'Table header cell vertical padding (8px).'],
      'border-width':    ['{border.width.thin}', 'Table border width (1px).'],
      'font-size':       ['{typography.font-size.sm}', 'Table cell font size (14px). Compact for data density.'],
      'header-font-weight': ['{typography.font-weight.semibold}', 'Table header font weight.'],
      'row-height':      ['3rem', 'Table row minimum height (48px).'],
      'sort-icon-size':  ['16px', 'Table sort indicator icon size.'],
    },
  },
  nav: {
    desc: 'Navigation item component tokens. Sidebar nav links, main nav items, and breadcrumb elements.',
    variants: {
      color: {
        'bg-default':      ['transparent', 'Nav item default background. Transparent at rest.'],
        'bg-hover':        ['{color.semantic.background.hover}', 'Nav item hover background.'],
        'bg-active':       ['{color.semantic.background.active}', 'Nav item active/current-page background.'],
        'bg-selected':     ['{color.semantic.background.selected}', 'Nav item selected background (sidebar tree).'],
        'text-default':    ['{color.semantic.text.secondary}', 'Nav item default text colour. Secondary emphasis.'],
        'text-hover':      ['{color.semantic.text.primary}', 'Nav item hover text colour.'],
        'text-active':     ['{color.semantic.text.primary}', 'Nav item active text colour.'],
        'text-disabled':   ['{color.semantic.text.disabled}', 'Nav item disabled text colour.'],
        'icon-default':    ['{color.semantic.icon.secondary}', 'Nav item icon colour at rest.'],
        'icon-active':     ['{color.semantic.icon.primary}', 'Nav item active icon colour.'],
        'border-active':   ['{color.semantic.interactive.primary}', 'Nav item active indicator. Left border for sidebar items.'],
        'border-focus':    ['{color.semantic.focus.outline}', 'Nav item focus indicator.'],
      },
    },
    sizing: {
      'padding-x':       ['{spacing.semantic.inset.md}', 'Nav item horizontal padding (16px).'],
      'padding-y':       ['{spacing.primitive.03}', 'Nav item vertical padding (8px).'],
      'gap':             ['{spacing.primitive.03}', 'Gap between nav icon and label (8px).'],
      'indent':          ['{spacing.semantic.inset.md}', 'Nav sub-item indent depth (16px per level).'],
      'border-width':    ['{border.width.thick}', 'Nav active indicator width (2px).'],
      'font-size':       ['{typography.font-size.sm}', 'Nav item font size (14px).'],
      'font-weight':     ['{typography.font-weight.medium}', 'Nav item font weight.'],
      'font-weight-active': ['{typography.font-weight.semibold}', 'Nav active item font weight (semibold).'],
      'icon-size':       ['20px', 'Nav item icon size.'],
    },
  },
  select: {
    desc: 'Select/dropdown component tokens. Custom select trigger, option list, and option items.',
    variants: {
      color: {
        'trigger-bg':        ['{color.primitive.white}', 'Select trigger background. White input surface.'],
        'trigger-bg-hover':  ['{color.semantic.background.hover}', 'Select trigger hover background.'],
        'trigger-bg-disabled': ['{color.semantic.background.disabled}', 'Select trigger disabled background.'],
        'trigger-text':      ['{color.semantic.text.primary}', 'Select trigger text colour. Selected value.'],
        'trigger-placeholder': ['{color.semantic.text.placeholder}', 'Select trigger placeholder text colour.'],
        'trigger-border':    ['{color.semantic.border.default}', 'Select trigger border.'],
        'trigger-border-focus': ['{color.semantic.border.interactive}', 'Select trigger focus border.'],
        'trigger-border-error': ['{color.semantic.border.error}', 'Select trigger error border.'],
        'trigger-icon':      ['{color.semantic.icon.secondary}', 'Select chevron/arrow icon colour.'],
        'menu-bg':           ['{color.semantic.surface.raised}', 'Select dropdown menu background.'],
        'option-text':       ['{color.semantic.text.primary}', 'Select option text colour.'],
        'option-bg-hover':   ['{color.semantic.background.hover}', 'Select option hover background.'],
        'option-bg-selected': ['{color.semantic.background.selected}', 'Select option selected background.'],
        'option-check-icon': ['{color.semantic.interactive.primary}', 'Select option checkmark icon for selected item.'],
      },
    },
    sizing: {
      'trigger-padding-x':  ['{spacing.semantic.inset.sm}', 'Select trigger horizontal padding.'],
      'trigger-padding-y':  ['{spacing.primitive.03}', 'Select trigger vertical padding.'],
      'trigger-border-radius': ['{border.radius.sm}', 'Select trigger border radius.'],
      'trigger-min-height':  ['2.5rem', 'Select trigger minimum height (40px).'],
      'menu-border-radius':  ['{border.radius.md}', 'Select dropdown menu border radius.'],
      'menu-shadow':         ['{shadow.semantic.overlay}', 'Select dropdown menu shadow.'],
      'menu-max-height':     ['15rem', 'Select dropdown menu max height (240px). Scrolls beyond.'],
      'option-padding-x':   ['{spacing.semantic.inset.sm}', 'Select option horizontal padding.'],
      'option-padding-y':   ['{spacing.primitive.03}', 'Select option vertical padding.'],
      'menu-z-index':        ['{layout.z-index.dropdown}', 'Select dropdown z-index.'],
      'font-size':           ['{typography.font-size.md}', 'Select text font size (16px).'],
    },
  },
  toggle: {
    desc: 'Toggle/switch component tokens. Binary on/off control for settings and preferences.',
    variants: {
      color: {
        'track-bg-off':       ['{color.primitive.gray.30}', 'Toggle track background when off. Neutral gray.'],
        'track-bg-on':        ['{color.semantic.interactive.primary}', 'Toggle track background when on. Active blue.'],
        'track-bg-disabled':  ['{color.primitive.gray.20}', 'Toggle track disabled background.'],
        'thumb-bg':           ['{color.primitive.white}', 'Toggle thumb (handle) colour. White circle.'],
        'thumb-shadow':       ['{shadow.primitive.02}', 'Toggle thumb shadow for slight elevation.'],
        'border-focus':       ['{color.semantic.focus.outline}', 'Toggle focus ring colour.'],
        'label-default':      ['{color.semantic.text.primary}', 'Toggle label text colour.'],
        'label-disabled':     ['{color.semantic.text.disabled}', 'Toggle disabled label colour.'],
      },
    },
    sizing: {
      'track-width':    ['2.75rem', 'Toggle track width (44px).'],
      'track-height':   ['1.5rem', 'Toggle track height (24px).'],
      'track-radius':   ['{border.radius.full}', 'Toggle track border radius (pill).'],
      'thumb-size':     ['1.25rem', 'Toggle thumb diameter (20px).'],
      'thumb-offset':   ['{spacing.primitive.01}', 'Toggle thumb offset from track edge (2px).'],
      'label-gap':      ['{spacing.primitive.03}', 'Gap between toggle and label (8px).'],
    },
  },
  radio: {
    desc: 'Radio button component tokens. Circular selection control for mutually exclusive choices within a group.',
    variants: {
      color: {
        'bg-unchecked':    ['{color.primitive.white}', 'Radio unchecked background. Empty white circle.'],
        'bg-disabled':     ['{color.semantic.background.disabled}', 'Radio disabled background.'],
        'border-unchecked':['{color.semantic.border.strong}', 'Radio unchecked border. Visible gray circle outline.'],
        'border-checked':  ['{color.semantic.interactive.primary}', 'Radio checked border. Blue outer ring.'],
        'border-hover':    ['{color.semantic.interactive.primary-hover}', 'Radio hover border. Darkened blue preview.'],
        'border-focus':    ['{color.semantic.focus.outline}', 'Radio focus ring colour.'],
        'border-error':    ['{color.semantic.border.error}', 'Radio error border for required-but-unselected validation.'],
        'border-disabled': ['{color.semantic.border.disabled}', 'Radio disabled border.'],
        'dot-color':       ['{color.semantic.interactive.primary}', 'Radio selected dot colour. Solid blue inner circle.'],
        'dot-disabled':    ['{color.semantic.text.disabled}', 'Radio disabled dot colour.'],
        'label-default':   ['{color.semantic.text.primary}', 'Radio label text colour.'],
        'label-disabled':  ['{color.semantic.text.disabled}', 'Radio disabled label colour.'],
        'helper-default':  ['{color.semantic.text.secondary}', 'Radio helper/description text colour.'],
      },
    },
    sizing: {
      'size':           ['1.25rem', 'Radio outer circle size (20px).'],
      'dot-size':       ['0.5rem', 'Radio inner dot size (8px).'],
      'border-width':   ['{border.width.default}', 'Radio circle border width.'],
      'label-gap':      ['{spacing.primitive.03}', 'Gap between radio circle and label text (8px).'],
      'group-gap':      ['{spacing.semantic.stack.sm}', 'Vertical gap between radio items in a group (8px).'],
      'focus-offset':   ['{focus.ring-offset}', 'Radio focus ring offset.'],
    },
  },
  avatar: {
    desc: 'Avatar component tokens. Circular user photo or initials indicator, with optional status badge.',
    variants: {
      color: {
        'bg-default':      ['{color.primitive.cool-gray.30}', 'Avatar default background. Neutral gray when no image is provided.'],
        'bg-brand':        ['{color.semantic.brand.primary}', 'Avatar brand background. Blue for system or bot avatars.'],
        'text-initials':   ['{color.semantic.text.on-color}', 'Avatar initials text colour. White on coloured background.'],
        'border-default':  ['{color.semantic.border.subtle}', 'Avatar border. Subtle ring around the image.'],
        'border-active':   ['{color.semantic.interactive.primary}', 'Avatar active/online border. Blue ring for active users.'],
        'badge-online':    ['{color.semantic.support.success}', 'Avatar status badge: online. Green dot.'],
        'badge-busy':      ['{color.semantic.support.error}', 'Avatar status badge: busy/do-not-disturb. Red dot.'],
        'badge-away':      ['{color.primitive.yellow.50}', 'Avatar status badge: away/idle. Yellow dot.'],
        'badge-offline':   ['{color.primitive.gray.50}', 'Avatar status badge: offline. Gray dot.'],
        'group-overlap-border': ['{color.primitive.white}', 'Avatar group overlap border. White ring between stacked avatars.'],
      },
    },
    sizing: {
      'size-xs':        ['1.5rem', 'Avatar extra-small size (24px). Compact lists and inline mentions.'],
      'size-sm':        ['2rem', 'Avatar small size (32px). Comment threads and chat messages.'],
      'size-md':        ['2.5rem', 'Avatar medium size (40px). Navigation bars and cards.'],
      'size-lg':        ['3rem', 'Avatar large size (48px). Profile sections and team grids.'],
      'size-xl':        ['4rem', 'Avatar extra-large size (64px). Profile headers and detail views.'],
      'border-width':   ['{border.width.thin}', 'Avatar image border width.'],
      'border-radius':  ['{border.radius.full}', 'Avatar border radius (circle).'],
      'badge-size':     ['0.625rem', 'Avatar status badge diameter (10px).'],
      'badge-border':   ['{border.width.thick}', 'Avatar badge border width (white ring around dot).'],
      'font-size-xs':   ['{typography.font-size.xs}', 'Avatar initials font size for xs avatar.'],
      'font-size-sm':   ['{typography.font-size.xs}', 'Avatar initials font size for sm avatar.'],
      'font-size-md':   ['{typography.font-size.sm}', 'Avatar initials font size for md avatar.'],
      'font-size-lg':   ['{typography.font-size.md}', 'Avatar initials font size for lg avatar.'],
      'font-size-xl':   ['{typography.font-size.lg}', 'Avatar initials font size for xl avatar.'],
      'group-overlap':  ['-0.5rem', 'Avatar group horizontal overlap offset.'],
    },
  },
  'progress-bar': {
    desc: 'Progress bar component tokens. Horizontal indicator for task completion, upload status, or loading sequences.',
    variants: {
      color: {
        'track-bg':          ['{color.primitive.gray.20}', 'Progress bar track (unfilled) background. Light gray baseline.'],
        'fill-default':      ['{color.semantic.interactive.primary}', 'Progress bar fill colour. Blue for standard progress.'],
        'fill-success':      ['{color.semantic.support.success}', 'Progress bar fill for completed/success state. Green.'],
        'fill-error':        ['{color.semantic.support.error}', 'Progress bar fill for error state. Red.'],
        'fill-warning':      ['{color.semantic.support.warning}', 'Progress bar fill for warning state. Yellow.'],
        'label-text':        ['{color.semantic.text.primary}', 'Progress bar label text colour.'],
        'value-text':        ['{color.semantic.text.secondary}', 'Progress bar percentage/value text colour.'],
        'helper-text':       ['{color.semantic.text.secondary}', 'Progress bar helper text colour (e.g. "Uploading file.pdf").'],
      },
    },
    sizing: {
      'track-height-sm':   ['0.25rem', 'Small progress bar height (4px). Compact variant.'],
      'track-height-md':   ['0.5rem', 'Medium progress bar height (8px). Default variant.'],
      'track-height-lg':   ['0.75rem', 'Large progress bar height (12px). Prominent variant.'],
      'border-radius':     ['{border.radius.full}', 'Progress bar border radius (pill shape).'],
      'label-gap':         ['{spacing.semantic.stack.xs}', 'Gap between progress label and bar (4px).'],
      'helper-gap':        ['{spacing.semantic.stack.xs}', 'Gap between bar and helper text (4px).'],
    },
  },
  accordion: {
    desc: 'Accordion/disclosure component tokens. Expandable sections with header trigger and collapsible content panel.',
    variants: {
      color: {
        'header-bg':         ['transparent', 'Accordion header default background. Transparent at rest.'],
        'header-bg-hover':   ['{color.semantic.background.hover}', 'Accordion header hover background.'],
        'header-bg-disabled':['{color.semantic.background.disabled}', 'Accordion header disabled background.'],
        'header-text':       ['{color.semantic.text.primary}', 'Accordion header title text colour.'],
        'header-text-disabled': ['{color.semantic.text.disabled}', 'Accordion header disabled title text colour.'],
        'content-text':      ['{color.semantic.text.secondary}', 'Accordion content panel text colour.'],
        'border':            ['{color.semantic.border.subtle}', 'Accordion divider border between items.'],
        'icon-default':      ['{color.semantic.icon.secondary}', 'Accordion expand/collapse chevron icon colour.'],
        'icon-hover':        ['{color.semantic.icon.primary}', 'Accordion chevron hover colour.'],
        'icon-disabled':     ['{color.semantic.icon.disabled}', 'Accordion chevron disabled colour.'],
        'border-focus':      ['{color.semantic.focus.outline}', 'Accordion header focus ring.'],
      },
    },
    sizing: {
      'header-padding-x':   ['{spacing.semantic.inset.md}', 'Accordion header horizontal padding (16px).'],
      'header-padding-y':   ['{spacing.primitive.04}', 'Accordion header vertical padding (12px).'],
      'content-padding-x':  ['{spacing.semantic.inset.md}', 'Accordion content horizontal padding (16px).'],
      'content-padding-y':  ['{spacing.semantic.inset.sm}', 'Accordion content vertical padding (8px).'],
      'border-width':       ['{border.width.thin}', 'Accordion divider border width (1px).'],
      'icon-size':          ['20px', 'Accordion chevron icon size.'],
      'gap':                ['{spacing.primitive.03}', 'Gap between accordion header text and chevron (8px).'],
      'font-size':          ['{typography.font-size.md}', 'Accordion header font size (16px).'],
      'font-weight':        ['{typography.font-weight.semibold}', 'Accordion header font weight.'],
      'transition':         ['{motion.duration.moderate-01}', 'Accordion expand/collapse animation duration (200ms).'],
    },
  },
  card: {
    desc: 'Card component tokens. Contained surface for grouping related content with optional header, body, footer, and media regions.',
    variants: {
      color: {
        'bg-default':        ['{color.semantic.surface.default}', 'Card default background. White content surface.'],
        'bg-hover':          ['{color.semantic.background.hover}', 'Card hover background (for clickable/selectable cards).'],
        'bg-selected':       ['{color.semantic.background.selected}', 'Card selected background. Light blue.'],
        'bg-disabled':       ['{color.semantic.background.disabled}', 'Card disabled background.'],
        'text-title':        ['{color.semantic.text.primary}', 'Card title text colour.'],
        'text-body':         ['{color.semantic.text.secondary}', 'Card body/description text colour.'],
        'text-meta':         ['{color.semantic.text.placeholder}', 'Card metadata text colour (date, author, category).'],
        'border-default':    ['{color.semantic.border.subtle}', 'Card default border. Subtle outline.'],
        'border-hover':      ['{color.semantic.border.strong}', 'Card hover border. Stronger outline for clickable cards.'],
        'border-selected':   ['{color.semantic.border.interactive}', 'Card selected border. Blue outline.'],
        'border-focus':      ['{color.semantic.focus.outline}', 'Card focus ring for keyboard navigation.'],
        'divider':           ['{color.semantic.border.subtle}', 'Card internal divider between header, body, and footer.'],
        'icon-action':       ['{color.semantic.icon.secondary}', 'Card action icon colour (overflow menu, bookmark).'],
        'icon-action-hover': ['{color.semantic.icon.primary}', 'Card action icon hover colour.'],
      },
    },
    sizing: {
      'padding':           ['{spacing.semantic.inset.md}', 'Card content padding (16px).'],
      'padding-compact':   ['{spacing.semantic.inset.sm}', 'Card compact variant padding (8px).'],
      'border-radius':     ['{border.radius.md}', 'Card border radius (8px).'],
      'border-width':      ['{border.width.thin}', 'Card border width (1px).'],
      'shadow':            ['{shadow.semantic.overlay}', 'Card shadow for elevated variant.'],
      'gap':               ['{spacing.semantic.stack.sm}', 'Gap between card content sections (8px).'],
      'media-height':      ['12rem', 'Card media/image region height (192px).'],
      'media-border-radius': ['{border.radius.md}', 'Card media region top border radius.'],
      'title-font-size':   ['{typography.font-size.lg}', 'Card title font size (18px).'],
      'title-font-weight': ['{typography.font-weight.semibold}', 'Card title font weight.'],
      'body-font-size':    ['{typography.font-size.sm}', 'Card body text font size (14px).'],
      'footer-gap':        ['{spacing.primitive.03}', 'Gap between card footer action buttons (8px).'],
    },
  },
  breadcrumb: {
    desc: 'Breadcrumb navigation component tokens. Horizontal trail showing the current page location within the site hierarchy.',
    variants: {
      color: {
        'text-default':    ['{color.semantic.text.link}', 'Breadcrumb link text colour. Blue for clickable items.'],
        'text-hover':      ['{color.semantic.interactive.primary-hover}', 'Breadcrumb link hover text colour.'],
        'text-current':    ['{color.semantic.text.primary}', 'Breadcrumb current page text. Black, not a link.'],
        'text-disabled':   ['{color.semantic.text.disabled}', 'Breadcrumb disabled link colour.'],
        'separator':       ['{color.semantic.icon.secondary}', 'Breadcrumb separator icon (slash or chevron) colour.'],
        'bg-hover':        ['{color.semantic.background.hover}', 'Breadcrumb item hover background.'],
        'border-focus':    ['{color.semantic.focus.outline}', 'Breadcrumb item focus ring.'],
      },
    },
    sizing: {
      'padding-x':       ['{spacing.primitive.02}', 'Breadcrumb item horizontal padding (4px).'],
      'padding-y':       ['{spacing.primitive.01}', 'Breadcrumb item vertical padding (2px).'],
      'gap':             ['{spacing.primitive.02}', 'Gap between breadcrumb items (4px).'],
      'separator-size':  ['16px', 'Breadcrumb separator icon size.'],
      'font-size':       ['{typography.font-size.sm}', 'Breadcrumb text font size (14px).'],
      'border-radius':   ['{border.radius.sm}', 'Breadcrumb item hover state border radius (4px).'],
      'max-items':       ['5', 'Breadcrumb max visible items before truncation.'],
    },
  },
  pagination: {
    desc: 'Pagination component tokens. Page navigation controls for paginated lists, tables, and search results.',
    variants: {
      color: {
        'bg-default':      ['transparent', 'Pagination button default background.'],
        'bg-hover':        ['{color.semantic.background.hover}', 'Pagination button hover background.'],
        'bg-active':       ['{color.semantic.interactive.primary}', 'Pagination active/current page background. Blue.'],
        'bg-disabled':     ['{color.semantic.background.disabled}', 'Pagination disabled button background.'],
        'text-default':    ['{color.semantic.text.primary}', 'Pagination button text colour.'],
        'text-active':     ['{color.semantic.text.on-color}', 'Pagination active page text. White on blue.'],
        'text-disabled':   ['{color.semantic.text.disabled}', 'Pagination disabled button text colour.'],
        'border-default':  ['{color.semantic.border.subtle}', 'Pagination button border.'],
        'border-active':   ['{color.semantic.interactive.primary}', 'Pagination active page border.'],
        'border-focus':    ['{color.semantic.focus.outline}', 'Pagination button focus ring.'],
        'icon-prev-next':  ['{color.semantic.icon.primary}', 'Pagination prev/next arrow icon colour.'],
        'icon-disabled':   ['{color.semantic.icon.disabled}', 'Pagination disabled arrow icon colour.'],
      },
    },
    sizing: {
      'button-size':     ['2.5rem', 'Pagination button width and height (40px square).'],
      'border-radius':   ['{border.radius.sm}', 'Pagination button border radius (4px).'],
      'gap':             ['{spacing.primitive.02}', 'Gap between pagination buttons (4px).'],
      'font-size':       ['{typography.font-size.sm}', 'Pagination text font size (14px).'],
      'icon-size':       ['20px', 'Pagination arrow icon size.'],
      'border-width':    ['{border.width.thin}', 'Pagination button border width.'],
    },
  },
  link: {
    desc: 'Inline link component tokens. Hyperlinks within body text and standalone action links.',
    variants: {
      color: {
        'text-default':    ['{color.semantic.text.link}', 'Link default text colour. Blue for standard hyperlinks.'],
        'text-hover':      ['{color.semantic.interactive.primary-hover}', 'Link hover text colour. Darkened blue.'],
        'text-active':     ['{color.semantic.interactive.primary-active}', 'Link active/pressed text colour.'],
        'text-visited':    ['{color.semantic.text.visited-link}', 'Link visited text colour. Purple to indicate previously followed.'],
        'text-disabled':   ['{color.semantic.text.disabled}', 'Link disabled text colour.'],
        'text-inverse':    ['{color.primitive.blue.40}', 'Link text on dark/inverse backgrounds. Lighter blue for contrast.'],
        'underline-default': ['{color.semantic.text.link}', 'Link underline colour. Matches text.'],
        'underline-hover': ['{color.semantic.interactive.primary-hover}', 'Link underline hover colour.'],
        'border-focus':    ['{color.semantic.focus.outline}', 'Link focus ring colour.'],
        'icon':            ['{color.semantic.text.link}', 'Link trailing icon colour (external link indicator).'],
      },
    },
    sizing: {
      'font-weight':     ['{typography.font-weight.regular}', 'Link font weight. Regular to blend with surrounding body text.'],
      'underline-offset': ['2px', 'Link underline offset from text baseline.'],
      'underline-thickness': ['1px', 'Link underline thickness.'],
      'icon-size':       ['0.75em', 'Link trailing icon size (relative to font size).'],
      'icon-gap':        ['{spacing.primitive.01}', 'Gap between link text and trailing icon (2px).'],
      'focus-offset':    ['2px', 'Link focus ring offset.'],
    },
  },
  badge: {
    desc: 'Badge/count component tokens. Small numeric or dot indicators overlaid on icons and avatars to show notification counts.',
    variants: {
      color: {
        'bg-default':      ['{color.semantic.support.error}', 'Badge default background. Red for notification count.'],
        'bg-info':         ['{color.semantic.interactive.primary}', 'Badge informational background. Blue for neutral counts.'],
        'bg-success':      ['{color.semantic.support.success}', 'Badge success background. Green for positive indicators.'],
        'bg-warning':      ['{color.semantic.support.warning}', 'Badge warning background. Yellow for cautionary counts.'],
        'bg-neutral':      ['{color.primitive.gray.60}', 'Badge neutral background. Gray for non-urgent counts.'],
        'text-default':    ['{color.semantic.text.on-color}', 'Badge text colour. White on coloured background.'],
        'border':          ['{color.primitive.white}', 'Badge border. White ring to separate from parent element.'],
        'dot-default':     ['{color.semantic.support.error}', 'Badge dot indicator. Small red circle for unread/new status.'],
      },
    },
    sizing: {
      'size-sm':         ['1rem', 'Small badge size (16px). Dot and single-digit counts.'],
      'size-md':         ['1.25rem', 'Medium badge size (20px). Multi-digit counts.'],
      'border-radius':   ['{border.radius.full}', 'Badge border radius (circle/pill).'],
      'border-width':    ['{border.width.thick}', 'Badge border width (white ring).'],
      'font-size':       ['{typography.font-size.xs}', 'Badge font size (12px).'],
      'font-weight':     ['{typography.font-weight.bold}', 'Badge font weight (bold for readability at small size).'],
      'dot-size':        ['0.5rem', 'Badge dot indicator diameter (8px).'],
      'offset-x':        ['-0.25rem', 'Badge horizontal offset from parent top-right corner.'],
      'offset-y':        ['-0.25rem', 'Badge vertical offset from parent top-right corner.'],
      'min-width':       ['1.25rem', 'Badge minimum width to prevent squishing single digits.'],
      'padding-x':       ['{spacing.primitive.02}', 'Badge horizontal padding for multi-digit counts (4px).'],
    },
  },
  divider: {
    desc: 'Divider/separator component tokens. Horizontal or vertical rules for visually separating content regions.',
    variants: {
      color: {
        'default':         ['{color.semantic.border.subtle}', 'Divider default colour. Subtle gray line.'],
        'strong':          ['{color.semantic.border.strong}', 'Divider strong colour. High-emphasis separator.'],
        'brand':           ['{color.semantic.brand.primary}', 'Divider brand colour. Blue accent divider for section breaks.'],
        'inverse':         ['{color.semantic.border.inverse}', 'Divider on dark/inverse backgrounds.'],
      },
    },
    sizing: {
      'thickness':       ['{border.width.thin}', 'Divider line thickness (1px).'],
      'thickness-thick': ['{border.width.thick}', 'Divider thick variant (2px).'],
      'spacing-sm':      ['{spacing.semantic.stack.sm}', 'Divider small vertical margin (8px above and below).'],
      'spacing-md':      ['{spacing.semantic.stack.md}', 'Divider medium vertical margin (16px above and below).'],
      'spacing-lg':      ['{spacing.semantic.stack.lg}', 'Divider large vertical margin (24px above and below).'],
      'indent':          ['{spacing.semantic.inset.md}', 'Divider indented variant left margin (16px). For list item separators.'],
    },
  },
  skeleton: {
    desc: 'Skeleton loading placeholder component tokens. Animated placeholders shown while real content loads.',
    variants: {
      color: {
        'bg':              ['{color.semantic.skeleton.background}', 'Skeleton base background colour. Light gray.'],
        'shimmer':         ['{color.semantic.skeleton.element}', 'Skeleton shimmer animation highlight colour.'],
        'border-radius':   ['{border.radius.sm}', 'Skeleton placeholder border radius.'],
      },
    },
    sizing: {
      'text-height':       ['1rem', 'Skeleton text line height (16px).'],
      'text-gap':          ['{spacing.primitive.03}', 'Gap between skeleton text lines (8px).'],
      'heading-height':    ['1.5rem', 'Skeleton heading line height (24px).'],
      'avatar-size':       ['2.5rem', 'Skeleton avatar circle size (40px).'],
      'image-height':      ['12rem', 'Skeleton image placeholder height (192px).'],
      'border-radius-text': ['{border.radius.sm}', 'Skeleton text line border radius (4px).'],
      'border-radius-image': ['{border.radius.md}', 'Skeleton image placeholder border radius (8px).'],
      'animation-duration': ['{motion.duration.slow-02}', 'Skeleton shimmer animation duration (500ms).'],
    },
  },
}

// Build component tokens into the tree
tokens.component = { $description: 'Component-scoped tokens. Each references semantic tokens and specifies property + state combinations for specific UI components.' }

for (const [compName, compDef] of Object.entries(COMPONENTS)) {
  tokens.component[compName] = { $description: compDef.desc }

  // Colour/state variants
  if (compDef.variants) {
    for (const [variantGroup, variantEntries] of Object.entries(compDef.variants)) {
      if (typeof variantEntries !== 'object') continue
      for (const [tokenName, spec] of Object.entries(variantEntries)) {
        if (tokenName.startsWith('$')) continue
        const [ref, desc] = spec
        tokens.component[compName][`${variantGroup !== 'color' ? variantGroup + '-' : ''}${tokenName}`] = {
          $value: ref,
          $description: `${compName.replace(/-/g, ' ')} ${tokenName.replace(/-/g, ' ')}. ${desc}`,
        }
      }
    }
  }

  // Sizing/layout
  if (compDef.sizing) {
    for (const [tokenName, spec] of Object.entries(compDef.sizing)) {
      const [ref, desc] = spec
      tokens.component[compName][tokenName] = {
        $value: ref,
        $description: `${compName.replace(/-/g, ' ')} ${tokenName.replace(/-/g, ' ')}. ${desc}`,
      }
    }
  }
}

// ─── Count tokens ───────────────────────────────────────────────────

function countTokens(obj, path = '') {
  let count = 0
  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith('$')) continue
    if (typeof value === 'object' && value !== null && '$value' in value) {
      count++
    } else if (typeof value === 'object' && value !== null) {
      count += countTokens(value, path ? `${path}.${key}` : key)
    }
  }
  return count
}

const total = countTokens(tokens)
console.log(`Generated ${total} tokens`)

// ─── Write output ───────────────────────────────────────────────────

writeFileSync(OUTPUT, JSON.stringify(tokens, null, 2) + '\n')
console.log(`Written to ${OUTPUT}`)
