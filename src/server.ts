import dgram from 'node:dgram'
import { createWriteStream, access, mkdir, type WriteStream } from 'fs'
import path from 'path'

let writeStream: WriteStream | undefined;

const server = dgram.createSocket('udp4')

const DATA_DIRECTORY = './data/'

function maybeCreateDataDirectory() {
  return new Promise((resolve, reject) => {
    access(DATA_DIRECTORY, function (error) {
      if (error) {
        mkdir(DATA_DIRECTORY, (err) => {
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

  await maybeCreateDataDirectory()
  console.log('ReadyToWriteTo', {file: path.resolve(DATA_DIRECTORY, fileName)})
  writeStream = writeStream
    ? writeStream
    : createWriteStream(path.resolve(DATA_DIRECTORY, fileName))
  writeStream.write(msg,(err)=>{
    if (err) {
      return console.error('WriteFailed', {err});
    }

    console.log('WriteSuccessful')
  })
})

server.on('listening', () => {
  const address = server.address()
  console.log(`server listening ${address.address}:${address.port}`)
})

server.bind(8080)
