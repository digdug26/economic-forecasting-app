import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

// Reuse the client across HMR reloads to avoid creating multiple
// GoTrueClient instances which can cause unexpected behavior.
const existingClient = globalThis.__supabaseClient;
export const supabase =
  existingClient || createClient(supabaseUrl, supabaseKey);
if (!existingClient) {
  globalThis.__supabaseClient = supabase;
}

// Optional admin client for server-side operations
const serviceRoleKey = process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY;
const existingAdmin = globalThis.__supabaseAdmin;
export const supabaseAdmin = serviceRoleKey
  ? existingAdmin || createClient(supabaseUrl, serviceRoleKey)
  : null;
if (!existingAdmin && supabaseAdmin) {
  globalThis.__supabaseAdmin = supabaseAdmin;
}

// Helper function to check if user is admin
export const isAdmin = async () => {
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
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  
  const { data: userData } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  return userData
}
