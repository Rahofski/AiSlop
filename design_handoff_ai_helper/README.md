# Handoff: AI-Helper — Student Assignment Solver

## Overview
AI-Helper is a web app for students: paste an assignment (e.g. "write a C# console app" or "write a report on topic X"), and the system generates, compiles, tests, and packages the solution, returning a ready file (zip archive or .docx). The app has three views: a chat for submitting tasks, a subjects dashboard, and a filterable task history.

## About the Design Files
The file in this bundle (`AI-Helper.dc.html`) is a **design reference created in HTML** — a prototype showing intended look and behavior, **not production code to copy directly**. The task is to **recreate this design in the target codebase's environment** (e.g. React + a real backend) using its established patterns. If no codebase exists yet, choose an appropriate stack (suggested: React/Next.js frontend; backend with a job queue and sandboxed build/test runners, e.g. Docker + dotnet CLI for C# tasks).

## Fidelity
**High-fidelity.** Colors, typography, spacing, and interactions are final. Recreate pixel-perfectly.

## App Shell
- Full-viewport layout: `display:flex; height:100vh; overflow:hidden`.
- Left sidebar 248px fixed + main content area (flex:1).
- Page background `#f6f5f2`; sidebar/surface background `#fcfbf9`; cards/panels `#fff`.
- Font: **Golos Text** (400/500/600/700), Google Fonts. Monospace accents: **JetBrains Mono** (400/600).
- Base text color `#1d1c19`; secondary `#4a463d` / `#6f6b61`; muted `#a39e93`; borders `#e7e4dd` (lighter dividers `#eeebe4`, `#f3f1ec`).
- Accent color: `oklch(0.51 0.17 270)` (violet), hover `oklch(0.45 0.17 270)`; tint background `oklch(0.95 0.03 270)`, tint text `oklch(0.4 0.17 270)`.
- Success: bg `oklch(0.93 0.05 150)`, text `oklch(0.4–0.45 0.12 150)`. Error: bg `oklch(0.93 0.05 25)`, text `oklch(0.45 0.15 25)`.
- Links: accent violet, underline on hover.

## Screens / Views

### 1. Sidebar (persistent)
- Logo: 30×30 rounded-square (radius 8) in accent violet with a white 4-point star/spark SVG glyph + small dot top-right; wordmark "AI-Helper" 17px/700, letter-spacing -0.02em.
- Nav items: "✦ New task", "▤ Subjects", "◷ History" — 14px/600, padding 9px 10px, radius 9px. Active: violet tint bg + violet text. Hover: `#f1efe9`.
- "SUBJECTS" section label: 11px/600, uppercase, letter-spacing 0.08em, muted.
- Subject list rows: name (13.5px, ellipsis) + task count (11.5px JetBrains Mono, muted). Click → opens History pre-filtered to that subject.
- Bottom: user block above a top border — 30px circle avatar with initials, name 13px/600, subtitle ("3rd year · CS") 11.5px muted.

### 2. New task (chat) — default view
- Header bar: "New task" 16px/700 + hint "send an assignment — get a finished file back" 13px muted; bottom border; bg `#fcfbf9`.
- Message list: scrollable, padding 28px 32px, column gap 18px. Auto-scrolls to bottom on update.
- **User message**: right-aligned bubble, max-width 560px, accent violet bg, white text 14.5px/1.5, radius `14px 14px 4px 14px`, padding 12px 16px. Below: meta line 11.5px muted ("C# Programming · today, 14:02").
- **Pipeline card** (left-aligned, 420px): white card, border, radius 14px, padding 16px 18px. Title "EXECUTION PIPELINE" (12px/600 uppercase muted). Steps (gap 10px): 20px circle indicator + step name 13.5px + right-aligned note in JetBrains Mono 11.5px muted.
  - Step states: done = green tint circle with ✓; active = violet tint circle with ● pulsing (opacity 1→0.35, 1s loop), name bold; pending = `#f1efe9` circle with ·, name `#c9c4b8`.
  - Code steps: Analyzing assignment → Generating code → Compiling (dotnet build) → Running tests → Packaging. Notes e.g. "3s", "21s", "ok", "12/12", "zip".
  - Document steps: Analyzing topic → Outlining document → Writing content → Formatting & styling → Exporting to .docx.
