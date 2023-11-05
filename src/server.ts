import dgram from 'node:dgram'
import { createWriteStream, type WriteStream } from 'fs'
import path from 'path'
import { createDataDirectory } from './common';

const writeStreams = new Map<string, WriteStream>()

const server = dgram.createSocket('udp4')

server.on('error', (err) => {
  console.error(`server error:\n${err.stack}`)
  server.close()
})

let lastSequenceNumber: number
server.on('message', async (msg, rinfo) => {
  console.log(`server got a msg from ${rinfo.address}:${rinfo.port}`)

  const dataDirectory = `./data/${rinfo.address}/${rinfo.port}/`

  await createDataDirectory(dataDirectory)

  const sequenceNumber = msg.readInt16BE()

  if(typeof lastSequenceNumber !== 'undefined' && lastSequenceNumber + 1 !== sequenceNumber) {
    console.error('SequenceNumberOutOfSync', {sequenceNumber, lastSequenceNumber})
  }
  lastSequenceNumber = sequenceNumber

  const fileNameLength = msg.readInt16BE(2)
  const fileNameBuf = Buffer.alloc(fileNameLength)
  msg.copy(fileNameBuf, 0, 4, fileNameLength + 4)
  const fileName = fileNameBuf.toString()
  
  const fileNameKey = `${rinfo.address}/${rinfo.port}/${fileName}`
  if(!writeStreams.has(fileNameKey)) {
    writeStreams.set(
      fileNameKey,
      createWriteStream(path.resolve(dataDirectory, fileName))
    )
  }
  const writeStream = writeStreams.get(fileNameKey)!

  const dataLength = msg.readInt32BE(fileNameLength + 4)

  const data = Buffer.alloc(dataLength)
  msg.copy(data, 0, fileNameLength + 8)
  console.log(`Received message for sequenceNumber = ${sequenceNumber}`, {sequenceNumber, fileNameLength, fileName: fileName, dataLength})

  writeStream.write(data,(err)=>{
    if (err) {
      return console.error('WriteFailed', {err});
    }
  })
})

server.on('listening', () => {
  const address = server.address()
  console.log(`server listening ${address.address}:${address.port}`)
})

server.bind(8080)
