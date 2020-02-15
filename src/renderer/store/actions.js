import GmailService from '../services/GmailService'
import { values } from 'lodash'

export async function addEmail({ commit, dispatch }) {
  commit('SET_LOADING', true)
  const { err, email } = await GmailService.addEmail()
  if (err) {
    commit('SET_LOADING', false)
    console.log('Login failed', err)
    return
  }

  commit('ADD_EMAIL', email)
  commit('SET_LOADING', false)

  dispatch('autoSync')
}

export async function removeEmail({ commit, dispatch }, email) {
  commit('REMOVE_EMAIL', email)
  dispatch('autoSync')
}

export async function getAllMessages({ state, commit }) {
  commit('SET_LOADING', true)
  await GmailService.fetchEmails(state.emails)
  commit('SET_LOADING', false)
}

export function addMessages({ state, commit }, messages) {
  const allMsgIds = state.messages.map(msg => msg.id)
  const newMessages = messages.filter(msg => !allMsgIds.includes(msg.id))
  commit('ADD_MESSAGES', newMessages)
  commit('SET_SYNCED_AT', new Date().getTime())
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

export async function autoSync({ state }) {
  await GmailService.autoSync({
    config: state.config,
    emails: state.emails
  })
}
