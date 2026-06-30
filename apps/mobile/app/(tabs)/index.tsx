'use client';

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  useColorScheme,
  Dimensions,
  Linking,
} from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../../lib/supabase';
import type { Property } from '../../lib/types';
import { colors, radius, shadow } from '../../lib/theme';

const { width } = Dimensions.get('window');

const AMENITIES = [
  {
    title: 'Azure Pool',
    type: 'Relax',
    emoji: '🏊',
    image: 'https://images.unsplash.com/photo-1576013551627-11971f366144?auto=format&fit=crop&w=800&q=80',
  },
  {
    title: 'Focus Studio',
    type: 'Active',
    emoji: '🏋️',
    image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=800&q=80',
  },
  {
    title: 'Play Court',
    type: 'Social',
    emoji: '🏸',
    image: 'https://images.unsplash.com/photo-1554068865-24cecd4e34f8?auto=format&fit=crop&w=800&q=80',
  },
];

export default function HomeScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const bg = isDark ? colors.backgroundDark : colors.background;
  const fg = isDark ? colors.foregroundDark : colors.foreground;
  const surface = isDark ? colors.surfaceDark : colors.white;
  const borderColor = isDark ? colors.borderDark : colors.border;

  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    const { data, error } = await supabase
      .from('properties')
      .select('*, rooms(*), benefits(*)')
      .limit(2);
    if (!error && data) setProperties(data);
    setLoading(false);
  };

  const s = makeStyles(isDark, bg, fg, surface, borderColor);

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* ── Nav Bar ─────────────────────────────────────────────── */}
      <View style={s.nav}>
        <View style={s.navLogo}>
          <View style={s.logoBadge}>
            <Text style={s.logoEmoji}>🏠</Text>
          </View>
          <Text style={s.logoText}>AARAM</Text>
        </View>
        <Pressable style={s.signInBtn} onPress={() => router.push('/login')}>
          <Text style={s.signInText}>Sign In</Text>
        </Pressable>
      </View>

      {/* ── Hero ────────────────────────────────────────────────── */}
      <View style={s.hero}>
        {/* Badge */}
        <View style={s.heroBadge}>
          <Text style={s.heroBadgeText}>🌿  EARTHY & ORGANIC</Text>
        </View>

        {/* Headline */}
        <Text style={s.heroTitle}>LIVE IN</Text>
        <Text style={s.heroTitleAccent}>HARMONY.</Text>
        <Text style={s.heroSubtitle}>
          Thoughtfully managed homes combining minimalist design with smart technology in India.
        </Text>

        {/* CTA Buttons */}
        <View style={s.heroActions}>
          <Pressable
            style={({ pressed }) => [s.primaryBtn, pressed && s.pressed]}
            onPress={() => router.push('/login')}
          >
            <Text style={s.primaryBtnText}>Explore Homes  →</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [s.secondaryBtn, pressed && s.pressed]}
            onPress={() => router.push('/login')}
          >
            <Text style={s.secondaryBtnText}>Join the Community</Text>
          </Pressable>
        </View>

        {/* Hero Image */}
        {loading ? (
          <View style={s.heroImgPlaceholder}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <View style={[s.heroImgCard, { borderColor }]}>
            <Image
              source={{
                uri:
                  properties[0]?.image_url ||
                  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80',
              }}
              style={s.heroImg}
              resizeMode="cover"
            />
            {/* Floating sustainability card */}
            <View style={[s.floatCard, { backgroundColor: surface }]}>
              <Text style={s.floatIcon}>⚡</Text>
              <View>
                <Text style={s.floatSub}>SUSTAINABILITY</Text>
                <Text style={[s.floatTitle, { color: fg }]}>Solar Powered</Text>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* ── Properties Section ─────────────────────────────────── */}
      <View style={s.section}>
        <Text style={[s.sectionTitle, { color: fg }]}>A Home That Breathes</Text>
        <Text style={s.sectionSub}>Natural materials and intentional white space, balanced for focus.</Text>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
        ) : properties.length === 0 ? (
          <View style={[s.emptyCard, { backgroundColor: surface, borderColor }]}>
            <Text style={{ color: colors.muted, fontSize: 13 }}>No properties available right now.</Text>
          </View>
        ) : (
          properties.map((property) => (
            <View key={property.id} style={[s.propCard, { backgroundColor: surface, borderColor }]}>
              <Image
                source={{
                  uri:
                    property.image_url ||
                    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80',
                }}
                style={s.propImg}
                resizeMode="cover"
              />
              <View style={s.propOverlay}>
                <Text style={s.propName}>{property.name}</Text>
                <Text style={s.propLocation}>📍 {property.location}</Text>
                {property.description ? (
                  <Text style={s.propDesc} numberOfLines={2}>{property.description}</Text>
                ) : null}
              </View>
            </View>
          ))
        )}
      </View>

      {/* ── Amenities Section ──────────────────────────────────── */}
      <View style={s.section}>
        <Text style={[s.sectionTitle, { color: fg }]}>Curated Amenities</Text>
        <Text style={s.sectionSub}>Designed to support your wellness journey seamlessly.</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 20 }}>
          {AMENITIES.map((a) => (
            <View key={a.title} style={[s.amenityCard, { backgroundColor: surface, borderColor }]}>
              <Image source={{ uri: a.image }} style={s.amenityImg} resizeMode="cover" />
              <View style={s.amenityFooter}>
                <View>
                  <Text style={[s.amenityName, { color: fg }]}>{a.title}</Text>
                  <Text style={s.amenityType}>{a.type.toUpperCase()}</Text>
                </View>
                <Text style={{ fontSize: 22 }}>{a.emoji}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* ── Get the App Section ────────────────────────────────── */}
      <View style={[s.section, s.appSection]}>
        <View style={[s.appCard, { backgroundColor: isDark ? colors.surfaceDark : colors.white, borderColor }]}>
          <Text style={s.appCardEmoji}>📱</Text>
          <Text style={[s.appCardTitle, { color: fg }]}>You're using the App!</Text>
          <Text style={s.appCardSub}>
            Share this experience with friends. They can download it for free.
          </Text>
          <Pressable
            style={({ pressed }) => [s.primaryBtn, pressed && s.pressed, { marginTop: 12 }]}
            onPress={() => Linking.openURL('exp://aaramsmarthomes')}
          >
            <Text style={s.primaryBtnText}>Share Expo Go Link</Text>
          </Pressable>
        </View>
      </View>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <View style={[s.footer, { borderTopColor: borderColor }]}>
        <Text style={s.footerText}>🏠 AARAM SMART HOMES  •  Est. 2024</Text>
      </View>
    </ScrollView>
  );
}

