import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("cadence", {
  getState: () => ipcRenderer.invoke("cadence:getState"),
  createJob: (input: unknown) => ipcRenderer.invoke("cadence:createJob", input),
  updateJob: (id: string, input: unknown) =>
    ipcRenderer.invoke("cadence:updateJob", id, input),
  deleteJob: (id: string) => ipcRenderer.invoke("cadence:deleteJob", id),
  runJob: (id: string) => ipcRenderer.invoke("cadence:runJob", id),
  onChanged: (cb: () => void) => {
    const handler = () => cb();
    ipcRenderer.on("cadence:changed", handler);
    return () => ipcRenderer.removeListener("cadence:changed", handler);
  },
  hide: () => ipcRenderer.invoke("cadence:hide"),
  openExternal: (url: string) => ipcRenderer.invoke("cadence:openExternal", url),
  fitHeight: (height: number) => ipcRenderer.invoke("cadence:fitHeight", height),
});
