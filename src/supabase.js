import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.warn(
    'Supabase environment variables are missing. The client will be disabled.'
  )
}

export const AUTH_STORAGE_PREFIX = 'forecasting-app.auth'

// Ensure we only ever create a single Supabase client, even during
// React fast refresh/hot module replacement.  We store the instance on
// the global object so repeated imports don't create new clients.
const globalScope =
  typeof window !== 'undefined'
    ? window
    : typeof global !== 'undefined'
    ? global
    : {}

const createSupabase = () =>
  createClient(supabaseUrl, supabaseKey, {
    auth: {
      // Avoid conflicts when multiple Supabase apps share the same browser context
      storageKey: AUTH_STORAGE_PREFIX,
      storage: globalScope.localStorage,
      persistSession: true,
      detectSessionInUrl: true,
    },
  })

export const supabase = (() => {
  if (!supabaseUrl || !supabaseKey) return null
  if (!globalScope.__supabase) {
    globalScope.__supabase = createSupabase()
  }
  return globalScope.__supabase
})()

// Optional admin client for server-side operations
const serviceRoleKey = process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY

const createSupabaseAdmin = () =>
  createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      // Use a separate storage key and disable session persistence to avoid
      // conflicts with the main client in the browser
      storageKey: 'forecasting-app.admin-auth',
      autoRefreshToken: false,
      persistSession: false,
    },
  })

export const supabaseAdmin = (() => {
  if (!supabaseUrl || !serviceRoleKey) return null
  if (!globalScope.__supabaseAdmin) {
    globalScope.__supabaseAdmin = createSupabaseAdmin()
  }
  return globalScope.__supabaseAdmin
})()

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
  console.log('Validating existing auth session')
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession()
    if (error || !session) {
      console.warn('No active session found, attempting recovery')
      // Attempt manual recovery from stored token if Supabase did not
      // initialize the session yet (e.g. in private browsing).
      try {
        const raw = localStorage.getItem(`${AUTH_STORAGE_PREFIX}-token`)
        if (raw) {
          const parsed = JSON.parse(raw)
          const current = parsed.currentSession || parsed
          if (current?.access_token && current?.refresh_token) {
            console.log('Restoring session from local storage')
            const { data: recovered } = await supabase.auth.setSession({
              access_token: current.access_token,
              refresh_token: current.refresh_token,
            })
            if (recovered.session) {
              console.log('Session recovery successful')
              return recovered.session
            }
          }
        }
      } catch (parseError) {
        console.error('Failed to recover stored session', parseError)
      }
      console.log('Clearing invalid auth state')
      await supabase.auth.signOut()
      clearAuthStorage()
      return null
    }
    console.log('Existing session valid')
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
