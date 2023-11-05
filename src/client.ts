import dgram from 'node:dgram'
import { createReadStream } from 'fs'
import path from 'node:path'


const CLIENT_TEMP_STORE = './temp/client/'

const sequences = new Map<number, {start: number, end: number}>()

async function main() {
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
  let start = 0

  readStream
    .on('error', (err) => {
      console.error('ReadStreamFailed', {err})
      client.close()
    })
    .on('data', async (chunk: Buffer) => {
      console.log('ReadyToSend')
      await waitForConnect

      const fileName = file.split(path.sep).pop()
      if(!fileName) {
        readStream.close()
        return console.error('UnexpectedFileNameMissing', {file})
      }

      const outBuf = Buffer.alloc(2 + 2 + fileName.length + 4 + chunk.length)
      outBuf.writeInt16BE(sequenceNumber)
      outBuf.writeInt16BE(fileName.length, 2)
      
      outBuf.write(fileName, 4, fileName.length, 'utf-8')

      const tempBuf = Buffer.alloc(fileName.length)
      outBuf.copy(tempBuf, 0, 4, 4 + fileName.length)
      outBuf.writeInt32BE(chunk.length, fileName.length + 4)
      chunk.copy(outBuf, fileName.length + 8)

      sequences.set(sequenceNumber, {start, end: start + chunk.length})

      start += chunk.length
      console.log({sequences, sequenceNumber, fileNameLength: fileName.length, fileName, chunkLength: chunk.length})

      client.send(outBuf, (err) => {
        if (err) {
          console.error('ErrorSendingMessage', { err })
          readStream.close()
          return
        }
        console.log('SentChunk', {sequences})
      });

      sequenceNumber++
    })
    .on('end', () => {
      console.log('DoneSendingData')
      client.close()
    })
}

main()
