import ElectronGoogleOAuth2 from '@dejay/electron-google-oauth2'
import { google } from 'googleapis'
import { Base64 } from 'js-base64'
import notifier from 'node-notifier'
import _ from 'lodash'
import Storage from './storage'

let messageIds = null
let pendingMessages = []
let mainWin

export function setMainWindow(window) {
  mainWin = window
}

/**
 * Google sign in flow
 * @returns Token object
 * @throws Error
 */
export async function googleSignIn() {
  const myApiOauth = new ElectronGoogleOAuth2(
    process.env.VUE_APP_GOOGLE_CLIENT_ID,
    process.env.VUE_APP_GOOGLE_CLIENT_SECRET,
    [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.modify'
    ],
    {
      successRedirectURL: 'https://github.com'
    }
  )
  const token = await myApiOauth.openAuthWindowAndGetTokens()

  return token
}

/**
 * Get OAuth2Client from Token Object
 * @param token - Token Object
 * @returns { OAuth2Client, newToken }
 * @throws Error
 */
export async function getAuthFromToken(token) {
  const auth = new google.auth.OAuth2(
    process.env.VUE_APP_GOOGLE_CLIENT_ID,
    process.env.VUE_APP_GOOGLE_CLIENT_SECRET,
    'http://localhost:42813/callback'
  )
  auth.setCredentials(token)

  let newToken
  if (auth.isTokenExpiring()) {
    const response = await auth.refreshToken(token.refresh_token)
    newToken = response.tokens
    newToken.refresh_token = token.refresh_token
  }

  return { auth, newToken }
}

/**
 * Get OAuth2Client from email address. Removes token from storage on failure
 * @param email Email address
 * @returns OAuth2Client
 * @throws Error
 */
async function getAuthFromEmail(email) {
  try {
    const token = await Storage.get(email)
    const { auth, newToken } = await getAuthFromToken(token)
    if (newToken) {
      if (!newToken.refresh_token) {
        newToken.refresh_token = token.refresh_token
      }
      await Storage.set(email, newToken)
    }

    return auth
  } catch (err) {
    console.log('getAuthFromEmail', err.message || 'Unknown error')
  }

  try {
    await Storage.remove(email)
    if (mainWin) {
      mainWin.webContents.send('email_removed', email)
    }
  } catch (err) {
    console.log('getAuthFromEmail', err.message || 'Unknown error')
  }

  throw new Error('Token invalid')
}

/**
 * Sign In and fetch messages
 * @returns { email, messages }
 * @throws Error
 */
export async function signInAndFetch() {
  try {
    const token = await googleSignIn()
    const { auth } = await getAuthFromToken(token)
    const tokenInfo = await auth.getTokenInfo(token.access_token)
    await Storage.set(tokenInfo.email, token)
    const messages = await getMessages(tokenInfo.email, auth)

    streamNewMessages(messages)

    return {
      email: tokenInfo.email
    }
  } catch (err) {
    console.log('getAuthFromEmail', err.message || 'Unknown error')
    throw err
  }
}

/**
 * Get unread messages
 * @param email Email address
 * @param auth OAuth2Client
 * @returns Messages array
 */
async function getMessages(email, auth) {
  try {
    const gmail = google.gmail({ version: 'v1', auth })

    const { data } = await gmail.users.threads.list({
      userId: 'me',
      labelIds: ['UNREAD']
    })

    if (!data.threads) {
      return []
    }

    let threadIds = data.threads.map(t => t.id)

    let messages = []

    for (let i = 0; i < threadIds.length; i++) {
      const { data: threadObj } = await gmail.users.threads.get({
        userId: 'me',
        id: threadIds[i]
      })

      if (!threadObj.messages) {
        continue
      }

      messages = _.concat(
        messages,
        threadObj.messages.map(msg => {
          let body = ''
          if (msg.payload.body.data) {
            body = msg.payload.body.data
          } else {
            const htmlPart = _.find(msg.payload.parts, {
              mimeType: 'text/html'
            })
            if (htmlPart) {
              body = htmlPart.body.data
            } else {
              const textPart = _.find(msg.payload.parts, {
                mimeType: 'text/plain'
              })
              body = textPart.body.data
            }
          }
          body = Base64.decode(body)

          return {
            id: msg.id,
            threadId: msg.threadId,
            labels: msg.labelIds,
            snippet: msg.snippet,
            internalDate: msg.internalDate,
            subject: _.find(msg.payload.headers, { name: 'Subject' }).value,
            from: _.find(msg.payload.headers, { name: 'From' }).value,
            to: _.find(msg.payload.headers, { name: 'To' }).value,
            text: body,
            email
          }
        })
      )
    }

    return messages
  } catch (err) {
    console.log('getEmails', err.message || 'Unknown error')
  }

  return []
}

