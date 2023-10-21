import dgram from 'node:dgram'
import { createWriteStream, access, mkdir, type WriteStream } from 'fs'
import path from 'path'

let writeStream: WriteStream | undefined;

const server = dgram.createSocket('udp4')

const DATA_DIRECTORY = './data/'

function CreateDataDirectory(directory:string) {
  return new Promise((resolve, reject) => {
    access(directory, function (error) {
      if (error) {
        mkdir(directory, (err) => {
          if (err) {
            return reject(err)
          }
          resolve(undefined)
        })
      } else {
        resolve(undefined)
      }
    })
  })
}

server.on('error', (err) => {
  console.error(`server error:\n${err.stack}`)
  server.close()
})

server.on('message', async (msg, rinfo) => {
  console.log(`server got a msg from ${rinfo.address}:${rinfo.port}`)

  const fileName = `${rinfo.address}-${rinfo.port}.uftp`

  await CreateDataDirectory(DATA_DIRECTORY)
  writeStream = writeStream
    ? writeStream
    : createWriteStream(path.resolve(DATA_DIRECTORY, fileName))

  const sequenceNumber = msg.readInt16BE()
  const dataLength = msg.readInt32BE(2)
  console.log({sequenceNumber, dataLength})
  const data = Buffer.alloc(dataLength)
  msg.copy(data, 10)
  console.log(`Received message for sequenceNumber = ${sequenceNumber}`)

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
