import VuexPersistence from 'vuex-persist'

const vuexLocal = new VuexPersistence({
  storage: window.localStorage,
  modules: ['emails', 'messages', 'syncedAt', 'config']
})

export default vuexLocal
