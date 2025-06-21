import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.warn(
    'Supabase environment variables are missing. The client will be disabled.'
  )
}

export const supabase =
  supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey, {
        auth: {
          // Avoid conflicts when multiple Supabase apps share the same browser context
          storageKey: 'forecasting-app.auth'
        }
      })
    : null

// Optional admin client for server-side operations
const serviceRoleKey = process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY
export const supabaseAdmin =
  supabaseUrl && serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey) : null

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
