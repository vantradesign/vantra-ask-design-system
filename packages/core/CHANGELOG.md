# @vantra-design/ask-design-system

## 0.2.0

### Minor Changes

- 22d5413: Hardening release — no API changes, no new features.

  - Cross-package integration tests verify LLM cache sharing with screenreader-empathy (download once, both tools use it)
  - CSP policy documented and verified — strict `connect-src` allowlist
  - README updated with real measured bundle sizes (5.6 KB core, gzipped) and model sizes
  - Demo CSP meta tag verified against integration test allowlist
  - Confirmed zero network calls after model download
