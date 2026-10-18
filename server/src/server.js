import { env } from './config/env.js'
import { connectDb } from './config/db.js'
import { createApp } from './app.js'

const app = createApp()

async function start() {
  try {
    await connectDb()
    app.listen(env.port, () => {
      console.info(`[server] SkillBridge AI API listening on port ${env.port}`)
    })
  } catch (err) {
    console.error('[server] failed to start', err.message)
    process.exit(1)
  }
}

start()
