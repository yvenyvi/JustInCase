# JusticeLink Mobile Web-Only Replacements

## Purpose
Record the parts of the current web app that should be redesigned for mobile instead of reused directly.

## UI And Navigation Replacements
- Browser router and nested route layouts.
- Persistent desktop sidebars.
- Hover-dependent navigation and tooltips.
- Multi-column dashboard layouts that collapse poorly on narrow screens.
- Dense data tables that need list or card equivalents.

## Interaction Replacements
- DOM file input flows for avatar and document uploads.
- Modal stacks designed for mouse-first desktop use.
- Drag-and-drop behavior that assumes pointer precision.
- Scroll regions that rely on desktop viewport heights.

## Content And Presentation Replacements
- Desktop-heavy account management tables.
- Large analytics dashboards that need simplified charting on mobile.
- Web-only landing page composition if it depends on browser spacing tricks.
- Background effects or animations that are too expensive or distracting on small devices.

## Screen-Level Replacements To Expect
- Public document generation should become a step-by-step mobile form with preview and export.
- Admin account management should become a searchable list with detail screens.
- Audit logs should become a compact filterable feed.
- Feedback analytics should become lightweight summary cards and charts.
- Terms and policy views should become scrollable reading screens with clear section anchors.

## Replacement Rule
- If the current implementation assumes a mouse, wide screen, or hover, replace it.
- If the current implementation already works as a form, list, or detail view, it can often be adapted with smaller layout changes.
