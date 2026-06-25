import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'
import { PrismaClient } from '@prisma/client'
import { google } from 'googleapis'

const prisma = new PrismaClient()
const DEFAULT_CLIENT_SECRET_FILENAME = 'client_secret.json'
const DEFAULT_SERVER_PORT = process.env.PORT || '3000'
const DEFAULT_REDIRECT_URI = `http://localhost:${DEFAULT_SERVER_PORT}/api/repository/drive/callback`

function resolveClientSecretPath() {
  const candidates = [
    process.env.GOOGLE_CLIENT_SECRET_PATH,
    resolve(process.cwd(), DEFAULT_CLIENT_SECRET_FILENAME),
    resolve(process.cwd(), 'server', DEFAULT_CLIENT_SECRET_FILENAME),
  ].filter(Boolean) as string[]

  return candidates.find((candidate) => existsSync(candidate)) || candidates[0]
}

const CLIENT_SECRET_PATH = resolveClientSecretPath()

function loadCredentialsFromFile() {
  if (!CLIENT_SECRET_PATH || !existsSync(CLIENT_SECRET_PATH)) {
    console.warn(
      'Google OAuth client_secret.json not found. Checked path:',
      CLIENT_SECRET_PATH || 'none',
    )
    return null
  }

  try {
    const raw = readFileSync(CLIENT_SECRET_PATH, 'utf8')
    const parsed = JSON.parse(raw)
    const web = parsed.web || parsed.installed
    if (!web) {
      console.warn('Google OAuth client_secret.json did not contain web/installed credentials:', CLIENT_SECRET_PATH)
      return null
    }

    const fileRedirectUri = Array.isArray(web.redirect_uris) ? web.redirect_uris[0] : undefined
    console.info('Loaded Google OAuth credentials from:', CLIENT_SECRET_PATH)
    return {
      clientId: web.client_id,
      clientSecret: web.client_secret,
      redirectUri: process.env.GOOGLE_REDIRECT_URI || fileRedirectUri || DEFAULT_REDIRECT_URI,
    }
  } catch (err) {
    console.warn('Failed to load Google OAuth credentials from client_secret.json', CLIENT_SECRET_PATH, err)
    return null
  }
}

const fileCredentials = loadCredentialsFromFile()
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || fileCredentials?.clientId
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || fileCredentials?.clientSecret
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || fileCredentials?.redirectUri || DEFAULT_REDIRECT_URI

function ensureGoogleOAuthConfigured() {
  const missing: string[] = []
  if (!CLIENT_ID) missing.push('GOOGLE_CLIENT_ID')
  if (!CLIENT_SECRET) missing.push('GOOGLE_CLIENT_SECRET')
  if (!REDIRECT_URI) missing.push('GOOGLE_REDIRECT_URI')
  if (missing.length) {
    throw new Error(`Google Drive OAuth is not configured: missing ${missing.join(', ')}`)
  }
}

async function createOAuth2ClientForUser(userId?: string) {
  if (userId && typeof (prisma as any).googleDriveClient?.findUnique === 'function') {
    try {
      const client = await (prisma as any).googleDriveClient.findUnique({ where: { userId } })
      if (client && client.clientId && client.clientSecret && client.redirectUri) {
        return new google.auth.OAuth2(client.clientId, client.clientSecret, client.redirectUri)
      }
    } catch (err) {
      console.warn('Failed to load per-user GoogleDriveClient config, falling back to env', err)
    }
  }

  ensureGoogleOAuthConfigured()
  return new google.auth.OAuth2(CLIENT_ID!, CLIENT_SECRET!, REDIRECT_URI!)
}

export async function generateAuthUrl(userId?: string, scopes: string[] = ['https://www.googleapis.com/auth/drive']) : Promise<string> {
  const oAuth2Client = await createOAuth2ClientForUser(userId)
  // include userId in state so callback can persist tokens to the right user
  const state = Buffer.from(JSON.stringify({ userId })).toString('base64')
  return oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: scopes,
    state,
  })
}

