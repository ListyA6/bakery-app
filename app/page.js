"use client";

import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import IngredientsList from './components/IngredientsList';
import Login from './components/Auth';

export default function Home() {
  const [session, setSession] = useState(null);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSession(session);
        getUserRole(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        getUserRole(session.user.id);
      } else {
        setUserRole(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const getUserRole = async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (data) {
      setUserRole(data.role);
    }
  };

  const handleLogin = (user, role) => {
    setSession({ user });
    setUserRole(role);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUserRole(null);
  };

  if (!session) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div>
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="p-4 max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              👤 {session.user.email} ({userRole})
            </span>
            {userRole === 'admin' && (
              <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">
                Admin
              </span>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-red-600 hover:text-red-800"
          >
            Logout
          </button>
        </div>
      </div>
      <IngredientsList userRole={userRole} />
    </div>
  );
}