# LifePilot AI — Design System

A modern "personal operating system." Calm, focused, premium. Dark-first with a vibrant accent. Feels like a high-end productivity tool, not a toy.

## Brand
- **Name:** LifePilot AI
- **Vibe:** Calm control. Spacious. Data-rich but never cluttered. Smooth, deliberate motion.

## Color (dark theme = default)
- `bg` (app background): `#0B0E14` — near-black slate
- `surface` (cards): `#151A23`
- `surfaceAlt` (raised / inputs): `#1C2330`
- `border`: `#252D3B`
- `text`: `#EAF0F7`
- `textMuted`: `#8A95A6`
- `textFaint`: `#5A6576`
- **Accent (primary):** `#6C5CE7` — electric indigo
- **Accent2 (mint/positive):** `#22D3A6`
- **Warn:** `#F59E0B`
- **Danger:** `#FF5C7C`
- **Info:** `#3B9EFF`

### Light theme
- `bg`: `#F6F8FB`, `surface`: `#FFFFFF`, `surfaceAlt`: `#EEF2F7`, `border`: `#E2E8F0`
- `text`: `#0B0E14`, `textMuted`: `#5A6576`
- Accents unchanged.

### Category / chart palette
`#6C5CE7` `#22D3A6` `#3B9EFF` `#F59E0B` `#FF5C7C` `#A78BFA` `#2DD4BF` `#FB7185` `#FBBF24` `#60A5FA`

## Typography
- System font stack (San Francisco / Roboto) for native crispness.
- **Display / greeting:** 28–34, weight 700, tight line-height.
- **Section title:** 18, weight 700.
- **Card title:** 16, weight 600.
- **Body:** 15, weight 400–500.
- **Meta / labels:** 12–13, weight 500, `textMuted`, letter-spacing 0.3 for uppercase labels.
- **Numbers (money/stats):** tabular feel, weight 700.

## Spacing & shape
- Base unit: 4. Common: 8, 12, 16, 20, 24.
- Screen horizontal padding: 20.
- Card radius: 20. Inner chips/pills: 12. Buttons: 14.
- Card padding: 16–20.
- Gap between cards: 14.

## Components
- **Card:** `surface` bg, radius 20, subtle border (`border`), no heavy shadow (use border + slight elevation on dark).
- **Stat tile:** big number + small label + tiny trend.
- **Pill / chip:** rounded 999, `surfaceAlt` bg, used for tags/categories/filters. Selected = accent bg.
- **Primary button:** accent bg, white text, radius 14, height 52.
- **Icon button:** circular, `surfaceAlt`.
- **FAB:** accent, bottom-right, used for create actions.
- **Progress ring / bar:** accent fill on `surfaceAlt` track.
- **Section header:** title left, "See all" link right in accent.

## Iconography
- `phosphor-react-native` (duotone for active/featured, regular elsewhere). Prefer icons over emoji.

## Motion
- Screen entry: subtle fade + 8px upward translate, staggered for list items.
- Press feedback: scale 0.97, opacity.
- Use `react-native-reanimated` / Animated. Keep durations 180–280ms, ease-out.

## Navigation
- Bottom tab bar (5 tabs): **Home** (dashboard), **Money** (finances), **Plan** (calendar/reminders/alarms/timetable), **Life** (diary/goals/habits/notes/timeline hub), **AI** (assistant).
- Floating-style tab bar with `surface` bg, accent for active tab.
- Stack screens push for detail/create views.
- Global search accessible from Home header.

## UX patterns
- Offline-first feel: optimistic updates everywhere (toggles, deletes, creates).
- Empty states: friendly icon + one line + a create button.
- Pull-to-refresh on list screens.
- Everything user-scoped via auth; sign-in is first run.
