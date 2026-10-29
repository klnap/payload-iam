#!/usr/bin/env bun
import { runCli } from '../src/cli/main.ts'

runCli(process.argv)
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err)
    process.exit(1)
  })
