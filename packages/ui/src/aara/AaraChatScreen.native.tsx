import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView,
  StyleSheet, KeyboardAvoidingView, Platform, Image,
  ActivityIndicator,
} from 'react-native';
import { MotiView } from 'moti';
import { useAaraChat } from '@aaram/core';
import type { AaraChatMessage } from '@aaram/core';
import { colors, radii } from '@aaram/config';

// ── Constants ─────────────────────────────────────────────────────────────────

const MUTED = '#9E998F';

const QUICK_REPLIES = [
  'What amenities are available?',
  'How do I raise a support ticket?',
  'Tell me about meal plans',
  'What are the bill split rules?',
];

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AaraChatScreenProps {
  /** Called with user message text; should return Aara's reply. */
  sendMessage: (text: string) => Promise<string>;
  onClose?: () => void;
}

// ── Typing Indicator ──────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <View style={s.bubbleRow}>
      <View style={s.avatarDot}>
        <Text style={s.avatarDotText}>🌿</Text>
      </View>
      <View style={[s.bubble, s.bubbleAssistant, s.typingBubble]}>
        {[0, 1, 2].map(i => (
          <MotiView
            key={i}
            from={{ translateY: 0 }}
            animate={{ translateY: -5 }}
            transition={{
              type: 'timing',
              duration: 380,
              delay: i * 120,
              loop: true,
              repeatReverse: true,
            }}
            style={s.typingDot}
          />
        ))}
      </View>
    </View>
  );
}

// ── Message Bubble ────────────────────────────────────────────────────────────

function MessageBubble({ message, index }: { message: AaraChatMessage; index: number }) {
  const isUser = message.role === 'user';
  return (
    <MotiView
      from={{ opacity: 0, translateY: 10, scale: 0.97 }}
      animate={{ opacity: 1, translateY: 0, scale: 1 }}
      transition={{ type: 'timing', duration: 300, delay: Math.min(index * 30, 300) }}
      style={[s.bubbleRow, isUser && s.bubbleRowUser]}
    >
      {!isUser && (
        <View style={s.avatarDot}>
          <Text style={s.avatarDotText}>🌿</Text>
        </View>
      )}
      <View style={[s.bubble, isUser ? s.bubbleUser : s.bubbleAssistant]}>
        <Text style={[s.bubbleText, isUser ? s.bubbleTextUser : s.bubbleTextAssistant]}>
          {message.text}
        </Text>
      </View>
    </MotiView>
  );
}

// ── Quick Replies ─────────────────────────────────────────────────────────────

function QuickReplies({ onSelect }: { onSelect: (text: string) => void }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={s.quickRepliesContent}
      style={s.quickRepliesScroll}
    >
      {QUICK_REPLIES.map(q => (
        <Pressable
          key={q}
          style={({ pressed }) => [s.quickReply, pressed && { opacity: 0.7 }]}
          onPress={() => onSelect(q)}
        >
          <Text style={s.quickReplyText}>{q}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export function AaraChatScreen({ sendMessage, onClose }: AaraChatScreenProps) {
  const { messages, loading, send } = useAaraChat(sendMessage);
  const [input, setInput] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  const showQuickReplies = messages.length <= 1;

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  }, [messages.length, loading]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    await send(text);
  };

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
    >
      {/* ── Header ─────────────────────────────────────────────── */}
      <MotiView
        from={{ opacity: 0, translateY: -8 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 380 }}
        style={s.header}
      >
        <View style={s.headerLeft}>
          <MotiView
            from={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 220, damping: 14, delay: 100 }}
            style={s.aaraAvatar}
          >
            <Text style={s.aaraAvatarEmoji}>🌿</Text>
          </MotiView>
          <View>
            <Text style={s.headerName}>Aara</Text>
            <View style={s.onlineRow}>
              <View style={s.onlineDot} />
              <Text style={s.onlineText}>Online · Aaram Assistant</Text>
            </View>
          </View>
        </View>
        {onClose && (
          <Pressable style={s.closeBtn} onPress={onClose} hitSlop={12}>
            <Text style={s.closeBtnText}>✕</Text>
          </Pressable>
        )}
      </MotiView>

      {/* ── Messages ───────────────────────────────────────────── */}
      <ScrollView
        ref={scrollRef}
        style={s.messages}
        contentContainerStyle={s.messagesContent}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="interactive"
      >
        {messages.map((msg, i) => (
          <MessageBubble key={msg.id} message={msg} index={i} />
        ))}
        {loading && <TypingIndicator />}
      </ScrollView>

      {/* ── Quick Replies (only before first user message) ──────── */}
      {showQuickReplies && !loading && (
        <QuickReplies onSelect={q => { setInput(''); send(q); }} />
      )}

      {/* ── Input Bar ──────────────────────────────────────────── */}
      <View style={s.inputBar}>
        <TextInput
          style={s.input}
          placeholder="Ask Aara anything…"
          placeholderTextColor={MUTED}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={handleSend}
          returnKeyType="send"
          multiline
          maxLength={500}
        />
        <Pressable
          style={({ pressed }) => [
            s.sendBtn,
            (!input.trim() || loading) && s.sendBtnDisabled,
            pressed && { opacity: 0.8 },
          ]}
          onPress={handleSend}
          disabled={!input.trim() || loading}
        >
          {loading
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={s.sendBtnText}>↑</Text>}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.light.background },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 36,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
    backgroundColor: colors.light.background,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  aaraAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${colors.light.secondary}18`,
    borderWidth: 2,
    borderColor: `${colors.light.secondary}30`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aaraAvatarEmoji: { fontSize: 22 },
  headerName: { fontSize: 16, fontWeight: '800', color: colors.light.foreground, letterSpacing: -0.2 },
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.light.secondary },
  onlineText: { fontSize: 10, fontWeight: '600', color: MUTED },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    borderWidth: 1.5, borderColor: colors.light.border,
    alignItems: 'center', justifyContent: 'center',
  },
  closeBtnText: { fontSize: 16, color: MUTED, lineHeight: 20 },

  // Messages
  messages: { flex: 1 },
  messagesContent: { padding: 16, gap: 10, paddingBottom: 8 },

  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 4 },
  bubbleRowUser: { flexDirection: 'row-reverse' },
  avatarDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: `${colors.light.secondary}18`,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarDotText: { fontSize: 14 },

  bubble: {
    maxWidth: '78%',
    borderRadius: radii.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  bubbleAssistant: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.light.border,
    borderBottomLeftRadius: 4,
  },
  bubbleUser: {
    backgroundColor: colors.light.primary,
    borderBottomRightRadius: 4,
  },
  bubbleText: { fontSize: 14, lineHeight: 21 },
  bubbleTextAssistant: { color: colors.light.foreground },
  bubbleTextUser: { color: '#fff' },

  // Typing indicator
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  typingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: `${colors.light.secondary}90`,
  },

  // Quick replies
  quickRepliesScroll: { maxHeight: 44 },
  quickRepliesContent: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  quickReply: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 50,
    borderWidth: 1.5,
    borderColor: `${colors.light.primary}50`,
    backgroundColor: `${colors.light.primary}08`,
  },
  quickReplyText: { fontSize: 12, fontWeight: '700', color: colors.light.primary },

  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    borderTopWidth: 1,
    borderTopColor: colors.light.border,
    backgroundColor: colors.light.background,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: colors.light.border,
    borderRadius: radii.xl,
    paddingHorizontal: 16,
    paddingVertical: 11,
    fontSize: 14,
    lineHeight: 20,
    color: colors.light.foreground,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.light.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { fontSize: 20, color: '#fff', lineHeight: 26, marginTop: -2 },
});
