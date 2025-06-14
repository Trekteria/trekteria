import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from './supabaseConfig';
import { router } from 'expo-router';

WebBrowser.maybeCompleteAuthSession();

const redirectUri = AuthSession.makeRedirectUri({
  scheme: 'trekteria',
  path: 'auth/callback',
});

export async function signInWithGoogle() {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUri,
        skipBrowserRedirect: true,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) throw error;

    if (data?.url) {
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);

      if (result.type === 'success' && result.url) {
        const { error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        console.log('Google OAuth successful! User is signed in.');
        router.replace('/(app)/home');
      }
    }
  } catch (error) {
    console.error('Error signing in with Google:', error);
    throw error;
  }
}
