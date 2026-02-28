const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("formmaker", {
  version: "1.0.0"
});
