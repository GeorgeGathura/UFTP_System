import dgram from 'node:dgram'
import { createReadStream } from 'fs'

function main() {
  const files = process.argv.slice(2)
  const file = files[0]
  console.log(file)

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
      const outBuf = Buffer.alloc(2 + 2 + file.length + 4 + chunk.length)
      outBuf.writeInt16BE(sequenceNumber)
      outBuf.writeInt16BE(file.length, 2)
      
      outBuf.write(file, 4, file.length, 'utf-8')

      const tempBuf = Buffer.alloc(file.length)
      outBuf.copy(tempBuf, 0, 4, 4 + file.length)
      outBuf.writeInt32BE(chunk.length, file.length + 4)
      chunk.copy(outBuf, file.length + 8)

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
