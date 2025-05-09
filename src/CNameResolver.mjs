import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

const CNAME_CACHE_TTL_SECONDS = 60

export class CNameResolver {
  constructor(dataDir) {
    this.dataDir = dataDir
    this.nextUpdateAt = 0
    this.cache = new Map()
  }

  async findCapsuleDir(hostname) {
    await this.maybeRefresh()

    return this.cache.get(hostname) ?? null
  }

  async maybeRefresh() {
    const now = Date.now()

    if (now < this.nextUpdateAt) {
      return
    }

    this.nextUpdateAt = now + CNAME_CACHE_TTL_SECONDS * 1000
    this.cache.clear()

    const capsuleDirs = (await readdir(this.dataDir, { withFileTypes: true }))
      .filter(file => file.isDirectory())
      .map(file => file.name)

    for (const capsuleDir of capsuleDirs) {
      try {
        const path = join(this.dataDir, capsuleDir, 'CNAME')
        const contents = (await readFile(path, 'utf-8')).trim().toLowerCase()

        if (contents) {
          this.cache.set(contents, capsuleDir)
        }
      }
      catch (e) {
        if (e.code !== 'ENOENT') {
          console.warn(`Couldn't read CNAME in ${capsuleDir}; ${e.toString()}`)
        }
      }
    }
  }
}
