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
            <Text style={styles.headerLabel}>LOCAL GUIDE</Text>
            <Text style={styles.headerTitle}>Ask anything</Text>
          </View>
          {!isPremium && (
            <View style={styles.counterBadge}>
              <Text style={styles.counterText}>
                {Math.max(0, messagesRemaining)} left
              </Text>
            </View>
          )}
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
              <View style={styles.avatarCircle}>
                <Ionicons name="compass" size={16} color={colors.white} />
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

function MessageBubble({ message }: { message: GuideMessage }) {
  const isUser = message.role === 'user';

  return (
    <View style={[styles.messageRow, isUser && styles.messageRowUser]}>
      {!isUser && (
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>🧭</Text>
        </View>
      )}
      <View style={styles.messageBubbleCol}>
        {!isUser && <Text style={styles.guideLabel}>Your guide</Text>}
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
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {},
  headerLabel: {
    color: colors.accent,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    letterSpacing: 2,
    marginBottom: 4,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
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
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.info,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 18,
  },
  avatarText: {
    fontSize: 16,
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
