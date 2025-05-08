import { readdir, readFile, stat } from 'node:fs/promises'
import { join, relative, resolve, sep } from 'node:path'
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
    catch (e) {
      console.debug(`Couldn't read capsule contents (${path})`, e)
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
    const indexBuffer = await this.handleFile(join(dirPath, 'index.gmi'))

    if (indexBuffer) {
      return indexBuffer
    }

    return this.makeDirectoryListing(dirPath)
  }

  async handleFile(filePath) {
    const mimeType = MimeTypesDictionary.lookup(filePath)

    try {
      let body = await readFile(filePath)

      if (mimeType === 'text/gemini' && this.fromCName === false) {
        const relativePath = relative(this.basePath, filePath)
        const userDir = relativePath.split(sep, 1)[0]

        body = this.rewriteLinks(body, userDir)
      }

      return Buffer.concat([
        Buffer.from(`20 ${mimeType}\r\n`, 'utf-8'),
        body,
      ])
    }
    catch (e) {
      console.debug(`Couldn't read file (${filePath})`, e)

      return null
    }
  }

  async makeDirectoryListing(dirPath) {
    try {
      const items = await readdir(dirPath)

      return Buffer.concat([
        Buffer.from(`20 text/gemini\r\n`),
        Buffer.from(
          items
            .filter(item => !item.startsWith('.'))
            .map(item => `=> ${item}`)
            .join('\n'),
          'utf-8',
        ),
      ])
    }
    catch (e) {
      console.debug(`Couldn't build directory index (${dirPath})`, e)
      return null
    }
  }

  rewriteLinks(gemtext, userDir) {
    const rx = new RegExp(`^=>\\s*(?!${userDir})([^\\s]+)(.*)?$`)

    const modifiedDocument = gemtext.toString()
      .split(/\r?\n/)
      .map((line) => {
        if (!line.startsWith('=>')) {
          return line
        }

        return line.replace(rx, `=> ${userDir}/$1$2`)
      })
      .join('\n')

    return Buffer.from(modifiedDocument, 'utf-8')
  }
}
