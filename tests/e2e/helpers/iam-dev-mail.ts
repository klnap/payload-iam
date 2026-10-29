import { execSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { iamE2eOtpLog } from '../fixtures'

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')

export function latestLoginOtpFromLog(logPath = iamE2eOtpLog): string {
  const script = path.join(packageRoot, 'scripts/host-regression/fetch-login-otp.sh')
  return execSync(`bash "${script}" "${logPath}"`, { encoding: 'utf8' }).trim()
}
