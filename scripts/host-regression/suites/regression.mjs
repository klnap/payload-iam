#!/usr/bin/env bun
/** Host regression (layer C) — live CMS HTTP checks. See specs/iam-testing.md */
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const PG = process.env.IAM_HOST_REGRESSION_PG_CONTAINER ?? 'stolbek-iam-audit-pg'
const PG_DB = process.env.IAM_HOST_REGRESSION_PG_DB ?? 'payload_iam_audit'

const WEB = (process.env.IAM_HOST_REGRESSION_URL ?? 'http://localhost:8010')
  .replace(/\/$/, '')
  .replace('127.0.0.1', 'localhost')
const BASE = `${WEB}/api`
const AUTH = `${BASE}/iam/auth`
const LOG =
  process.env.IAM_HOST_REGRESSION_OTP_LOG ??
  process.env.IAM_E2E_OTP_LOG ??
  '/home/klnap/code/stolbek/.generated/iam-audit/cms.log'
const ROOT_EMAIL = 'e2e-root@stolbek.test'
const ROOT_PASS = 'E2e-Root-9x!Secure'
const JUNIOR_EMAIL = 'e2e-junior@stolbek.test'
const JUNIOR_PASS = 'E2e-Fixture-9x!'

function clearRateLimit() {
  try {
    execSync(`docker exec ${PG} psql -U postgres -d ${PG_DB} -c 'DELETE FROM auth."rateLimit";'`, {
      stdio: 'ignore',
    })
  } catch {}
}

const results = []
function record(id, ok, detail) {
  results.push({ id, ok, detail })
}

const jar = new Map()
function cookies() {
  return [...jar.entries()].map(([a, b]) => `${a}=${b}`).join('; ')
}
function store(res) {
  for (const c of res.headers.getSetCookie?.() ?? []) {
    const [pair] = c.split(';')
    const i = pair.indexOf('=')
    if (i > 0) jar.set(pair.slice(0, i), pair.slice(i + 1))
  }
}
async function req(url, opts = {}, useJar = true) {
  const headers = { Origin: WEB, ...(opts.headers ?? {}) }
  if (useJar && cookies()) headers.Cookie = cookies()
  const res = await fetch(url, { ...opts, headers })
  const text = await res.text()
  let json
  try {
    json = JSON.parse(text)
  } catch {
    json = text.slice(0, 200)
  }
  store(res)
  return { status: res.status, json, headers: res.headers }
}

function latestOtp(beforeLine) {
  const lines = readFileSync(LOG, 'utf8').split('\n')
  for (let i = lines.length - 1; i >= (beforeLine || 0); i--) {
    const m = lines[i]?.match(/otp=(\d{6})/)
    if (m) return m[1]
  }
  return ''
}

