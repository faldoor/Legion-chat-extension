import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const twitchClientId = Deno.env.get('TWITCH_CLIENT_ID')!
const twitchClientSecret = Deno.env.get('TWITCH_CLIENT_SECRET')!
const twitchOwnerUserId = Deno.env.get('TWITCH_OWNER_USER_ID')!
const configuredCallbackUrl = Deno.env.get('LOOT_CALLBACK_URL')!
const ownerSessionTtlSeconds = 60 * 60 * 24 * 30

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8',
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: corsHeaders })
const error = (message: string, status = 400, code = 'BAD_REQUEST') => json({ error: message, code }, status)

function randomToken(bytes = 32) {
  const data = new Uint8Array(bytes)
  crypto.getRandomValues(data)
  return Array.from(data, (value) => value.toString(16).padStart(2, '0')).join('')
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function bearer(request: Request) {
  const value = request.headers.get('authorization') || ''
  return value.startsWith('Bearer ') ? value.slice(7).trim() : ''
}

async function requireUser(request: Request) {
  const token = bearer(request)
  if (!token) throw new HttpError('Требуется вход в Supabase', 401, 'AUTH_REQUIRED')
  const { data, error: authError } = await admin.auth.getUser(token)
  if (authError || !data.user) throw new HttpError('Недействительная сессия', 401, 'AUTH_INVALID')
  return data.user
}

class HttpError extends Error {
  status: number
  code: string

  constructor(message: string, status: number, code: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

async function requireOwner(request: Request) {
  const tokenHash = await sha256(bearer(request))
  if (!tokenHash) throw new HttpError('Требуется доступ владельца', 401, 'OWNER_REQUIRED')
  const { data, error: queryError } = await admin
    .from('loot_owner_sessions')
    .select('twitch_user_id,expires_at')
    .eq('token_hash', tokenHash)
    .maybeSingle()
  if (queryError || !data || data.twitch_user_id !== twitchOwnerUserId || new Date(data.expires_at).getTime() <= Date.now()) {
    throw new HttpError('Доступ владельца истёк', 403, 'OWNER_FORBIDDEN')
  }
}

function validCallback(value: unknown) {
  return typeof value === 'string' && value === configuredCallbackUrl
}

async function twitchStart(request: Request) {
  const body = request.method === 'POST' ? await request.json().catch(() => ({})) : {}
  const callbackUrl = body.callback_url || configuredCallbackUrl
  if (!validCallback(callbackUrl)) throw new HttpError('Недопустимый callback URL', 400, 'CALLBACK_INVALID')
  const state = randomToken(24)
  const { error: insertError } = await admin.from('loot_oauth_states').insert({
    state_hash: await sha256(state),
    callback_url: callbackUrl,
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  })
  if (insertError) throw new HttpError('Не удалось начать Twitch OAuth', 500, 'OAUTH_STATE_FAILED')
  const params = new URLSearchParams({
    client_id: twitchClientId,
    redirect_uri: `${supabaseUrl}/functions/v1/loot/twitch/callback`,
    response_type: 'code',
    scope: 'user:read:email',
    state,
  })
  return json({ authorize_url: `https://id.twitch.tv/oauth2/authorize?${params}` })
}

async function twitchCallback(url: URL) {
  const oauthError = url.searchParams.get('error')
  const state = url.searchParams.get('state') || ''
  const stateHash = await sha256(state)
  const { data: savedState } = await admin.from('loot_oauth_states').select('*').eq('state_hash', stateHash).maybeSingle()
  if (!savedState || new Date(savedState.expires_at).getTime() <= Date.now()) return error('OAuth state истёк', 400, 'OAUTH_STATE_INVALID')
  await admin.from('loot_oauth_states').delete().eq('state_hash', stateHash)
  if (oauthError) return Response.redirect(`${savedState.callback_url}?loot_error=${encodeURIComponent(oauthError)}`, 302)

  const code = url.searchParams.get('code') || ''
  const tokenResponse = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: twitchClientId, client_secret: twitchClientSecret, code, grant_type: 'authorization_code', redirect_uri: `${supabaseUrl}/functions/v1/loot/twitch/callback` }),
  })
  if (!tokenResponse.ok) return error('Twitch не подтвердил OAuth', 401, 'TWITCH_TOKEN_FAILED')
  const twitchToken = await tokenResponse.json()
  const userResponse = await fetch('https://api.twitch.tv/helix/users', { headers: { Authorization: `Bearer ${twitchToken.access_token}`, 'Client-Id': twitchClientId } })
  if (!userResponse.ok) return error('Не удалось получить Twitch-пользователя', 401, 'TWITCH_USER_FAILED')
  const twitchUser = (await userResponse.json()).data?.[0]
  if (!twitchUser || twitchUser.id !== twitchOwnerUserId) return Response.redirect(`${savedState.callback_url}?loot_error=owner_required`, 302)

  const ownerCode = randomToken(32)
  const { error: codeError } = await admin.from('loot_owner_codes').insert({
    code_hash: await sha256(ownerCode),
    twitch_user_id: twitchUser.id,
    expires_at: new Date(Date.now() + 2 * 60 * 1000).toISOString(),
  })
  if (codeError) return error('Не удалось создать код владельца', 500, 'OWNER_CODE_FAILED')
  return Response.redirect(`${savedState.callback_url}?owner_code=${encodeURIComponent(ownerCode)}`, 302)
}

