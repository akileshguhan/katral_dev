# Dashboard Density & Depth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Compress the top section, remove the ghost placeholder card, establish a 3-level shadow system, wrap analytics in a visual tray, and constrain lime/coral to 3 use cases — on both teacher and student dashboards.

**Architecture:** All changes are purely presentational (JSX structure + inline styles + Tailwind classes). No new components, no API changes, no new dependencies. The two dashboard files are edited independently and in parallel — teacher first, then student by mirroring the same pattern.

**Tech Stack:** Next.js 15 App Router, React, Tailwind CSS, TypeScript. Inline styles used for all shadow/color values (no Tailwind config changes needed).

---

## File Map

| File | What changes |
|------|-------------|
| `frontend/edu-web/app/teacher/dashboard/page.tsx` | All 4 sections: top compression, ghost card removal, shadows, accent restraint |
| `frontend/edu-web/app/student/dashboard/page.tsx` | Mirror of teacher: same 4 sections with coral substituted for lime |

No files created. No other files touched.

---

## Shadow System Reference (use these exact values everywhere)

| Level | Value | Used on |
|-------|-------|---------|
| L1 | `0 2px 8px rgba(0,0,0,0.04)` | Stat cards |
| L2 | `0 4px 16px rgba(0,0,0,0.06)` | Classroom cards (rest), Quick Start panel, Sessions panel |
| L3 | `0 8px 24px rgba(0,0,0,0.08)` | Featured session banner, classroom cards (hover) |

Do not use any other shadow values. `hover:shadow-lg` and similar Tailwind shadow utilities are NOT used — they produce values outside this system.

---

## Task 1: Teacher — Top Section Compression

**File:** `frontend/edu-web/app/teacher/dashboard/page.tsx`

- [ ] **Step 1: Replace greeting block with flex row (greeting left, buttons right)**

Find the greeting block starting at line ~291:
```tsx
{/* ── 1. Page header ─────────────────────────────────────────── */}
<div className="mb-6">
  <p className="text-[11px] font-black uppercase tracking-[0.14em] text-gray-400 mb-1.5">
    {today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
  </p>
  <h1 className="text-[2.25rem] font-black tracking-tight leading-tight mb-1">
    {greeting}, {firstName}
  </h1>
  <p className="text-sm text-gray-400 font-medium">Here&apos;s your learning dashboard for today</p>
</div>
```

Replace with:
```tsx
{/* ── 1. Page header ─────────────────────────────────────────── */}
<div className="flex items-center justify-between mb-4">
  <div>
    <p className="text-[11px] font-black uppercase tracking-[0.14em] text-gray-400 mb-1.5">
      {today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
    </p>
    <h1 className="text-[1.5rem] font-black tracking-tight leading-none">
      {greeting}, {firstName}
    </h1>
  </div>
  <div className="flex items-center gap-2 shrink-0">
    <button onClick={() => setShowCreate(true)}
      className="flex items-center gap-1.5 font-black text-sm px-4 py-2 rounded-xl transition-all active:scale-[0.97] select-none"
      style={{ background: LIME, color: INK }}>
      <Plus className="w-3.5 h-3.5" /> New Classroom
    </button>
    <Link href="/teacher/schedule"
      className="flex items-center gap-1.5 font-black text-sm px-4 py-2 rounded-xl transition-all active:scale-[0.97] select-none"
      style={{ background: 'white', color: INK, border: '1px solid #E8E5DC' }}>
      View Schedule
    </Link>
  </div>
</div>
```

- [ ] **Step 2: Remove the standalone action button strip**

Find and delete the entire block starting at line ~328 (the `flex gap-3 mb-8` row):
```tsx
{/* ── 3. Action row ───────────────────────────────────────────── */}
<div className="flex gap-3 mb-8">
  <button onClick={() => setShowCreate(true)}
    className="flex items-center justify-center gap-2 font-black text-sm px-6 py-3 rounded-xl flex-1 transition-all active:scale-[0.97] select-none"
    style={{ background: LIME, color: INK }}>
    <Plus className="w-4 h-4" /> New Classroom
  </button>
  <Link href="/teacher/schedule"
    className="flex items-center justify-center gap-2 font-black text-sm px-6 py-3 rounded-xl flex-1 transition-all active:scale-[0.97] select-none"
    style={{ background: '#F7F6F3', color: INK }}>
    View Schedule
  </Link>
</div>
```

