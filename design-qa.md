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
