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

    for (const capsuleDir of await readdir(this.dataDir)) {
      try {
        const path = join(this.dataDir, capsuleDir, 'CNAME')
        const contents = (await readFile(path, 'utf-8')).trim().toLowerCase()

        if (contents) {
          this.cache.set(contents, capsuleDir)
        }
      }
      catch (_e) {
        console.debug(`Couldn't find CNAME in ${capsuleDir}`)
      }
    }
  }
}