/**
 * Get unread messages
 * @param email Email address
 * @param auth OAuth2Client
 * @returns Messages array
 */
async function getMessagesFromEmail(email) {
  try {
    const auth = await getAuthFromEmail(email)
    return await getMessages(email, auth)
  } catch (err) {
    console.log('getEmails', err.message || 'Unknown error')
  }

  return []
}

/**
 * Get unread messages for all registered emails
 * @param emails Email addresses
 */
export async function getAllMessags(emails) {
  let messages = []

  for (let i = 0; i < emails.length; i++) {
    const msgs = await getMessagesFromEmail(emails[i])

    messages = _.unionBy(messages, msgs, 'id')
  }

  streamNewMessages(messages)
}

/**
 * Mark a message as READ
 * @param email Email address
 * @param msgId Message Id to read
 */
export async function readMessage(email, msgId) {
  try {
    const auth = await getAuthFromEmail(email)
    const gmail = google.gmail({ version: 'v1', auth })

    await gmail.users.messages.modify({
      userId: 'me',
      id: msgId,
      requestBody: {
        removeLabelIds: ['UNREAD']
      }
    })
  } catch (err) {
    console.log('readEmail', err.message || 'Unknown error')
  }
}

/**
 * Mark multiple messages for an email
 * @param email Email address
 * @param msgIds Message IDs array
 */
async function readMessages(email, msgIds) {
  try {
    const auth = await getAuthFromEmail(email)
    const gmail = google.gmail({ version: 'v1', auth })

    await gmail.users.messages.batchModify({
      userId: 'me',
      requestBody: {
        ids: msgIds,
        removeLabelIds: ['UNREAD']
      }
    })
  } catch (err) {
    console.log('readMessages', err.message || 'Unknown error')
  }
}

/**
 * Mark all messages as READ
 * @param payload [ { email, msgIds } ]
 */
export async function readEmails(payload) {
  for (let i = 0; i < payload.length; i++) {
    await readMessages(payload[i].email, payload[i].msgIds)
  }
}

let timer
let syncedCount = 0
/**
 *
 * @param config.sync 'manual' or 'auto'
 * @param config.interval Interval in seconds
 * @param emails Emails
 */
export async function autoSync({ config, emails }) {
  if (config.sync === 'auto' && emails && emails.length > 0) {
    if (syncedCount === emails.length) {
      return
    }

    if (timer) {
      clearInterval(timer)
    }
    timer = setInterval(() => {
      getAllMessags(emails).then(() => {})
    }, config.interval * 1000)
    syncedCount = emails.length
  } else if (timer) {
    clearInterval(timer)
    timer = null
    syncedCount = 0
  }
}

export async function removeMessages(msgIds) {
  messageIds = _.difference(messageIds, msgIds)
  await Storage.set('messages', messageIds)
}

export async function getPendingMessages() {
  const temp = pendingMessages.slice()
  pendingMessages = []
  await Storage.set('pending', pendingMessages)
  return temp
}

async function streamNewMessages(messages) {
  if (!messageIds) {
    messageIds = await Storage.getArray('messages')
  }

  const newMessages = messages.filter(msg => messageIds.indexOf(msg.id) < 0)

  messageIds = _.concat(
    messageIds,
    newMessages.map(msg => msg.id)
  )
  await Storage.set('messages', messageIds)

  if (newMessages.length > 0) {
    notifier.notify({
      title: 'Gmail Reader',
      message: `${newMessages.length} new mail(s) arrived`,
      icon: 'build/icons/256x256.png'
    })

    if (!pendingMessages) {
      pendingMessages = await Storage.getArray('pending')
    }

    if (mainWin) {
      mainWin.webContents.send('messages', [...pendingMessages, ...newMessages])
      pendingMessages = []
    } else {
      pendingMessages = [...pendingMessages, ...newMessages]
    }
    await Storage.set('pending', pendingMessages)
  }
}
