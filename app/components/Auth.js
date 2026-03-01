"use client";

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function Login({ onLogin }) {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Load all active users
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    const { data, error } = await supabase
      .from('staff_users')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (!error && data) {
      setUsers(data);
    }
  };

  const handleUserSelect = (user) => {
    setSelectedUser(user);
    setPassword('');
    setError('');
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    
    // Check password (simple for now)
    if (password === selectedUser.password) {
      onLogin({ 
        email: selectedUser.email, 
        name: selectedUser.name 
      }, selectedUser.role);
    } else {
      setError('Incorrect password');
      setPassword('');
    }
  };

  const handleBack = () => {
    setSelectedUser(null);
    setPassword('');
    setError('');
  };

  // Generate avatar color based on name
  const getAvatarColor = (name) => {
    const colors = [
      'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500',
      'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'
    ];
    const index = name.length % colors.length;
    return colors[index];
  };

  // Get initials from name
  const getInitials = (name) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Admin hardcoded (you)
  const adminUser = {
    id: 'admin',
    name: 'Admin',
    email: 'zhugelisty@gmail.com',
    password: '171115',
    role: 'admin',
    avatar_url: null
  };

  const allUsers = [adminUser, ...users];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="max-w-4xl w-full p-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">🥖 Bakery Management</h1>
          <p className="text-gray-600">Select your account to continue</p>
        </div>

        {!selectedUser ? (
          // User Selection Grid
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {allUsers.map((user) => (
              <button
                key={user.id}
                onClick={() => handleUserSelect(user)}
                className="group flex flex-col items-center p-6 bg-white rounded-2xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200"
              >
                {/* Avatar Circle - with support for photos */}
                <div className={`w-24 h-24 rounded-full ${!user.avatar_url ? getAvatarColor(user.name) : ''} flex items-center justify-center mb-4 shadow-lg group-hover:scale-105 transition-transform overflow-hidden`}>
                  {user.avatar_url ? (
                    <img 
                      src={user.avatar_url} 
                      alt={user.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-3xl font-bold text-white">
                      {getInitials(user.name)}
                    </span>
                  )}
                </div>
                
                {/* User Info */}
                <span className="text-lg font-semibold text-gray-800">{user.name}</span>
                <span className="text-sm text-gray-500 mt-1">
                  {user.role === 'admin' ? '👑 Admin' : '👤 Staff'}
                </span>
              </button>
            ))}
          </div>
        ) : (
          // Password Entry Screen
          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <button
                onClick={handleBack}
                className="text-gray-500 hover:text-gray-700 mb-6 flex items-center"
              >
                ← Back to users
              </button>

              <div className="flex flex-col items-center mb-8">
                {/* Selected User Avatar - with support for photos */}
                <div className={`w-32 h-32 rounded-full ${!selectedUser.avatar_url ? getAvatarColor(selectedUser.name) : ''} flex items-center justify-center mb-4 shadow-xl overflow-hidden`}>
                  {selectedUser.avatar_url ? (
                    <img 
                      src={selectedUser.avatar_url} 
                      alt={selectedUser.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-4xl font-bold text-white">
                      {getInitials(selectedUser.name)}
                    </span>
                  )}
                </div>
                <h2 className="text-2xl font-bold text-gray-800">{selectedUser.name}</h2>
                <p className="text-gray-500">{selectedUser.email}</p>
                {selectedUser.role === 'admin' && (
                  <span className="mt-2 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                    Administrator
                  </span>
                )}
              </div>

              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full p-3 border-2 rounded-xl text-gray-900 focus:border-blue-500 focus:ring focus:ring-blue-200 transition-all"
                    placeholder="Enter your password"
                    autoFocus
                    required
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm border border-red-200">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-blue-500 text-white py-3 rounded-xl hover:bg-blue-600 font-medium text-lg transition-colors"
                >
                  Sign In
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-gray-500 text-sm mt-8">
          © 2026 Bakery Management System
        </p>
      </div>
    </div>
  );
}