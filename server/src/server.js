import { env } from './config/env.js'
import { connectDb } from './config/db.js'
import app from './app.js'

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

if (!process.env.VERCEL) start()

export default app