const makeStyles = (isDark: boolean, bg: string, fg: string, surface: string, borderColor: string) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: bg },
    content: { paddingBottom: 40 },

    // Nav
    nav: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 60,
      paddingBottom: 16,
    },
    navLogo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    logoBadge: {
      width: 36,
      height: 36,
      borderRadius: radius.md,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    logoEmoji: { fontSize: 18 },
    logoText: { fontSize: 17, fontWeight: '800', color: fg, letterSpacing: -0.5 },
    signInBtn: {
      backgroundColor: colors.primary,
      paddingHorizontal: 18,
      paddingVertical: 9,
      borderRadius: radius.md,
    },
    signInText: { color: '#fff', fontWeight: '700', fontSize: 13 },

    // Hero
    hero: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32 },
    heroBadge: {
      alignSelf: 'flex-start',
      backgroundColor: colors.secondaryLight,
      borderWidth: 1,
      borderColor: `${colors.secondary}33`,
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 50,
      marginBottom: 20,
    },
    heroBadgeText: { fontSize: 10, fontWeight: '800', color: colors.secondary, letterSpacing: 1.2 },
    heroTitle: { fontSize: 52, fontWeight: '900', color: fg, lineHeight: 54, letterSpacing: -1 },
    heroTitleAccent: {
      fontSize: 52,
      fontWeight: '900',
      color: colors.primary,
      fontStyle: 'italic',
      lineHeight: 58,
      letterSpacing: -1,
    },
    heroSubtitle: { fontSize: 15, color: colors.muted, marginTop: 16, lineHeight: 22, maxWidth: 320 },
    heroActions: { flexDirection: 'column', gap: 12, marginTop: 28 },

    // Buttons
    primaryBtn: {
      backgroundColor: colors.primary,
      paddingVertical: 16,
      paddingHorizontal: 28,
      borderRadius: radius.lg,
      alignItems: 'center',
      ...shadow.sm,
    },
    primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
    secondaryBtn: {
      backgroundColor: 'transparent',
      paddingVertical: 16,
      paddingHorizontal: 28,
      borderRadius: radius.lg,
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: borderColor,
    },
    secondaryBtnText: { color: fg, fontWeight: '700', fontSize: 15 },
    pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },

    // Hero image
    heroImgPlaceholder: {
      height: 240,
      borderRadius: radius.xl,
      backgroundColor: `${colors.primary}10`,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 28,
    },
    heroImgCard: {
      marginTop: 28,
      borderRadius: radius.xl,
      borderWidth: 1,
      overflow: 'hidden',
      ...shadow.md,
      position: 'relative',
    },
    heroImg: { width: '100%', height: 240 },
    floatCard: {
      position: 'absolute',
      bottom: 16,
      right: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: radius.md,
      ...shadow.sm,
    },
    floatIcon: { fontSize: 20 },
    floatSub: { fontSize: 8, fontWeight: '800', color: colors.secondary, letterSpacing: 1 },
    floatTitle: { fontSize: 12, fontWeight: '700' },

    // Sections
    section: { paddingHorizontal: 20, paddingTop: 40 },
    sectionTitle: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
    sectionSub: { fontSize: 13, color: colors.muted, marginTop: 6, lineHeight: 19 },
    emptyCard: {
      marginTop: 20,
      padding: 24,
      borderRadius: radius.lg,
      borderWidth: 1,
      alignItems: 'center',
    },

    // Property cards
    propCard: {
      borderRadius: radius.xl,
      borderWidth: 1,
      overflow: 'hidden',
      marginTop: 20,
      ...shadow.sm,
    },
    propImg: { width: '100%', height: 200 },
    propOverlay: {
      padding: 20,
    },
    propName: { fontSize: 18, fontWeight: '800', color: fg, letterSpacing: -0.3 },
    propLocation: { fontSize: 13, color: colors.muted, marginTop: 4 },
    propDesc: { fontSize: 13, color: colors.muted, marginTop: 8, lineHeight: 18 },

    // Amenity cards
    amenityCard: {
      width: width * 0.65,
      borderRadius: radius.xl,
      borderWidth: 1,
      overflow: 'hidden',
      marginRight: 16,
      ...shadow.sm,
    },
    amenityImg: { width: '100%', height: 160 },
    amenityFooter: {
      padding: 14,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    amenityName: { fontSize: 15, fontWeight: '700' },
    amenityType: { fontSize: 9, fontWeight: '800', color: colors.secondary, letterSpacing: 1.2, marginTop: 2 },

    // App section
    appSection: { paddingTop: 32 },
    appCard: {
      borderRadius: radius.xl,
      borderWidth: 1,
      padding: 24,
      alignItems: 'center',
      ...shadow.sm,
    },
    appCardEmoji: { fontSize: 40, marginBottom: 12 },
    appCardTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
    appCardSub: { fontSize: 13, color: colors.muted, textAlign: 'center', marginTop: 8, lineHeight: 19 },

    // Footer
    footer: {
      marginTop: 40,
      paddingTop: 24,
      paddingBottom: 12,
      borderTopWidth: 1,
      alignItems: 'center',
    },
    footerText: { fontSize: 11, fontWeight: '700', color: colors.muted, letterSpacing: 0.5 },
  });