Delete this block entirely. The buttons now live in the greeting row.

- [ ] **Step 3: Tighten stat cards margin**

Find the stats grid opening tag at line ~343:
```tsx
<div className="grid grid-cols-4 gap-4 mb-8">
```
Change `mb-8` → `mb-6`:
```tsx
<div className="grid grid-cols-4 gap-4 mb-6">
```

- [ ] **Step 4: Verify visually**

Run the dev server:
```bash
cd frontend/edu-web && npm run dev
```
Open `http://localhost:3000/teacher/dashboard`. Check:
- Greeting and buttons are on the same row (flex)
- h1 is noticeably smaller than before
- No standalone button row below the greeting
- Stat cards appear sooner in the viewport

- [ ] **Step 5: Commit**

```bash
git add frontend/edu-web/app/teacher/dashboard/page.tsx
git commit -m "feat(teacher): compress top section — merge greeting and actions into one row"
```

---

## Task 2: Teacher — Remove Ghost Placeholder Card

**File:** `frontend/edu-web/app/teacher/dashboard/page.tsx`

- [ ] **Step 1: Remove the dashed ghost card from the classroom grid**

Inside the `classrooms.length > 0` branch of the classroom grid (line ~399), find and delete:
```tsx
<button onClick={() => setShowCreate(true)}
  className="min-h-[220px] border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-2.5 bg-white text-gray-300 hover:text-gray-500 transition-colors"
  style={{ borderColor: '#E8E5DC' }}>
  <div className="w-10 h-10 rounded-xl border-2 border-current flex items-center justify-center">
    <Plus className="w-5 h-5" />
  </div>
  <p className="text-xs font-bold">New classroom</p>
</button>
```

The `grid grid-cols-2 gap-4` div should now only contain `{classrooms.map(...)}` — no ghost card.

- [ ] **Step 2: Strengthen the section heading "+ New" button**

Find the heading "+ New" button at line ~377:
```tsx
<button onClick={() => setShowCreate(true)}
  className="text-xs font-black px-3 py-1.5 rounded-lg hover:bg-white active:scale-[0.95] transition-all"
  style={{ color: INK }}>+ New</button>
```

Replace with:
```tsx
<button onClick={() => setShowCreate(true)}
  className="text-xs font-black px-3 py-1.5 rounded-lg bg-white hover:shadow-sm active:scale-[0.95] transition-all"
  style={{ color: INK, border: '1px solid #E8E5DC' }}>+ New</button>
```

- [ ] **Step 3: Verify visually**

Reload `http://localhost:3000/teacher/dashboard` with at least one classroom. Check:
- Grid ends at the last real classroom card — no empty dashed slot
- "+ New" button in the "Your Classrooms" heading has a white pill treatment
- Empty state (zero classrooms) still shows the full centered dashed block — test this by commenting out classrooms temporarily if needed

- [ ] **Step 4: Commit**

```bash
git add frontend/edu-web/app/teacher/dashboard/page.tsx
git commit -m "feat(teacher): remove ghost placeholder card from classroom grid"
```

---

## Task 3: Teacher — Visual Depth & Elevation

**File:** `frontend/edu-web/app/teacher/dashboard/page.tsx`

- [ ] **Step 1: Add L3 shadow to featured session banner**

Find the featured banner div at line ~304:
```tsx
<div className="rounded-2xl px-6 py-5 mb-5 flex items-center justify-between gap-6"
  style={{ background: '#1C1C1C' }}>
```

Change to:
```tsx
<div className="rounded-2xl px-6 py-5 mb-4 flex items-center justify-between gap-6"
  style={{ background: '#1C1C1C', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}>
```

- [ ] **Step 2: Add L1 shadow to stat cards**

Find the stat card div at line ~350:
```tsx
<div key={label} className="rounded-2xl bg-white p-5" style={{ border: '1px solid #E8E5DC' }}>
```

Change to:
```tsx
<div key={label} className="rounded-2xl bg-white p-5" style={{ border: '1px solid #E8E5DC', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
```

- [ ] **Step 3: Add L2 shadow and improved hover to classroom cards**

