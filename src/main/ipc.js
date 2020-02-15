import { ipcMain } from 'electron'
import {
  signInAndFetch,
  getAllMessags,
  readEmails,
  readMessage,
  autoSync
} from './gmail'

ipcMain.on('add_email', event => {
  signInAndFetch()
    .then(result => {
      event.reply('add_email_callback', result)
    })
    .catch(err => {
      event.reply('add_email_callback', { err })
    })
})

ipcMain.on('fetch_emails', (event, emails) => {
  getAllMessags(emails).then(messages => {
    event.reply('fetch_emails_callback', messages)
  })
})

ipcMain.on('read_email', (event, args) => {
  readMessage(args.email, args.msgId).then(() => {
    event.reply('read_email_callback')
  })
})

ipcMain.on('read_emails', (event, args) => {
  readEmails(args).then(() => {
    event.reply('read_emails_callback')
  })
})

ipcMain.on('auto_sync', (event, args) => {
  autoSync(args).then(() => {
    event.reply('auto_sync_callback')
  })
})
