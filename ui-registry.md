# AgroSentinel visual registry

Established 22 October 2026 using the imprint skill.

## Foundations

Paper canvas `#F4F3EE`, white surface, green-black ink `#13211B`, secondary `#4B5A52`, meta `#62706A`. Forest `#1E4D3A` is the action color. Lime `#D4F36B` is reserved for active agent states. No resting demo indicator uses lime. Source chips use blue `#1D5C86`; offline uses slate and hatch. Core values are exported from `shared/theme.ts`.

## Panel and KPI

File: app/globals.css. White background, 1px line border, 10–14px radius, 20px padding, no shadow. Eyebrows are uppercase with tracking; large numbers use light Hanken Grotesk; metadata uses IBM Plex Mono. Hover changes brightness without moving layout.

## Actions

Forest pill, white label, 48px web / 56px native height. Native pressed opacity .75, disabled .5. Secondary actions use a visible border. Web focus is a 2px forest outline at 4px offset. Map focus uses lime on forest. Icon-only buttons have accessible labels.

## Trust components

Source chips use blue text and pale blue fill with a 1px blue border and 4px radius. Demo fixtures explicitly identify missing external evidence. Receipt panels use native HTML dialog for focus trapping, Escape dismissal and return focus. Offline banners use slate hatching with text. Warnings pair text with amber fill.

## Motion

GSAP drives web motion through `app/motion.ts` (custom eases `field` and `settle`). Entrances stagger upward; headlines reveal by masked lines. The filament marks "growth / agent at work" on the landing, login, field advisory and analyzing step. Lime pulses only for live or active agent states. Pills carry a magnetic round nub. Never let a CSS transition run on a transform GSAP animates. Native motion uses `Animated` with the native driver. Reduced motion disables loops and shows final states.

## App identity assets

The AgroSentinel launcher mark is a rounded two-leaf forest-green sprout with a horizontal soil baseline, on paper #F4F3EE. Generated transparent master: public/brand/agrosentinel-mark.png; opaque 1024px export: public/brand/agrosentinel-icon.png. Keep the padded composition for adaptive and maskable icon crops. Regenerate size/format exports with node scripts/build-icons.mjs. Web uses Next metadata icon files and explicit PWA manifest icons. Android uses transparent foreground/monochrome layers; iOS uses the opaque icon. Native launcher changes require a new binary.
