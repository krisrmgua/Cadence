# Timeflow menu-bar artwork

Selected design: option 6 from the Cadence icon exploration. Green healthy hourglass includes a check cutout; red failure hourglass includes an exclamation cutout and broken top rail. The artwork was generated from the selected reference, then normalized to flat status colors and a shared transparent 256px canvas. Sources are raster assets; no generated code tracing is used.

`electron/trayIcon.ts` loads these packaged assets and supplies 1x/2x representations for an 18pt icon. PNG transparency keeps negative space open on light and dark menu bars. Health rules are unchanged: an enabled job whose last status is fail makes the icon red; all other combinations are green.
