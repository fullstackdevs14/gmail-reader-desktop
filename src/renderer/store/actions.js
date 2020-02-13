import GmailService from '../services/GmailService'
import { values } from 'lodash'

export async function addEmail({ commit, dispatch }) {
  commit('SET_LOADING', true)
  const { err, email, messages } = await GmailService.addEmail()
  if (err) {
    commit('SET_LOADING', false)
    console.log('Login failed', err)
    return
  }

  commit('ADD_EMAIL', email)
  dispatch('addMessages', messages)
  commit('SET_LOADING', false)
}

export async function getAllMessages({ state, commit, dispatch }, hideLoading) {
  if (!hideLoading) {
    commit('SET_LOADING', true)
  }
  const messages = await GmailService.fetchEmails(state.emails)
  dispatch('addMessages', messages)
  commit('SET_SYNCED_AT', new Date().getTime())

  if (!hideLoading) {
    commit('SET_LOADING', false)
  }
}

export function addMessages({ state, commit }, messages) {
  const allMsgIds = state.messages.map(msg => msg.id)
  const newMessages = messages.filter(msg => !allMsgIds.includes(msg.id))
  commit('ADD_MESSAGES', newMessages)

  if (state.config.sync === 'auto' && newMessages.length > 0) {
    // eslint-disable-next-line
    new Notification(`Gmail Reader`, {
      body: `${newMessages.length} new email(s) arrived`
    })
  }
}

export async function readMessage({ commit, state }, msg) {
  commit('SET_LOADING', true)
  if (state.emails.indexOf(msg.email) >= 0) {
    await GmailService.readEmail(msg.email, msg.id)
  }
  commit('READ_MESSAGE', msg.id)
  commit('SET_LOADING', false)
}

export async function readAllFilteredMessages({ commit, getters, state }) {
  commit('SET_LOADING', true)
  let emails = {}
  const msgList = getters.filteredMessages.filter(msg => !msg.read)
  msgList.forEach(msg => {
    if (state.emails.indexOf(msg.email) < 0) {
      commit('READ_MESSAGE', msg.id)
      return
    }

    if (emails[msg.email]) {
      emails[msg.email].msgIds.push(msg.id)
    } else {
      emails[msg.email] = {
        msgIds: [msg.id],
        email: msg.email
      }
    }
  })

  await GmailService.readEmails(values(emails))
  commit(
    'READ_MESSAGES',
    msgList.map(msg => msg.id)
  )
  commit('SET_LOADING', false)
}

export function removeReadFilteredMessages({ commit, getters }) {
  const msgIds = getters.filteredMessages
    .filter(msg => msg.read)
    .map(msg => msg.id)
  commit('REMOVE_MESSAGES', msgIds)
}

let timer
export function autoSync({ dispatch, state }) {
  if (state.config.sync === 'auto') {
    if (timer) {
      clearInterval(timer)
    }

    const interval = (+state.config.interval || 30) * 1000
    timer = setInterval(() => {
      dispatch('getAllMessages', true)
    }, interval)
  } else {
    clearInterval(timer)
  }
}
