import { neon } from '@neondatabase/serverless'

const databaseUrl = import.meta.env.VITE_DATABASE_URL || ''

export const sql = neon(databaseUrl)

export const NEON_AUTH_BASE_URL = 
  import.meta.env.VITE_NEON_AUTH_BASE_URL || 
  'https://ep-solitary-pond-bennl2ta.neonauth.c-9.us-east-2.aws.neon.tech/neondb/auth'

