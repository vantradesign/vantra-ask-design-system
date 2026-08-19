# Acme Design System — Synthetic Demo Token Set

This directory contains a **synthetic** design token set used to demonstrate the `@vantra-design/ask-design-system` assistant. It is **not** a real design system — it is a realistic, well-structured token set inspired by [IBM Carbon](https://carbondesignsystem.com/) and [Web Awesome](https://www.webawesome.com/) design systems.

## Token Count

**804 tokens** across three tiers:

| Tier | Count | Description |
|------|------:|-------------|
| Primitive | ~177 | Raw values: color ramps, font sizes, spacing scale |
| Semantic | ~127 | Role-based aliases: brand colors, text styles, surface tokens |
| Component | ~472 | Scoped per-component: button, input, modal, card, etc. |

## Categories

- **Color** — 12 hue ramps × 10 steps + white/black, semantic color roles
- **Typography** — font families, sizes, weights, line heights, letter spacing, composite presets
- **Spacing** — 4px-base scale (01–14), semantic inset/stack/squish aliases
- **Border** — widths and radii
- **Shadow** — primitive (5 levels) + semantic (raised, overlay, temporary)
- **Motion** — durations and easing curves
- **Focus** — ring color, width, offset, inset
- **Layout** — breakpoints, containers, columns, gutters, z-index
- **Opacity** — 4 opacity levels

## Components (23)

accordion, avatar, badge, breadcrumb, button, card, checkbox, data-table, divider, input, link, modal, nav, notification, pagination, progress-bar, radio, select, skeleton, tabs, tag, toggle, tooltip

Each component includes color/state variants (default, hover, focus, disabled, error) and sizing tokens.

## Scripts

| Script | Purpose |
|--------|---------|
| `node demo/scripts/generate-tokens.mjs` | Regenerate `sample-tokens.json` from the generator |
| `node demo/scripts/validate-tokens.mjs` | Validate referential integrity, naming lint, descriptions |
| `node demo/scripts/spot-check-retrieval.mjs` | Run 46 natural-language queries and check retrieval quality |

## Format

Tokens use the [DTCG](https://design-tokens.github.io/community-group/format/) format:

```json
{
  "color": {
    "primitive": {
      "blue": {
        "$type": "color",
        "50": {
          "$value": "#4589ff",
          "$description": "Blue 50. Primary action colour..."
        }
      }
    }
  }
}
```

References use DTCG alias syntax: `{color.semantic.brand.primary}`.

## Referential Integrity

All `{reference}` values resolve to existing tokens. Run `validate-tokens.mjs` to verify — it checks:
- All references resolve (zero broken refs)
- All paths are kebab-case
- No duplicates
- All tokens have descriptions
