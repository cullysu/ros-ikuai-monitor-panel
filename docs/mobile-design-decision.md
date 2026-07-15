# Mobile design direction decision

## Why the previous direction was rejected

The evidence ledger was truthful in several narrow cases but visually flattened identity, verdict, proof, and raw records into the same row grammar. Its enclosing card, side status strip, repeated evidence wording, tiny utility text, and centered tablet column reproduced the feel of a scaled administration panel. Green screenshot gates certified geometry, not product quality.

## Compared directions

| Direction | Strength | Release risk | Decision |
|---|---|---|---|
| Patrol brief | Fast continuous reading and quiet native hierarchy | Can collapse back into a generic status ledger | Keep reading order only |
| Object workspace | Clear WAN/route/collection objects, meaningful view switching, strongest phone interaction model | Needs explicit concurrent-risk priority | Primary interaction architecture |
| Incident workspace | Dense business-impact queue and effective tablet split | Codes and four-up proof band feel too console-like on compact phones | Keep risk ordering and tablet structure |

Local comparison artifacts were rendered at `390x844` and `768x1024` under `_acceptance/design-directions/` before product implementation.

## Selected visual thesis

**A native patrol brief opening into an object-aware network workspace.**

The memorable product signal is not glass, a card, or a topology drawing. It is the immediate connection between a restrained business verdict and the exact network object that proves it. Cool blue identifies verified/current evidence; neutral gray carries structure; warning tones appear only when facts require them.

## Non-negotiable differences from the rejected UI

- no page-enclosing card or 3px state stripe;
- no generic key/value ledger as the whole product;
- no fake read-only pill or identical disclosure/navigation chevrons;
- no rate region in resource pressure;
- no hidden retained route/WAN numbers in unavailable evidence;
- no narrow centered tablet card;
- no repeated evidence banner in detail;
- no scenario enum that can hide concurrent P1 facts.

## Responsive composition

- `320–699px`: one full-width patrol brief, then a horizontally selectable object workspace in normal flow.
- `700px+`: persistent brief on the left and selected object workspace on the right; both are part of the mobile render tree.
- short landscape: verdict/proof and selected object share the viewport without an overlay or fixed sheet.

## Interaction semantics

- static mode text is not styled as a control;
- tabs switch object views and expose selected state;
- a downward indicator expands inline evidence;
- a right chevron opens a new destination;
- detail participates in browser history and restores focus/selection on return.
