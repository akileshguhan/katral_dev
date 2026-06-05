# Dashboard Redesign — Density & Depth

**Date:** 2026-06-01  
**Scope:** Teacher dashboard + Student dashboard (both `app/teacher/dashboard/page.tsx` and `app/student/dashboard/page.tsx`)  
**Out of scope:** New backend data, new API calls, information richness (B scope), grid overhaul (C-advanced)

---

## Problem Statement

The dashboards score ~6.8/10 due to three core issues:

1. **Top section wastes ~35% of viewport height** — oversized greeting, subtitle that says nothing, full-width action button strip that duplicates sidebar actions
2. **Single flat visual plane** — all cards use only `border: 1px solid #E8E5DC`, no shadows, no elevation hierarchy. Nothing feels more important than anything else.
3. **Accent color overuse** — lime (teacher) and coral (student) appear ~10 times each. They lose all signaling power. The eye has no priority map.

---

## Goals

- Compress the top section by ~120–150px
- Establish a 3-level shadow system that creates visual hierarchy
- Reduce lime/coral to 3 use cases each
- Add one "alive" element using existing computed data
- Remove the dashed ghost card that wastes center-screen space

---

## Shadow System (canonical, used everywhere)

| Level | Value | Used on |
|-------|-------|---------|
| L1 | `0 2px 8px rgba(0,0,0,0.04)` | Stat cards |
| L2 | `0 4px 16px rgba(0,0,0,0.06)` | Classroom cards, Quick Start panel, Sessions panel |
| L3 | `0 8px 24px rgba(0,0,0,0.08)` | Featured session banner |

No other shadow values. Do not deviate.

---

## Section 1 — Top Compression

### Current structure
```
[date label]
[h1 greeting — 2.25rem]        mb-6
[subtitle — "Here's your..."]
[featured banner]
[action button strip — 2 full-width buttons] mb-8
[4 stat cards] mb-8
```

### Target structure
```
[flex row: date+greeting LEFT | action buttons RIGHT]  mb-4
[featured banner]
[4 stat cards] mb-6
```

### Specific changes

**Greeting block** (`mb-6` div containing date, h1, subtitle):
- Wrap in `flex items-center justify-between`
- h1: `text-[2.25rem]` → `text-[1.5rem]`
- Remove subtitle paragraph entirely (`"Here's your learning dashboard for today"`)
- `mb-6` → `mb-4`

**Action button strip** (the `flex gap-3 mb-8` row with two full-width buttons):
- Remove this entire block
- Move the two buttons to the right side of the greeting row as compact buttons:
  - Primary action (New Classroom / Join Classroom): `px-4 py-2 rounded-xl text-sm font-black` with accent bg
  - Secondary action (View Schedule): `px-4 py-2 rounded-xl text-sm font-black bg-white border border-[#E8E5DC]`

**Stat cards grid**: `mb-8` → `mb-6`

---

## Section 2 — Remove Ghost Placeholder Card

### Current behavior
When classrooms exist, the classroom grid always appends a dashed `min-h-[220px]` card as a creation CTA. This wastes a full card slot of prime real estate.

### Target behavior
- When `classrooms.length === 0`: keep the existing full empty-state centered block (unchanged)
- When `classrooms.length > 0`: remove the dashed card from the grid entirely

### Specific changes

**Teacher dashboard** — in `TeacherClassroomCard` grid block:
```tsx
// Remove this button entirely when classrooms.length > 0:
<button onClick={() => setShowCreate(true)}
  className="min-h-[220px] border-2 border-dashed ...">
  ...
</button>
```

**Section heading "+ New" button** — upgrade visual treatment:
- From: `text-xs font-black px-3 py-1.5 rounded-lg hover:bg-white`
- To: `text-xs font-black px-3 py-1.5 rounded-lg bg-white border border-[#E8E5DC] hover:shadow-sm transition-all`

