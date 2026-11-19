import { useEffect, useRef, useState } from 'react';
import { api, type AuthConfig, type User } from '../api';

interface Props {
  onSignedIn: (user: User) => void;
}

interface GoogleId {
  accounts: {
    id: {
      initialize: (options: { client_id: string; callback: (response: { credential: string }) => void }) => void;
      renderButton: (element: HTMLElement, options: Record<string, string>) => void;
    };
  };
}

const GSI_SRC = 'https://accounts.google.com/gsi/client';

function loadGoogleScript(): Promise<GoogleId> {
  const existing = (window as unknown as { google?: GoogleId }).google;
  if (existing) return Promise.resolve(existing);
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GSI_SRC;
    script.async = true;
    script.onload = () => resolve((window as unknown as { google: GoogleId }).google);
    script.onerror = () => reject(new Error('Google sign-in could not load.'));
    document.head.appendChild(script);
  });
}

export function SignIn({ onSignedIn }: Props) {
  const [config, setConfig] = useState<AuthConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const buttonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.config().then(setConfig, () => setError('The server is not reachable. Is it running?'));
  }, []);

  useEffect(() => {
    const clientId = config?.googleClientId;
    if (!clientId || !buttonRef.current) return;
    let cancelled = false;
    loadGoogleScript()
      .then((google) => {
        if (cancelled || !buttonRef.current) return;
        google.accounts.id.initialize({
          client_id: clientId,
          callback: ({ credential }) => {
            setError(null);
            api.signInWithGoogle(credential).then(onSignedIn, (e: Error) => setError(e.message));
          },
        });
        google.accounts.id.renderButton(buttonRef.current, { theme: 'outline', size: 'large', text: 'signin_with' });
      })
      .catch((e: Error) => setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [config, onSignedIn]);

  return (
    <div className="panel sign-in">
      <h2>Get started</h2>
      <p className="muted">Sign in to save your family's details to your account, so they're there on any computer you use.</p>
      {config?.googleClientId && <div ref={buttonRef} />}
      {config?.devLogin && (
        <button type="button" className="secondary" onClick={() => api.devSignIn().then(onSignedIn, (e: Error) => setError(e.message))}>
          Sign in as local tester
        </button>
      )}
      {error && <p className="warn">{error}</p>}
    </div>
  );
}
