import dgram from 'node:dgram'
import { createReadStream } from 'fs'

function main() {
  const files = process.argv.slice(2)
  const file = files[0]

  const client = dgram.createSocket('udp4')

  const readStream = createReadStream(file, {highWaterMark: 65000})
  const waitForConnect = new Promise((resolve) => {
    client.connect(8080, 'localhost', () => {
      resolve(undefined)
    })
  })
  let sequenceNumber = 0
  readStream
    .on('data', async (chunk: Buffer) => {
      console.log('ReadyToSend')
      await waitForConnect
      const outBuf = Buffer.alloc(2 + 8 + chunk.length)
      outBuf.writeInt16BE(sequenceNumber)
      outBuf.writeInt32BE(chunk.length, 2)
      outBuf.copy(chunk, 10)

      client.send(outBuf, (err) => {
        if (err) {
          client.close()
          console.error('ErrorSendingMessage', { err })
          return
        }
        console.log('SentChunk')
      });

      sequenceNumber++
    })
    .on('end', () => {
      console.log('DoneSendingData')
      client.close()
    })
}

main()
