import { stat } from 'node:fs/promises'
import { join } from 'node:path'
import { Capsule } from './Capsule.mjs'
import { CNameResolver } from './CNameResolver.mjs'

export class CapsuleFactory {
  constructor(hostname, dataDir) {
    this.hostname = hostname
    this.dataDir = dataDir

    this.cnameResolver = new CNameResolver(dataDir)
  }

  async findCapsule(url) {
    const {
      capsuleDir,
      fromCName,
    } = await this.findCapsuleDir(url)

    try {
      const capsulePath = join(this.dataDir, capsuleDir)
      const stats = await stat(capsulePath)

      if (stats.isDirectory()) {
        return new Capsule(capsulePath, fromCName)
      }
    }
    catch (e) {
      console.debug(`Couldn't read capsule dir`, e)
      throw new Error('Not Found')
    }

    throw new Error('Not Found')
  }

  async findCapsuleDir(url) {
    const fromCName = await this.cnameResolver.findCapsuleDir(url.hostname)

    if (fromCName) {
      return {
        fromCName: true,
        capsuleDir: fromCName,
      }
    }

    return {
      fromCName: false,
      capsuleDir: url.pathname.split('/')[0],
    }
  }
}
