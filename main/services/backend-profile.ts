import type {
  UserProfile,
  UserProfileUpdateInput,
} from '../../shared/respondy-types'
import { requestJson } from './backend-client'

type UnknownRecord = Record<string, unknown>

type ProfileResponse = {
  data?: unknown
  user?: unknown
  profile?: unknown
  name?: unknown
  username?: unknown
  email?: unknown
  birth_date?: unknown
  birthDate?: unknown
}

function toStringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function toRecord(value: unknown): UnknownRecord | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as UnknownRecord
}

function getProfileEndpoint(): string {
  return process.env.USER_PROFILE_ENDPOINT?.trim() || '/auth/profile/'
}

function normalizeProfile(body: unknown): UserProfile {
  const root = toRecord(body) ?? {}
  const data = toRecord(root.data) ?? {}
  const profile = toRecord(root.profile) ?? toRecord(data.profile) ?? {}
  const user = toRecord(root.user) ?? toRecord(data.user) ?? {}

  const name =
    toStringValue(profile.name) ||
    toStringValue(data.name) ||
    toStringValue(root.name) ||
    toStringValue(user.name) ||
    toStringValue(user.username) ||
    toStringValue(data.username) ||
    toStringValue(root.username)
  const email =
    toStringValue(profile.email) ||
    toStringValue(data.email) ||
    toStringValue(root.email) ||
    toStringValue(user.email)
  const birthDate =
    toStringValue(profile.birth_date) ||
    toStringValue(profile.birthDate) ||
    toStringValue(data.birth_date) ||
    toStringValue(data.birthDate) ||
    toStringValue(root.birth_date) ||
    toStringValue(root.birthDate) ||
    toStringValue(user.birth_date) ||
    toStringValue(user.birthDate)

  return {
    name,
    email,
    birthDate,
  }
}

export async function getUserProfile(): Promise<UserProfile> {
  const body = await requestJson<ProfileResponse>(getProfileEndpoint(), {
    method: 'GET',
    auth: true,
  })
  return normalizeProfile(body)
}

export async function updateUserProfile(
  payload: UserProfileUpdateInput,
): Promise<UserProfile> {
  const name = payload.name.trim()
  const email = payload.email.trim()
  if (!name || !email) {
    throw new Error('이름과 이메일을 입력해 주세요.')
  }

  const body = await requestJson<ProfileResponse>(getProfileEndpoint(), {
    method: 'PATCH',
    auth: true,
    body: {
      name,
      email,
      birth_date: payload.birthDate.trim(),
    },
  })

  return normalizeProfile(body)
}
