
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { Profile } from '../types';
import { useToast } from '../hooks/useToast';

interface AuthContextType {
  user: any | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  // Check for local admin override (manual fix for owners stuck as collaborators)
  const hasAdminOverride = window.localStorage.getItem('voice_dashboard_admin_override') === 'true';

  const fetchProfile = useCallback(async (userId: string, email?: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.warn("Profile fetch warning:", error.message);
        // Fallback to local structure if DB read fails
        const fallbackProfile: Profile = {
            id: userId,
            email: email || '',
            full_name: email?.split('@')[0] || 'User',
            role: 'collaborator'
        };
        setProfile(fallbackProfile);
      } else {
        setProfile(data as Profile);
      }
    } catch (error) {
      console.error("Profile error:", error);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    
    // SAFETY TIMEOUT: Force app to load after 3 seconds if DB hangs
    const safetyTimer = setTimeout(() => {
        if (mounted && loading) {
            console.warn("Auth loading timed out. Forcing UI render.");
            setLoading(false);
        }
    }, 3000);

    const initAuth = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (mounted) {
                setUser(session?.user ?? null);
                if (session?.user) {
                    await fetchProfile(session.user.id, session.user.email);
                } else {
                    setProfile(null);
                }
            }
        } catch (e) {
            console.error("Auth init failed:", e);
        } finally {
            if (mounted) setLoading(false);
        }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      
      if (currentUser) {
        await fetchProfile(currentUser.id, currentUser.email);
      } else {
        setProfile(null);
      }
      
      setLoading(false);
    });

    return () => {
      mounted = false;
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signIn = async (email: string) => {
    // Placeholder for global sign-in logic if needed
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setUser(null);
    window.localStorage.removeItem('voice_dashboard_admin_override');
    addToast('Logged out successfully', 'info');
  };

  const refreshProfile = async () => {
      if (user) {
          await fetchProfile(user.id, user.email);
      }
  };

  // Admin check: True if DB role is admin OR if local override is set
  const isAdmin = profile?.role === 'admin' || hasAdminOverride;

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signOut, refreshProfile, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
