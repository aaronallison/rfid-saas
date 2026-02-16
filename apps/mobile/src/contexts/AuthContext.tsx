import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { User, Organization } from '../types';
import { Session } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  selectedOrganization: Organization | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
  selectOrganization: (org: Organization) => Promise<void>;
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

  // Function to restore selected organization
  const restoreSelectedOrganization = useCallback(async (userOrganizations: Organization[]) => {
    try {
      const savedOrgJson = await AsyncStorage.getItem('selectedOrganization');
      if (savedOrgJson) {
        const savedOrg = JSON.parse(savedOrgJson);
        // Verify the saved organization is still valid for this user
        const validOrg = userOrganizations.find(org => org.id === savedOrg.id);
        if (validOrg) {
          setSelectedOrganization(validOrg);
          return;
        }
      }
      // If no valid saved organization, clear it
      await AsyncStorage.removeItem('selectedOrganization');
    } catch (error) {
      console.error('Error restoring selected organization:', error);
    }
  }, []);

  const fetchUserData = useCallback(async (userId: string, userEmail: string) => {
    try {
      setLoading(true);
      
      // Fetch user organizations using the correct table name from migration
      const { data: orgMemberships, error } = await supabase
        .from('org_members')
        .select(`
          organizations!org_members_org_id_fkey (
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

      // Map the organization data to match our User type
      const userOrgs = orgMemberships?.map(membership => ({
        id: membership.organizations.org_id,
        name: membership.organizations.name,
        created_at: membership.organizations.created_at,
      })) || [];
      
      const userData: User = {
        id: userId,
        email: userEmail,
        organizations: userOrgs,
      };

      setUser(userData);
      
      // Restore previously selected organization if available
      await restoreSelectedOrganization(userOrgs);
    } catch (error) {
      console.error('Error fetching user data:', error);
      // Reset user state on error to prevent inconsistent state
      setUser(null);
      setSelectedOrganization(null);
    } finally {
      setLoading(false);
    }
  }, [restoreSelectedOrganization]);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Get initial session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          setLoading(false);
          return;
        }

        if (mounted) {
          setSession(session);
          if (session?.user?.id && session?.user?.email) {
            await fetchUserData(session.user.id, session.user.email);
          } else {
            setLoading(false);
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        console.log('Auth state changed:', event);
        setSession(session);
        
        if (session?.user?.id && session?.user?.email) {
          await fetchUserData(session.user.id, session.user.email);
        } else {
          setUser(null);
          setSelectedOrganization(null);
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUserData]);

  const signIn = async (email: string, password: string) => {
    if (!email?.trim() || !password?.trim()) {
      throw new Error('Email and password are required');
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      throw error;
    }

    // The onAuthStateChange listener will handle user data fetching
    return data;
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
      // The onAuthStateChange listener will handle state cleanup
    } catch (error) {
      // Even if signOut fails, clear local state
      console.error('Error signing out:', error);
      setUser(null);
      setSession(null);
      setSelectedOrganization(null);
      // Clear persisted organization selection
      AsyncStorage.removeItem('selectedOrganization').catch(console.error);
      throw error;
    }
  };

  const selectOrganization = useCallback(async (org: Organization) => {
    try {
      // Persist the selected organization
      await AsyncStorage.setItem('selectedOrganization', JSON.stringify(org));
      setSelectedOrganization(org);
    } catch (error) {
      console.error('Error saving selected organization:', error);
      // Still set the organization even if persistence fails
      setSelectedOrganization(org);
    }
  }, []);

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