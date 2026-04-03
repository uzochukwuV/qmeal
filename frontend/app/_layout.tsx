import React, { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { useAuthStore } from '../src/store/authStore';
import { setAuthToken } from '../src/api/client';
import apiClient from '../src/api/client';
import { COLORS } from '../src/constants/theme';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function RootLayout() {
  const { user, isLoading, token, setUser, setToken, setLoading, loadStoredAuth } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  const [isVerifying, setIsVerifying] = useState(false);

  // Load stored auth on mount
  useEffect(() => {
    loadStoredAuth();
  }, []);

  // Register for push notifications
  useEffect(() => {
    const registerForPushNotifications = async () => {
      if (Platform.OS === 'web') return;
      
      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        
        if (finalStatus !== 'granted') {
          console.log('Push notification permission not granted');
          return;
        }
        
        const pushToken = await Notifications.getExpoPushTokenAsync({
          projectId: 'qmeal-app', // This would be your actual project ID
        });
        
        // Send push token to backend if user is authenticated
        if (user && token) {
          try {
            await apiClient.post('/auth/push-token', {
              push_token: pushToken.data,
            });
          } catch (error) {
            console.error('Error updating push token:', error);
          }
        }
      } catch (error) {
        console.error('Error registering for push notifications:', error);
      }
    };

    if (user) {
      registerForPushNotifications();
    }
  }, [user, token]);

  // Verify stored session token
  useEffect(() => {
    const verifySession = async () => {
      if (token && !user && !isVerifying) {
        setIsVerifying(true);
        setLoading(true);
        try {
          setAuthToken(token);
          const response = await apiClient.get('/auth/me');
          setUser(response.data);
        } catch (error) {
          console.error('Session verification failed:', error);
          await setToken(null);
          setAuthToken(null);
        } finally {
          setLoading(false);
          setIsVerifying(false);
        }
      }
    };

    verifySession();
  }, [token]);

  // Handle navigation based on auth state
  useEffect(() => {
    if (isLoading || isVerifying) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)';

    if (!user && !inAuthGroup) {
      // Not logged in and not in auth group, redirect to login
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      // Logged in and in auth group, redirect to main app
      router.replace('/(tabs)');
    }
  }, [user, segments, isLoading, isVerifying]);

  // Listen for notifications (native only)
  useEffect(() => {
    if (Platform.OS === 'web') return;

    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });

    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
      const data = response.notification.request.content.data;
      
      // Navigate based on notification type
      if (data?.type === 'order_status' || data?.type === 'order_confirmed') {
        router.push('/(tabs)/orders');
      }
    });

    return () => {
      if (notificationListener) {
        Notifications.removeNotificationSubscription(notificationListener);
      }
      if (responseListener) {
        Notifications.removeNotificationSubscription(responseListener);
      }
    };
  }, []);

  if (isLoading || isVerifying) {
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
        <Stack.Screen 
          name="favorites" 
          options={{ 
            headerShown: false,
            presentation: 'card',
          }} 
        />
        <Stack.Screen 
          name="order/[id]" 
          options={{ 
            headerShown: false,
            presentation: 'card',
          }} 
        />
        <Stack.Screen 
          name="notifications" 
          options={{ 
            headerShown: false,
            presentation: 'card',
          }} 
        />
        <Stack.Screen 
          name="review/[restaurant_id]" 
          options={{ 
            headerShown: false,
            presentation: 'modal',
          }} 
        />
        <Stack.Screen 
          name="edit-profile" 
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
