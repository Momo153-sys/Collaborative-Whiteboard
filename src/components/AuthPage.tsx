import { useState } from 'react';
import type {  FormEvent } from 'react';
import { useAuth } from '@/hooks/use-auth';

export function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        // Appwrite signUp usually creates the account
        await signUp(email, password, displayName);
        
        // Note: Appwrite doesn't always require email confirmation 
        // unless you explicitly trigger it with account.createVerification.
        // For now, we'll assume you want the confirmation flow.
        setConfirmSent(true);
      } else {
        await signIn(email, password);
        // On success, the useAuth hook should handle the redirect
      }
    } catch (err: any) {
      // Appwrite errors are thrown, not returned as an object
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (confirmSent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas-bg">
        <div className="w-full max-w-sm rounded-xl bg-toolbar-bg p-8 shadow-lg text-center">
          <div className="flex justify-center mb-4 text-tool-active">
            {/* Success Icon Placeholder */}
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Check your email</h2>
          <p className="text-sm text-muted-foreground">
            We sent a confirmation link to <strong>{email}</strong>. Click the link to activate your account.
          </p>
          <button
            onClick={() => { setConfirmSent(false); setIsSignUp(false); }}
            className="mt-6 w-full rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

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
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-tool-active transition-all"
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
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-tool-active transition-all"
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
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-tool-active transition-all"
            />
          </div>

          {error && (
            <div className="p-2.5 rounded-md bg-destructive/10 border border-destructive/20">
              <p className="text-[11px] text-destructive leading-tight">{error}</p>
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
            {isSignUp ? 'Already using our whiteboard?' : "New to the platform?"}{' '}
            <button
              onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
              className="font-semibold text-tool-active hover:text-tool-active/80 transition-colors"
            >
              {isSignUp ? 'Sign in here' : 'Create an account'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}