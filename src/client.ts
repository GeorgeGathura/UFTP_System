import dgram from 'node:dgram'
import { createReadStream } from 'fs'

function main() {
  const files = process.argv.slice(2)
  const file = files[0]

  const client = dgram.createSocket('udp4')

  const readStream = createReadStream(file)
  readStream
    .on('data', (chunk) => {
      client.send(chunk, 8080, 'localhost', (err) => {
        if (err) {
          client.close()
          console.error('ErrorSendingMessage', { err })
        }
      })
    })
    .on('end', () => {
      console.log('DoneSendingData')
      client.close()
    })
}

main()
