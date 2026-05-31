# Changelog

All notable changes to Expense Tracker are documented here.
Format: [MAJOR.MINOR.PATCH.MICRO] - YYYY-MM-DD

## [0.1.0.0] - 2026-05-23

### Added
- **Penny the Fox mascot** — dynamic iOS app icon that changes expression based on
  how long since you last logged (composed → concerned → disappointed → feral → final form,
  at 6h / 24h / 48h / 72h thresholds)
- **Smart push notifications** — Penny roasts your spending by category (delivery fees,
  coffee count, late-night shopping, fast fashion, etc.), alerts at budget milestones
  (50% / 75% / 90% / 100% / 110% / 150% / 200%), nudges you if a full day goes unlogged,
  celebrates 7- and 30-day streaks, and praises staying under budget at the month midpoint
- **Voice expense capture** — hold the mic button, say your expense, and Penny's AI parses
  it into amount, description, category, and date automatically
- **Inactivity chain scheduling** — 5 notifications pre-scheduled on every save (24h, 48h,
  72h, 120h, 168h), cancelled and rescheduled fresh each time you log
- **Daily nudge system** — noon, 6pm, and 10pm nudges on days you haven't logged yet;
  automatically skipped on days you do log
- Penny icon assets (5 expressions) and widget image variants

### Changed
- App default icon updated to Penny's composed face
- Settings screen: per-category budget inputs and improved currency picker
- History, category detail, and expense detail screens: visual polish
- Receipt auto-purge: receipts older than 90 days are cleaned up automatically

### Fixed
- Stale AppState listener closure — budget preference changes now correctly affect
  Penny's foreground midpoint-praise check
- Month key format unified to 1-indexed YYYY-M across all Penny state keys
- Silent swallow of notification scheduling errors now surfaces via console.warn
- `'mac '` keyword trailing-space edge case in beauty category matching
