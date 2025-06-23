import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.warn(
    'Supabase environment variables are missing. The client will be disabled.'
  )
}

export const AUTH_STORAGE_PREFIX = 'forecasting-app.auth'

let supabaseInstance = null
export const getSupabase = () => {
  if (!supabaseUrl || !supabaseKey) return null
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseKey, {
      auth: {
        // Avoid conflicts when multiple Supabase apps share the same browser context
        storageKey: AUTH_STORAGE_PREFIX,
      },
    })
  }
  return supabaseInstance
}

export const supabase = getSupabase()

// Optional admin client for server-side operations
const serviceRoleKey = process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY
let adminInstance = null
export const getSupabaseAdmin = () => {
  if (!supabaseUrl || !serviceRoleKey) return null
  if (!adminInstance) {
    adminInstance = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        // Use a separate storage key and disable session persistence to avoid
        // conflicts with the main client in the browser
        storageKey: 'forecasting-app.admin-auth',
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  }
  return adminInstance
}

export const supabaseAdmin = getSupabaseAdmin()

// Helper function to check if user is admin
export const isAdmin = async () => {
  if (!supabase) {
    console.warn('Supabase client not initialized')
    return false
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()
  
  return userData?.role === 'admin'
}

// Helper function to get current user profile
export const getCurrentUser = async () => {
  if (!supabase) {
    console.warn('Supabase client not initialized')
    return null
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  
  const { data: userData } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  return userData
}

// Validate the current auth session and clear any invalid state
export const validateSession = async () => {
  if (!supabase) return null
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession()
    if (error || !session) {
      await supabase.auth.signOut()
      clearAuthStorage()
      return null
    }
    return session
  } catch (err) {
    console.error('Session validation failed:', err)
    clearAuthStorage()
    return null
  }
}

// Remove any Supabase auth items from localStorage
export const clearAuthStorage = () => {
  if (typeof localStorage === 'undefined') return
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith(AUTH_STORAGE_PREFIX)) {
      localStorage.removeItem(key)
    }
  })
}
