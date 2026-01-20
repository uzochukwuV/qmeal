import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { COLORS, SIZES, FONTS, SHADOWS } from '../../src/constants/theme';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export default function LoginScreen() {
  const handleGoogleLogin = async () => {
    try {
      // Generate redirect URL based on platform
      const redirectUrl = Platform.OS === 'web'
        ? `${BACKEND_URL}/`
        : Linking.createURL('/');
      
      const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
      
      if (Platform.OS === 'web') {
        // For web, just redirect
        window.location.href = authUrl;
      } else {
        // For mobile, use WebBrowser
        const result = await WebBrowser.openAuthSessionAsync(
          authUrl,
          redirectUrl
        );
        
        if (result.type === 'success' && result.url) {
          // The URL will be processed by the _layout.tsx deep link handler
          console.log('Auth success, URL:', result.url);
        }
      }
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo and Branding */}
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Ionicons name="restaurant" size={48} color={COLORS.accent} />
          </View>
          <Text style={styles.appName}>Qmeal</Text>
          <Text style={styles.tagline}>Discover & Order from the best restaurants</Text>
        </View>

        {/* Hero Image */}
        <Image
          source={{ uri: 'https://images.unsplash.com/photo-1615719413546-198b25453f85' }}
          style={styles.heroImage}
          resizeMode="cover"
        />

        {/* Features */}
        <View style={styles.features}>
          <View style={styles.featureItem}>
            <Ionicons name="star" size={20} color={COLORS.star} />
            <Text style={styles.featureText}>Top-rated restaurants</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="location" size={20} color={COLORS.accent} />
            <Text style={styles.featureText}>Find nearby places</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="bicycle" size={20} color={COLORS.accent} />
            <Text style={styles.featureText}>Fast delivery</Text>
          </View>
        </View>

        {/* Login Button */}
        <TouchableOpacity
          style={styles.googleButton}
          onPress={handleGoogleLogin}
          activeOpacity={0.8}
        >
          <Ionicons name="logo-google" size={24} color={COLORS.white} />
          <Text style={styles.googleButtonText}>Continue with Google</Text>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          By continuing, you agree to our Terms of Service and Privacy Policy
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: SIZES.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: SIZES.xl,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.accentLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SIZES.md,
  },
  appName: {
    fontSize: 36,
    color: COLORS.textPrimary,
    ...FONTS.bold,
    marginBottom: SIZES.xs,
  },
  tagline: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  heroImage: {
    width: '100%',
    height: 200,
    borderRadius: SIZES.radiusLg,
    marginBottom: SIZES.xl,
  },
  features: {
    width: '100%',
    marginBottom: SIZES.xl,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.md,
  },
  featureText: {
    fontSize: 16,
    color: COLORS.textPrimary,
    marginLeft: SIZES.md,
    ...FONTS.medium,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    width: '100%',
    paddingVertical: SIZES.md,
    borderRadius: SIZES.radiusMd,
    ...SHADOWS.medium,
  },
  googleButtonText: {
    color: COLORS.white,
    fontSize: 18,
    ...FONTS.semiBold,
    marginLeft: SIZES.md,
  },
  disclaimer: {
    fontSize: 12,
    color: COLORS.textTertiary,
    textAlign: 'center',
    marginTop: SIZES.lg,
    paddingHorizontal: SIZES.xl,
  },
});
