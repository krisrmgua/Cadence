# Timeflow menu-bar artwork

Selected design: option 6 from the Cadence icon exploration. The hourglass rails stay white. The healthy center is a green diamond with a check cutout; the failure center is the red exclamation diamond, and the broken top rail stays white. The artwork was generated from the selected reference, then normalized onto a shared transparent 256px canvas. Sources are raster assets; no generated code tracing is used.

`electron/trayIcon.ts` loads these packaged assets and supplies 1x/2x representations for an 18pt icon. PNG transparency keeps negative space open on light and dark menu bars. Health rules are unchanged: an enabled job whose last status is fail turns the center red; all other combinations keep the center green.
