const { contextBridge, ipcRenderer } = require('electron');
const fixture = require('./fixture.cjs');
const state = structuredClone(fixture.state);
let changed;
const saved = [];
const calls = [];
const notify = () => { if (changed) changed(structuredClone(state)); };
const noOp = async () => ({ ok: true });
const api = {
  getState: async () => structuredClone(state),
  refresh: async () => structuredClone(state),
  onChanged: callback => { changed = callback; return () => {}; },
  onState: callback => { changed = callback; return () => {}; },
  onClosed: () => () => {}, onOpened: () => () => {},
  onHidden: () => () => {}, onShown: () => () => {},
  fitHeight: async height => ipcRenderer.send('capture:fit', fixture.width, height),
  fit: async (width, height) => ipcRenderer.send('capture:fit', width, height),
  setPrefs: async patch => { Object.assign(state.prefs, patch); notify(); return structuredClone(state); },
  setMode: async mode => { state.dailystocker.mode = mode; notify(); },
  setOpenAtLogin: noOp, hide: noOp, quit: noOp, openExternal: noOp,
  openNotificationSettings: noOp, sendTestNotification: noOp, testNotification: noOp,
  openDataDir: noOp, resetPrefs: noOp, saveOpenAIKey: noOp, deleteOpenAIKey: noOp,
  setOpenAIBalance: noOp, saveDailystocker: noOp,
  setSource: async (id, patch) => {
    Object.assign(state.prefs.sources[id], patch);
    const source = state.sources.find(s => s.id === id);
    for (const key of ['enabled', 'showInTray', 'account']) if (key in patch) source[key] = patch[key];
    notify(); return { ok: true };
  },
  addSymbol: noOp, removeSymbol: noOp, pull: noOp, pullFix: noOp, clean: noOp,
  deleteRemote: noOp,
  createJob: async payload => { const job = { ...payload, id: 'demo-created', createdBy: 'ui' }; saved.push(structuredClone(payload)); state.jobs.unshift(job); notify(); return { job }; },
  updateJob: async (id, payload) => { const job = state.jobs.find(job => job.id === id); Object.assign(job, payload); saved.push(structuredClone(payload)); notify(); return { job }; },
  deleteJob: async id => { calls.push({action:'delete',id}); state.jobs=state.jobs.filter(job=>job.id!==id); notify(); return {ok:true}; },
  runJob: async id => { calls.push({action:'run',id}); const job=state.jobs.find(job=>job.id===id); job.lastStatus='running'; notify(); return {id:'preview-run',jobId:id,status:'running'}; },
  merge: noOp, close: noOp, copy: noOp,
  jobs: async key => structuredClone(state.pipelines.find(p => `${p.host}:${p.projectID}:${p.id}` === key)?.jobs || []),
  log: async () => fixture.log,
  mrDetail: async key => {
    const request = state.mrs.find(m => (m.host === 'github' ? `github:${m.projectID}:${m.iid}` : `${m.projectID}:${m.iid}`) === key);
    return { request, body: 'Adds request tracing and regression coverage.\nAll required checks passed. Ready for review.', author: 'alex-demo', jobs: fixture.mrJobs || [] };
  },
};
ipcRenderer.on('capture:update', (_event, patch) => { Object.assign(state, patch); notify(); });
contextBridge.exposeInMainWorld(fixture.bridge, api);
window.addEventListener('error', event => ipcRenderer.send('capture:error', event.message));
window.addEventListener('unhandledrejection', event => ipcRenderer.send('capture:error', String(event.reason)));

contextBridge.exposeInMainWorld("screenshotTest", { saved: () => structuredClone(saved), calls: () => structuredClone(calls) });
