import { readFile } from 'node:fs/promises'
import { createServer } from 'node:tls'

import 'dotenv/config'

import { CapsuleFactory } from './CapsuleFactory.mjs'
import { RequestReader } from './RequestReader.mjs'

;(async () => {
  const options = {
    key: await readFile(`${process.env.KEYS_DIR}/server.key`),
    cert: await readFile(`${process.env.KEYS_DIR}/server.crt`),

    minVersion: 'TLSv1.2',
  }

  const capsuleFactory = new CapsuleFactory(
    process.env.GEMINI_HOSTNAME,
    process.env.DATA_DIR,
  )

  const server = createServer(options, async (conn) => {
    let url

    try {
      url = await RequestReader.processRequest(conn)
    }
    catch (e) {
      conn.write(`50 ${e.toString}\r\n`)
      return conn.end()
    }

    try {
      const capsule = await capsuleFactory.findCapsule(url)
      const data = await capsule.read(url.pathname)

      conn.write(data)
    }
    catch (e) {
      conn.write(`51 ${e.toString}\r\n`)
    }
    finally {
      conn.end()
    }
  })

  server.listen(process.env.GEMINI_PORT, () => {
    console.log(`Listening on ${process.env.GEMINI_PORT}`)
  })
})()
