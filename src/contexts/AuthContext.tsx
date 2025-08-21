import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  User, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { initializeUserProfile } from '@/lib/firebaseService';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('🔥 Auth state changed:', firebaseUser ? 'User logged in' : 'User logged out');
      setUser(firebaseUser);
      
      // Initialize user profile in Firestore if this is a new user
      if (firebaseUser) {
        try {
          await initializeUserProfile(firebaseUser);
          console.log('✅ User profile initialized successfully');
        } catch (error: any) {
          console.error('❌ Error initializing user profile:', error);
          
          // Handle specific Firebase errors gracefully
          if (error.code === 'unavailable' || error.code === 'failed-precondition') {
            console.warn('⚠️ Firebase temporarily unavailable - user profile will be created later');
          } else if (error.code === 'permission-denied') {
            console.error('🚫 Permission denied - check Firebase rules');
          } else if (error.message?.includes('offline') || error.message?.includes('network')) {
            console.warn('🔌 Network issue - profile initialization will retry when online');
          } else {
            console.error('💥 Unexpected error during profile initialization:', error);
          }
        }
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      console.log('🔑 Attempting sign in for:', email);
      await signInWithEmailAndPassword(auth, email, password);
      console.log('✅ Sign in successful');
    } catch (error: any) {
      console.error('❌ Sign in failed:', error);
      
      // More descriptive error messages
      let errorMessage = error.message;
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email address.';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address.';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your internet connection.';
      }
      
      throw new Error(errorMessage);
    }
  };

  const signUp = async (email: string, password: string, name?: string) => {
    try {
      console.log('📝 Attempting sign up for:', email);
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update the user's display name if provided
      if (name && result.user) {
        await updateProfile(result.user, { displayName: name });
        console.log('✅ Display name updated');
      }
      
      console.log('✅ Sign up successful');
    } catch (error: any) {
      console.error('❌ Sign up failed:', error);
      
      // More descriptive error messages
      let errorMessage = error.message;
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'An account with this email already exists.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please use at least 6 characters.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address.';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your internet connection.';
      }
      
      throw new Error(errorMessage);
    }
  };

  const signInWithGoogle = async () => {
    try {
      console.log('🔍 Attempting Google sign in');
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      console.log('✅ Google sign in successful');
    } catch (error: any) {
      console.error('❌ Google sign in failed:', error);
      
      let errorMessage = error.message;
      if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Sign in was cancelled.';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your internet connection.';
      }
      
      throw new Error(errorMessage);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error: any) {
      throw new Error(error.message);
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
