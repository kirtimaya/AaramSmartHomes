import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  useColorScheme,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';
import { colors, radius, shadow } from '../lib/theme';

export default function LoginScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const bg = isDark ? colors.backgroundDark : colors.background;
  const fg = isDark ? colors.foregroundDark : colors.foreground;
  const surface = isDark ? colors.surfaceDark : colors.white;
  const borderColor = isDark ? colors.borderDark : colors.border;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Required', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });

    if (error) {
      Alert.alert('Sign In Failed', error.message);
    } else {
      router.replace('/(tabs)/portal');
    }
    setLoading(false);
  };

  const s = makeStyles(isDark, bg, fg, surface, borderColor);

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Logo */}
        <View style={s.logoArea}>
          <View style={s.logoBadge}>
            <Text style={s.logoEmoji}>🏠</Text>
          </View>
          <Text style={s.logoTitle}>AARAM</Text>
          <Text style={s.logoSub}>Smart Homes</Text>
        </View>

        {/* Card */}
        <View style={[s.card, { backgroundColor: surface, borderColor }]}>
          <Text style={[s.cardTitle, { color: fg }]}>Welcome back</Text>
          <Text style={s.cardSub}>Sign in to access your tenant portal</Text>

          {/* Email */}
          <Text style={[s.label, { color: fg }]}>Email</Text>
          <TextInput
            style={[s.input, { backgroundColor: bg, borderColor, color: fg }]}
            placeholder="you@example.com"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            value={email}
            onChangeText={setEmail}
          />

          {/* Password */}
          <Text style={[s.label, { color: fg }]}>Password</Text>
          <TextInput
            style={[s.input, { backgroundColor: bg, borderColor, color: fg }]}
            placeholder="••••••••"
            placeholderTextColor={colors.muted}
            secureTextEntry
            autoComplete="password"
            value={password}
            onChangeText={setPassword}
            onSubmitEditing={handleLogin}
          />

          {/* Sign In Button */}
          <Pressable
            style={({ pressed }) => [s.primaryBtn, pressed && { opacity: 0.8 }, { marginTop: 8 }]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.primaryBtnText}>Sign In  →</Text>
            )}
          </Pressable>
        </View>

        {/* Back to Home */}
        <Pressable style={s.backLink} onPress={() => router.back()}>
          <Text style={s.backLinkText}>← Back to Home</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (isDark: boolean, bg: string, fg: string, surface: string, borderColor: string) =>
  StyleSheet.create({
    container: {
      flexGrow: 1,
      backgroundColor: bg,
      paddingHorizontal: 24,
      paddingTop: 40,
      paddingBottom: 60,
      alignItems: 'center',
    },

    // Logo area
    logoArea: { alignItems: 'center', marginBottom: 36 },
    logoBadge: {
      width: 72,
      height: 72,
      borderRadius: 20,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 14,
      ...shadow.md,
    },
    logoEmoji: { fontSize: 36 },
    logoTitle: { fontSize: 26, fontWeight: '900', color: fg, letterSpacing: -0.5 },
    logoSub: { fontSize: 14, color: colors.muted, fontWeight: '600', marginTop: 2 },

    // Card
    card: {
      width: '100%',
      borderRadius: 28,
      borderWidth: 1,
      padding: 28,
      ...shadow.md,
    },
    cardTitle: { fontSize: 22, fontWeight: '800', letterSpacing: -0.3, marginBottom: 4 },
    cardSub: { fontSize: 13, color: colors.muted, marginBottom: 24 },

    // Fields
    label: { fontSize: 12, fontWeight: '700', marginBottom: 8, letterSpacing: 0.3 },
    input: {
      borderWidth: 1.5,
      borderRadius: radius.md,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 15,
      marginBottom: 18,
    },

    // Buttons
    primaryBtn: {
      backgroundColor: colors.primary,
      paddingVertical: 16,
      borderRadius: radius.lg,
      alignItems: 'center',
      ...shadow.sm,
    },
    primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },

    backLink: { marginTop: 24 },
    backLinkText: { color: colors.primary, fontWeight: '700', fontSize: 14 },
  });
