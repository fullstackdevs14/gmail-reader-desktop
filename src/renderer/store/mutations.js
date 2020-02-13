import Vue from 'vue'
import { union, concat } from 'lodash'

export default {
  ADD_EMAIL(state, email) {
    state.emails = union(state.emails, [email])
  },
  REMOVE_EMAIL(state, email) {
    state.emails = state.emails.filter(item => item !== email)
  },
  SELECT_EMAIL(state, email) {
    state.selected = email
  },
  SET_SYNCED_AT(state, time) {
    state.syncedAt = time
  },
  ADD_MESSAGES(state, messages) {
    state.messages = concat(messages, state.messages)
  },
  READ_MESSAGE(state, msgId) {
    const msg = state.messages.find(msg => msg.id === msgId)
    Vue.set(msg, 'read', true)
  },
  READ_MESSAGES(state, msgIds) {
    state.messages = state.messages.map(msg => {
      if (msgIds.indexOf(msg.id) >= 0) {
        return {
          ...msg,
          read: true
        }
      }
      return msg
    })
  },
  REMOVE_MESSAGE(state, msgId) {
    state.messages = state.messages.filter(msg => msg.id !== msgId)
  },
  REMOVE_MESSAGES(state, msgIds) {
    state.messages = state.messages.filter(msg => msgIds.indexOf(msg.id) < 0)
  },
  SET_LOADING(state, loading) {
    state.loading = loading
  }
}
