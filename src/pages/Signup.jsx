import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';

const Signup = () => {
  // Invitation links from Supabase may include parameters either in the
  // query string or in the URL hash fragment. Parse both locations so the
  // signup form works regardless of where the values are provided.
  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.slice(1));

  const token = searchParams.get('token') || hashParams.get('token') || '';
  const access_token = hashParams.get('access_token');
  const refresh_token = hashParams.get('refresh_token');

  useEffect(() => {
    if (access_token && refresh_token) {
      supabase.auth.setSession({ access_token, refresh_token });
    }
  }, [access_token, refresh_token]);

  // The invitation already specifies the email address, so only collect
  // the user's name and desired password here.
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');
    try {
      if (!access_token && !refresh_token && token) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(token);
        if (exchangeError) throw exchangeError;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password,
        data: { name }
      });
      if (updateError) throw updateError;

      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();
      if (userError || !user) throw userError || new Error('User not found');

      const { error: upsertError } = await supabase
        .from('users')
        .upsert(
          {
            id: user.id,
            name,
            email: user.email,
            role: 'forecaster',
            must_change_password: false
          },
          { onConflict: 'id' }
        );
      if (upsertError) throw upsertError;

      window.location.href = '/';
    } catch (err) {
      setError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md space-y-4 max-w-md w-full">
        <h2 className="text-xl font-bold text-gray-900 text-center">Complete Your Signup</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700">Name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
          <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" required />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-2 rounded-md">
          {loading ? 'Submitting...' : 'Create Account'}
        </button>
      </form>
    </div>
  );
};

export default Signup;
