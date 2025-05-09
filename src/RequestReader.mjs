import EventEmitter from 'node:events'
import { URL } from 'node:url'

const MAX_URI_LENGTH = 1024
const SOCKET_TIMEOUT_MS = 5000
const DATA_TRANSFER_TIMEOUT = 10000

export class RequestReader extends EventEmitter {
  constructor(conn) {
    super()

    this.buffer = ''

    conn.setTimeout(SOCKET_TIMEOUT_MS)
    conn.setEncoding('utf-8')

    conn.on('data', (chunk) => {
      this.addRequestChunk(chunk)
    })

    this.dataTransferWatchdog = setTimeout(() => {
      this.emit('error', 'Timeout')
    }, DATA_TRANSFER_TIMEOUT)
  }

  addRequestChunk(chunk) {
    if (this.buffer.length + chunk.length > MAX_URI_LENGTH) {
      return this.emit('error', 'URI Too Long')
    }

    this.buffer += chunk
    if (this.buffer.endsWith('\r\n')) {
      clearTimeout(this.dataTransferWatchdog)

      this.buffer = this.buffer.trim()
      this.validateURL()
    }
  }

  validateURL() {
    if (!URL.canParse(this.buffer)) {
      return this.emit('error', 'Bad URI')
    }

    const url = URL.parse(this.buffer)

    if (url.protocol !== 'gemini:') {
      return this.emit('error', 'Absolute URI Reuired')
    }

    if (url.username || url.password) {
      return this.emit('error', 'URI must not contain userinfo part')
    }

    if (url.hash) {
      return this.emit('error', 'URI must not contain #hash part')
    }

    this.emit('success', url)
  }

  static processRequest(conn) {
    const reader = new RequestReader(conn)

    return new Promise((resolve, reject) => {
      reader.on('success', resolve)
      reader.on('error', reject)
    })
  }
}
