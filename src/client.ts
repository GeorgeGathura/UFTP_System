import dgram from 'node:dgram'
import { createReadStream } from 'fs'

function main() {
  const files = process.argv.slice(2)
  const file = files[0]

  const client = dgram.createSocket('udp4')

  const readStream = createReadStream(file)
  const waitForConnect = new Promise((resolve) => {
    client.connect(8080, 'localhost', () => {
      resolve(undefined)
    })
  })
  readStream
    .on('data', async (chunk) => {
      console.log('ReadyToSend')
      await waitForConnect
      client.send(chunk, (err) => {
        if (err) {
          client.close()
          console.error('ErrorSendingMessage', { err })
          return
        }
        console.log('SentChunk')
      });
    })
    .on('end', () => {
      console.log('DoneSendingData')
      client.close()
    })
}

main()