Inside `TeacherClassroomCard` (bottom of the file), find the Link wrapper at line ~847:
```tsx
<Link href={`/teacher/classroom/${classroom.id}`}
  className="block bg-white rounded-2xl overflow-hidden transition-all hover:-translate-y-px"
  style={{ border: '1px solid #E8E5DC' }}>
```

Replace with:
```tsx
<Link href={`/teacher/classroom/${classroom.id}`}
  className="block bg-white rounded-2xl overflow-hidden transition-all duration-150 hover:-translate-y-1"
  style={{ border: '1px solid #E8E5DC', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}
  onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)' }}
  onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.06)' }}>
```

- [ ] **Step 4: Add L2 shadow to Quick Start panel**

Find the Quick Start panel div at line ~433:
```tsx
<div className="rounded-2xl bg-white overflow-hidden" style={{ border: '1px solid #E8E5DC' }}>
  <div className="px-4 py-2.5 flex items-center gap-2" style={{ background: INK }}>
    <Zap className="w-3.5 h-3.5 shrink-0" style={{ color: LIME }} />
    <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: LIME }}>Quick Start</p>
```

Change the outer div:
```tsx
<div className="rounded-2xl bg-white overflow-hidden" style={{ border: '1px solid #E8E5DC', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
```

- [ ] **Step 5: Add L2 shadow to Upcoming Sessions panel**

Find the Upcoming Sessions panel div at line ~471:
```tsx
<div className="rounded-2xl bg-white overflow-hidden" style={{ border: '1px solid #E8E5DC' }}>
  <div className="px-4 py-3" style={{ borderBottom: '1px solid #F5F3EE' }}>
    <p className="text-xs font-black text-gray-900">Upcoming Sessions</p>
```

Change the outer div:
```tsx
<div className="rounded-2xl bg-white overflow-hidden" style={{ border: '1px solid #E8E5DC', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
```

- [ ] **Step 6: Wrap bottom widgets in analytics tray**

Find the bottom widgets section at line ~532:
```tsx
{/* ── 6. Bottom row — interactive widgets ────────────────────── */}
<div className="grid grid-cols-3 gap-6">
```

Replace the opening of this section with:
```tsx
{/* ── 6. Bottom row — analytics tray ─────────────────────────── */}
<div className="rounded-2xl p-5" style={{ background: '#E8E7E2' }}>
  <div className="flex items-center justify-between mb-4">
    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Analytics</p>
    {sessionsReady && stats.live > 0 && (
      <span className="flex items-center gap-1.5 text-[10px] font-black text-green-600">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
        {stats.live} live now
      </span>
    )}
  </div>
  <div className="grid grid-cols-3 gap-6">
```

Then find the closing `</div>` of the grid (after the three widgets, before `</div></main>`) and add one extra `</div>` to close the tray wrapper. The structure becomes:
```tsx
    </div>{/* end grid */}
  </div>{/* end analytics tray */}
```

- [ ] **Step 7: Upgrade secondary text contrast**

Do a targeted find-and-replace on section subtitle lines within the main content area. Change these specific `text-gray-400` instances to `text-gray-500`:
- "Manage and monitor your active classes" (line ~375)
- "Quick start or view upcoming" (line ~426)
- "Your scheduled classes" (line ~473)
- "All sessions at a glance" (line ~636)
- "7-day session trend" (line ~712)

These are subtitle/description lines directly under section headings. Do NOT change `text-gray-400` on empty-state text or placeholder labels — those stay de-emphasized.

- [ ] **Step 8: Verify visually**

Reload the page. Check:
- Featured banner has a visible shadow that lifts it above the page
- Classroom cards cast a shadow at rest; on hover they lift 4px and shadow deepens
- The bottom 3 widgets sit inside a warm `#E8E7E2` tray with "Analytics" label
- If `stats.live > 0`, a pulsing green dot appears next to "Analytics" in the tray header

- [ ] **Step 9: Commit**

```bash
git add frontend/edu-web/app/teacher/dashboard/page.tsx
git commit -m "feat(teacher): add 3-level shadow system, hover elevation, analytics tray, live indicator"
```

---

## Task 4: Teacher — Accent Color Restraint

**File:** `frontend/edu-web/app/teacher/dashboard/page.tsx`

- [ ] **Step 1: Change weekly chart "today" bar color**

