# Frontend Assessment Fallback Design Tokens

Use these tokens as the fallback visual direction for the new assessment project.

## Product Character

The workspace should feel operational, calm, and quick to scan. It is used repeatedly throughout a working day. Favor clear hierarchy, stable dimensions, restrained decoration, and visible system status.

## Color

| Token | Value | Purpose |
| --- | --- | --- |
| `canvas` | `#F5F7F8` | Page background |
| `surface` | `#FFFFFF` | Main work surface |
| `surface-muted` | `#EEF2F3` | Secondary controls and grouped rows |
| `text` | `#172124` | Primary text |
| `text-muted` | `#5F6B6F` | Supporting text |
| `border` | `#D7DEE0` | Dividers and control boundaries |
| `primary` | `#087F72` | Primary action and active state |
| `primary-hover` | `#06675D` | Primary action hover |
| `focus` | `#1769E0` | Focus outline |
| `success` | `#217A3C` | Confirmed success |
| `warning` | `#9A6200` | Full capacity or attention |
| `danger` | `#B42318` | Destructive action and critical error |

Status must always include visible text or a familiar symbol. Color alone is insufficient.

## Typography

- Use a locally available UI sans-serif.
- Page title: 24px, 32px line height, 700 weight.
- Section title: 16px, 24px line height, 650 or 700 weight.
- Body: 14px, 20px line height, 400 weight.
- Supporting text: 13px, 18px line height, 400 weight.
- Use normal letter spacing.

## Spacing And Shape

- Base spacing unit: 4px.
- Common gaps: 8px, 12px, 16px, 24px, 32px.
- Control height: 40px minimum.
- Touch target: 44px minimum where controls are used on mobile.
- Border radius: 6px maximum for controls and repeated items.
- Main content width: responsive, with 24px desktop and 16px mobile page padding.
- Avoid cards inside cards. Use dividers and full-width work surfaces for dense information.

## Interaction

- Focus outline: at least 2px with visible offset.
- Hover must not be the only way to discover an action.
- Pending controls keep stable dimensions.
- Destructive actions use explicit labels and confirmation.
- Motion is optional. Keep it short and disable non-essential motion for `prefers-reduced-motion`.
