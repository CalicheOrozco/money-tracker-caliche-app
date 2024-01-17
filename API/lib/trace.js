import bunyan from 'bunyan'

const log = bunyan.createLogger({
  name: 'money-tracker',
  stream: process.stdout
})

export default log
