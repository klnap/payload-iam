export type ParsedUserAgent = {
  deviceLabel: string
  browserLabel: string
  osLabel: string
}

const MOBILE_RE = /Mobile|Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i

export function parseUserAgent(userAgent: string | null | undefined): ParsedUserAgent {
  const ua = (userAgent ?? '').trim()
  if (!ua) {
    return {
      deviceLabel: 'Unknown device',
      browserLabel: 'Unknown browser',
      osLabel: 'Unknown OS',
    }
  }

  const isMobile = MOBILE_RE.test(ua)
  const deviceLabel = isMobile ? 'Mobile' : 'Desktop'

  let browserLabel = 'Browser'
  if (/Edg\//.test(ua)) browserLabel = 'Edge'
  else if (/Chrome\//.test(ua) && !/Edg\//.test(ua)) browserLabel = 'Chrome'
  else if (/Firefox\//.test(ua)) browserLabel = 'Firefox'
  else if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) browserLabel = 'Safari'
  else if (/OPR\//.test(ua) || /Opera/.test(ua)) browserLabel = 'Opera'

  let osLabel = 'Unknown OS'
  if (/Windows NT/.test(ua)) osLabel = 'Windows'
  else if (/Mac OS X/.test(ua) && !/iPhone|iPad|iPod/.test(ua)) osLabel = 'macOS'
  else if (/Android/.test(ua)) osLabel = 'Android'
  else if (/iPhone|iPad|iPod/.test(ua)) osLabel = 'iOS'
  else if (/Linux/.test(ua)) osLabel = 'Linux'

  return { deviceLabel, browserLabel, osLabel }
}
