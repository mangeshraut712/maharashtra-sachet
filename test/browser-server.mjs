import { startDemoServer } from '../demo/server.mjs'

startDemoServer({ port: Number(process.env.PORT || 8800) })