async function exchangeOwnerCode(request: Request) {
  const body = await request.json().catch(() => ({}))
  const codeHash = await sha256(String(body.code || ''))
  const { data: code, error: queryError } = await admin.from('loot_owner_codes').select('*').eq('code_hash', codeHash).maybeSingle()
  if (queryError || !code || code.used_at || code.twitch_user_id !== twitchOwnerUserId || new Date(code.expires_at).getTime() <= Date.now()) {
    throw new HttpError('Код владельца недействителен', 401, 'OWNER_CODE_INVALID')
  }
  const { data: marked, error: markError } = await admin.from('loot_owner_codes').update({ used_at: new Date().toISOString() }).eq('code_hash', codeHash).is('used_at', null).select('code_hash').maybeSingle()
  if (markError || !marked) throw new HttpError('Код владельца уже использован', 409, 'OWNER_CODE_USED')
  const token = randomToken(32)
  const { error: sessionError } = await admin.from('loot_owner_sessions').insert({ token_hash: await sha256(token), twitch_user_id: twitchOwnerUserId, expires_at: new Date(Date.now() + ownerSessionTtlSeconds * 1000).toISOString() })
  if (sessionError) throw new HttpError('Не удалось сохранить сессию владельца', 500, 'OWNER_SESSION_FAILED')
  return json({ owner_token: token, expires_at: new Date(Date.now() + ownerSessionTtlSeconds * 1000).toISOString() })
}

async function getLootState(request: Request) {
  await requireUser(request)
  const { data: active, error: roundError } = await admin.from('loot_rounds').select('*').eq('status', 'active').order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (roundError) throw new HttpError('Не удалось загрузить разролл', 500, 'STATE_FAILED')
  const round = active || (await admin.from('loot_rounds').select('*').order('created_at', { ascending: false }).limit(1).maybeSingle()).data
  const rolls = round ? (await admin.from('loot_rolls').select('id,round_id,user_id,nick,roll,created_at').eq('round_id', round.id).order('roll', { ascending: false }).order('created_at', { ascending: true })).data || [] : []
  return json({ round: round || null, rolls, server_now: new Date().toISOString() })
}