Find the `bgCol` variable inside the bar chart (line ~568):
```tsx
const bgCol  = isHov  ? INK
             : isT && count > 0 ? LIME
             : isT    ? '#E8F9C0'
             : count > 0 ? '#DCDFE6'
             : '#F0EDE8'
```

Replace with:
```tsx
const bgCol  = isHov  ? INK
             : isT && count > 0 ? INK
             : isT    ? '#D0D0CB'
             : count > 0 ? '#DCDFE6'
             : '#F0EDE8'
```

Today-with-sessions now shows INK (strong, obvious). Today-empty shows a warm neutral tint. Hover (which also uses INK) is visually distinguished by the tooltip and scale transform.

- [ ] **Step 2: Change completed sessions donut ring color**

Find the "Done" DonutRing in the Session Breakdown widget at line ~659:
```tsx
<DonutRing value={stats.ended} total={Math.max(allSessions.length, 1)}
  color={LIME} size={72} thickness={7}
  centerLabel={String(stats.ended)} centerSub="done" />
```

Change `color={LIME}` → `color="#6b7280"`:
```tsx
<DonutRing value={stats.ended} total={Math.max(allSessions.length, 1)}
  color="#6b7280" size={72} thickness={7}
  centerLabel={String(stats.ended)} centerSub="done" />
```

- [ ] **Step 3: Change completed sessions segment in the stacked bar**

Find the stacked color bar at line ~674:
```tsx
{ v: stats.live,     c: '#16A34A' },
{ v: stats.upcoming, c: '#3B7FE8' },
{ v: stats.ended,    c: LIME },
```

Change last line:
```tsx
{ v: stats.live,     c: '#16A34A' },
{ v: stats.upcoming, c: '#3B7FE8' },
{ v: stats.ended,    c: '#6b7280' },
```

- [ ] **Step 4: Change "View All Sessions" button to INK**

Find the sessions panel CTA at line ~519:
```tsx
<Link href="/teacher/schedule"
  className="block w-full text-center text-sm font-black py-2.5 rounded-xl transition-all active:scale-[0.97]"
  style={{ background: LIME, color: INK }}>
  View All Sessions
</Link>
```

Change to:
```tsx
<Link href="/teacher/schedule"
  className="block w-full text-center text-sm font-black py-2.5 rounded-xl transition-all active:scale-[0.97] text-white"
  style={{ background: INK }}>
  View All Sessions
</Link>
```

- [ ] **Step 5: Change sidebar "New Classroom" icon background**

Find the sidebar button icon at line ~243:
```tsx
<div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0" style={{ background: LIME }}>
  <Plus className="w-3.5 h-3.5" />
</div>
```

Change to:
```tsx
<div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0" style={{ background: INK }}>
  <Plus className="w-3.5 h-3.5 text-white" />
</div>
```

- [ ] **Step 6: Verify accent usage**

Search the file for occurrences of `LIME`:
```bash
grep -n "LIME" frontend/edu-web/app/teacher/dashboard/page.tsx
```

Expected remaining uses of `LIME` (these are correct, keep them):
1. Avatar initials button background (`style={{ background: LIME }}`)
2. The greeting row "New Classroom" button background
3. Quick Start "Start Now" button background
4. Quick Start header Zap icon color
5. `const LIME = '#C5D000'` definition

Any other `LIME` occurrence is an accent violation — fix it.

- [ ] **Step 7: Commit**

```bash
git add frontend/edu-web/app/teacher/dashboard/page.tsx
git commit -m "feat(teacher): restrain lime accent to 3 use cases — CTA, live dot, avatar"
```

---

## Task 5: Student — Top Section Compression

**File:** `frontend/edu-web/app/student/dashboard/page.tsx`

Mirrors Task 1 exactly, with CORAL instead of LIME and UserPlus instead of Plus.

- [ ] **Step 1: Replace greeting block with flex row**

Find the greeting block at line ~313:
```tsx
{/* ── 1. Page header ─────────────────────────────────────────── */}
<div className="mb-6">
  <p className="text-[11px] font-black uppercase tracking-[0.14em] text-gray-400 mb-1.5">
    {today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
  </p>
  <h1 className="text-[2.25rem] font-black tracking-tight leading-tight mb-1">
    {greeting}, {firstName}
  </h1>
  <p className="text-sm text-gray-400 font-medium">Here&apos;s your learning dashboard for today</p>
</div>
```

