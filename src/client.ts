import dgram from 'node:dgram'

const message = Buffer.from('Some bytes')
const client = dgram.createSocket('udp4')
client.send(message, 8080, 'localhost', (err) => {
  if (err) {
    client.close()
    console.error('ErrorSendingMessage', { err })
  }
})

client.on('message', (msg) => {
  console.log(`client got "${msg}" from server`)
})
