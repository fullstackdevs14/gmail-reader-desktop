import { callIPCMethod } from './ipc'

export default {
  addEmail: () => callIPCMethod('add_email'),
  fetchEmails: emails => callIPCMethod('fetch_emails', emails),
  readEmail: (email, msgId) => callIPCMethod('read_email', { email, msgId }),
  readEmails: payload => callIPCMethod('read_emails', payload)
}
