# Cadence screenshots

Production renderer, fictional jobs, version 0.2.4. No real commands are executed and no private application data is read.

## Recreate and verify the editor

```bash
npm install
npm run build
npx tsc -p tsconfig.json --noEmit
npx electron scripts/screenshots.cjs
```

The standalone Electron capture entry point replaces the backend with an isolated fixture bridge and blocks network access. It checks every interval preset, hour-to-minute conversion, invalid interval handling, switching to weekday clock times, create/update payloads, paused state, and a short scrollable window. Normal production IPC is unchanged. Images are captured at 2× density on macOS.

The fixture bridge is documentation/test tooling only. It never executes commands, touches real jobs, or talks to the localhost API.

## Views

### Jobs

Scheduled jobs with passing, running, failed, and paused states.

![Scheduled jobs with passing, running, failed, and paused states.](jobs.png)

### Job Details

Expanded job: command, schedule, enable/disable, run, and delete actions.

![Expanded job: command, schedule, enable/disable, run, and delete actions.](job-details.png)

### Run Confirmation

Run-now confirmation before a command is executed.

![Run-now confirmation before a command is executed.](run-confirmation.png)

### Delete Confirmation

Delete-job confirmation with the actual destructive-action wording.

![Delete-job confirmation with the actual destructive-action wording.](delete-confirmation.png)

### History

Run history with status, exit codes, stdout, and stderr.

![Run history with status, exit codes, stdout, and stderr.](history.png)

### New Job

Job step: name, command, and optional working directory.

![Job step: name, command, and optional working directory.](new-job.png)

### Interval Job

Schedule step: interval presets and custom minute/hour controls.

![Schedule step: interval presets and custom minute/hour controls.](interval-job.png)

### Custom Interval

Custom interval supports whole minutes or hours.

![Custom interval supports whole minutes or hours.](custom-interval.png)

### Invalid Interval

Invalid intervals stay on Schedule with an actionable error.

![Invalid intervals stay on Schedule with an actionable error.](invalid-interval.png)

### Specific Times

Specific times: day shortcuts, individual time pickers, and local time context.

![Specific times: day shortcuts, individual time pickers, and local time context.](specific-times.png)

### Review Job

Review the command, directory, schedule, timezone, and enabled status before saving.

![Review the command, directory, schedule, timezone, and enabled status before saving.](review-job.png)

### Saved Clock Job

Saved clock-time job with the hidden interval removed.

![Saved clock-time job with the hidden interval removed.](saved-clock-job.png)

### Edit Interval

Editing an existing interval job opens its saved Schedule directly.

![Editing an existing interval job opens its saved Schedule directly.](edit-interval.png)

### Review Interval

Review reflects a preset change and a paused job.

![Review reflects a preset change and a paused job.](review-interval.png)

### Saved Interval

Interval edit preserves job identity and submits minutes without clock-time/day restrictions.

![Interval edit preserves job identity and submits minutes without clock-time/day restrictions.](saved-interval.png)

### Short Window

Schedule remains scrollable and actions stay accessible on a shorter display.

![Schedule remains scrollable and actions stay accessible on a shorter display.](short-window.png)
