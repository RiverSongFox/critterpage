import db from 'mime-db'
import { extname } from 'node:path'

export class MimeTypesDictionary {
  constructor() {
    this.dictionary = {
      gmi: 'text/gemini',
    }

    for (const mimeType in db) {
      for (const extension of db[mimeType].extensions ?? []) {
        this.dictionary[extension] = mimeType
      }
    }
  }

  static instance = null
  static lookup(file) {
    if (!this.instance) {
      this.instance = new MimeTypesDictionary()
    }

    const dictionary = this.instance.dictionary
    const extension = extname(file).toLowerCase().slice(1)

    return dictionary[extension] ?? 'application/octet-stream'
  }
}
