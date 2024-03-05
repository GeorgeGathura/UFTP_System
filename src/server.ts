import dgram from 'node:dgram'
import path from 'path'
import { createDataDirectory } from './common';
import { access } from 'node:fs/promises';
import { type WriteStream, createWriteStream, createReadStream } from 'node:fs';
import {rimraf} from 'rimraf'

type PromiseResolve = (value: unknown) => void

const writeStreams = new Map<string, Set<number>>()
const readyToCompilePromises = new Map<string, [Promise<unknown>, PromiseResolve | undefined]>()
const largestSequenceNumbers = new Map<string, number>()

const server = dgram.createSocket('udp4')

server.on('error', (err) => {
  console.error(`server error:\n${err.stack}`)
  server.close()
})

async function compileChunks({filename, port, address}: {filename: string, port: number, address: string}) {
  const filenameDirectory = getFilenameDirectory({filename, port, address})
  console.log('CompilingChunks', {filename, port, address})
  let sequenceNumber = 0
  const writeStream = createWriteStream(path.resolve(filenameDirectory, filename))
  while (true) {
    try {
      const chunkFilePath = path.resolve(`${filenameDirectory}/temp/`, `${sequenceNumber}.chunk`)
      await access(chunkFilePath)
      const readStream = createReadStream(chunkFilePath)
      await new Promise((resolve, reject) => {
        readStream.on('data', (chunk) => {
          writeStream.write(chunk)
        }).on('end', () => {
          console.log('WrittenChunk:end', {sequenceNumber})
          resolve(undefined)
        })
      })
      console.log('DoneWritingChunk')
      sequenceNumber += 1

      if(sequenceNumber > (largestSequenceNumbers.get(filename) ?? 0)) {
        console.log('DoneCompilingAllChunks', {sequenceNumber: sequenceNumber - 1})
        break
      }
    } catch(error) {
      console.error('ErrorWhileWritingChunk', {error, sequenceNumber})
      break
    }
  }

  await rimraf(`${filenameDirectory}/temp/`)
}

function getFilenameDirectory({port, address, filename}: {port: number, address: string, filename: string}) {
  return `./data/${address}/${port}/${filename}`
}

let lastSequenceNumber: number
let ackQueue: {sequenceNumber: number, fileName: string}[] = []
const ACQ_QUEUE_MAX_SIZE = 5
const ACQ_QUEUE_TIMEOUT = 5_000
let ackQueueTimer: NodeJS.Timeout | undefined

function sendAck({address, port}: dgram.RemoteInfo) {
  let outputBufferSize = 0
  for (const sequence of ackQueue) {
    outputBufferSize += 4 + sequence.fileName.length
  }
  const outputBuffer = Buffer.alloc(outputBufferSize)
  let offset = 0
  while (ackQueue.length) {
    const sequence = ackQueue.pop()!

    outputBuffer.writeInt16BE(sequence.sequenceNumber, offset)
    offset += 2
    outputBuffer.writeInt16BE(sequence.fileName.length, offset)
    offset += 2
    outputBuffer.write(sequence.fileName, offset)
    offset += sequence.fileName.length
  }
  
  const client = dgram.createSocket('udp4')
  client.connect(port, address, () => {
    client.send(outputBuffer, (err) => {
      client.close()
      if (err) {
        console.error('SendAckFailed', {err})
        return
      }
      console.info('SendAckSucceeded')
    })
  })
}

function flush(rinfo: dgram.RemoteInfo) {
  if (ackQueue.length >= ACQ_QUEUE_MAX_SIZE) {
    sendAck(rinfo)
    clearTimeout(ackQueueTimer)
    ackQueueTimer = undefined
    return
  }

  if (!ackQueueTimer) {
    ackQueueTimer = setTimeout(() => {
      sendAck(rinfo)
      ackQueueTimer = undefined
    }, ACQ_QUEUE_TIMEOUT)
  }
}

server.on('message', async (msg, rinfo) => {
  console.log(`server got a msg from ${rinfo.address}:${rinfo.port}`)

  const sequenceNumber = msg.readInt16BE()

  if(typeof lastSequenceNumber !== 'undefined' && lastSequenceNumber + 1 !== sequenceNumber) {
    console.error('SequenceNumberOutOfSync', {sequenceNumber, lastSequenceNumber})
  }
  lastSequenceNumber = sequenceNumber

  const fileNameLength = msg.readInt16BE(2)
  const fileNameBuf = Buffer.alloc(fileNameLength)
  msg.copy(fileNameBuf, 0, 4, fileNameLength + 4)
  const fileName = fileNameBuf.toString()

  const filenameDirectory = getFilenameDirectory({port: rinfo.port, address: rinfo.address, filename: fileName})
  const dataDirectory = `${filenameDirectory}/temp/`
  await createDataDirectory(dataDirectory)

  const dataLength = msg.readInt32BE(fileNameLength + 4)

  if(readyToCompilePromises.has(fileName)) {
    let promiseResolve: PromiseResolve | undefined = undefined
    const promise = new Promise((resolve) => {
      promiseResolve = resolve
    })
    readyToCompilePromises.set(fileName, [promise, promiseResolve])
  }

  if (dataLength === 0) {
    const result = readyToCompilePromises.get(fileName)
    if (result) {
      const [promise] = result
      await promise
    }

    await compileChunks({filename: fileName, port: rinfo.port, address: rinfo.address})
    writeStreams.delete(fileName)
    return
  }


  if (!largestSequenceNumbers.has(fileName)) {
    largestSequenceNumbers.set(fileName, -1)
  }
  largestSequenceNumbers.set(fileName, largestSequenceNumbers.get(fileName) ?? 0 + 1)

  const data = Buffer.alloc(dataLength)
  msg.copy(data, 0, fileNameLength + 8)
  console.log(`Received message for sequenceNumber = ${sequenceNumber}`, {sequenceNumber, fileNameLength, fileName: fileName, dataLength})

  const writeStream = createWriteStream(path.resolve(dataDirectory, `${sequenceNumber}.chunk`))
  if (!writeStreams.has(fileName)) {
    writeStreams.set(fileName, new Set())
  }
  const pendingSequenceNumbers = writeStreams.get(fileName)?.add(sequenceNumber)
  writeStream.write(data, (err)=>{
    writeStream.close()
    pendingSequenceNumbers?.delete(sequenceNumber)
    if (pendingSequenceNumbers?.size === 0) {
      const result = readyToCompilePromises.get(fileName)
      if (result) {
        const [, resolve] = result
        resolve?.(undefined)
      }
    }
    if (err) {
      return console.error('WriteFailed', {err});
    }
  })

  ackQueue.push({sequenceNumber, fileName})
  flush(rinfo)
})

server.on('listening', () => {
  const address = server.address()
  console.log(`server listening ${address.address}:${address.port}`)
})

server.bind(8080)
