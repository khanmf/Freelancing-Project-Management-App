
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../supabaseClient';
import { Profile } from '../types';
import { useToast } from '../hooks/useToast';

interface AuthContextType {
  user: any | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  const fetchProfile = async (userId: string, email?: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        // Fallback: create a temporary profile object in state if DB fetch fails or row is missing.
        // This ensures the app loads even if the profile record hasn't been created yet.
        console.warn("Profile fetch warning (using fallback):", error.message);
        const fallbackProfile: Profile = {
            id: userId,
            email: email || '',
            full_name: email?.split('@')[0] || 'User',
            role: 'collaborator' // Default to collaborator for safety
        };
        setProfile(fallbackProfile);
      } else {
        setProfile(data as Profile);
      }
    } catch (error) {
      console.error("Profile error:", error);
    }
  };

  useEffect(() => {
    let mounted = true;
    
    // SAFETY TIMEOUT:
    // If Supabase takes too long or hangs, this timer forces the app to stop loading after 3 seconds.
    // This fixes the "stuck purple spinner" issue.
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
        // We don't await this here to prevent blocking the UI updates, 
        // as initAuth handles the initial critical load.
        fetchProfile(currentUser.id, currentUser.email);
      } else {
        setProfile(null);
      }
      
      // Ensure loading is false whenever auth state settles
      setLoading(false);
    });

    return () => {
      mounted = false;
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string) => {
    // Placeholder for global sign-in logic if needed
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setUser(null);
    addToast('Logged out successfully', 'info');
  };

  // Check if role is explicitly admin
  const isAdmin = profile?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signOut, isAdmin }}>
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
