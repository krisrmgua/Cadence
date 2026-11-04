# Cadence guided schedule editor QA

final result: passed

## Visual evidence

- Source visual truth: `designs/scheduling/combined-reference.png` (1046 × 1504). This combines the selected guided setup with the requested interval presets.
- Production-renderer capture: `docs/screenshots/interval-job.png` (904 × 1420; 452 × 710 CSS pixels, device scale 2).
- Full comparison: `designs/scheduling/comparison.png`.
- Focused interval controls: `designs/scheduling/interval-comparison.png`.
- State: Schedule step, Repeat on an interval selected, Every hour preset, fake API health check job, enabled.
- Density normalization: the reference is scaled proportionally to the implementation's 904-pixel width. Neither image is stretched vertically. Native 452pt panel sizing and real system typography are retained.

## Comparison history

Initial comparison found excess vertical spacing in the job summary, mode headings, and interval controls, plus an overly heavy selected outline (P2). Reduced summary padding, line height, stepper gaps, preset height, and label spacing; removed the duplicate inset outline. Rebuilt, recaptured every state, and compared the final full view and focused controls above. The schedule screen reduced from 782 to 710 CSS pixels high. No actionable P0/P1/P2 findings remain.

## Fidelity surfaces

- Typography: existing SF Pro / system sans-serif family retained. Clear title, section, choice, control, and helper hierarchy. Preset labels remain readable without wrapping. Real number/select controls replace the illustration's stylized controls.
- Spacing: compact job identity, three-step navigation, selected expandable interval choice, 3 × 2 preset grid, custom row, alternate mode, summary, and footer all follow the combined target. At short heights, the main area scrolls and sticky actions remain reachable.
- Colors: original navy background and panel tokens retained; blue selected presets, highlighted choice border, blue primary action, and muted helper text. Flat fills intentionally retain the existing app's restrained styling rather than reproducing generated glossy highlights.
- Assets: original supplied clock mark reused for the summary, rather than adding a raster illustration or substituting a new brand icon. Mock calendar summary glyph becomes the existing Cadence clock. No photography or new artwork is required.
- Copy: guided Job / Schedule / Review labels, two distinct scheduling modes, all six requested interval choices, custom units, summary, and Continue to review are present. Existing version/API subtitle remains; system timezone appears with clock-time controls and on Review. New/Edit reflects whether the user is creating or editing.

## Functional verification

Standalone Electron renderer with an isolated synthetic backend, blocked network, and temporary app data. Sixteen scenarios ran without renderer errors:

- Existing Jobs, expanded actions, run/delete dialogs, History.
- Job step with editable name, command, directory.
- All five fixed interval conversions and Custom.
- Invalid zero interval stays on Schedule with an error.
- Weekdays and two distinct clock times.
- Review before saving.
- Create payload contains only clock-time settings, with hidden interval removed.
- Existing interval job opens directly on Schedule.
- Preset change and paused status are reflected on Review.
- Update payload converts hours to minutes, clears clock/day restrictions, and preserves job identity.
- Short window at 452 × 520 CSS pixels: scrolling is available and the primary button remains inside the viewport.

Production build, renderer TypeScript check, PNG integrity/dimensions, documentation image links, and `git diff --check` passed. Installed bundle is Cadence 0.2.4, signature verified, and the installed process is running. Installer did not change job configuration files. Native accessibility attachment timed out for the accessory app; installed-menu interaction was not separately verified through CUA. The actual production renderer was visually verified through Electron captures. Windows packaging was not exercised.

## Follow-up polish

P3: Completed steps retain their numbers with completed styling instead of the illustration's checkmark; native platform radio, number, and select appearance differs slightly from generated controls.

# Jobs action cards — option 5

final result: passed

## Visual evidence

- Selected reference: `designs/jobs/reference.png`.
- Actual production renderer: `docs/screenshots/jobs.png`, 904px wide at 2x (452 CSS pixels).
- Side-by-side comparison: `designs/jobs/comparison.png`; focused cards: `designs/jobs/card-comparison.png`. Reference width normalized proportionally; no vertical stretching.
- All screenshots use synthetic jobs and output; no user commands are executed by the capture harness.
- Compared title/count, state badges, colored accent, schedule/last-run hierarchy, enabled switches, Edit/Run/overflow footer, expanded failure summary, command, and history action.
- First pass found an editor-summary class collision, excessive failure detail height, blue rather than green enabled switches, and misplaced failure/actions ordering. Renamed the card summary class, reduced spacing, matched green switches, placed failure details before the footer, and aligned the log link in the failure panel; rebuilt and recaptured.
- Native system fonts and the existing header dimensions are retained. Dates use real locale formatting and missing history says “Not run yet”. Failure uses a standard Octicon rather than the generated illustration’s glyph. These are intentional adaptations.
- Existing guided Job / Schedule / Review editor is preserved. Original uncommitted edits in the other checkout were left untouched.

## Verification

- Production build and UI/Electron TypeScript checks passed.
- 24 isolated Electron screenshot scenarios passed without renderer errors, including the original guided scheduler checks plus overflow, cancelled pause, confirmed pause, paused manual run, disabled duplicate run, correct history highlight by job ID, confirmed delete, long names without horizontal overflow, and empty list.
- Corrected two pre-existing synthetic fixture job-ID associations so failure/running previews match the actual jobs.
- Real API errors are surfaced in a visible alert; running and pending jobs disable manual Run now.
- Packaged macOS arm64 0.2.5, locally signed and verified. Installed app bundle update preserves the separate user-data directory and keeps the previous bundle in a temporary backup.
- Visual and interaction verification uses the real production renderer with a fixture bridge. Native app launch/version/signature are checked separately; this does not claim a native accessibility automation pass.

## History job filter follow-up

Added only the job dropdown to the existing History layout, per the narrowed request. Options use job IDs and include historical/deleted jobs. Selection persists across data refresh; All jobs restores the full list. View last run clears filters so its target remains reachable. Production build, TypeScript, fixture syntax validation, and 26 renderer scenarios passed, including single-job and all-job assertions. Inspected `docs/screenshots/history-job-filter.png`. The earlier screenshot-fixture quoting mistake is corrected; fixture-load errors now exit the capture process with stderr rather than an uncaught Electron dialog. Updated the installed app while preserving user data.
