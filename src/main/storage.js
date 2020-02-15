import storage from 'electron-json-storage'
import util from 'util'

const getAsync = util.promisify(storage.get)

export default {
  get: getAsync,
  set: util.promisify(storage.set),
  remove: util.promisify(storage.remove),
  getArray: key => getAsync(key).then(data => (!data[0] ? [] : data))
}
