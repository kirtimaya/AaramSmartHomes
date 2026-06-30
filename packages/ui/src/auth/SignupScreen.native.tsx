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
} from 'react-native';
import { MotiView } from 'moti';
import { useSignupForm } from '@aaram/core';
import { colors, radii } from '@aaram/config';

type AuthClient = {
  auth: {
    signUp: (opts: {
      email: string;
      password: string;
      options?: { data?: Record<string, string>; emailRedirectTo?: string };
    }) => Promise<{ error: { message: string } | null }>;
  };
};

export interface SignupScreenProps {
  supabase: AuthClient;
  onNavigateLogin: () => void;
  onNavigateHome: () => void;
  emailRedirectTo?: string;
}

export function SignupScreen({ supabase, onNavigateLogin, onNavigateHome, emailRedirectTo }: SignupScreenProps) {
  const [success, setSuccess] = useState(false);
  const { name, setName, email, setEmail, password, setPassword, loading, error, submit } =
    useSignupForm(supabase, () => setSuccess(true), emailRedirectTo);

  if (success) {
    return (
      <View style={styles.successContainer}>
        <MotiView
          from={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'timing', duration: 400 }}
          style={styles.successCard}
        >
          <Text style={styles.successEmoji}>✉️</Text>
          <Text style={styles.successTitle}>Request Received</Text>
          <Text style={styles.successSub}>Please verify your email to activate your account.</Text>
          <Pressable style={styles.primaryBtn} onPress={onNavigateLogin}>
            <Text style={styles.primaryBtnText}>Return to Sign In</Text>
          </Pressable>
        </MotiView>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <MotiView from={{ opacity: 0, translateY: -10 }} animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 400 }} style={styles.logoArea}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoEmoji}>🏠</Text>
          </View>
          <Text style={styles.logoTitle}>AARAM</Text>
          <Text style={styles.logoSub}>Join the Community</Text>
        </MotiView>

        <MotiView from={{ opacity: 0, translateY: 16 }} animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 450, delay: 80 }} style={styles.card}>
          <Text style={styles.cardTitle}>Create account</Text>
          <Text style={styles.cardSub}>Join the Aaram Smart Homes community</Text>

          <Text style={styles.label}>Full Name</Text>
          <TextInput style={styles.input} placeholder="John Doe"
            placeholderTextColor={colors.light.foreground + '55'}
            autoCapitalize="words" value={name} onChangeText={setName} />

          <Text style={styles.label}>Email</Text>
          <TextInput style={styles.input} placeholder="you@example.com"
            placeholderTextColor={colors.light.foreground + '55'}
            autoCapitalize="none" keyboardType="email-address" autoComplete="email"
            value={email} onChangeText={setEmail} />

          <Text style={styles.label}>Password</Text>
          <TextInput style={styles.input} placeholder="Min 6 characters"
            placeholderTextColor={colors.light.foreground + '55'}
            secureTextEntry value={password} onChangeText={setPassword}
            onSubmitEditing={submit} />

          {error ? (
            <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </MotiView>
          ) : null}

          <Pressable style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.8 }, { marginTop: 8 }]}
            onPress={submit} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Create Account  →</Text>}
          </Pressable>
        </MotiView>

        <View style={styles.footer}>
          <Pressable onPress={onNavigateLogin} style={styles.footerLink}>
            <Text style={styles.footerLinkText}>Already have an account? Sign in</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.light.background },
  container: { flexGrow: 1, backgroundColor: colors.light.background, paddingHorizontal: 24, paddingTop: 48, paddingBottom: 60, alignItems: 'center' },
  successContainer: { flex: 1, backgroundColor: colors.light.background, alignItems: 'center', justifyContent: 'center', padding: 24 },
  successCard: { alignItems: 'center', padding: 32, gap: 12 },
  successEmoji: { fontSize: 56, marginBottom: 8 },
  successTitle: { fontSize: 24, fontWeight: '800', color: colors.light.foreground },
  successSub: { fontSize: 14, color: colors.light.foreground + '77', textAlign: 'center', lineHeight: 22 },
  logoArea: { alignItems: 'center', marginBottom: 36 },
  logoBadge: { width: 72, height: 72, borderRadius: 20, backgroundColor: colors.light.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 14, shadowColor: colors.light.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  logoEmoji: { fontSize: 36 },
  logoTitle: { fontSize: 26, fontWeight: '900', color: colors.light.foreground, letterSpacing: -0.5 },
  logoSub: { fontSize: 14, color: colors.light.foreground + '88', fontWeight: '600', marginTop: 2 },
  card: { width: '100%', borderRadius: radii.xl, borderWidth: 1, borderColor: colors.light.border, padding: 28, backgroundColor: '#fff', shadowColor: colors.light.neoDark, shadowOffset: { width: 6, height: 6 }, shadowOpacity: 1, shadowRadius: 12, elevation: 4 },
  cardTitle: { fontSize: 22, fontWeight: '800', color: colors.light.foreground, letterSpacing: -0.3, marginBottom: 4 },
  cardSub: { fontSize: 13, color: colors.light.foreground + '77', marginBottom: 24 },
  label: { fontSize: 12, fontWeight: '700', color: colors.light.foreground, marginBottom: 8, letterSpacing: 0.3 },
  input: { borderWidth: 1.5, borderColor: colors.light.border, borderRadius: radii.md, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: colors.light.foreground, backgroundColor: colors.light.background, marginBottom: 18 },
  errorBox: { backgroundColor: colors.light.primary + '15', borderWidth: 1, borderColor: colors.light.primary + '30', borderRadius: radii.sm, padding: 12, marginBottom: 8 },
  errorText: { color: colors.light.primary, fontSize: 12, fontWeight: '700' },
  primaryBtn: { backgroundColor: colors.light.primary, paddingVertical: 16, borderRadius: radii.lg, alignItems: 'center', shadowColor: colors.light.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 4 },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  footer: { marginTop: 28 },
  footerLink: {},
  footerLinkText: { color: colors.light.primary, fontWeight: '700', fontSize: 14 },
});
