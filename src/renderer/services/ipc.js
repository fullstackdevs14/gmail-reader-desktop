import { ipcRenderer } from 'electron'

export function subscribeToChannel(channel, callback) {
  ipcRenderer.on(channel, (ev, args) => {
    callback(args)
  })
}

export function callIPCMethod(method, args) {
  ipcRenderer.send(method, args)

  return new Promise(resolve => {
    ipcRenderer.once(method + '_callback', (ev, result) => {
      resolve(result)
    })
  })
}
