1. Design principles
1. Every claim shows its receipt. No recommendation, price, wind speed or saving appears without a visible source: a Tavily grounding chip, the model tier that produced it (Nano triage vs Ultra reasoning), and a timestamp. Why: the product's whole argument against "fragile cloud chatbots" is trust. It is also the exact thing the Tavily prize judges score. Test: if you can't tap a number and see where it came from, it ships wrong.
2. Freshness is always on screen. Every data surface states how old it is and whether it came from the network or the cache ("Cached 2h ago · offline"). Offline is a first-class mode with its own styling, never an error toast. Why: an agronomist acting on a stale spray plan is the single most expensive failure this product can cause. The PRD's push notification for "weather shift invalidates plan" only works if staleness is legible everywhere else too.
3. The decision comes first; the reasoning is one tap away. Each screen leads with the action ("Do not spray. Use soil injection."), then the economics, then the collapsible Agent Thought Trace. Why: the agronomist reads with gloves on in sunlight and the manager reads between calls. The trace earns trust, but it can't block the answer. This also caps the AI-demo look: reasoning is a supporting exhibit, not the hero.
2. Visual direction
Mood: "field notebook meets weather instrument." It should feel quiet, botanical and exact. Think agronomist's waxed notebook, a hygrometer dial, a seed catalogue. Confidence comes from restraint and precise numbers, not glow effects.
References and what each contributes
Reference
Take
Leave
The reference video (Dantora clinic site)
Off-white + forest green + chartreuse logic; ultra-light display headlines; uppercase eyebrows; digit roll-up; organic green filament; pill CTA with round icon nub
Scroll-linked text reveals and image scatters inside the product; slow intro loader before useful content
Windy.com
Data drawn directly on the map, legend always visible, time scrubber
Its dark rainbow palette, which is unreadable for colour-blind users
Linear / Vercel dashboards
Density, keyboard-first, quiet chrome, monospaced metadata
Pure-black SaaS look; it says "dev tool", not agriculture
Field guides and seed packets
Hand-labelled specimen framing for the scanned leaf; serif-free but warm
Faux-vintage textures
Apple Weather
Big glanceable number + one sentence of meaning
Decorative gradients
How the filament is used. The video's green strands become the product's signature: a slow-drifting mycelium/root network. It appears in three places only: (1) the landing hero, (2) the mobile Analyze screen, where strands grow toward the leaf while the agent works, and (3) the dashboard's empty map state. Everywhere else it is absent. It encodes the agent is thinking and nothing else.
Avoid
• Purple-blue "AI" gradients, sparkles and robot or brain icons. They make it look like a wrapper, the opposite of the commodity-edge story.
• Glassmorphism over the map. It kills contrast in sunlight and on cheap office monitors.
• Red-green status coding. About 8% of men are red-green colour-blind, and green is already our brand colour, so green cannot also mean "healthy".
• Stock farmer-with-tablet photography. Use the user's own leaf photos, and macro botanical textures on the landing only.
• Emoji in UI (the PRD uses them; the product must not).
• Rounded-everything bubbly UI. Radii stay modest so dense tables still feel engineered.
3. Design tokens
One token set ships to both platforms: CSS variables plus a Tailwind theme for Next.js, and a TS theme.ts for Expo. Contrast ratios below were computed against the background named (WCAG 2.x formula).
Colour — core
Token
Hex
Usage
Contrast
canvas
#F4F3EE
App background. A warm paper white, not #FFF: less glare in sun, and it lets white cards lift without shadows
—
surface
#FFFFFF
Cards, sheets, table rows
—
ink
#13211B
Primary text. Green-black, so it belongs to the palette
14.99:1 on canvas
ink-2
#4B5A52
Secondary text, labels
6.56:1 on canvas
ink-3
#62706A
Meta, timestamps, placeholders (darkest grey that still passes AA)
4.67:1 on canvas
line
#D9DDD5
Dividers only, never as the only edge of an input
decorative
line-strong
#7A8780
Input and checkbox borders (needs 3:1 non-text)
3.37:1 on canvas
forest-700
#1E4D3A
Brand and primary action fill, links, selected state
8.68:1 on canvas; white text on it 9.64:1
forest-900
#0E2A1F
Map canvas, dark sheets, landing loader
text-on-dark #E9EEE9 at 13.05:1
lime-300
#D4F36B
Agent-active only: live pulse, thinking state, focus halo on dark, "New" marker. Always a fill under ink text (13.35:1), never text on light (1.25:1)
see left
Why forest + lime. Forest green reads as agronomy without the cartoon grass green of most ag-tech. Lime is the colour of new growth and of the reference video's secondary pill. Rationing it to one meaning (the agent is live) turns it into a signal instead of decoration.
Colour — semantic
Token
Hex
Usage
Contrast
critical
#B3261E
Disease confirmed, action blocked, "Do not spray"
6.54:1 on white, both ways
warning-text
#8A5300
Caution text (amber that still passes as text)
6.33:1 on white
warning-fill
#F6E3B8
Caution banner background
under ink
grounded
#1D5C86
Tavily-sourced fact chip: a blue, deliberately outside the green family so "verified external data" never looks like brand
7.17:1 on white
offline
#55626B
Offline banner and cached state, with a 45° hatch pattern so it isn't colour-only
5.65:1 on canvas
success
#1E4D3A
Reuses forest-700, always paired with a check icon and word
8.68:1
Colour — outbreak heat ramp (map, on forest-900)
The heat ramp is called "embers". Luminance rises monotonically, so it reads in greyscale and for all common colour-vision types. Low risk is dim, high risk glows.
Step
Hex
Meaning
1
#3F5A34
Single detection
2
#8C5A2B
Cluster forming
3
#D2693A
Active outbreak
4
#F0A24A
Spreading
5
#FFE3B0
Severe, act now
Typography
• Display and UI: Hanken Grotesk (Google Fonts, variable 100–900). It is the closest open match to the reference's airy light grotesk. Its open apertures and wide counters stay legible at small sizes on a $200 Android screen. Light 300 gives the editorial headlines; 500–600 carries UI. One family keeps the Expo bundle small, which matters on cheap phones.
• Data and agent voice: IBM Plex Mono (400/500). Used for the Agent Thought Trace, coordinates, prices and ledger figures. Plex was drawn for IBM's engineering heritage, so it reads as instrumentation rather than hacker-terminal. Monospace makes columns of NGN/USD and timestamps align without tabular-figure tricks, and it gives the agent a distinct "voice" separate from the human UI.
• Rejected: Inter (the default; the product would look like every other dashboard) and a serif (too editorial for a field tool, and poor at small sizes on low-DPI screens).
Token
Size / line height
Weight
Use
display-xl
64/68 (web), 40/44 (mobile)
300
Landing hero only
display
40/44
300
Dashboard page title, big KPI numbers
h1
28/34
400
Screen titles (mobile), section titles (web)
h2
22/28
500
Card titles, the verdict line on Result
h3
17/24
600
Sub-sections, table group headers
body
16/24
400
Default text. Mobile never goes below 16 (sunlight)
body-sm
14/20
400
Dense dashboard tables, helper text
eyebrow
12/16, +0.08em, uppercase
600
Section labels, the reference video's signature
mono
14/20
400
Trace lines, coordinates, prices
mono-sm
12/16
500
Source chips, timestamps
Scale ratio is roughly 1.25 (major third). The jump from 22 to 40 is intentional, so headline numbers dominate.
Spacing (4-pt base)
space-0 0 · 1 4 · 2 8 · 3 12 · 4 16 · 5 20 · 6 24 · 8 32 · 10 40 · 12 48 · 16 64 · 24 96
• Mobile screen gutter is 20. Use 16 between cards and 24 between sections.
• Dashboard panel padding is 20. Table rows are 40 tall (compact) or 48 (comfortable), with a user toggle.
• Mobile touch targets are at least 48×48, and the primary capture button is 72. Gloved and dirty fingers need bigger targets.
Radius
Token
Value
Use
radius-xs
4
Chips inside tables, checkboxes
radius-sm
8
Inputs, small buttons, map popovers
radius-md
14
Cards, panels
radius-lg
24
Bottom sheets, the leaf image frame, landing feature cards (the reference's large rounded media)
radius-pill
999
Primary CTAs (the reference's pill + round icon nub), status chips
Elevation
Keep shadows minimal, because surfaces lift by colour (white on paper). Shadows only mark things that float.
Token
Value
Use
shadow-0
none + 1px line border
Cards at rest
shadow-1
0 1px 2px rgba(19,33,27,.06), 0 2px 8px rgba(19,33,27,.06)
Hover cards, sticky table header
shadow-2
0 8px 24px rgba(19,33,27,.12)
Popovers, map tooltips, dropdowns
shadow-3
0 -8px 32px rgba(19,33,27,.16)
Mobile bottom sheet, modal
Shadow colour is tinted ink, not black, so it never turns grey and muddy on the warm canvas.
Motion
Token
Value
Use
dur-fast
120ms
Press states, chip toggles
dur-base
220ms
Sheet and panel open, accordion
dur-slow
480ms
Digit roll-up, map fly-to
ease-out
cubic-bezier(.2,.8,.2,1)
Entrances
ease-in-out
cubic-bezier(.65,0,.35,1)
Map camera
Under prefers-reduced-motion (or the OS reduce-motion setting on mobile), the filament freezes to a still frame, roll-ups jump to their final value, and sheets cross-fade.
4. Screen inventory
There are 19 screens across three surfaces. Screens marked MVP are the minimum for the 3-minute demo; the others make it read as a finished product.
Mobile (Expo) — Agronomist
ID
Screen
Purpose
MVP
M0
Welcome + permissions
Explain in one sentence why camera, location and notifications are needed, then request them one at a time
Yes
M1
Field Home
Today's regional advisory (cached), Scan CTA, last 5 recommendations, sync status
Yes
M2
Capture
Full-screen camera with leaf-framing guide, quality hints, GPS lock indicator
Yes
M3
Review shot
Confirm or retake, optional crop and field note, then Analyze
Yes
M4
Analyzing
Live agent progress: Nano triage, then Tavily calls, then Ultra plan. The filament grows here
Yes
M5
Recommendation (Result)
Verdict, treatment plan, economics, grounding chips, collapsible Agent Thought Trace
Yes
M6
Scan history
All scans with status (synced, queued, failed, invalidated)
Yes
M7
Scan detail
Past result, with an "Invalidated by weather shift" banner when applicable
Yes
M8
Regional advisory
Full cached regional alert with outbreak list and weather window
—
M9
Alert (from push)
What changed, the old vs new plan diff, Acknowledge
Yes
M10
Sync queue
Queued scans waiting for signal; retry or discard
—
M11
Settings
Region, units (°C, km/h, NGN/USD), data saver, sign out
—
Web (Next.js) — Cooperative Manager
ID
Screen
Purpose
MVP
W1
Sign in
Email magic link; picks the cooperative
—
W2
Regional Overview
Outbreak map (hero), KPI strip, live detection feed, Grounding Ledger summary
Yes
W3
Outbreak / cluster detail
One cluster: timeline, affected farms, crops, agent plan, dispatch action
Yes
W4
Tavily Grounding Ledger
Every grounded check, the decision it changed, and money saved, with an audit trail
Yes
W5
Market & Inputs
Commodity prices and chemical availability by supplier, with source and freshness
Yes
W6
Agent Activity
Region-wide reasoning log: runs, tool calls, model tier, cost
—
W7
Settings
Region bounds, alert thresholds, team, currency
—
Landing (Next.js, public)
ID
Screen
Purpose
MVP
L1
Demo landing
One scroll for judges: hook, "phone is the sensor", how the agent grounds itself, live stats from the ledger, architecture, open-source link. This is where the reference video's motion language lives
Yes
5. User flows
The offline branch rejoins the same Analyzing step, so the result screen is identical whichever path a scan took.
F1 — Scan a leaf and get a plan (online) · US1, US3
1. M1 Field Home. Tap the 72px Scan leaf button, which sits bottom-centre within thumb reach.
2. M2 Capture. The camera opens in under 2s (KPI). A leaf-shaped guide plus live hints: "Move closer", "Too dark", "Hold steady". The GPS chip turns from grey to green when locked (±15m).
3. Shutter. The app gives haptic feedback and freezes the frame, and M3 slides up.
4. M3 Review. Choose Retake or Analyze. Optionally add a field note (voice-to-text) or a crop type if the agronomist already knows it.
5. The image is compressed on device to 1024px JPEG at 0.6 and uploaded; a progress ring sits on the thumbnail.
6. M4 Analyzing. Three steps stream in as they happen: Triage (Nano), which shows the likely disease and confidence; Grounding (Tavily), where each call appears as a line ("Wind 18 km/h NE, Kaduna, next 6h"); Plan (Ultra).
7. M5 Result. The verdict line, the treatment, a cost comparison of plan vs default spray, and grounding chips. The Thought Trace is collapsed by default.
8. Optional: expand the Trace, tap a chip to see the source URL and time, then Save or Share (WhatsApp share sheet; this is how agronomists actually hand plans to farmers).
9. The result is cached into the last-5 store, and the scan pin appears on the manager's map (W2).
F2 — Scan with no signal · US2
1. M1 shows the offline banner (hatched slate): "Offline · advisory cached 3h ago".
2. The capture flow is the same as F1, steps 1–4.
3. Tap Analyze. Instead of M4, a Queued card appears: "Saved. We'll analyze when you're back online." The thumbnail carries a clock badge.
4. Meanwhile the app offers the cached regional advisory for that crop and states clearly that it is not a diagnosis of this leaf.
5. When signal returns, the queue auto-syncs and a local notification says "2 scans analyzed". Tapping it opens M5 for the first result.
6. If a sync fails three times, the scan moves to M10 with Retry or Discard.
F3 — Plan invalidated by weather shift · PRD push notification
1. A background job detects a wind or rain change for a recent scan's location.
2. A push arrives: "Rain expected 14:00. Your 09:40 spray plan for Farm 12 is no longer safe."
3. Tapping it opens M9 Alert: a side-by-side old plan vs new plan, with what changed highlighted and the triggering Tavily source.
4. Tap Acknowledge. The old result in M6 and M7 gets an "Invalidated" tag with a link to the new plan.
F4 — Spot and respond to an outbreak · US4
1. W2 Overview. The SSR map loads with the embers heat layer in under 1.5s. The KPI strip shows a +38% detections change in 24h for one LGA.
2. The manager hovers a cluster to see a tooltip: count, dominant disease, trend arrow. Click it.
3. W3 Cluster detail opens as a right-side panel over the map, so the map context stays visible.
4. They review the timeline sparkline, affected farms, and the agent's regional plan.
5. Dispatch: assign an agronomist and add a note. Alternatively, Flag for purchasing, which deep-links to W5 filtered to the recommended input.
F5 — Optimize a purchase · US5
1. W5 Market & Inputs. The table of inputs is pre-filtered when coming from F4.
2. Each price row shows its supplier, the source chip, freshness, and a flag when Tavily sources disagree.
3. On a conflict, the row shows both values and the conservative choice Ultra picked (PRD edge case), with a "Why this?" popover.
4. Export CSV, or copy a purchase summary.
F6 — Prove ROI (judge path) · Tavily prize
1. W4 Ledger. A hero number shows money saved this season, with a roll-up animation on first load only.
2. Below it, a running list: each row is a grounded check, the decision it changed ("Spray cancelled: drift risk"), and the estimated saving.
3. Click a row to see the full trace and source links. This is the audit trail.
6. Per-screen layout
The hierarchy is listed top to bottom. Primary is the one action the screen exists for. Only one forest-filled pill appears per screen.
M1 Field Home
• Top bar: region name (h3) and a SyncStatusPill ("Synced 2m ago" or "Offline · 3 queued").
• Advisory card (forest-900 surface, light text): eyebrow "REGIONAL ADVISORY", one-line headline ("Late blight risk high in Zaria LGA"), a weather window ("Safe to spray: 06:00–09:00"), and a FreshnessStamp. It is the darkest element so the eye lands there first.
• Recent plans: up to 5 RecommendationRows (thumbnail, crop, verdict chip, time, status badge).
• Bottom dock: a 72px circular Scan leaf (primary) centred, with History and Settings icon buttons either side.
• Components: AppBar, SyncStatusPill, AdvisoryCard, RecommendationRow, CaptureButton, OfflineBanner.
M2 Capture
• Full-bleed camera. A top overlay has Close, Flash and a GPS chip.
• A centre leaf-silhouette guide (2px white at 70% opacity) that turns lime when sharpness and exposure pass.
• A hint line above the dock (16/600, white on a 60% ink scrim) states one hint at a time.
• Primary: shutter (72px). Secondary: import from gallery.
• Components: CameraOverlay, QualityHint, GpsChip, CaptureButton.
M3 Review shot
• The image fills the top 60% at radius-lg, framed like a specimen card with mono metadata below (lat/long, time, file size after compression).
• Optional crop selector (chips: Maize, Cassava, Tomato, Sorghum, Other) and a field note field.
• Primary: Analyze (full-width pill, round arrow nub, from the reference). Secondary: Retake (text button).
M4 Analyzing
• The leaf thumbnail sits top-left. The filament animation grows from the edges toward it.
• An AgentStepper with three rows (Triage, Grounding, Plan). Each row shows its state: waiting, running (lime dot pulse), done (check + duration) or failed.
• Under Grounding, trace lines stream in Plex Mono as Tavily calls return.
• No primary action. Cancel is a text button, and if the app is backgrounded a note says "You can leave, we'll notify you."
M5 Recommendation — the most important screen
1. Verdict block: eyebrow "DIAGNOSIS · 87% CONFIDENCE", the disease name (h1), and a VerdictBanner: an icon plus an imperative sentence ("Do not spray today. Use soil injection."), coloured by severity.
2. Why, in one line: "Wind 22 km/h NE would drift spray onto Farm 14 within 3h," with grounding chips inline.
3. Plan card: numbered steps with product, dose and timing. Each product links to its price.
4. Economics card: CostCompare ("Default spray ₦48,000 vs Plan ₦19,500 · saves ₦28,500") in mono figures.
5. Agent Thought Trace (collapsed accordion): step count, sources and model tiers in the summary line.
6. Footer: FreshnessStamp and model attribution ("Triage: Nemotron Nano · Plan: Nemotron 3 Ultra").
• Primary: Save plan (sticky bottom). Secondary: Share (WhatsApp) and Rescan.
M6 History / M7 Scan detail
• M6: segmented filter (All, Queued, Invalidated) and a list of RecommendationRows grouped by day.
• M7: M5's layout, read-only, with an InvalidatedBanner pinned top when applicable. Primary is "View new plan".
M9 Alert
• A critical eyebrow and a headline of what changed.
• PlanDiff: two columns (Before / Now). Changed lines get a warning-fill background plus a "Changed" label, so colour is never the only cue.
• The triggering source chip.
• Primary: Acknowledge.
W2 Regional Overview
• Left rail (64px, expands to 220): Overview, Ledger, Market, Agent, Settings.
• Top bar: region switcher, date range (24h, 7d, Season), live dot (lime pulse when the stream is connected), user.
• KPI strip (4 tiles): Detections 24h, Active clusters, Sprays prevented, Saved this season. Each tile shows a big number (display, 300), a delta, and a sparkline.
• Map (about 65% width, full height below the strip): dark forest-900 basemap, embers clusters, legend bottom-left (always visible), time scrubber bottom.
• Right column (about 35%): Live Detections feed (newest first, new rows slide in), then a Ledger summary card (3 latest saves plus "Open ledger").
• Primary: none global. Each cluster's Dispatch is the action. This is a monitoring screen, so a big CTA would be wrong.
W3 Cluster detail (side panel, 480px)
• Header: disease, LGA, count, trend chip, Close.
• Detection timeline (bar sparkline per day).
• Affected farms table (farm, crop, first seen, agronomist, status).
• Agent regional plan, with the Trace available.
• Primary: Dispatch agronomist. Secondary: Flag for purchasing.
W4 Tavily Grounding Ledger
• Hero: eyebrow "SAVED BY GROUNDED DECISIONS", a display-xl figure with roll-up, and a sub-line ("from 312 Tavily checks · 47 decisions changed").
• Filter bar: type (Weather, Price, Availability), outcome (Changed, Confirmed), date.
• LedgerTable: Time · Query (mono) · Result · Decision impact · Est. saving (right-aligned mono) · Source. Clicking a row opens a drawer with the full trace.
• A footnote states how savings are estimated. Judges will ask, so the method must be one click away.
W5 Market & Inputs
• Two tabs: Commodity prices and Inputs availability.
• PriceTable: Item · Price · 7d change · Supplier/Market · Source chip · Fresh. A ConflictFlag marks rows with conflicting sources.
• Primary: Export.
L1 Demo landing — where the reference video's language goes
1. Loader (≤ 900ms, skippable): full forest-900 screen with the AS mark in a thin circle, as in the video's opening frame. It only shows on the first visit.
2. Hero: eyebrow "COMMODITY-EDGE AGRONOMY", headline in display-xl 300 ("Any phone becomes a field sensor"), sub-copy, then CTAs: Open dashboard (forest pill with nub) and Watch demo (lime pill). The filament drifts on the right.
3. Statement block (the video's "One clinic, one record" moment): centred "One leaf, one plan, one region that sees it," with copy that fills from grey to ink on scroll.
4. Three numbered cards (the video's 02/03/04 service cards): Edge (phone), Brain (agents on Nebius), Macro (dashboard). Large rounded media, horizontal scroll on mobile.
5. Live stats with digit roll-up, pulled from the real ledger API, not hard-coded.
6. Architecture strip: stack logos in mono captions, plus the GitHub MIT link.
7. Component library
Every interactive component has these states unless noted: default, hover (web), pressed, focus-visible, disabled, loading. Platform: B = both, M = mobile, W = web.
Foundations and actions
Component
Platform
Variants
States / notes
Button
B
primary (forest pill + round icon nub), accent (lime fill, ink text; landing only), secondary (1px line-strong outline), ghost (text), danger
Loading swaps the label for a spinner but keeps the width (no layout jump). Sizes 40 / 48 / 56
IconButton
B
filled, ghost
48×48 hit area minimum even when the icon is 20
CaptureButton
M
idle, armed (quality OK: lime ring), capturing, disabled (no camera permission)
72px. Haptic on press
Chip
B
filter (toggle), status, crop
selected, unselected, disabled
SegmentedControl
B
2–4 segments
Arrow-key navigation on web
Input / TextArea
B
text, search, voice (mic suffix on mobile)
error (icon + message below, not colour only), with helper text
Select / Combobox
W
single, multi
open, filtered, empty
Trust and freshness (the signature set)
Component
Platform
Variants
States / notes
GroundingChip
B
weather, price, availability, web
Mono-sm text in grounded blue with a small globe-check glyph. Tap/hover opens a SourcePopover. States: fresh, stale (>6h: dashed border + "stale"), conflict (split icon)
SourcePopover
B
—
Query string, result, domain, timestamp, "Open source". On mobile it renders as a bottom sheet
FreshnessStamp
B
live, cached, stale, offline
"Updated 2m ago" / "Cached 3h ago" / "Offline". Icon + text always
SyncStatusPill
M
synced, syncing, offline, queued(n), error
Tappable; opens M10
OfflineBanner
B
full-width, compact
Hatched slate. Persistent, not dismissible while offline
ModelTag
B
nano, ultra
Mono-sm label for which tier produced a statement. Builds trust and fulfils the Nebius rubric
ConflictFlag
W
—
"2 sources disagree" with a popover showing both and the conservative pick
Agent
Component
Platform
Variants
States / notes
AgentStepper
M
3-step
Per step: waiting, running (lime pulse dot), done (check + seconds), failed (critical + retry), skipped (offline)
ThoughtTrace
B
collapsed, expanded
Summary line: "7 steps · 3 sources · Ultra". Expanded is a vertical rail of TraceLines. Live-streaming variant on M4
TraceLine
B
thought, tool-call, tool-result, decision
Mono. Tool calls show the function name (get_micro_climate_forecast) plus args in muted text. Decision lines are bold ink
FilamentCanvas
B
hero, thinking, empty
WebGL/Skia strands. Static frame under reduced motion. Paused when off-screen to save battery
Results and data
Component
Platform
Variants
States / notes
VerdictBanner
B
act (forest), caution (warning-fill), stop (critical), unknown (low confidence: neutral + "Rescan closer")
Icon + imperative sentence. Never colour-only
ConfidenceMeter
B
bar, inline text
Below 60% switches to the unknown verdict. We don't fake certainty
PlanSteps
B
numbered
completed (checkbox on mobile)
CostCompare
B
2-column
Mono figures. The saving is highlighted in a forest-tinted row
PlanDiff
M
before/after
Changed lines marked by fill + "Changed" label
RecommendationRow
M
default, queued, failed, invalidated
Thumbnail 56, crop, verdict chip, time
AdvisoryCard
M
default, stale, offline
Dark surface
KpiTile
W
with sparkline, plain
loading (skeleton), error ("—" + retry), roll-up on first paint
DataTable
W
compact, comfortable; sortable, selectable
sticky header, empty, loading rows, error row, row hover, row focus
LedgerTable
W
extends DataTable
Row opens TraceDrawer
PriceTable
W
extends DataTable
ConflictFlag column
Sparkline
W
line, bar
No axes; tooltip on hover
FeedItem
W
new (lime left edge 3px, fades after 8s), default

Map
Component
Platform
Variants
States / notes
OutbreakMap
W
heat, clusters, pins (auto by zoom)
loading (basemap first, then layer), empty, error, offline (last snapshot + stamp)
ClusterMarker
W
5 embers steps
hover (ring), selected (lime ring 2px), focus-visible
MapLegend
W
—
Always visible, labelled steps (not just a gradient)
TimeScrubber
W
24h, 7d, Season
Play/pause, keyboard arrows
MapTooltip
W
—
count, disease, trend
Layout and overlays
AppBar (M), BottomDock (M), SideRail (W), TopBar (W), Card, BottomSheet (M; snap points 40% / 90%), SidePanel (W, 480px), Drawer (W), Modal (B, used sparingly), Toast (B; success and info only, never for errors that need action), Skeleton (B), EmptyState (B; illustration from FilamentCanvas still), Tabs (W).
8. States
The rule is that every state says what happened, what the user still has, and what they can do next. Loading uses skeletons shaped like the real content, never a centred spinner on a blank screen.
Screen
Empty
Loading
Error
Success
Offline
M1 Field Home
First run: "No scans yet." A still filament illustration plus a "Scan your first leaf" CTA, and the advisory still shows if cached
Advisory and rows as skeletons; the Scan button is live immediately (never block capture)
Advisory failed: "Couldn't refresh advisory", the cached one stays shown with its stamp, plus Retry
Pull-to-refresh ends with "Updated just now" in the stamp, no toast
Hatched banner "Offline · advisory cached 3h ago"; Scan still works and queues
M2 Capture
—
Camera warming: last-frame blur + "Starting camera" (target under 2s)
Permission denied: explain why plus an "Open settings" button. Camera failure: offer gallery import
Shutter flash + haptic
Works fully; the GPS chip may show "Approx. location"
M4 Analyzing
—
The AgentStepper is the loading state, so progress is real, not fake
Step failed: that step turns critical with a reason ("Weather service didn't respond"), plus Retry step or "Continue without weather" (the result is marked ungrounded)
Auto-advances to M5 after 400ms on the final check
Never reached: the scan becomes Queued (F2)
M5 Result
—
Opened from history: skeleton of the verdict and plan
Low confidence (below 60%): unknown verdict "Not sure. Rescan in daylight, closer to the lesion." This is a designed state, not an error
Save gives a check animation on the button + "Saved for offline"
Shows cached result + stamp; Share still works (text)
M6 History
"Your scans will appear here"
Row skeletons ×5
Partial sync failure: the affected rows get a red badge plus Retry
—
Queued rows show a clock badge and the top summary "3 waiting for signal"
M9 Alert
—
Diff skeleton
New plan failed: "Weather changed, but the new plan couldn't load. Don't apply the old plan." Safety first
Acknowledged: banner collapses, M6 row is tagged
Push arrived but no data: show the push text plus "Connect to see the new plan"
W2 Overview
New region, no detections: dark map with a still filament, "No detections in this region yet," and the date range shown
SSR ships KPI numbers and the basemap. The heat layer fades in; the feed shows 6 skeleton rows
Map tiles failed: a neutral placeholder plus a region list fallback. Stream dropped: the live dot turns grey, "Reconnecting…"
New detection: the feed row slides in, its map pin pulses lime once
Office internet drops: the last snapshot stays with a "Live updates paused · 2 min ago" stamp
W3 Cluster
—
Panel skeleton
"Couldn't load cluster" plus Retry; the map stays usable
Dispatch toast: "Amina assigned · notified"
Dispatch is disabled with a reason tooltip
W4 Ledger
"No grounded decisions yet. Savings appear after the first scan in this region."
Hero shows "—" (no roll-up from 0, which would read as a real zero), table skeleton
Error row plus Retry; the hero keeps its last value with a stamp
Hero roll-up on first load
Snapshot plus stamp
W5 Market
Filter returns nothing: "No prices for Cassava in Kaduna in the last 7 days" plus Clear filters
Table skeleton
Per-row "Source unavailable" rather than failing the whole table
Export: "CSV downloaded"
Snapshot plus stamp; every price is marked stale
One extra state matters: Ungrounded. When Tavily is unavailable and the agent still answers, the result carries a warning-fill banner reading "Not checked against live weather or prices." Grounding chips are replaced by a dashed "No source" chip. This is how the UI keeps principle 1 honest.
9. Responsive behaviour
Breakpoints: sm below 640 · md 640–1023 · lg 1024–1439 · xl 1440 and up. The web dashboard is designed desktop-first because the persona sits in an office. It still has to work on a manager's phone in a meeting, so it degrades into a read-and-dispatch tool, not a squashed desktop.
Surface
Mobile (sm)
Tablet (md)
Desktop (lg/xl)
Expo app
Primary target: 360×800 Android baseline (the $200 phone), single column, bottom dock, one-handed reach. Tested at 1.3× font scale
iPad/large Android: M5 splits into image + verdict left and plan + trace right; History becomes a list-detail two-pane
n/a
W2 Overview
Map becomes a 50vh card at top; KPI strip becomes a 2×2 grid; the feed sits below; SideRail becomes a bottom tab bar
KPI strip 4 across; map full width; feed moves to a tab beside the map
lg: map 65% / feed 35%. xl: adds the Ledger summary as a third column so the judge sees ROI without a click
W3 Cluster
Full-screen sheet over the map
Side panel at 50% width
Side panel 480px; the map re-centres to keep the cluster visible
W4 / W5 tables
Rows become stacked cards: the key value (saving or price) on the right, other fields as label:value lines
Table with the lowest-priority columns hidden (Source collapses into an icon)
Full table, sticky header, compact density by default at xl
L1 Landing
Hero type 40/44; filament sits behind the copy at 40% opacity; numbered cards scroll horizontally with snap
Hero 52; 2-column cards
Hero 64/68; filament on the right half; 3-up cards
Performance is part of responsiveness. On sm, the landing filament renders at half resolution and at most 30fps, and is replaced by a static WebP when saveData is on. In the app, FilamentCanvas uses Skia with a strand count cut by 60% on low-RAM devices.
10. Accessibility
The target is WCAG 2.2 AA everywhere, and AAA (7:1) for the M5 verdict, because it is read in direct sun.
Contrast (computed)
Pair
Ratio
Passes
ink on canvas
14.99:1
AAA
ink-2 on canvas
6.56:1
AA (AAA large)
ink-3 on canvas
4.67:1
AA, the floor for any text
White on forest-700 (primary button)
9.64:1
AAA
ink on lime-300
13.35:1
AAA
lime-300 on white
1.25:1
Fails. Lime is banned as text or icon on light surfaces
critical and white, either way
6.54:1
AA
grounded on white
7.17:1
AAA
line-strong input border on canvas
3.37:1
3:1 non-text
Lowest embers step (#3F5A34) on forest-900
about 2:1
Below 3:1, so step 1 always has a 1px light outline as well, and the legend gives text labels
Focus
• Focus ring: 2px forest-700 outline at 2px offset, plus a 4px lime-300 halo on dark surfaces (7.73:1 against forest). Shown only on :focus-visible. Never remove outlines without this replacement.
• Web focus order on W2: skip link ("Skip to map" / "Skip to detections") → SideRail → TopBar (region, date range) → KPI tiles → Map (one tab stop; arrow keys move between clusters inside it) → Live feed → Ledger card.
• Side panel / drawer: focus moves to its heading on open, is trapped while open, Esc closes it, and focus returns to the cluster or row that opened it.
• Mobile focus order on M5: verdict → why line → grounding chips → plan steps → economics → Trace toggle → Save. This matches the visual order, so screen-reader users get the decision first.
Keyboard (web)
Key
Action
/
Focus search or filter
g o / g l / g m
Go to Overview / Ledger / Market
Arrow keys (map focused)
Move between clusters, nearest in that direction
Enter
Open the focused cluster or table row
+ / -
Zoom map
[ / ]
Step the time scrubber
Esc
Close panel, drawer or popover
?
Shortcut sheet
The map must never be a keyboard trap. Tab always leaves it, and a "View as list" toggle gives an accessible table of the same clusters.
ARIA and semantics
• Map: role="application" with aria-label="Outbreak map, Kaduna region, 14 clusters" and aria-describedby pointing at the legend. Each focused cluster announces "Late blight, 23 detections, rising, Zaria LGA".
• Live feed: aria-live="polite", throttled to at most one announcement per 10s with batching ("3 new detections"), so screen readers aren't flooded.
• AgentStepper (M4): each step change goes to an accessibilityLiveRegion="polite" region (Android) or AccessibilityInfo.announceForAccessibility (iOS): "Grounding: checking wind in Zaria." Completion announces the verdict.
• ThoughtTrace: a button with aria-expanded and aria-controls. The trace is an ol, so order is announced.
• GroundingChip: a button labelled "Source: weather, Tavily, updated 10 minutes ago". Its popover is role="dialog", focus-managed.
• VerdictBanner: role="status" for act and caution; role="alert" for stop.
• OfflineBanner / SyncStatusPill: a status role announced on change only.
• KpiTile: roll-up numbers are aria-hidden; a visually hidden final value is read instead, so screen readers never announce counting digits.
• Charts and sparklines: role="img" with a sentence summary ("Detections rose from 12 to 41 over 7 days").
• Icons: decorative ones aria-hidden; icon-only buttons need an aria-label.
Field-specific
• Respect OS font scaling to 200% on web and 1.3× or more in the app without truncating verdicts. Plan steps wrap, they never ellipsize.
• Never use colour alone: every status pairs a colour with an icon and a word, and the heat ramp has labelled steps.
• Haptics confirm capture and save, which helps when the screen is washed out by sun.
• Copy is written to a 7th-grade reading level, with plain-language disease names first and the Latin name second. Local language support (Hausa, Yoruba, Igbo, Pidgin) is a post-MVP must; keep string lengths flexible (+40%) now so layouts survive it.