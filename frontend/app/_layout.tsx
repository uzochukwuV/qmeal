import React, { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '../src/store/authStore';
import { setAuthToken } from '../src/api/client';
import apiClient from '../src/api/client';
import { COLORS } from '../src/constants/theme';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

export default function RootLayout() {
  const { user, isLoading, sessionToken, setUser, setSessionToken, setLoading, loadStoredAuth } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  const [isProcessingAuth, setIsProcessingAuth] = useState(false);

  // Load stored auth on mount
  useEffect(() => {
    loadStoredAuth();
  }, []);

  // Process session_id from URL (for OAuth callback)
  useEffect(() => {
    const processSessionId = async (sessionId: string) => {
      if (isProcessingAuth) return;
      setIsProcessingAuth(true);
      setLoading(true);
      
      try {
        const response = await apiClient.post('/auth/session', {
          session_id: sessionId,
        });
        
        const userData = response.data;
        setAuthToken(userData.session_token);
        await setSessionToken(userData.session_token);
        setUser({
          user_id: userData.user_id,
          email: userData.email,
          name: userData.name,
          picture: userData.picture,
        });
      } catch (error) {
        console.error('Error processing session:', error);
      } finally {
        setLoading(false);
        setIsProcessingAuth(false);
      }
    };

    // Check for session_id in URL (web)
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const hash = window.location.hash;
      const params = new URLSearchParams(hash.replace('#', ''));
      const sessionId = params.get('session_id');
      
      if (sessionId) {
        // Clear the hash from URL
        window.history.replaceState(null, '', window.location.pathname);
        processSessionId(sessionId);
      }
    }

    // Handle deep links for mobile
    const handleUrl = (event: { url: string }) => {
      const { url } = event;
      const parsed = Linking.parse(url);
      const sessionId = parsed.queryParams?.session_id as string;
      
      if (sessionId) {
        processSessionId(sessionId);
      }
    };

    // Check initial URL (cold start)
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleUrl({ url });
      }
    });

    // Listen for URL changes
    const subscription = Linking.addEventListener('url', handleUrl);
    return () => subscription.remove();
  }, []);

  // Verify stored session token
  useEffect(() => {
    const verifySession = async () => {
      if (sessionToken && !user && !isProcessingAuth) {
        setLoading(true);
        try {
          setAuthToken(sessionToken);
          const response = await apiClient.get('/auth/me');
          setUser(response.data);
        } catch (error) {
          console.error('Session verification failed:', error);
          await setSessionToken(null);
          setAuthToken(null);
        } finally {
          setLoading(false);
        }
      }
    };

    verifySession();
  }, [sessionToken]);

  // Handle navigation based on auth state
  useEffect(() => {
    if (isLoading || isProcessingAuth) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)';

    if (!user && !inAuthGroup) {
      // Not logged in and not in auth group, redirect to login
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      // Logged in and in auth group, redirect to main app
      router.replace('/(tabs)');
    }
  }, [user, segments, isLoading, isProcessingAuth]);

  if (isLoading || isProcessingAuth) {
    return (
      <SafeAreaProvider>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen 
          name="restaurant/[id]" 
          options={{ 
            headerShown: false,
            presentation: 'card',
          }} 
        />
        <Stack.Screen 
          name="cart" 
          options={{ 
            headerShown: false,
            presentation: 'modal',
          }} 
        />
        <Stack.Screen 
          name="checkout" 
          options={{ 
            headerShown: false,
            presentation: 'card',
          }} 
        />
      </Stack>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
});
