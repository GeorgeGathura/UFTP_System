import dgram from 'node:dgram'
import { createReadStream } from 'fs'
import path from 'node:path'
import { MD5_HASH_SIZE, readMessage } from './common'
import { createHash } from 'node:crypto'


const CLIENT_TEMP_STORE = './temp/client/'

const sequences = new Map<number, {start: number, end: number, acknowledged?: boolean, retriesCount?: number}>()
let sequencesAcknowledged = 0

async function sendTerminatingSignal(client: dgram.Socket, fileName: string, sequenceNumber: number) {
  const outBuf = Buffer.alloc(2 + 2 + fileName.length + 4)
    outBuf.writeInt16BE(sequenceNumber)
    outBuf.writeInt16BE(fileName.length, 2)
    
    outBuf.write(fileName, 4, fileName.length, 'utf-8')
    outBuf.writeInt32BE(0, fileName.length + 4)

    await new Promise((resolve) => {
      client.send(outBuf, (err) => {
        resolve(undefined)

        if (err) {
          console.error('ErrorSendingTerminatingMessage', { err })
          return
        }
        console.log('SentTerminatingMessage')
      })
  }); 
}

function resendChunk({client, fileName, chunk, sequenceNumber}: {client: dgram.Socket, fileName: string, chunk: Buffer, sequenceNumber: number}) {
  const outBuf = Buffer.alloc(2 + 2 + fileName.length + MD5_HASH_SIZE + 4 + chunk.length)
  let offset = 0
  outBuf.writeInt16BE(sequenceNumber, offset)
  offset += 2

  outBuf.writeInt16BE(fileName.length, offset)
  offset += 2
  outBuf.write(fileName, offset, fileName.length, 'utf-8')
  offset += fileName.length

  outBuf.writeInt32BE(chunk.length, offset)
  offset += 4

  const checksum = createHash('md5').update(chunk).digest('hex')
  outBuf.write(checksum, offset, MD5_HASH_SIZE)
  offset += MD5_HASH_SIZE

  chunk.copy(outBuf, offset)

  client.send(outBuf, (err) => {
    if (err) {
      console.error('ErrorSendingMessage', { err })
      return
    }

    console.log('ResentChunk')
    setTimeout(() => {
      const sequence = sequences.get(sequenceNumber);
      if (!sequence?.acknowledged) {
        resendChunk({client, fileName, chunk, sequenceNumber})
      }
    }, 2_000);
  });
}

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

      const outBuf = Buffer.alloc(2 + 2 + fileName.length + MD5_HASH_SIZE + 4 + chunk.length)
      let offset = 0
      outBuf.writeInt16BE(sequenceNumber, offset)
      offset += 2

      outBuf.writeInt16BE(fileName.length, offset)
      offset += 2
      outBuf.write(fileName, offset, fileName.length, 'utf-8')
      offset += fileName.length

      outBuf.writeInt32BE(chunk.length, offset)
      offset += 4

      const checksum = createHash('md5').update(chunk).digest('hex')
      outBuf.write(checksum, offset, MD5_HASH_SIZE)
      offset += MD5_HASH_SIZE

      chunk.copy(outBuf, offset)

      sequences.set(sequenceNumber, {start, end: start + chunk.length})

      start += chunk.length
      client.send(outBuf, (err) => {
        if (err) {
          console.error('ErrorSendingMessage', { err })
          readStream.close()
          return
        }

        console.log('SentChunk')
        setTimeout(() => {
          const sequence = sequences.get(sequenceNumber);
          if (!sequence?.acknowledged) {
            resendChunk({client, fileName, chunk, sequenceNumber})
          }
        }, 2_000);
      });

      sequenceNumber++
    })
  
  client.on('message', async (msg, rinfo) => {
    console.log(`server got a msg from ${rinfo.address}:${rinfo.port}`)
    let offset = 0
    while(offset < msg.length) {
      const {sequenceNumber, fileName} = readMessage(msg, offset)
      console.log('ReceivedAckForSequence', {sequenceNumber, fileName, messageLength: msg.length})
      const sequence = sequences.get(sequenceNumber) ?? {start: 0, end: 0}
      sequences.set(sequenceNumber, {start: sequence.start, end: sequence.end, acknowledged: true})

      sequencesAcknowledged++
      offset += 4 + fileName.length
    }

    if (sequencesAcknowledged === sequences.size) {
      console.log('ReceivedAcksForAllSequences')
      const fileName = file.split(path.sep).pop()
      if(!fileName) {
        readStream.close()
        client.close()
        return console.error('UnexpectedFileNameMissing', {file})
      }

      await sendTerminatingSignal(client, fileName, sequenceNumber)
      client.close()
    }
  })
}

main()
