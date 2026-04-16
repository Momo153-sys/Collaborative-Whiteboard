import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type {  ReactNode } from 'react';
import { account } from '@/lib/appwrite';
import { ID } from 'appwrite';
import type {  Models } from 'appwrite';

// Appwrite returns a User object that includes 'prefs'
interface AuthContextType {
  user: Models.User<Models.Preferences> | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch current user session on mount
  const checkUser = useCallback(async () => {
    try {
      const currentUser = await account.get();
      setUser(currentUser);
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkUser();
  }, [checkUser]);

  const signUp = useCallback(async (email: string, password: string, displayName: string) => {
    try {
      // 1. Create the account
      await account.create(ID.unique(), email, password, displayName);
      
      // 2. Add a random color to user preferences (replacing the separate profile table)
      const randomColor = ['#3498DB', '#E74C3C', '#2ECC71', '#F1C40F', '#9B59B6'][Math.floor(Math.random() * 5)];
      
      // 3. Log them in to create a session (Appwrite needs a session to update prefs)
      await account.createEmailPasswordSession(email, password);
      await account.updatePrefs({ color: randomColor });
      
      // 4. Refresh local user state
      const userWithPrefs = await account.get();
      setUser(userWithPrefs);
      
      return { error: null };
    } catch (error: any) {
      return { error };
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      await account.createEmailPasswordSession(email, password);
      const currentUser = await account.get();
      setUser(currentUser);
      return { error: null };
    } catch (error: any) {
      return { error };
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      // Appwrite deletes the 'current' session
      await account.deleteSession('current');
      setUser(null);
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}