Replace with:
```tsx
{/* ── 1. Page header ─────────────────────────────────────────── */}
<div className="flex items-center justify-between mb-4">
  <div>
    <p className="text-[11px] font-black uppercase tracking-[0.14em] text-gray-400 mb-1.5">
      {today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
    </p>
    <h1 className="text-[1.5rem] font-black tracking-tight leading-none">
      {greeting}, {firstName}
    </h1>
  </div>
  <div className="flex items-center gap-2 shrink-0">
    <button onClick={() => setShowJoin(true)}
      className="flex items-center gap-1.5 font-black text-sm px-4 py-2 rounded-xl transition-all active:scale-[0.97] select-none text-white"
      style={{ background: CORAL }}>
      <UserPlus className="w-3.5 h-3.5" /> Join Classroom
    </button>
    <Link href="/student/schedule"
      className="flex items-center gap-1.5 font-black text-sm px-4 py-2 rounded-xl transition-all active:scale-[0.97] select-none"
      style={{ background: 'white', color: INK, border: '1px solid #E8E5DC' }}>
      View Schedule
    </Link>
  </div>
</div>
```

- [ ] **Step 2: Remove the standalone action button strip**

Find and delete the entire `flex gap-3 mb-8` block at line ~351:
```tsx
{/* ── 3. Action row ───────────────────────────────────────────── */}
<div className="flex gap-3 mb-8">
  <button onClick={() => setShowJoin(true)}
    className="flex items-center justify-center gap-2 font-black text-sm px-6 py-3 rounded-xl flex-1 text-white transition-all active:scale-[0.97] select-none"
    style={{ background: CORAL }}>
    <UserPlus className="w-4 h-4" /> Join a Classroom
  </button>
  <Link href="/student/schedule"
    className="flex items-center justify-center gap-2 font-black text-sm px-6 py-3 rounded-xl flex-1 transition-all active:scale-[0.97] select-none"
    style={{ background: '#F7F6F3', color: INK }}>
    View Schedule
  </Link>
</div>
```

- [ ] **Step 3: Tighten stat cards margin**

```tsx
// Before:
<div className="grid grid-cols-4 gap-4 mb-8">

// After:
<div className="grid grid-cols-4 gap-4 mb-6">
```

- [ ] **Step 4: Verify and commit**

Open `http://localhost:3000/student/dashboard`. Check greeting row matches teacher layout pattern. Then:
```bash
git add frontend/edu-web/app/student/dashboard/page.tsx
git commit -m "feat(student): compress top section — merge greeting and actions into one row"
```

---

## Task 6: Student — Remove Ghost Placeholder Card

**File:** `frontend/edu-web/app/student/dashboard/page.tsx`

- [ ] **Step 1: Remove ghost card from classroom grid**

Inside the `classrooms.length > 0` branch at line ~421, find and delete:
```tsx
<button onClick={() => setShowJoin(true)}
  className="min-h-[220px] border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-2.5 bg-white text-gray-300 hover:text-gray-500 transition-colors"
  style={{ borderColor: '#E8E5DC' }}>
  <div className="w-10 h-10 rounded-xl border-2 border-current flex items-center justify-center">
    <UserPlus className="w-5 h-5" />
  </div>
  <p className="text-xs font-bold">Join classroom</p>
</button>
```

- [ ] **Step 2: Strengthen the "+ Join" heading button**

Find the "My Classrooms" heading button at line ~399:
```tsx
<button onClick={() => setShowJoin(true)}
  className="text-xs font-black px-3 py-1.5 rounded-lg hover:bg-white active:scale-[0.95] transition-all"
  style={{ color: INK }}>+ Join</button>
```

Replace with:
```tsx
<button onClick={() => setShowJoin(true)}
  className="text-xs font-black px-3 py-1.5 rounded-lg bg-white hover:shadow-sm active:scale-[0.95] transition-all"
  style={{ color: INK, border: '1px solid #E8E5DC' }}>+ Join</button>
```

- [ ] **Step 3: Commit**

```bash
git add frontend/edu-web/app/student/dashboard/page.tsx
git commit -m "feat(student): remove ghost placeholder card from classroom grid"
```

---

## Task 7: Student — Visual Depth & Elevation

**File:** `frontend/edu-web/app/student/dashboard/page.tsx`

