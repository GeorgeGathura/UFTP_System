import dgram from 'node:dgram'

const server = dgram.createSocket('udp4')

server.on('error', (err) => {
  console.error(`server error:\n${err.stack}`)
  server.close()
})

server.on('message', (msg, rinfo) => {
  console.log(`server got "${msg}" from ${rinfo.address}:${rinfo.port}`)
  server.send(
    Buffer.from(`server received this message from client: ${msg}`),
    rinfo.port,
    rinfo.address,
    (err) => {
      if (err) {
        server.close()
        console.error('ErrorSendingMessage', { err })
      }
    },
  )
})

server.on('listening', () => {
  const address = server.address()
  console.log(`server listening ${address.address}:${address.port}`)
})

server.bind(8080)