export async function exchangeCodeAndSave(userId: string, code: string) {
  const oAuth2Client = await createOAuth2ClientForUser(userId)
  const { tokens } = await oAuth2Client.getToken(code)
  await saveTokensForUser(userId, tokens)
  return tokens
}

export async function saveTokensForUser(userId: string, tokens: any) {
  const data: any = {
    accessToken: tokens.access_token || tokens.accessToken || '',
    refreshToken: tokens.refresh_token || tokens.refreshToken || '',
    scope: tokens.scope || null,
    tokenType: tokens.token_type || null,
    expiryDate: typeof tokens.expiry_date === 'number' ? BigInt(tokens.expiry_date) : tokens.expiry_date ? BigInt(Number(tokens.expiry_date)) : null,
  }

  // Upsert the token row for the user
  await prisma.googleDriveToken.upsert({
    where: { userId },
    create: { userId, ...data },
    update: { ...data },
  })
}

export async function getTokensForUser(userId: string) {
  return prisma.googleDriveToken.findUnique({ where: { userId } })
}

export async function getDriveClientForUser(userId: string) {
  const tokenRow = await getTokensForUser(userId)
  if (!tokenRow) throw new Error('No Google Drive token found for user')
  const oAuth2Client = await createOAuth2ClientForUser(userId)
  const current = {
    access_token: tokenRow.accessToken,
    refresh_token: tokenRow.refreshToken,
    scope: tokenRow.scope || undefined,
    token_type: tokenRow.tokenType || undefined,
    expiry_date: tokenRow.expiryDate ? Number(tokenRow.expiryDate) : undefined,
  }

  oAuth2Client.setCredentials(current)

  // Persist refresh/access tokens when the client refreshes
  // @ts-ignore - OAuth2Client emits 'tokens'
  oAuth2Client.on('tokens', async (newTokens: any) => {
    try {
      const merged = {
        access_token: newTokens.access_token || current.access_token,
        refresh_token: newTokens.refresh_token || current.refresh_token,
        scope: newTokens.scope || current.scope,
        token_type: newTokens.token_type || current.token_type,
        expiry_date: newTokens.expiry_date || current.expiry_date,
      }
      await saveTokensForUser(userId, merged)
    } catch (err) {
      console.error('Failed to persist refreshed Google tokens for user', userId, err)
    }
  })

  const drive = google.drive({ version: 'v3', auth: oAuth2Client })
  return { oAuth2Client, drive }
}

export async function getDocsClientForUser(userId: string) {
  const { oAuth2Client } = await getDriveClientForUser(userId)
  return google.docs({ version: 'v1', auth: oAuth2Client })
}

export async function getSheetsClientForUser(userId: string) {
  const { oAuth2Client } = await getDriveClientForUser(userId)
  return google.sheets({ version: 'v4', auth: oAuth2Client })
}

export async function revokeTokensForUser(userId: string) {
  const tokenRow = await getTokensForUser(userId)
  if (!tokenRow) return
  const oAuth2Client = await createOAuth2ClientForUser(userId)
  oAuth2Client.setCredentials({ refresh_token: tokenRow.refreshToken })
  try {
    await oAuth2Client.revokeCredentials()
  } catch (err) {
    console.warn('Failed to revoke credentials for user', userId, err)
  }
  await prisma.googleDriveToken.deleteMany({ where: { userId } })
}

export function parseState(state?: string): { userId?: string } {
  if (!state) return {}
  try {
    const decoded = Buffer.from(state, 'base64').toString('utf8')
    return JSON.parse(decoded)
  } catch (err) {
    return {}
  }
}

export default {
  generateAuthUrl,
  exchangeCodeAndSave,
  getDriveClientForUser,
  getDocsClientForUser,
  getSheetsClientForUser,
  getTokensForUser,
  revokeTokensForUser,
  parseState,
}
