export default {
  mailCounts: state => {
    const result = {}
    state.emails.forEach(email => {
      result[email] = 0
    })
    state.messages.forEach(msg => {
      if (!msg.read && result[msg.email] !== undefined) {
        result[msg.email]++
      }
    })
    return result
  },
  orphanMsgCount: state =>
    state.messages.filter(msg => state.emails.indexOf(msg.email) < 0).length,
  filteredMessages: state =>
    state.messages.filter(
      msg =>
        !state.selected ||
        msg.email === state.selected ||
        (state.selected === 'orphans' && state.emails.indexOf(msg.email) < 0)
    )
}