async function createRound(request: Request) {
  await requireOwner(request)
  const body = await request.json().catch(() => ({}))
  const itemName = String(body.item_name || '').trim().slice(0, 160)
  const rarity = String(body.rarity || '')
  const duration = Number(body.duration_seconds)
  if (!itemName || !['серая', 'необычная', 'редкая', 'эпическая', 'легендарная', 'мифическая'].includes(rarity) || !Number.isInteger(duration) || duration < 10 || duration > 86400) throw new HttpError('Проверьте предмет, редкость и таймер', 400, 'ROUND_INVALID')
  await admin.from('loot_rounds').update({ status: 'finished' }).eq('status', 'active')
  const startsAt = new Date()
  const { data, error: insertError } = await admin.from('loot_rounds').insert({ item_name: itemName, rarity, duration_seconds: duration, starts_at: startsAt.toISOString(), ends_at: new Date(startsAt.getTime() + duration * 1000).toISOString(), status: 'active' }).select('*').single()
  if (insertError) throw new HttpError('Не удалось создать раунд', 409, 'ROUND_CREATE_FAILED')
  return json({ round: data, rolls: [] })
}

async function finishRound(request: Request) {
  await requireOwner(request)
  const { data, error: updateError } = await admin.from('loot_rounds').update({ status: 'finished' }).eq('status', 'active').select('*').maybeSingle()
  if (updateError) throw new HttpError('Не удалось завершить раунд', 500, 'ROUND_FINISH_FAILED')
  return json({ round: data || null })
}

async function rollLoot(request: Request) {
  const user = await requireUser(request)
  const body = await request.json().catch(() => ({}))
  const nick = String(body.nick || '').trim().slice(0, 80)
  const roundId = String(body.round_id || '')
  if (!nick || !roundId) throw new HttpError('Не указан участник или раунд', 400, 'ROLL_INVALID')
  const roll = crypto.getRandomValues(new Uint32Array(1))[0] % 100 + 1
  const { data, error: rpcError } = await admin.rpc('claim_loot_roll', { p_round_id: roundId, p_user_id: user.id, p_nick: nick, p_roll: roll })
  if (rpcError) {
    if (rpcError.message === 'ALREADY_ROLLED') throw new HttpError('Ты уже роллил этот предмет', 409, 'ALREADY_ROLLED')
    if (rpcError.message === 'ROUND_EXPIRED') throw new HttpError('Время разролла истекло', 409, 'ROUND_EXPIRED')
    throw new HttpError('Не удалось сохранить ролл', 409, 'ROLL_FAILED')
  }
  return json({ roll: data })
}

async function clearLoot(request: Request) {
  await requireOwner(request)
  const body = await request.json().catch(() => ({}))
  const requestedRoundId = String(body.round_id || '')
  const roundQuery = admin.from('loot_rounds').select('id').order('created_at', { ascending: false }).limit(1)
  const { data: round } = requestedRoundId
    ? await roundQuery.eq('id', requestedRoundId).maybeSingle()
    : await roundQuery.maybeSingle()
  if (round) await admin.from('loot_rolls').delete().eq('round_id', round.id)
  return json({ cleared_round_id: round?.id || null })
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const url = new URL(request.url)
  try {
    if (url.pathname.endsWith('/twitch/start')) return await twitchStart(request)
    if (url.pathname.endsWith('/twitch/callback')) return await twitchCallback(url)
    if (url.pathname.endsWith('/owner/exchange')) return await exchangeOwnerCode(request)
    if (url.pathname.endsWith('/loot/state')) return await getLootState(request)
    if (url.pathname.endsWith('/loot/round/finish')) return await finishRound(request)
    if (url.pathname.endsWith('/loot/round')) return await createRound(request)
    if (url.pathname.endsWith('/loot/roll')) return await rollLoot(request)
    if (url.pathname.endsWith('/loot/clear')) return await clearLoot(request)
    return error('Маршрут не найден', 404, 'NOT_FOUND')
  } catch (caught) {
    const failure = caught instanceof HttpError ? caught : new HttpError('Внутренняя ошибка', 500, 'INTERNAL_ERROR')
    console.error(caught)
    return error(failure.message, failure.status, failure.code)
  }
})
