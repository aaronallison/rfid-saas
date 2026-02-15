import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { User, Organization } from '../types';
import { Session } from '@supabase/supabase-js';

interface AuthContextType {
  /** Current authenticated user with organization data */
  user: User | null;
  /** Current Supabase session */
  session: Session | null;
  /** Currently selected organization for the user */
  selectedOrganization: Organization | null;
  /** Whether authentication state is being loaded */
  loading: boolean;
  /** Sign in with email and password */
  signIn: (email: string, password: string) => Promise<void>;
  /** Sign out the current user */
  signOut: () => Promise<void>;
  /** Select an organization from the user's available organizations */
  selectOrganization: (org: Organization) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Error getting initial session:', error);
        setLoading(false);
        return;
      }
      
      setSession(session);
      if (session?.user) {
        fetchUserData(session.user.id).catch((error) => {
          console.error('Error fetching initial user data:', error);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        if (session?.user) {
          try {
            await fetchUserData(session.user.id);
          } catch (error) {
            console.error('Error in auth state change handler:', error);
            setLoading(false);
          }
        } else {
          setUser(null);
          setSelectedOrganization(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserData = async (userId: string) => {
    try {
      setLoading(true);
      
      // Get current session to avoid stale closure data
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      // Fetch user organizations using the correct table name
      const { data: orgMembers, error } = await supabase
        .from('org_members')
        .select(`
          organizations (
            org_id,
            name,
            created_at
          )
        `)
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching user organizations:', error);
        throw error;
      }

      const userOrgs: Organization[] = orgMembers?.map(item => ({
        id: item.organizations.org_id,
        name: item.organizations.name,
        created_at: item.organizations.created_at,
      })) || [];
      
      const userData: User = {
        id: userId,
        email: currentSession?.user?.email || '',
        organizations: userOrgs,
      };

      setUser(userData);
    } catch (error) {
      console.error('Error fetching user data:', error);
      // Reset user data on error
      setUser(null);
      setSelectedOrganization(null);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
    setUser(null);
    setSelectedOrganization(null);
  };

  const selectOrganization = (org: Organization) => {
    // Validate that the user has access to this organization
    if (!user?.organizations.some(userOrg => userOrg.id === org.id)) {
      console.error('User does not have access to organization:', org.id);
      return;
    }
    setSelectedOrganization(org);
  };

  const value: AuthContextType = {
    user,
    session,
    selectedOrganization,
    loading,
    signIn,
    signOut,
    selectOrganization,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}