async function loginEmailPassword(email, password) {
  jar.clear()
  const n = readFileSync(LOG, 'utf8').split('\n').length
  let s1 = await req(`${AUTH}/email-and-password/sign-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (s1.status === 403) {
    clearRateLimit()
    await Bun.sleep(400)
    s1 = await req(`${AUTH}/email-and-password/sign-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
  }
  if (s1.status !== 200) throw new Error(`sign-in ${email} ${s1.status}`)
  await Bun.sleep(600)
  const otp = latestOtp(n)
  if (!otp) throw new Error(`no OTP for ${email}`)
  const s2 = await req(`${AUTH}/email-and-password/login-otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: otp }),
  })
  if (s2.status !== 200) throw new Error(`otp ${email} ${s2.status}`)
}

async function loginRoot() {
  await loginEmailPassword(ROOT_EMAIL, ROOT_PASS)
}

async function ensureRootSession() {
  const me = await req(`${BASE}/users/me`)
  if (me.json?.user?.email === ROOT_EMAIL) return
  clearRateLimit()
  await Bun.sleep(300)
  await loginEmailPassword(ROOT_EMAIL, ROOT_PASS)
}

async function main() {
  clearRateLimit()

  const anonReset = await req(
    `${BASE}/iam/users/send-password-reset`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: '00000000-0000-0000-0000-000000000001' }),
    },
    false
  )
  record('M-3.4.5', anonReset.status === 401, `anon ${anonReset.status}`)

  jar.clear()
  const nPending = readFileSync(LOG, 'utf8').split('\n').length
  await req(`${AUTH}/email-and-password/sign-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ROOT_EMAIL, password: ROOT_PASS }),
  })
  await Bun.sleep(400)
  const otpFirst = latestOtp(nPending)
  const logBeforeResend = readFileSync(LOG, 'utf8').split('\n').length
  await req(`${AUTH}/email-and-password/login-otp/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  })
  await Bun.sleep(500)
  const otpSecond = latestOtp(logBeforeResend)
  record(
    'M-2.2.5',
    Boolean(otpSecond && otpFirst && otpSecond !== otpFirst),
    `otp ${otpFirst} -> ${otpSecond}`
  )
  const pending = await req(`${AUTH}/email-and-password/login-otp/pending-email`)
  record(
    'M-2.2.7',
    pending.status === 200 && pending.json?.email === ROOT_EMAIL,
    `${pending.status} ${JSON.stringify(pending.json)}`
  )
  record(
    'M-2.2.3',
    (
      await req(`${AUTH}/email-and-password/login-otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: '000000' }),
      })
    ).status >= 400,
    'wrong otp during challenge'
  )
  const otpGood = otpSecond || latestOtp(nPending)
  if (otpFirst) {
    const stale = await req(`${AUTH}/email-and-password/login-otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: otpFirst }),
    })
    record('M-2.2.5-stale', stale.status >= 400, `old otp ${stale.status}`)
  }
  if (otpGood) {
    await req(`${AUTH}/email-and-password/login-otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: otpGood }),
    })
  }

  const forgot = await fetch(`${WEB}/forgot`)
  record('M-3.1.1', forgot.status === 200, `GET /forgot ${forgot.status}`)

  const unknown = await req(
    `${BASE}/iam/users/request-password-email`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nobody-matrix@stolbek.test' }),
    },
    false
  )
  record(
    'M-3.1.3',
    unknown.status === 200 && unknown.json?.ok === true,
    `${unknown.status} ${JSON.stringify(unknown.json)}`
  )

  clearRateLimit()
  await Bun.sleep(300)
  await ensureRootSession()
  const me = await req(`${BASE}/users/me`)
  const rootId = me.json?.user?.id

  const rolesList = await req(`${BASE}/roles?limit=50`)
  const docs = rolesList.json?.docs ?? []
  const readerRole =
    docs.find((r) => r.name === 'E2E Reader' || r.slug === 'e2e-reader' || r.title === 'E2E Reader')
      ?.id ?? docs[0]?.id
  if (!readerRole) throw new Error('no role for M-4.2')

  const dupEmail = `dup-m42-${Date.now()}@stolbek.test`
  const rolePayload = (email) => ({
    email,
    fullName: 'Dup M42',
    roleIds: [readerRole],
  })
  const inv1 = await req(`${BASE}/iam/invitations/invite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(rolePayload(dupEmail)),
  })
  const inv2 = await req(`${BASE}/iam/invitations/invite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(rolePayload(dupEmail)),
  })
  record(
    'M-4.2',
    inv1.status === 200 && inv2.status === 409,
    `first=${inv1.status} second=${inv2.status} ${JSON.stringify(inv2.json).slice(0, 120)}`
  )

  const pendingInvId = inv1.json?.invitationId
  if (pendingInvId) {
    const mailBefore = readFileSync(LOG, 'utf8').split('\n').length
    const resendSilent = await req(`${BASE}/iam/invitations/resend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invitationId: pendingInvId, sendEmail: false }),
    })
    const mailSlice = readFileSync(LOG, 'utf8').split('\n').slice(mailBefore)
    const mailedDup = mailSlice.some((l) => l.includes(dupEmail) && l.includes('dev-mail'))
    record(
      'M-4.9',
      resendSilent.status === 200 && Boolean(resendSilent.json?.inviteUrl) && !mailedDup,
      `${resendSilent.status} mail=${mailedDup}`
    )
  } else {
    record('M-4.9', false, 'no invitationId from M-4.2')
  }

  const expEmailM44 = `exp-m44-${Date.now()}@stolbek.test`
  const expInvM44 = await req(`${BASE}/iam/invitations/invite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: expEmailM44, fullName: 'Expired M44', roleIds: [readerRole] }),
  })
  const expInvM44Id = expInvM44.json?.invitationId
  if (expInvM44Id) {
    execSync(
      `docker exec ${PG} psql -U postgres -d ${PG_DB} -c "UPDATE invitations SET status = 'expired', expires_at = NOW() - INTERVAL '1 day' WHERE id = '${expInvM44Id}';"`,
      { stdio: 'ignore' }
    )
    const dupExpired = await req(`${BASE}/iam/invitations/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: expEmailM44,
        fullName: 'Dup Expired',
        roleIds: [readerRole],
      }),
    })
    record(
      'M-4.4',
      dupExpired.status === 409 &&
        (dupExpired.json?.code === 'expired_invitation_exists' ||
          dupExpired.json?.error === 'expired_invitation_exists'),
      `${dupExpired.status} ${JSON.stringify(dupExpired.json).slice(0, 100)}`
    )
  } else {
    record('M-4.4', false, 'no exp invite')
  }

  const expEmailM410 = `exp-m410-${Date.now()}@stolbek.test`
  const expInv = await req(`${BASE}/iam/invitations/invite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: expEmailM410, fullName: 'Expired M410', roleIds: [readerRole] }),
  })
  const expInvId = expInv.json?.invitationId
  if (expInvId) {
    execSync(
      `docker exec ${PG} psql -U postgres -d ${PG_DB} -c "UPDATE invitations SET status = 'expired', expires_at = NOW() - INTERVAL '1 day' WHERE id = '${expInvId}';"`,
      { stdio: 'ignore' }
    )
    const mailBefore411 = readFileSync(LOG, 'utf8').split('\n').length
    const renew = await req(`${BASE}/iam/invitations/resend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invitationId: expInvId, sendEmail: true }),
    })
    const renewed = await req(`${BASE}/invitations/${expInvId}`)
    const mail411 = readFileSync(LOG, 'utf8').split('\n').slice(mailBefore411)
    const mailed411 = mail411.some((l) => l.includes(expEmailM410) && l.includes('dev-mail'))
    record(
      'M-4.10',
      renew.status === 200 && Boolean(renew.json?.inviteUrl) && renewed.json?.status === 'pending',
      `resend=${renew.status} status=${renewed.json?.status}`
    )
    record('M-4.11', renew.status === 200 && mailed411, `mail=${mailed411} resend=${renew.status}`)
  } else {
    record('M-4.10', false, 'no exp invite')
  }

  const m46Email = `m46-revoke-${Date.now()}@stolbek.test`
  const m46Inv = await req(`${BASE}/iam/invitations/invite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: m46Email, fullName: 'M46 Revoke', roleIds: [readerRole] }),
  })
  const m46Id = m46Inv.json?.invitationId
  const m46Url = m46Inv.json?.inviteUrl ?? ''
  const tokenMatch = m46Url.match(/token=([^&]+)/)
  if (m46Id && tokenMatch) {
    await req(`${BASE}/iam/invitations/revoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invitationId: m46Id }),
    })
    const accept = await req(
      `${AUTH}/invitations/accept`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitationId: m46Id, token: tokenMatch[1] }),
      },
      false
    )
    const invalidInvite =
      accept.json?.error === 'invalid_invite' ||
      String(accept.json?.code ?? '').includes('invalid_invite')
    record(
      'M-4.6',
      accept.status >= 400 || (accept.status === 200 && invalidInvite),
      `accept after revoke ${accept.status} ${JSON.stringify(accept.json).slice(0, 80)}`
    )
  } else {
    record('M-4.6', false, 'invite url/token missing')
  }

  const provEmail = `prov-m343-${Date.now()}@stolbek.test`
  const provUserId = crypto.randomUUID()
  try {
    execSync(
      `docker exec ${PG} psql -U postgres -d ${PG_DB} -c "INSERT INTO users (id, email, full_name, is_active, provisioning_status) VALUES ('${provUserId}', '${provEmail}', 'Prov M343', false, 'provisioning');"`,
      { stdio: 'ignore' }
    )
    const provReset = await req(`${BASE}/iam/users/send-password-reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: provUserId }),
    })
    record(
      'M-3.4.3',
      provReset.status === 400 &&
        String(provReset.json?.error ?? '')
          .toLowerCase()
          .includes('provisioning'),
      `${provReset.status} ${JSON.stringify(provReset.json)}`
    )
  } finally {
    try {
      execSync(
        `docker exec ${PG} psql -U postgres -d ${PG_DB} -c "DELETE FROM users WHERE id = '${provUserId}';"`,
        { stdio: 'ignore' }
      )
    } catch {}
  }

  const knownReset = await req(
    `${BASE}/iam/users/request-password-email`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'e2e-reader@stolbek.test' }),
    },
    false
  )
  record(
    'M-3.1.2',
    knownReset.status === 200 && knownReset.json?.ok === true,
    `reader ${knownReset.status}`
  )

  const noroles = await req(`${BASE}/users?where[email][equals]=e2e-noroles@stolbek.test&limit=1`)
  const norolesId = noroles.json?.docs?.[0]?.id

  const noCredEmail = `no-cred-m344-${Date.now()}@stolbek.test`
  const noCredUserId = crypto.randomUUID()
  try {
    execSync(
      `docker exec ${PG} psql -U postgres -d ${PG_DB} -c "INSERT INTO users (id, email, full_name, is_active, provisioning_status) VALUES ('${noCredUserId}', '${noCredEmail}', 'No Credential', true, 'none');"`,
      { stdio: 'ignore' }
    )
    const setKind = await req(`${BASE}/iam/users/send-password-reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: noCredUserId }),
    })
    record(
      'M-3.4.4',
      setKind.status === 200 && setKind.json?.kind === 'set',
      `${setKind.status} ${JSON.stringify(setKind.json)}`
    )
  } finally {
    try {
      execSync(
        `docker exec ${PG} psql -U postgres -d ${PG_DB} -c "DELETE FROM users WHERE id = '${noCredUserId}';"`,
        { stdio: 'ignore' }
      )
    } catch {}
  }

  const activeInvite = await req(`${BASE}/iam/invitations/invite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'e2e-reader@stolbek.test',
      fullName: 'Active Reader',
      roleIds: [readerRole],
    }),
  })
  record(
    'M-4.3',
    activeInvite.status === 409 &&
      (activeInvite.json?.code === 'email_already_provisioned' ||
        activeInvite.json?.error === 'email_already_provisioned'),
    `${activeInvite.status} ${JSON.stringify(activeInvite.json)}`
  )

  const rootRole = docs.find((r) => r.name === 'Root')?.id
  const noRolesRole = docs.find((r) => r.name === 'E2E No Roles')?.id
  if (norolesId && readerRole && rootRole && noRolesRole) {
    const withinCeiling = await req(`${BASE}/users/${norolesId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roles: [readerRole] }),
    })
    const aboveCeiling = await req(`${BASE}/users/${norolesId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roles: [rootRole] }),
    })
    await req(`${BASE}/users/${norolesId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roles: [noRolesRole] }),
    })
    record(
      'M-5.3',
      withinCeiling.status === 200 && (aboveCeiling.status === 403 || aboveCeiling.status === 400),
      `reader=${withinCeiling.status} root=${aboveCeiling.status} ${JSON.stringify(aboveCeiling.json).slice(0, 80)}`
    )
  } else {
    record('M-5.3', false, 'missing noroles/roles ids')
  }

  const payloadSecret = process.env.PAYLOAD_SECRET
  if (payloadSecret && readerRole) {
    const serviceInvite = await fetch(`${BASE}/iam/invitations/invite`, {
      method: 'POST',
      headers: {
        Origin: WEB,
        'Content-Type': 'application/json',
        'x-payload-service-token': payloadSecret,
      },
      body: JSON.stringify({
        email: `service-inv-${Date.now()}@stolbek.test`,
        fullName: 'Service Blocked',
        roleIds: [readerRole],
      }),
    })
    const serviceBody = await serviceInvite.json().catch(() => ({}))
    record(
      'M-5.9',
      serviceInvite.status === 401,
      `service invite ${serviceInvite.status} ${JSON.stringify(serviceBody).slice(0, 60)}`
    )
  } else {
    record('M-5.9', false, 'set PAYLOAD_SECRET in the host environment')
  }

  const selfTransfer = await req(`${BASE}/iam/users/transfer-root`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: String(rootId) }),
  })
  record(
    'M-5.5',
    selfTransfer.status === 400,
    `${selfTransfer.status} ${JSON.stringify(selfTransfer.json)}`
  )

  await req(`${AUTH}/sign-out`, { method: 'POST' })
  clearRateLimit()
  await Bun.sleep(500)
  await loginEmailPassword(JUNIOR_EMAIL, JUNIOR_PASS)
  const juniorMe = await req(`${BASE}/users/me`)
  record(
    'M-5.8',
    juniorMe.status === 200 && juniorMe.json?.user?.email === JUNIOR_EMAIL,
    `me ${juniorMe.status}`
  )
  const juniorInviteCeiling = noRolesRole
    ? await req(`${BASE}/iam/invitations/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `junior-ceiling-inv-${Date.now()}@stolbek.test`,
          fullName: 'Junior Ceiling OK',
          roleIds: [noRolesRole],
        }),
      })
    : { status: 0 }
  record(
    'M-5.3-junior-invite',
    juniorInviteCeiling.status === 200 && Boolean(juniorInviteCeiling.json?.invitationId),
    `no-roles invite ${juniorInviteCeiling.status} ${JSON.stringify(juniorInviteCeiling.json).slice(0, 80)}`
  )

  const juniorInviteRoot = rootRole
    ? await req(`${BASE}/iam/invitations/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `junior-root-inv-${Date.now()}@stolbek.test`,
          fullName: 'Blocked Root',
          roleIds: [rootRole],
        }),
      })
    : { status: 0 }
  record(
    'M-4.15',
    juniorInviteRoot.status === 403,
    `invite root ${juniorInviteRoot.status} ${JSON.stringify(juniorInviteRoot.json).slice(0, 80)}`
  )
  const juniorSendReset = norolesId
    ? await req(`${BASE}/iam/users/send-password-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: String(norolesId) }),
      })
    : { status: 0 }
  record('M-3.4.6', juniorSendReset.status === 403, `junior send ${juniorSendReset.status}`)
  const juniorTransfer = await req(`${BASE}/iam/users/transfer-root`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: String(rootId) }),
  })
  record('M-5.6', juniorTransfer.status === 403, `transfer ${juniorTransfer.status}`)

  await req(`${AUTH}/sign-out`, { method: 'POST' })
  clearRateLimit()
  await loginRoot()
  const signedOut = await req(`${AUTH}/get-session`, {}, false)
  record('M-2.4.1-api', signedOut.json?.session == null, 'sign-out clears session')

  const redirectTo = '/collections/redirects'
  const redirectsRes = await fetch(`${WEB}${redirectTo}`, {
    headers: { Cookie: cookies(), Origin: WEB },
  })
  const redirectsHtml = await redirectsRes.text()
  record(
    'M-2.1.6',
    redirectsRes.status === 200 &&
      (redirectsHtml.includes('Redirects') || redirectsHtml.includes('Redirect')),
    `GET ${redirectTo} after login ${redirectsRes.status}`
  )

  const badOtp = await req(
    `${AUTH}/email-and-password/login-otp/verify`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: '000000' }),
    },
    false
  )
  record('M-2.1.4', badOtp.status === 400 || badOtp.status === 401, `bad otp ${badOtp.status}`)

  const fail = results.filter((r) => !r.ok)
  console.log(JSON.stringify({ rootId, results, fail: fail.length }, null, 2))
  if (fail.length) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
