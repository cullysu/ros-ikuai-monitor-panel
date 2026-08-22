# Document authority inventory

- status: `current-authority-inventory`
- validForCommit: Step1037 current mobile 56/56, accessibility 10/10 and Product/Visual P0/P1/P2-zero signoff closed; overall release still open
- supersededBy: `null`
- authority: `docs/decision-system/current-state.md` owns the current product conclusion; this file owns the machine-readable document registry.

This registry prevents historical design, migration, breakpoint, score, and release notes from silently becoming implementation instructions again. It does not delete history and it does not turn a documentation check into product acceptance.

`authorityStatus` is intentionally narrower than the prose status in each document:

- `current`: an active decision/spec authority for a named domain.
- `current-contract`: a current contract whose acceptance may still be failed.
- `superseded`: retained history that cannot direct implementation.
- `reference`: index, evidence, chronology, or handoff material that can explain a decision but cannot override `current-state.md`.

```json
{
  "schemaVersion": 1,
  "soleCurrentConclusion": "docs/decision-system/current-state.md",
  "activeResponsiveAuthority": "docs/decision-system/responsive-capabilities.md",
  "entries": [
    {"path":"docs/decision-system/current-state.md","authorityStatus":"current","validForCommit":"local remediation","supersededBy":null,"role":"sole current conclusion"},
    {"path":"docs/decision-system/document-authority.md","authorityStatus":"current","validForCommit":"local remediation","supersededBy":null,"role":"document authority registry"},
    {"path":"docs/decision-system/product-pdr.md","authorityStatus":"current","validForCommit":"local remediation","supersededBy":null,"role":"product decision authority"},
    {"path":"docs/decision-system/architecture-adr.md","authorityStatus":"current","validForCommit":"local remediation","supersededBy":null,"role":"architecture decision authority"},
    {"path":"docs/decision-system/responsive-capabilities.md","authorityStatus":"current","validForCommit":"local remediation","supersededBy":null,"role":"only responsive capability authority"},
    {"path":"docs/decision-system/route-maturity.md","authorityStatus":"current","validForCommit":"local remediation","supersededBy":null,"role":"route maturity authority"},
    {"path":"docs/mobile-reference-baseline.md","authorityStatus":"current-contract","validForCommit":"local remediation","supersededBy":null,"role":"sole accepted mobile visual baseline"},
    {"path":"docs/full-console-product-contract.md","authorityStatus":"current-contract","validForCommit":"local remediation","supersededBy":null,"role":"full console acceptance contract"},
    {"path":"docs/decision-system/README.md","authorityStatus":"reference","validForCommit":"local remediation","supersededBy":null,"role":"decision repository index"},
    {"path":"docs/decision-system/current-index.md","authorityStatus":"reference","validForCommit":"local remediation","supersededBy":null,"role":"compact current discovery index; cannot override current-state"},
    {"path":"docs/decision-system/historical-index.md","authorityStatus":"reference","validForCommit":"local remediation","supersededBy":null,"role":"historical index"},
    {"path":"docs/decision-system/release-journal.md","authorityStatus":"reference","validForCommit":"local remediation","supersededBy":null,"role":"release chronology"},
    {"path":"docs/decision-system/review-adjudication-2026-07-23.md","authorityStatus":"reference","validForCommit":"local remediation","supersededBy":null,"role":"current review evidence"},
    {"path":"docs/product-loop-current.md","authorityStatus":"reference","validForCommit":"local remediation","supersededBy":"docs/decision-system/current-state.md","role":"loop handoff"},
    {"path":"docs/panel-redesign-decision-log.md","authorityStatus":"reference","validForCommit":"local remediation","supersededBy":"docs/decision-system/current-state.md","role":"chronological decision log"},
    {"path":"docs/README.md","authorityStatus":"reference","validForCommit":"local remediation","supersededBy":null,"role":"documentation index"},
    {"path":"docs/desktop-overview-redesign-directions.md","authorityStatus":"superseded","validForCommit":"historical design exploration","supersededBy":"docs/decision-system/responsive-capabilities.md","role":"legacy desktop direction"},
    {"path":"docs/overview-framework-migration.md","authorityStatus":"superseded","validForCommit":"historical migration bridge","supersededBy":"docs/decision-system/architecture-adr.md","role":"legacy DOM migration direction"},
    {"path":"docs/overview-ikuai40-completion-audit.md","authorityStatus":"superseded","validForCommit":"historical visual audit","supersededBy":"docs/decision-system/current-state.md","role":"legacy completion audit"}
  ]
}
```

The checker is fail-closed: a missing file, malformed registry, duplicate path, missing metadata, wrong successor, or legacy entry without `supersededBy` fails before implementation checks run.
