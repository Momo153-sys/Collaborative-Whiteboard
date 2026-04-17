import { useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '@/hooks/use-auth';

export function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        // Creates account AND should trigger session in your hook
        await signUp(email, password, displayName);
      } else {
        await signIn(email, password);
      }
      // Success: useAuth should handle navigation to /whiteboard via useEffect or redirect
    } catch (err: any) {
      // Appwrite specific error handling
      if (err.code === 401) {
        setError('Invalid email or password. Please try again.');
      } else if (err.code === 409) {
        setError('An account with this email already exists.');
      } else if (err.code === 400) {
        setError('Password must be at least 8 characters long.');
      } else {
        setError(err.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas-bg px-4">
      <div className="w-full max-w-sm rounded-xl bg-toolbar-bg p-8 shadow-2xl border border-border/50">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2 tracking-tight">
            Collaborative Whiteboard
          </h1>
          <p className="text-sm text-muted-foreground">
            {isSignUp ? 'Create your account to start drawing' : 'Sign in to access your boards'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground ml-1">Full Name</label>
              <input
                type="text"
                placeholder="John Doe"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-tool-active outline-none transition-all"
              />
            </div>
          )}
          
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground ml-1">Email Address</label>
            <input
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-tool-active outline-none transition-all"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground ml-1">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-tool-active outline-none transition-all"
            />
          </div>

          {error && (
            <div className="p-3 rounded-md bg-destructive/15 border border-destructive/20 animate-in fade-in zoom-in duration-200">
              <p className="text-xs text-destructive font-medium text-center">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? 'Processing...' : isSignUp ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-border/50 text-center">
          <p className="text-xs text-muted-foreground">
            {isSignUp ? 'Already have an account?' : "New to the platform?"}{' '}
            <button
              onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
              className="font-semibold text-tool-active hover:underline transition-all"
            >
              {isSignUp ? 'Sign in here' : 'Create an account'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}