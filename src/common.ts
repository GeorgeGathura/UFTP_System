import { access } from 'fs'
import { mkdirp } from 'mkdirp'

export function createDataDirectory(directory:string) {
  return new Promise((resolve, reject) => {
    access(directory, function (error) {
      if (error) {
        mkdirp(directory).then(() => resolve(undefined))
        .catch(reject)
      } else {
        resolve(undefined)
      }
    })
  })
}

export function readMessage(msg: Buffer, offset: number) {
  const sequenceNumber = msg.readInt16BE(offset)
  const fileNameLength = msg.readInt16BE(2)
  const fileNameBuf = Buffer.alloc(fileNameLength)
  msg.copy(fileNameBuf, 0, 4, fileNameLength + 4)
  const fileName = fileNameBuf.toString()

  return {sequenceNumber, fileName}
}
