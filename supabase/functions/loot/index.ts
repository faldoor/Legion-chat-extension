import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ownerNick = 'faldoorch'

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

function normalizeNick(value: unknown) {
  return String(value || '')
    .replace(/[\u200b-\u200f\u202a-\u202e\u2060-\u2064\ufeff]/g, '')
    .replace(/^@+/, '')
    .replace(/\s+/g, '')
    .replace(/[.,;:!?]+$/, '')
    .toLowerCase()
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

async function requireOwner(request: Request, nickname: unknown) {
  await requireUser(request)
  if (normalizeNick(nickname) !== ownerNick) {
    throw new HttpError('Управление доступно только нику faldoorch', 403, 'OWNER_FORBIDDEN')
  }
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
  const body = await request.json().catch(() => ({}))
  await requireOwner(request, body.owner_nick)
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
  const body = await request.json().catch(() => ({}))
  await requireOwner(request, body.owner_nick)
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
  const body = await request.json().catch(() => ({}))
  await requireOwner(request, body.owner_nick)
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