Same pattern applies to student dashboard "+ Join" button.

---

## Section 3 — Visual Depth & Elevation

### Featured session banner
Add `boxShadow: '0 8px 24px rgba(0,0,0,0.08)'` (L3). Remove bottom `mb-5`, replace with `mb-4`.

### Stat cards
Add `boxShadow: '0 2px 8px rgba(0,0,0,0.04)'` (L1) to the existing inline style.

### Classroom cards (TeacherClassroomCard / StudentClassroomCard)
- Add `boxShadow: '0 4px 16px rgba(0,0,0,0.06)'` (L2) to the Link wrapper inline style at rest
- Hover: upgrade from `hover:-translate-y-px` → `hover:-translate-y-1 transition-all duration-150`
- On hover, shadow escalates to L3 via inline `onMouseEnter`/`onMouseLeave` handlers setting `boxShadow: '0 8px 24px rgba(0,0,0,0.08)'`. Do NOT use Tailwind `shadow-lg` — it produces a value outside the shadow system.

### Quick Start panel + Sessions panel (teacher right column)
Add `boxShadow: '0 4px 16px rgba(0,0,0,0.06)'` (L2).

### Analytics tray (bottom 3 widgets)
Wrap the existing `grid grid-cols-3 gap-6` div in:
```tsx
<div className="rounded-2xl p-5" style={{ background: '#E8E7E2' }}>
  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">
    {/* Teacher: "Analytics" | Student: "Overview" */}
  </p>
  {/* existing grid */}
</div>
```
- **Teacher dashboard** label: `Analytics`
- **Student dashboard** label: `Overview`

This creates a distinct visual layer separating this section from the main card grid.

### Secondary text contrast
All `text-gray-400` instances used as card sub-labels, section subtitles, and list metadata → `text-gray-500`. Does not apply to placeholder/empty-state text (keep those gray-400 — they should be de-emphasized).

### Live state indicator
In the analytics tray header row, add a live pulse alongside the "Analytics" label when `stats.live > 0`:
```tsx
{stats.live > 0 && (
  <span className="flex items-center gap-1.5 text-[10px] font-black text-green-600">
    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
    {stats.live} live now
  </span>
)}
```
This uses already-computed data. Zero new API calls.

---

## Section 4 — Accent Color Restraint

### Rule
Lime (#C5D000) on teacher, Coral (#E04828) on student — used **only** for:
1. Primary CTA button (one per logical region)
2. Live pulse dot
3. Avatar initials button

### Changes by occurrence

| Element | Before | After |
|---------|--------|-------|
| Weekly chart "today" bar (has sessions) | LIME / CORAL fill | INK (`#0f0e0e`) |
| Completed sessions donut ring | LIME | `#6b7280` |
| "View All Sessions" / "View Full Schedule" button | LIME / CORAL bg | INK bg, white text |
| Sidebar "New Classroom" / "Join Classroom" icon bg | LIME / CORAL | INK with white icon |
| Stats "THIS WEEK" value color | inherits INK (already) | no change |
| Stats "LIVE NOW" value color | `#16A34A` green | keep — semantic, not accent |
| Upcoming sessions list CTA ("View All" at bottom) | LIME / CORAL | INK bg, white text |

---

## Files Changed

| File | Change type |
|------|-------------|
| `app/teacher/dashboard/page.tsx` | Layout, shadows, accent, placeholder removal |
| `app/student/dashboard/page.tsx` | Layout, shadows, accent, placeholder removal |

No new components, no API changes, no new dependencies.

---

## Success Criteria

- Top section height before stat cards is visibly shorter (≥30% reduction)
- Classroom cards have a clear physical hover response (4px lift + shadow)
- Featured banner reads as the highest-priority surface on the page
- Lime / coral does not appear on any bar chart, donut ring, or secondary CTA
- Analytics section reads as a distinct visual zone
- At least one live indicator is visible when sessions are active
