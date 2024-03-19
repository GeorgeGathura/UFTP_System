import { access } from 'fs'
import { mkdirp } from 'mkdirp'

export const MD5_HASH_SIZE = 32

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
  offset += 2
  const fileNameLength = msg.readInt16BE(offset)
  const fileNameBuf = Buffer.alloc(fileNameLength)
  msg.copy(fileNameBuf, 0, offset, fileNameLength + offset)
  const fileName = fileNameBuf.toString()

  return {sequenceNumber, fileName}
}