- **Result card** (left-aligned, 420px): white card, radius 14px. Header row: 38px violet-tint icon square (🗜️ for zip / 📄 for docx), filename in JetBrains Mono 14.5px/600, meta 12px muted ("ready · compiled & tested · 46 KB"). Body: file list rows (JetBrains Mono 12.5px, name left / size right). Footer: two buttons — primary "Download archive" (violet, white text, radius 9px) and secondary "Test report" (bordered).
- **Composer** (bottom, bg `#fcfbf9`, top border, max-width 760px):
  - Row 1: subject `<select>`; type toggle pills "Code" / "Document" (active = violet filled, inactive = bordered white); right-aligned hint "📎 attach guidelines if needed".
  - Row 2: 3-row textarea (radius 12px, placeholder "Paste the assignment: what to build, which language, professor's requirements…") + primary button "Solve →" (radius 11px).
- **Simulation behavior** (prototype): on Solve, appends user bubble + pipeline card; steps advance every 900ms (first after 400ms); then result card appears, history gains a row, subject counter increments. Real implementation: submit job → stream pipeline status (WebSocket/SSE) → deliver artifact download.

### 3. Subjects
- Title "Subjects" 22px/700 + "+ Add subject" bordered button (prototype uses window.prompt; real app should use a proper dialog).
- Card grid: `repeat(auto-fill, minmax(280px, 1fr))`, gap 16px, max-width 980px.
- Card: white, border, radius 14px, padding 18px; hover border → accent violet. Contents: subject name 15.5px/700, teacher 13px `#6f6b61`, stats row 12.5px muted ("**4** tasks · last: yesterday"). Click → History filtered by subject.

### 4. History
- Title "Task history" 22px/700.
- **Filter bar** (flex, gap 8px, wraps):
  - Subject `<select>`: "All subjects" + one option per subject.
  - Period `<select>`: Any time / Last 7 days / Last 30 days / Last 3 months.
  - Status pills: All / Done / Failed. Type pills: All types / Code / Documents. Pill: radius 99px, 12.5px/600, padding 7px 13px; active = `#1d1c19` bg white text; inactive = bordered white.
  - When any filter active: right-aligned "✕ Clear filters" violet text link.
- Result count line: "N tasks" 12.5px muted.
- **Table** (white card, radius 14px, max-width 980px): grid columns `minmax(180px,1fr) 140px 90px 90px 120px`, gap 12px, row padding 13px 18px. Header: 11.5px/600 uppercase muted — Task / Subject / Date / Status / File. Rows: title 13.5px/500 ellipsis; subject `#6f6b61`; date muted 12.5px; status chip (radius 99px, green tint "Done" / red tint "Failed"); file as monospace link. Row hover bg `#faf9f6`.
- Empty state (filters match nothing): centered "Nothing matches these filters", 13.5px muted, padding 36px.
- Filters combine with AND. Prototype stores `days` age per row for period filtering; real app should filter by timestamp.

## State Management
- `view`: 'chat' | 'subjects' | 'history'.
- Chat: `draft`, `taskType` ('code'|'doc'), `subject`, `messages[]` (user / pipeline / result), running-job lock (one at a time in prototype).
- History filters: `fSubject`, `fPeriod`, `fStatus`, `fType` (each 'all' or a value); sidebar/subject-card click sets `fSubject` and navigates.
- Data: `subjects[] {name, teacher, count, last}`, `history[] {title, subject, date, type, status, file}`.
- Real app additions: auth/user, job queue status, artifact storage URLs.

## Design Tokens
- Colors: see App Shell above.
- Radii: 8 (small controls/logo), 9 (buttons/nav), 10–12 (inputs/icons), 14 (cards), 99px (pills/chips).
- Type scale: 11/11.5 labels · 12–12.5 meta · 13–13.5 body-small · 14–14.5 body · 15.5–17 headings-small · 22 page titles. Weights 400/500/600/700.
- Spacing: card padding 16–18px; page padding 28px 36px; list gaps 10–18px.
- Animations: pipeline pulse `blink` 1s infinite (opacity 1→0.35); no other motion.

## Assets
No external images. Logo is an inline SVG (violet rounded square + white 4-point star + dot). Icons are unicode glyphs (✦ ▤ ◷ 🗜️ 📄 📎) — replace with a proper icon set (e.g. Lucide) in production.

## Files
- `AI-Helper.dc.html` — full prototype (all three views, chat simulation, filters). Layout/styles are inline; behavior is in the `Component` class at the bottom of the file.
