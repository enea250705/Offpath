// Offpath — Guide Tab (AI Chat)
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../store/AppContext';
import { api, friendlyError } from '../../services/api';
import * as storage from '../../services/storage';
import { colors, typography, spacing, radius } from '../../theme';
import { GuideMessage } from '../../types';

const FREE_MESSAGE_LIMIT = 3;
const INITIAL_MESSAGE: GuideMessage = {
  id: 'initial',
  role: 'assistant',
  text: "I'll be your local while you're there. Ask me what's worth noticing, where locals actually go after dinner, or what's overrated around you.",
  timestamp: new Date().toISOString(),
};

export default function GuideTab() {
  const { state, actions } = useApp();
  const plan = state.plan;
  const isPremium = state.isPremium;
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const messages = state.guideMessages.length
    ? state.guideMessages
    : [INITIAL_MESSAGE];

  const userMessageCount = messages.filter((m) => m.role === 'user').length;
  const messagesRemaining = isPremium
    ? Infinity
    : FREE_MESSAGE_LIMIT - userMessageCount;
  const canSend = messagesRemaining > 0 && !sending;

  // Load messages from server on mount
  useEffect(() => {
    if (plan?.id && state.user) {
      api
        .getGuideMessages(plan.id)
        .then((serverMsgs) => {
          if (serverMsgs.length > 0) {
            const allMsgs = [INITIAL_MESSAGE, ...serverMsgs];
            actions.setGuideMessages(allMsgs);
            storage.saveGuideMessages(allMsgs);
          }
        })
        .catch(() => {
          // Use local messages
        });
    }
  }, [plan?.id]);

  // Auto scroll
  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages.length]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || !canSend || !plan?.id) return;

    const userMsg: GuideMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: input.trim(),
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...messages, userMsg];
    actions.setGuideMessages(updatedMessages);
    setInput('');
    setSending(true);

    try {
      const chatHistory = updatedMessages
        .filter((m) => m.id !== 'initial')
        .map((m) => ({ role: m.role, text: m.text }));

      const response = await api.sendGuideMessage(plan.id, plan.destinationCity, chatHistory);

      const assistantMsg: GuideMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        text: response.text,
        timestamp: new Date().toISOString(),
      };

      const finalMessages = [...updatedMessages, assistantMsg];
      actions.setGuideMessages(finalMessages);
      await storage.saveGuideMessages(finalMessages);
    } catch (err: any) {
      const errorMsg: GuideMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        text: friendlyError(err),
        timestamp: new Date().toISOString(),
      };
      const finalMessages = [...updatedMessages, errorMsg];
      actions.setGuideMessages(finalMessages);
    } finally {
      setSending(false);
    }
  }, [input, canSend, messages, plan?.id, actions]);

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <VoyaraAvatar size={42} />
            <View style={styles.headerText}>
              <Text style={styles.headerName}>Voyara</Text>
              <View style={styles.headerOnlineRow}>
                <View style={styles.onlineDot} />
                <Text style={styles.headerSub}>Your local guide</Text>
              </View>
            </View>
          </View>
          <View style={styles.counterBadge}>
            <Text style={styles.counterText}>
              {isPremium ? 'Unlimited' : `${Math.max(0, messagesRemaining)} left`}
            </Text>
          </View>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          style={styles.messageList}
          contentContainerStyle={styles.messageListContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((msg, idx) => (
            <MessageBubble key={msg.id || idx} message={msg} />
          ))}
          {sending && (
            <View style={styles.typingIndicator}>
              <View style={styles.avatarWrap}>
                <VoyaraAvatar size={32} />
              </View>
              <View style={styles.typingDots}>
                <ActivityIndicator size="small" color={colors.accent} />
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input or Upgrade */}
        {messagesRemaining > 0 || isPremium ? (
          <View style={styles.inputBar}>
            <TextInput
              style={styles.textInput}
              placeholder="What's worth doing tonight?"
              placeholderTextColor={colors.textMuted}
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={500}
              editable={canSend}
            />
            <TouchableOpacity
              style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={!input.trim() || !canSend}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={
                  input.trim()
                    ? ['#F97316', '#FB923C']
                    : [colors.bgElevated, colors.bgElevated]
                }
                style={styles.sendBtnGradient}
              >
                <Ionicons name="arrow-up" size={20} color={colors.white} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.upgradeBanner}
            onPress={() => actions.setPhase('preview')}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={['#F97316', '#FB923C']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.upgradeBannerGradient}
            >
              <Text style={styles.upgradeText}>
                Unlock unlimited messages with a Trip Pass
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Voyara Avatar ────────────────────────────────────────

function VoyaraAvatar({ size = 36 }: { size?: number }) {
  const ringSize = size + 4;
  const innerSize = size - 2;
  return (
    <View style={{ width: ringSize, height: ringSize }}>
      {/* Outer glow */}
      <View style={{
        position: 'absolute',
        width: ringSize + 6,
        height: ringSize + 6,
        borderRadius: (ringSize + 6) / 2,
        top: -3,
        left: -3,
        backgroundColor: '#F97316',
        opacity: 0.12,
      }} />
      {/* Gradient ring */}
      <LinearGradient
        colors={['#F97316', '#A855F7', '#3B82F6']}
        start={{ x: 0, y: 1 }}
        end={{ x: 1, y: 0 }}
        style={{
          width: ringSize,
          height: ringSize,
          borderRadius: ringSize / 2,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {/* Dark inner fill */}
        <LinearGradient
          colors={['#1A0D2E', '#0D1525']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            width: innerSize,
            height: innerSize,
            borderRadius: innerSize / 2,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {/* Compass icon */}
          <Ionicons name="compass" size={size * 0.46} color="#F97316" />
          {/* Tiny north dot */}
          <View style={{
            position: 'absolute',
            top: size * 0.08,
            width: 3,
            height: 3,
            borderRadius: 1.5,
            backgroundColor: '#F97316',
            opacity: 0.8,
          }} />
        </LinearGradient>
      </LinearGradient>
    </View>
  );
}

function MessageBubble({ message }: { message: GuideMessage }) {
  const isUser = message.role === 'user';

  return (
    <View style={[styles.messageRow, isUser && styles.messageRowUser]}>
      {!isUser && (
        <View style={styles.avatarWrap}>
          <VoyaraAvatar size={32} />
        </View>
      )}
      <View style={styles.messageBubbleCol}>
        {!isUser && <Text style={styles.guideLabel}>Voyara</Text>}
        <View
          style={[
            styles.bubble,
            isUser ? styles.bubbleUser : styles.bubbleAssistant,
          ]}
        >
          <Text
            style={[
              styles.bubbleText,
              isUser ? styles.bubbleTextUser : styles.bubbleTextAssistant,
            ]}
          >
            {message.text}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingBottom: Platform.OS === 'ios' ? 100 : 88,
  },
  kav: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerText: {
    gap: 3,
  },
  headerName: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerOnlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
  },
  headerSub: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },
  counterBadge: {
    backgroundColor: colors.accentMuted,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  counterText: {
    color: colors.accent,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },

  // Messages
  messageList: {
    flex: 1,
  },
  messageListContent: {
    padding: 16,
    paddingBottom: 16,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  avatarWrap: {
    marginRight: 10,
    marginTop: 18,
  },
  messageBubbleCol: {
    maxWidth: '75%',
  },
  guideLabel: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
    marginBottom: 4,
    marginLeft: 4,
  },
  bubble: {
    borderRadius: radius.lg,
    padding: 14,
  },
  bubbleAssistant: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopLeftRadius: 4,
  },
  bubbleUser: {
    backgroundColor: colors.accent,
    borderTopRightRadius: 4,
  },
  bubbleText: {
    fontSize: typography.sizes.base,
    lineHeight: 22,
  },
  bubbleTextAssistant: {
    color: colors.textPrimary,
  },
  bubbleTextUser: {
    color: colors.white,
  },

  // Typing
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  typingDots: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },

  // Input
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: colors.textPrimary,
    fontSize: typography.sizes.base,
    maxHeight: 100,
    letterSpacing: 0,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 10,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  sendBtnGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnText: {
    color: colors.white,
    fontSize: 20,
    fontWeight: typography.weights.bold,
  },

  // Upgrade
  upgradeBanner: {
    margin: 12,
    marginBottom: 12,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  upgradeBannerGradient: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderRadius: radius.lg,
  },
  upgradeText: {
    color: colors.white,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    textAlign: 'center',
  },
});
