// Synthetic documentation fixtures. No accounts, credentials, or live services.
module.exports = {
  "bridge": "cadence",
  "width": 452,
  "maxHeight": 850,
  "state": {
    "jobs": [
      {
        "id": "0",
        "name": "Nightly backup",
        "command": "./scripts/backup.sh",
        "cwd": "/Users/demo/projects/atlas",
        "enabled": true,
        "schedule": {
          "times": [
            "22:00"
          ],
          "days": [
            1,
            2,
            3,
            4,
            5
          ]
        },
        "createdBy": "ui",
        "lastStatus": "ok"
      },
      {
        "id": "1",
        "name": "API health check",
        "command": "./scripts/health-check.sh",
        "cwd": "/Users/demo/projects/atlas",
        "enabled": true,
        "schedule": {
          "times": [],
          "days": [],
          "intervalMinutes": 15
        },
        "createdBy": "api",
        "lastStatus": "running"
      },
      {
        "id": "2",
        "name": "Weekly report",
        "command": "npm run report",
        "cwd": "/Users/demo/projects/atlas",
        "enabled": true,
        "schedule": {
          "times": [
            "09:00"
          ],
          "days": [
            1
          ]
        },
        "createdBy": "ui",
        "lastStatus": "fail"
      },
      {
        "id": "3",
        "name": "Refresh sample data",
        "command": "npm run seed:demo",
        "cwd": "/Users/demo/projects/atlas",
        "enabled": false,
        "schedule": {
          "times": [
            "08:30"
          ],
          "days": []
        },
        "createdBy": "api",
        "lastStatus": null
      }
    ],
    "runs": [
      {
        "id": "0",
        "jobId": "0",
        "jobName": "Nightly backup",
        "startedAt": "2026-11-04T15:49:28.428689+00:00",
        "finishedAt": "2026-11-04T15:50:28.428689+00:00",
        "exitCode": 0,
        "status": "ok",
        "stdout": "Archived 12 demo projects.\nVerified archive checksum.\nBackup complete.",
        "stderr": "",
        "triggeredBy": "schedule"
      },
      {
        "id": "1",
        "jobId": "1",
        "jobName": "Weekly report",
        "startedAt": "2026-11-04T15:29:28.428689+00:00",
        "finishedAt": "2026-11-04T15:30:28.428689+00:00",
        "exitCode": 1,
        "status": "fail",
        "stdout": "Building weekly summary\u2026",
        "stderr": "Report template not found: weekly.html\nProcess exited with code 1.",
        "triggeredBy": "schedule"
      },
      {
        "id": "2",
        "jobId": "2",
        "jobName": "API health check",
        "startedAt": "2026-11-04T15:09:28.428689+00:00",
        "finishedAt": "2026-11-04T15:10:28.428689+00:00",
        "exitCode": null,
        "status": "running",
        "stdout": "Checking https://api.example.com/health\u2026",
        "stderr": "",
        "triggeredBy": "schedule"
      }
    ],
    "apiPort": 3927,
    "platform": "darwin",
    "version": "0.2.3"
  },
  "shots": [
    {
      "name": "jobs",
      "caption": "Scheduled jobs with passing, running, failed, and paused states.",
      "action": "",
      "expect": "Nightly backup"
    },
    {
      "name": "job-details",
      "caption": "Expanded job: command, schedule, enable/disable, run, and delete actions.",
      "action": "document.querySelector(\".job-toggle\").click();",
      "expect": "Run now"
    },
    {
      "name": "run-confirmation",
      "caption": "Run-now confirmation before a command is executed.",
      "action": "document.querySelector(\"[data-act=\\\"run\\\"]\").click();",
      "expect": "Run now?"
    },
    {
      "name": "delete-confirmation",
      "caption": "Delete-job confirmation with the actual destructive-action wording.",
      "action": "document.querySelector(\"#confirm-cancel\").click();document.querySelector(\"[data-act=\\\"delete\\\"]\").click();",
      "expect": "Delete job?"
    },
    {
      "name": "history",
      "caption": "Run history with status, exit codes, stdout, and stderr.",
      "action": "document.querySelector(\"#confirm-cancel\").click();document.querySelector(\"[data-tab=\\\"history\\\"]\").click();",
      "expect": "Backup complete."
    },
    {
      "name": "new-job",
      "caption": "New calendar job: command, directory, times, weekdays, and enabled state.",
      "action": "document.querySelector(\"[data-tab=\\\"new\\\"]\").click();document.querySelector('#f-name').value='Nightly backup';document.querySelector('#f-command').value='./scripts/backup.sh';document.querySelector('#f-cwd').value='/Users/demo/projects/atlas';document.querySelector('#f-times').value='22:00';",
      "expect": "Interval minutes"
    },
    {
      "name": "interval-job",
      "caption": "Interval scheduling uses the same New form.",
      "action": "document.querySelector('#f-name').value='API health check';document.querySelector('#f-command').value='./scripts/health-check.sh';document.querySelector('#f-times').value='';document.querySelector('#f-interval').value='15';",
      "expect": "Save job"
    }
  ]
};
