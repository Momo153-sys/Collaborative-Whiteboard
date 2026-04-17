import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { account, databases, DATABASE_ID } from '@/lib/appwrite'; // Ensure databases is exported from your lib
import { ID } from 'appwrite';
import type { Models } from 'appwrite';

// Use the collection ID for your 'users' collection
const USERS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_USERS_COLLECTION_ID;

interface AuthContextType {
  user: Models.User<Models.Preferences> | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
  const [loading, setLoading] = useState(true);

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
    // 1. Create the account
    const userId = ID.unique();
    await account.create(userId, email, password, displayName);
    
    // 2. Log in to create a session
    await account.createEmailPasswordSession(email, password);
    
    // 3. Assign a random cursor color
    const colors = ['#3498DB', '#E74C3C', '#2ECC71', '#F1C40F', '#9B59B6', '#1ABC9C', '#E67E22'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    await account.updatePrefs({ color: randomColor });

    // 4. Create a document in your custom 'users' collection
    // This connects the Auth user to your 'users' database collection
    try {
        await databases.createDocument(
            DATABASE_ID,
            USERS_COLLECTION_ID,
            userId, // Use the same ID as the Auth account for consistency
            {
                email: email,
                username: displayName
            }
        );
    } catch (dbError) {
        console.error("Failed to sync user to database collection:", dbError);
    }
    
    // 5. Final state update
    const userWithPrefs = await account.get();
    setUser(userWithPrefs);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    await account.createEmailPasswordSession(email, password);
    const currentUser = await account.get();
    setUser(currentUser);
  }, []);

  const signOut = useCallback(async () => {
    try {
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