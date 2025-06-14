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

        // Get user data after successful authentication
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;

        if (user) {
          // Store user data in the users table
          const { error: upsertError } = await supabase
            .from('users')
            .upsert({
              user_id: user.id,
              email: user.email,
              emailVerified: true,
              firstname: user.user_metadata?.full_name?.split(' ')[0] || 'User',
              lastname: user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '',
              ecoPoints: 0,
            //   avatar_url: user.user_metadata?.avatar_url,
            //   created_at: new Date().toISOString(),
            //   updated_at: new Date().toISOString(),
            }, {
              onConflict: 'user_id'
            });

          if (upsertError) throw upsertError;
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