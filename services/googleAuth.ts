import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from './supabaseConfig';
import { router } from 'expo-router';

WebBrowser.maybeCompleteAuthSession();

export async function signInWithGoogle() {
  try {
    const redirectUrl = AuthSession.makeRedirectUri({
      scheme: 'trekteria',
      path: 'auth/callback',
    });

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: true,
      },
    });

    if (error) throw error;

    if (data?.url) {
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectUrl
      );

      if (result.type === 'success' && result.url) {
        // Parse the URL to extract the session
        const url = new URL(result.url);
        const params = new URLSearchParams(url.hash.substring(1));
        
        if (params.get('access_token')) {
          // Session was returned in URL fragments
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');
          
          if (!accessToken) throw new Error('No access token found');
          
          const { error: setSessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          });
          
          if (setSessionError) throw setSessionError;
        } else {
          // Use the newer exchangeCodeForSession method
          const { error: sessionError } = await supabase.auth.exchangeCodeForSession(result.url);
          if (sessionError) throw sessionError;
        }
        
        console.log('Google OAuth successful! User is signed in.');
        router.replace('/(app)/home');
      }
    }
  } catch (error) {
    console.error('Error signing in with Google:', error);
    throw error;
  }
}