- [ ] **Step 1: Add L3 shadow to featured session banner**

Find the featured banner at line ~326:
```tsx
<div className="rounded-2xl px-6 py-5 mb-5 flex items-center justify-between gap-6"
  style={{ background: '#1C1C1C' }}>
```

Change to:
```tsx
<div className="rounded-2xl px-6 py-5 mb-4 flex items-center justify-between gap-6"
  style={{ background: '#1C1C1C', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}>
```

- [ ] **Step 2: Add L1 shadow to stat cards**

Find at line ~372:
```tsx
<div key={label} className="rounded-2xl bg-white p-5" style={{ border: '1px solid #E8E5DC' }}>
```

Change to:
```tsx
<div key={label} className="rounded-2xl bg-white p-5" style={{ border: '1px solid #E8E5DC', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
```

- [ ] **Step 3: Add L2 shadow and improved hover to classroom cards**

Inside `StudentClassroomCard` (bottom of the file), find the Link wrapper at line ~804:
```tsx
<Link href={`/student/classroom/${classroom.id}`}
  className="block bg-white rounded-2xl overflow-hidden transition-all hover:-translate-y-px"
  style={{ border: '1px solid #E8E5DC' }}>
```

Replace with:
```tsx
<Link href={`/student/classroom/${classroom.id}`}
  className="block bg-white rounded-2xl overflow-hidden transition-all duration-150 hover:-translate-y-1"
  style={{ border: '1px solid #E8E5DC', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}
  onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)' }}
  onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.06)' }}>
```

- [ ] **Step 4: Add L2 shadow to Upcoming Classes panel**

Find the upcoming classes panel at line ~447:
```tsx
<div className="rounded-2xl bg-white overflow-hidden" style={{ border: '1px solid #E8E5DC' }}>
```
(Note: student has one right-column panel here, not two like teacher)

Change to:
```tsx
<div className="rounded-2xl bg-white overflow-hidden" style={{ border: '1px solid #E8E5DC', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
```

- [ ] **Step 5: Wrap bottom widgets in "Overview" analytics tray**

Find the bottom widgets section at line ~501:
```tsx
{/* ── 6. Bottom row — interactive widgets ────────────────────── */}
<div className="grid grid-cols-3 gap-6">
```

Replace with:
```tsx
{/* ── 6. Bottom row — overview tray ──────────────────────────── */}
<div className="rounded-2xl p-5" style={{ background: '#E8E7E2' }}>
  <div className="flex items-center justify-between mb-4">
    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Overview</p>
    {sessionsReady && stats.live > 0 && (
      <span className="flex items-center gap-1.5 text-[10px] font-black text-green-600">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
        {stats.live} live now
      </span>
    )}
  </div>
  <div className="grid grid-cols-3 gap-6">
```

Add the closing `</div>` for the tray after the grid's closing `</div>`:
```tsx
    </div>{/* end grid */}
  </div>{/* end overview tray */}
```

- [ ] **Step 6: Upgrade secondary text contrast**

Change these specific `text-gray-400` subtitle lines to `text-gray-500`:
- "Your enrolled classes" (line ~397)
- "Your scheduled sessions" (line ~445)
- "Sessions you attended" (line ~597)
- "Real-time countdown" (line ~664)

Do NOT change empty-state text or placeholder labels.

- [ ] **Step 7: Verify and commit**

Open `http://localhost:3000/student/dashboard`. Check shadows, hover lift, tray section. Then:
```bash
git add frontend/edu-web/app/student/dashboard/page.tsx
git commit -m "feat(student): add 3-level shadow system, hover elevation, overview tray, live indicator"
```

---

## Task 8: Student — Accent Color Restraint

**File:** `frontend/edu-web/app/student/dashboard/page.tsx`

- [ ] **Step 1: Change weekly chart "today" bar color**

Find the `bg` variable inside the student bar chart (line ~534):
```tsx
const bg    = isHov  ? INK
            : isT && count > 0 ? CORAL
            : isT    ? '#F5C5B5'
            : count > 0 ? '#DCDFE6'
            : '#F0EDE8'
```

Replace with:
```tsx
const bg    = isHov  ? INK
            : isT && count > 0 ? INK
            : isT    ? '#D0D0CB'
            : count > 0 ? '#DCDFE6'
            : '#F0EDE8'
```

