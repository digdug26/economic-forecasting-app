import React from "react";
import { supabase, isAdmin as checkAdmin, getCurrentUser } from '../supabase'

/**
 * Centralized service for admin operations. All admin-related
 * database calls should go through this module so the rest of the
 * application does not need to know about the underlying RPC
 * functions or security rules.
 */
export const adminService = {
  async createUserInvitation(email, name, role = 'forecaster') {
    const { data, error } = await supabase.functions.invoke('invite-user', {
      body: { email, role, name },
    })
    if (error) return { success: false, error: error.message }
    return { success: true, invitation: data }
  },

  async deleteUser(userId) {
    const { error } = await supabase.functions.invoke('delete-user', {
      body: { uid: userId },
    })
    if (error) return { success: false, error: error.message }
    return { success: true }
  },

  async updateUser(userId, updates) {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
    if (error) return { success: false, error: error.message }
    return { success: true, user: data?.[0] }
  },

  async getAllUsers() {
    const { data, error } = await supabase.from('users').select('*')
    if (error) return { success: false, error: error.message }
    return { success: true, users: data }
  },

  async createQuestion(questionData) {
    const { data, error } = await supabase
      .from('questions')
      .insert([questionData])
      .select()
    if (error) return { success: false, error: error.message }
    return { success: true, question: data?.[0] }
  },

  async updateQuestion(questionId, updates) {
    const { data, error } = await supabase
      .from('questions')
      .update(updates)
      .eq('id', questionId)
      .select()
    if (error) return { success: false, error: error.message }
    return { success: true, question: data?.[0] }
  },

  async deleteQuestion(questionId) {
    const { error } = await supabase.from('questions').delete().eq('id', questionId)
    if (error) return { success: false, error: error.message }
    return { success: true }
  },

  async resolveQuestion(questionId, resolutionData) {
    const { error } = await supabase
      .from('questions')
      .update(resolutionData)
      .eq('id', questionId)
    if (error) return { success: false, error: error.message }
    return { success: true }
  },

  async isCurrentUserAdmin() {
    return await checkAdmin()
  },

  async getCurrentUserInfo() {
    return await getCurrentUser()
  },
}

/**
 * Hook that exposes admin status and current user information.
 */
export function useAdmin() {
  const [isAdmin, setIsAdmin] = React.useState(false)
  const [currentUser, setCurrentUser] = React.useState(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    let active = true
    const fetchData = async () => {
      const user = await getCurrentUser()
      if (!active) return
      setCurrentUser(user)
      if (user) {
        const admin = await checkAdmin()
        if (!active) return
        setIsAdmin(admin)
      }
      setLoading(false)
    }
    fetchData()
    return () => {
      active = false
    }
  }, [])

  return { isAdmin, currentUser, loading }
}
