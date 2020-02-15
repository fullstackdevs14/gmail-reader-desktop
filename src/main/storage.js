import storage from 'electron-json-storage'
import util from 'util'

console.log(storage.getDataPath())

export default {
  get: util.promisify(storage.get),
  set: util.promisify(storage.set),
  remove: util.promisify(storage.remove)
}