- [ ] **Step 2: Keep the attendance ring color as-is (semantic exception)**

The attendance ring uses:
```tsx
const ringColor = pct >= 80 ? '#16A34A' : pct >= 60 ? '#F59E0B' : CORAL
```

This is a traffic-light warning indicator (green/amber/red) — identical in nature to `#16A34A` for live count. It is **semantic, not decorative**. Do NOT change this. Leave it as CORAL when attendance < 60%.

- [ ] **Step 3: Change "View Full Schedule" button to INK**

Find the upcoming classes panel CTA at line ~490:
```tsx
<Link href="/student/schedule"
  className="block w-full text-center text-sm font-black py-2.5 rounded-xl text-white transition-all active:scale-[0.97] select-none"
  style={{ background: CORAL }}>
  View Full Schedule
</Link>
```

Change to:
```tsx
<Link href="/student/schedule"
  className="block w-full text-center text-sm font-black py-2.5 rounded-xl text-white transition-all active:scale-[0.97] select-none"
  style={{ background: INK }}>
  View Full Schedule
</Link>
```

- [ ] **Step 4: Change "Join Live Now" / "Enter When Live" button to INK**

Find the next class CTA at line ~694:
```tsx
<Link href={`/student/session/${nextSession.id}`}
  className="w-full flex items-center justify-center gap-2 font-black text-sm py-2.5 rounded-xl transition-all hover:-translate-y-px active:scale-[0.98] text-white"
  style={{ background: CORAL }}>
```

Change to:
```tsx
<Link href={`/student/session/${nextSession.id}`}
  className="w-full flex items-center justify-center gap-2 font-black text-sm py-2.5 rounded-xl transition-all hover:-translate-y-px active:scale-[0.98] text-white"
  style={{ background: INK }}>
```

- [ ] **Step 5: Change sidebar "Join Classroom" icon background**

Find at line ~265:
```tsx
<div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0" style={{ background: CORAL }}>
  <UserPlus className="w-3.5 h-3.5 text-white" />
</div>
```

Change to:
```tsx
<div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0" style={{ background: INK }}>
  <UserPlus className="w-3.5 h-3.5 text-white" />
</div>
```

- [ ] **Step 6: Verify accent usage**

```bash
grep -n "CORAL" frontend/edu-web/app/student/dashboard/page.tsx
```

Expected remaining CORAL uses:
1. `const CORAL = '#E04828'` definition
2. Avatar initials button background
3. The greeting row "Join Classroom" button background
4. Header "Join Classroom" button (top-right nav)
5. Attendance ring `ringColor` (semantic exception — conditionally CORAL when pct < 60)
6. `stats.live` sidebar pulse dot color

Any other occurrence is a violation — fix it.

- [ ] **Step 7: Final visual check**

Open both dashboards side-by-side:
- `http://localhost:3000/teacher/dashboard`
- `http://localhost:3000/student/dashboard`

Verify the success criteria from the spec:
- [ ] Top section is visibly shorter — greeting and buttons on one row
- [ ] No ghost card in classroom grid
- [ ] Featured banner casts a shadow that lifts it above everything
- [ ] Classroom cards lift 4px on hover with deepened shadow
- [ ] Bottom widgets sit inside a warm tray
- [ ] Lime/coral appears only on: avatar, primary CTA button, live pulse dot
- [ ] No lime/coral on any chart bar, donut ring, or secondary CTA

- [ ] **Step 8: Commit**

```bash
git add frontend/edu-web/app/student/dashboard/page.tsx
git commit -m "feat(student): restrain coral accent to 3 use cases — CTA, live dot, avatar"
```

---

## Self-Review Notes

**Spec coverage check:**
- Section 1 (top compression): Tasks 1, 5 ✅
- Section 2 (ghost card): Tasks 2, 6 ✅
- Section 3 (depth/shadows/tray/live indicator/text contrast): Tasks 3, 7 ✅
- Section 4 (accent restraint): Tasks 4, 8 ✅
- Shadow system table: referenced in every shadow-adding step ✅

**Placeholder scan:** No TBDs, no vague instructions — every step includes exact code.

**Type consistency:** No new types introduced. All inline style properties are standard React `CSSProperties`. `onMouseEnter`/`onMouseLeave` cast to `HTMLAnchorElement` consistently in Tasks 3 and 7.
