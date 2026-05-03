'use server'

import bcrypt from 'bcryptjs'
import { createSession, destroySession } from '@/lib/auth'
import { redirect } from 'next/navigation'

export async function login(formData: FormData): Promise<{ error?: string } | undefined> {
  const password = formData.get('password') as string

  if (!password) {
    return { error: 'Password is required.' }
  }

  const hash = process.env.DASHBOARD_PASSWORD_HASH
  if (!hash) {
    return { error: 'Dashboard not configured. Contact admin.' }
  }

  const valid = await bcrypt.compare(password, hash)
  if (!valid) {
    return { error: 'Incorrect password.' }
  }

  await createSession()
  return undefined
}

export async function logout() {
  await destroySession()
  redirect('/login')
}
