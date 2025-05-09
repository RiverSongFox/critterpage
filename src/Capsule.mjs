import { createReadStream } from 'node:fs'
import { access, constants, readdir, stat } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { PassThrough, Readable } from 'node:stream'
import { MimeTypesDictionary } from './MimeTypesDictionary.mjs'

export class Capsule {
  constructor(capsulePath, fromCName) {
    this.basePath = capsulePath
    this.fromCName = fromCName

    this.basePathAbsolute = resolve(this.basePath)
  }

  async read(requestedPath) {
    const path = this.resolvePath(requestedPath)

    try {
      if (!path.startsWith(this.basePathAbsolute)) {
        throw new Error('Not Found')
      }

      const stats = await stat(path)

      if (stats.isDirectory()) {
        return this.handleDirectory(path)
      }

      return this.handleFile(path)
    }
    catch (_e) {
      console.debug(`Couldn't read capsule contents (${path})`)
      throw new Error('Not Found')
    }
  }

  resolvePath(requestedPath) {
    const path = join(
      this.basePath,
      this.fromCName
        ? requestedPath
        : requestedPath.split('/').slice(1).join('/'),
    )

    return resolve(path)
  }

  async handleDirectory(dirPath) {
    const indexFilePath = join(dirPath, 'index.gmi')

    try {
      await access(indexFilePath, constants.R_OK)
      return await this.handleFile(indexFilePath)
    }
    catch (_e) {
      return this.makeDirectoryListing(dirPath)
    }
  }

  async handleFile(filePath) {
    const mimeType = MimeTypesDictionary.lookup(filePath)

    const responseStream = PassThrough()
    const fileStream = createReadStream(filePath)

    fileStream.on('error', (err) => {
      if (responseStream.writableEnded) {
        return
      }

      if (err.code === 'ENOENT') {
        responseStream.write(`51 Not Found ${filePath}\r\n`)
      }
      else {
        responseStream.write(`50 Sorry\r\n`)
      }

      responseStream.end()
    })

    fileStream.on('open', () => {
      if (responseStream.writableEnded) {
        return
      }

      responseStream.write(`20 ${mimeType}\r\n`)
      fileStream.pipe(responseStream)
    })

    return responseStream
  }

  async makeDirectoryListing(dirPath) {
    try {
      const items = await readdir(dirPath)
      const page = [
        '20 text/gemini \r',
        ...items
          .filter(item => !item.startsWith('.'))
          .map(item => `=> ${item}`),
      ]
        .join('\n')

      return Readable.from(page)
    }
    catch (e) {
      console.debug(`Couldn't build directory index (${dirPath})`, e)
      return null
    }
  }
}
