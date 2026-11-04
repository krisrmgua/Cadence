// Synthetic documentation fixtures and end-to-end editor scenarios.
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
        "jobId": "2",
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
        "jobId": "1",
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
    "version": "0.2.5"
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
      "caption": "Job details: command, failure summary, last-run logs, and quick actions.",
      "action": "document.querySelector(\"[data-act=details]\").click();",
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
    {name:'history-job-filter',caption:'History filtered to one job.',action:'document.querySelector("#history-job-filter").value="2";document.querySelector("#history-job-filter").dispatchEvent(new Event("change",{bubbles:true}));',check:'document.querySelectorAll("[data-run-id]").length===1 && document.querySelector("[data-run-id]").dataset.runId==="1"'},
    {name:'history-all-jobs',caption:'All jobs restores the complete history.',action:'document.querySelector("#history-job-filter").value="";document.querySelector("#history-job-filter").dispatchEvent(new Event("change",{bubbles:true}));',check:'document.querySelectorAll("[data-run-id]").length===3'},
    {
      "name": "new-job",
      "caption": "Job step: name, command, and optional working directory.",
      "action": "document.querySelector(\"[data-tab=\\\"new\\\"]\").click();document.querySelector(\"#f-name\").value=\"API health check\";document.querySelector(\"#f-name\").dispatchEvent(new Event(\"input\",{bubbles:true}));document.querySelector(\"#f-command\").value=\"./scripts/check-health.sh\";document.querySelector(\"#f-command\").dispatchEvent(new Event(\"input\",{bubbles:true}));document.querySelector(\"#f-cwd\").value=\"/Users/demo/projects/atlas\";document.querySelector(\"#f-cwd\").dispatchEvent(new Event(\"input\",{bubbles:true}));",
      "expect": "What should this job do?",
      "check": ""
    },
    {
      "name": "interval-job",
      "caption": "Schedule step: interval presets and custom minute/hour controls.",
      "action": "document.querySelector(\"#form-save\").click();",
      "expect": "Every hour, every day.",
      "check": "document.querySelector(\"#interval-choice\").classList.contains(\"selected\")"
    },
    {
      "name": "custom-interval",
      "caption": "Custom interval supports whole minutes or hours.",
      "action": "document.querySelector('[data-interval=\"5\"]').click();if(!document.querySelector(\"#schedule-blurb\").textContent.includes(\"5 minutes\"))throw new Error(\"Preset conversion failed\");document.querySelector('[data-interval=\"15\"]').click();if(!document.querySelector(\"#schedule-blurb\").textContent.includes(\"15 minutes\"))throw new Error(\"Preset conversion failed\");document.querySelector('[data-interval=\"30\"]').click();if(!document.querySelector(\"#schedule-blurb\").textContent.includes(\"30 minutes\"))throw new Error(\"Preset conversion failed\");document.querySelector('[data-interval=\"360\"]').click();if(!document.querySelector(\"#schedule-blurb\").textContent.includes(\"6 hours\"))throw new Error(\"Preset conversion failed\");document.querySelector('[data-interval=\"60\"]').click();if(!document.querySelector(\"#schedule-blurb\").textContent.includes(\"Every hour\"))throw new Error(\"Preset conversion failed\");document.querySelector(\"[data-interval=\\\"custom\\\"]\").click();document.querySelector(\"#f-interval\").value=\"2\";document.querySelector(\"#f-interval\").dispatchEvent(new Event(\"input\",{bubbles:true}));document.querySelector(\"#f-interval-unit\").value=\"hours\";document.querySelector(\"#f-interval-unit\").dispatchEvent(new Event(\"change\",{bubbles:true}));",
      "expect": "Every 2 hours",
      "check": ""
    },
    {
      "name": "invalid-interval",
      "caption": "Invalid intervals stay on Schedule with an actionable error.",
      "action": "document.querySelector(\"#f-interval\").value=\"0\";document.querySelector(\"#f-interval\").dispatchEvent(new Event(\"input\",{bubbles:true}));document.querySelector(\"#form-save\").click();",
      "expect": "Use a positive whole number",
      "check": ""
    },
    {
      "name": "specific-times",
      "caption": "Specific times: day shortcuts, individual time pickers, and local time context.",
      "action": "document.querySelector(\"[name=\\\"schedule-mode\\\"][value=\\\"times\\\"]\").click();document.querySelector(\"[data-days=\\\"weekdays\\\"]\").click();document.querySelector(\"#add-time\").click();",
      "expect": "Weekdays at 9:00 AM and 5:30 PM.",
      "check": ""
    },
    {
      "name": "review-job",
      "caption": "Review the command, directory, schedule, timezone, and enabled status before saving.",
      "action": "document.querySelector(\"#form-save\").click();",
      "expect": "Ready to save?",
      "check": "document.querySelector(\"#form-save\").textContent===\"Save job\""
    },
    {
      "name": "saved-clock-job",
      "caption": "Saved clock-time job with the hidden interval removed.",
      "action": "document.querySelector(\"#form-save\").click();",
      "expect": "API health check",
      "check": "window.screenshotTest.saved().length===1 && window.screenshotTest.saved()[0].schedule.intervalMinutes===undefined && window.screenshotTest.saved()[0].schedule.times.join(\",\")===\"09:00,17:30\" && window.screenshotTest.saved()[0].schedule.days.join(\",\")===\"1,2,3,4,5\""
    },
    {
      "name": "edit-interval",
      "caption": "Editing an existing interval job opens its saved Schedule directly.",
      "action": "document.querySelector(\".job-card[data-id=\\\"1\\\"] [data-act=details]\").click();document.querySelector(\".job-card[data-id=\\\"1\\\"] [data-act=\\\"edit\\\"]\").click();",
      "expect": "Every 15 minutes, every day.",
      "check": ""
    },
    {
      "name": "review-interval",
      "caption": "Review reflects a preset change and a paused job.",
      "action": "document.querySelector(\"[data-interval=\\\"60\\\"]\").click();document.querySelector(\"#f-enabled\").click();document.querySelector(\"#form-save\").click();",
      "expect": "Paused \u2014 will not run until enabled",
      "check": ""
    },
    {
      "name": "saved-interval",
      "caption": "Interval edit preserves job identity and submits minutes without clock-time/day restrictions.",
      "action": "document.querySelector(\"#form-save\").click();",
      "expect": "API health check",
      "check": "window.screenshotTest.saved().length===2 && window.screenshotTest.saved()[1].schedule.intervalMinutes===60 && window.screenshotTest.saved()[1].schedule.times.length===0 && window.screenshotTest.saved()[1].schedule.days.length===0 && window.screenshotTest.saved()[1].enabled===false"
    },
    {
      "name": "short-window",
      "caption": "Schedule remains scrollable and actions stay accessible on a shorter display.",
      "action": "document.querySelector('.job-card[data-id=\"1\"] [data-act=details]').click();document.querySelector('.job-card[data-id=\"1\"] [data-act=\"edit\"]').click();",
      "height": 520,
      "expect": "How often should it run?",
      "check": "document.querySelector(\"#form-save\").getBoundingClientRect().bottom<=innerHeight && document.querySelector(\"main\").scrollHeight>document.querySelector(\"main\").clientHeight"
    },
    {name:'job-actions-menu',caption:'Compact overflow menu keeps destructive actions separate.',action:'document.querySelector("[data-tab=jobs]").click();document.querySelector(".job-menu summary").click();',expect:'Delete job…'},
    {name:'pause-cancel',caption:'Cancel leaves the schedule enabled.',action:'document.querySelector(".job-switch").click();document.querySelector("#confirm-cancel").click();',check:'document.querySelector(".job-switch").getAttribute("aria-checked")==="true"'},
    {name:'paused-job',caption:'Pausing updates the visible switch and status.',action:'document.querySelector(".job-switch").click();document.querySelector("#confirm-ok").click();',check:'document.querySelector(".job-switch").getAttribute("aria-checked")==="false"'},
    {name:'manual-run',caption:'Paused schedules can still run manually, with duplicate runs disabled.',action:'document.querySelector("[data-act=run]").click();document.querySelector("#confirm-ok").click();',check:'document.querySelector("[data-act=run]").disabled && window.screenshotTest.calls().filter(c=>c.action==="run").length===1'},
    {name:'linked-history',caption:'View last run opens and highlights the correct execution.',action:'document.querySelector("[data-act=history]").click();',check:'document.querySelector(".selected-run").dataset.runId==="0"'},
    {name:'delete-job',caption:'Confirmed deletion removes only the selected job.',action:'document.querySelector("[data-tab=jobs]").click();document.querySelector("[data-act=delete]").click();document.querySelector("#confirm-ok").click();',check:'!document.querySelector(".action-card[data-id=demo-created]") && window.screenshotTest.calls().some(c=>c.action==="delete")'}
,
    {name:'long-job-name',caption:'Long job names wrap while actions stay in the panel.',patch:{jobs:[{id:'long',name:'Archive and verify the development team’s complete weekly project snapshots',command:'echo demo',enabled:true,createdBy:'ui',schedule:{times:['09:00','12:00','18:00'],days:[1,3,5]}}],runs:[]},check:'document.documentElement.scrollWidth<=innerWidth && document.querySelector("[data-act=run]").getBoundingClientRect().right<=innerWidth'},
    {name:'empty-jobs',caption:'An empty Jobs list offers a clear starting point.',patch:{jobs:[],runs:[]},expect:'Choose New to schedule your first job.'}

  ]
};
