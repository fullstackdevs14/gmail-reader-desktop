import storage from 'electron-json-storage'
import util from 'util'

export default {
  get: util.promisify(storage.get),
  set: util.promisify(storage.set),
  remove: util.promisify(storage.remove)
}
