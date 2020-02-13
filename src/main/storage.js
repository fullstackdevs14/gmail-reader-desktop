import storage from 'electron-json-storage'
import util from 'util'

export const saveToken = util.promisify(storage.set)
export const getToken = util.promisify(storage.get)
export const removeToken = util.promisify(storage.remove)
