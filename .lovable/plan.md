
# Fix CourtroomStage 3D composition

The current 3D stage renders correctly but is visually wrong: oversized floor/bench, low-angle camera showing huge foreground geometry, gavel and bench cutting across the card, and a bright emissive disc near the bottom that pulls attention away from the HTML UI.

We'll recompose the scene so it reads as quiet atmosphere behind the card, not a full 3D room. No new 3D surfaces (Index, creation) yet.

## Scope

- Edit only:
  - `src/components/courtroom3d/CourtroomStage.tsx` (add `variant` prop, layout)
  - `src/components/courtroom3d/Stage3D.tsx` (recompose scene)
  - `src/pages/TrialShare.tsx` (pass `variant="hero"`, constrain container)
  - `src/pages/Trial.tsx` (pass `variant` per phase, constrain container)
- Keep: lazy loading, WebGL detection, reduced-motion fallback, `CourtroomStageFallback`, `pointer-events-none`, all existing trial logic.
- Do NOT touch: Index, PartyNew, Room, VerdictReveal logic, share copy, DB, polling.

## 1. Add variant system

Extend `CourtroomStageProps` with:

```ts
variant?: "ambient" | "hero" | "waiting" | "reveal"; // default "ambient"
```

`Stage3D` reads `variant` and chooses:

- Which objects to render
- Camera position/FOV
- Fog density
- Spotlight intensity

| variant  | Objects shown                                      | Camera                  | Mood                  |
|----------|----------------------------------------------------|-------------------------|-----------------------|
| ambient  | bench silhouette (far), soft spotlight, fog        | far, high, narrow FOV   | barely-there backdrop |
| hero     | floating paper + wax stamp, soft spotlight, fog    | centered, slight tilt   | summons moment        |
| waiting  | bench silhouette, gavel, juror lights, spotlight   | mid, slightly elevated  | live courtroom        |
| reveal   | bench + gavel (slamming), spotlight pulse, fog     | tighter, shake on hit   | impact                |

The bright bottom emissive disc (`AccusedSpotlight`'s ground circle) is removed; spotlight stays as a light only, no glowing floor decal.

## 2. Reframe & shrink

- Remove the giant `Floor` plane (`40x40`) entirely. The dark background + fog reads as floor without geometry intruding.
- Shrink bench: `boxGeometry [3.2, 1.0, 0.8]`, push to `z = -5.5`, lower opacity material so it's a silhouette.
- Shrink gavel scale ~0.55x; move behind/above card focal point, not into foreground.
- Paper scaled down (~0.7x) and centered behind the card on hero variant.
- Juror lights: smaller spheres (`0.10` radius), tighter arc radius (`r ≈ 2.4`), positioned behind+above so they don't bleed under the card.
- Camera: raise to `y ≈ 3.2`, pull back `z ≈ 7.5`, FOV `32`, `lookAt(0, 1.6, -3)` — content sits center; geometry recedes.
- Increase fog: `fog [color, 5, 12]` so far objects fade into background.

## 3. Layering & container

- `CourtroomStage` container becomes a positioned box that the page sizes — not always `fixed inset-0`. Pages pass a `className` that constrains it to the content column.
- Add inner gradient mask (radial, dark edges) via a CSS overlay div inside the stage wrapper so geometry softly fades at viewport edges, especially bottom — prevents "bright thing at the bottom".
- Stage wrapper opacity defaults to `0.85` for ambient/hero, `1` for waiting/reveal.

### TrialShare layout

- Wrap the existing `<main>` so the stage sits absolutely behind the centered card container (max-w-md), not the full viewport. The stage canvas matches the card column width on mobile; on desktop it gets a moderate side bleed (e.g. `-inset-x-16 inset-y-0`) so it frames the card without spanning the screen.
- Variant: `hero`.

### Trial page

- Same constrained container around the trial content column.
- Variant mapping:
  - before vote → `ambient`
  - after vote, waiting for jury → `waiting`
  - countdown urgent/critical → `waiting` (tone already reacts via existing props)
  - reveal → `reveal`

## 4. Responsive

- In `Stage3D`, read viewport via `useThree(({size}) => …)` and apply a scale factor: `< 640px` → group scale `0.75`, also pull camera slightly closer. Prevents objects feeling oversized on phones while keeping desktop framing.
- All geometry lives inside one top-level `<group>` so a single scale uniform handles it.

## 5. Cleanup

- Delete `Floor` component usage.
- Replace `AccusedSpotlight`'s emissive disc with a non-rendered target object (still drives spotlight direction). Keep the spotlight light itself.
- Remove gavel's wide swing amplitude; keep it tiny in ambient/hero (`0.02` rad), only slam on reveal.

## Technical notes

- No new dependencies.
- All edits are presentational; trial state, voting, polling, sharing copy stay as-is.
- Fallback (`CourtroomStageFallback`) signature unchanged — it ignores `variant`, which is safe.

## Out of scope (explicitly deferred)

- 3D on Index/PartyNew/Room.
- New models, textures, or shaders.
- Changes to VerdictReveal HTML overlay, share text, or DB schema.

## Verification

After implementing, check on `/t/:slug/share`, `/t/:slug` (pre-vote, waiting, reveal) at mobile (375) and desktop widths: card stays the focal point, no bright object at the bottom, no geometry crossing the card, 3D reads as background atmosphere.
