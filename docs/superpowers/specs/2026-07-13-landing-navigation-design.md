# Landing navigation

## Scope

- Keep the existing desktop floating navigation items, including “คู่มือ” and “ประเมินเว็บไซต์”.
- Constrain the floating navigation to the viewport so lower items remain reachable instead of falling below the screen.
- Keep the site header visible while scrolling.

## Design

- The floating navigation retains its existing links and visual style. Its height is capped to the viewport with an internal vertical scroll when necessary.
- The top navigation becomes sticky at the top of the viewport with its current translucent background and stacking order above page content.
- Mobile keeps its existing bottom navigation; the desktop floating navigation remains hidden there.

## Validation

- Run the existing landing-page end-to-end test.
- Confirm at desktop height that the manual and website-evaluation links can be reached, and that the header remains visible after scrolling.
