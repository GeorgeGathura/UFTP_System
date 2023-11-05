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
