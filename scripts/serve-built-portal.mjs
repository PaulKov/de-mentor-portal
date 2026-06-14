#!/usr/bin/env node

const port = process.argv[2] || process.env.PORT || '3471'
const host = process.env.HOST || '127.0.0.1'

process.env.HOST = host
process.env.PORT = port

await import('../.output/server/index.mjs')
