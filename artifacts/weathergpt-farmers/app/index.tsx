import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';

type Screen = 'home' | 'chat' | 'map' | 'community';
type IconName = React.ComponentProps<typeof Feather>['name'];

type CommunityPost = {
  id: string;
  name: string;
  initials: string;
  time: string;
  message: string;
  crop: string;
  likes: number;
  liked?: boolean;
};

type ChatMessage = {
  id: string;
  role: 'assistant' | 'user';
  message: string;
};

const initialPosts: CommunityPost[] = [
  {
    id: '1',
    name: 'Ramesh K.',
    initials: 'RK',
    time: '12 min ago',
    message: 'Clouds are building over our side. Should I wait one more day before spraying?',
    crop: 'Cotton',
    likes: 14,
  },
  {
    id: '2',
    name: 'Meena S.',
    initials: 'MS',
    time: '1 hr ago',
    message: 'The early morning mist helped my tomatoes today. Sharing a photo-free tip: water at the roots, not the leaves.',
    crop: 'Tomato',
    likes: 9,
  },
];

const starterMessages: ChatMessage[] = [
  {
    id: 'welcome',
    role: 'assistant',
    message:
      'Namaste! I’m here to help you plan around the weather. Ask me about rain, watering, spraying, or your crop.',
  },
];

const quickQuestions = [
  { label: 'Can I spray today?', icon: 'droplet' as IconName },
  { label: 'Will it rain this week?', icon: 'cloud-rain' as IconName },
  { label: 'When should I water?', icon: 'sun' as IconName },
];

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [screen, setScreen] = useState<Screen>('home');
  const [posts, setPosts] = useState<CommunityPost[]>(initialPosts);
  const [chat, setChat] = useState<ChatMessage[]>(starterMessages);
  const [question, setQuestion] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showPostComposer, setShowPostComposer] = useState(false);
  const [newPost, setNewPost] = useState('');
  const [selectedMapPoint, setSelectedMapPoint] = useState('Your farm');
  const [mapLayer, setMapLayer] = useState<'rain' | 'wind' | 'fields'>('rain');
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem('weathergpt-community-posts')
      .then((saved) => {
        if (saved) setPosts(JSON.parse(saved) as CommunityPost[]);
      })
      .catch(() => undefined)
      .finally(() => setIsLoadingPosts(false));
  }, []);

  useEffect(() => {
    if (!isLoadingPosts) {
      AsyncStorage.setItem('weathergpt-community-posts', JSON.stringify(posts)).catch(
        () => undefined,
      );
    }
  }, [isLoadingPosts, posts]);

  const activeTitle = useMemo(() => {
    if (screen === 'chat') return 'Weather guide';
    if (screen === 'map') return 'Field map';
    if (screen === 'community') return 'Farmer interaction';
    return '';
  }, [screen]);

  const selectScreen = (next: Screen) => {
    Haptics.selectionAsync().catch(() => undefined);
    setScreen(next);
  };

  const sendQuestion = (value = question) => {
    const trimmed = value.trim();
    if (!trimmed || isSending) return;
    setQuestion('');
    setIsSending(true);
    setChat((current) => [
      ...current,
      { id: `${Date.now()}-user`, role: 'user', message: trimmed },
    ]);
    setTimeout(() => {
      setChat((current) => [
        ...current,
        {
          id: `${Date.now()}-assistant`,
          role: 'assistant',
          message: answerFor(trimmed),
        },
      ]);
      setIsSending(false);
    }, 550);
  };

  const toggleListening = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    setIsListening((current) => !current);
    if (!isListening) {
      setQuestion('Tell me about the weather for my field');
    }
  };

  const toggleLike = (id: string) => {
    Haptics.selectionAsync().catch(() => undefined);
    setPosts((current) =>
      current.map((post) =>
        post.id === id
          ? {
              ...post,
              liked: !post.liked,
              likes: post.liked ? post.likes - 1 : post.likes + 1,
            }
          : post,
      ),
    );
  };

  const publishPost = () => {
    const trimmed = newPost.trim();
    if (!trimmed) {
      Alert.alert('Add a little more', 'Write a question or tip for your farmer friends.');
      return;
    }
    const post: CommunityPost = {
      id: `${Date.now()}`,
      name: 'You',
      initials: 'YO',
      time: 'Just now',
      message: trimmed,
      crop: 'My field',
      likes: 0,
    };
    setPosts((current) => [post, ...current]);
    setNewPost('');
    setShowPostComposer(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => undefined,
    );
  };

  return (
    <View style={[styles.app, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: Math.max(insets.top, Platform.OS === 'web' ? 67 : 16),
          paddingBottom: 106 + (Platform.OS === 'web' ? 34 : insets.bottom),
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {screen === 'home' ? (
          <HomeView
            colors={colors}
            onChat={() => selectScreen('chat')}
            onMap={() => selectScreen('map')}
            onCommunity={() => selectScreen('community')}
          />
        ) : screen === 'chat' ? (
          <ChatView
            colors={colors}
            messages={chat}
            question={question}
            isSending={isSending}
            isListening={isListening}
            onQuestionChange={setQuestion}
            onSend={() => sendQuestion()}
            onQuickQuestion={sendQuestion}
            onListen={toggleListening}
          />
        ) : screen === 'map' ? (
          <MapView
            colors={colors}
            selectedPoint={selectedMapPoint}
            layer={mapLayer}
            onSelectPoint={setSelectedMapPoint}
            onSelectLayer={setMapLayer}
          />
        ) : (
          <CommunityView
            colors={colors}
            posts={posts}
            isLoading={isLoadingPosts}
            onLike={toggleLike}
            onAdd={() => setShowPostComposer(true)}
          />
        )}
      </ScrollView>

      {screen !== 'home' ? (
        <View style={[styles.pageTitle, { top: Math.max(insets.top, Platform.OS === 'web' ? 67 : 16) }]}>
          <Pressable
            onPress={() => selectScreen('home')}
            accessibilityLabel="Back to today"
            hitSlop={12}
            style={({ pressed }) => [styles.backButton, { opacity: pressed ? 0.65 : 1 }]}
          >
            <Feather name="arrow-left" size={20} color={colors.leafDark} />
          </Pressable>
          <Text style={[styles.pageTitleText, { color: colors.foreground }]}>{activeTitle}</Text>
        </View>
      ) : null}

      <BottomNav colors={colors} active={screen} onSelect={selectScreen} insets={insets} />

      <Modal
        visible={showPostComposer}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPostComposer(false)}
      >
        <KeyboardAvoidingView
          behavior="padding"
          style={[styles.modalOverlay, { paddingBottom: insets.bottom || 16 }]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowPostComposer(false)} />
          <View style={[styles.composer, { backgroundColor: colors.card }]}>
            <View style={styles.composerHandle} />
            <Text style={[styles.composerTitle, { color: colors.foreground }]}>Share with farmers</Text>
            <Text style={[styles.composerHint, { color: colors.mutedForeground }]}>
              Ask a question or share a tip from your field.
            </Text>
            <TextInput
              autoFocus
              multiline
              value={newPost}
              onChangeText={setNewPost}
              placeholder="What would you like to share?"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.postInput, { backgroundColor: colors.muted, color: colors.foreground }]}
              textAlignVertical="top"
            />
            <Pressable
              onPress={publishPost}
              style={({ pressed }) => [
                styles.publishButton,
                { backgroundColor: colors.primary, opacity: pressed ? 0.86 : 1 },
              ]}
            >
              <Feather name="send" size={17} color={colors.primaryForeground} />
              <Text style={[styles.publishText, { color: colors.primaryForeground }]}>Post to community</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function HomeView({
  colors,
  onChat,
  onMap,
  onCommunity,
}: {
  colors: ReturnType<typeof useColors>;
  onChat: () => void;
  onMap: () => void;
  onCommunity: () => void;
}) {
  return (
    <>
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.eyebrow, { color: colors.primary }]}>GOOD MORNING</Text>
          <Text style={[styles.greeting, { color: colors.foreground }]}>Namaste, farmer</Text>
        </View>
        <Pressable
          accessibilityLabel="Open profile"
          style={({ pressed }) => [
            styles.avatar,
            { backgroundColor: colors.warmSurface, borderColor: colors.warmBorder, opacity: pressed ? 0.75 : 1 },
          ]}
        >
          <Feather name="user" size={20} color={colors.accentForeground} />
        </Pressable>
      </View>

      <View style={styles.locationRow}>
        <Feather name="map-pin" size={14} color={colors.coral} />
        <Text style={[styles.locationText, { color: colors.mutedForeground }]}>Nashik, Maharashtra</Text>
        <Feather name="chevron-down" size={14} color={colors.mutedForeground} />
      </View>

      <LinearGradient
        colors={[colors.leafDark, colors.primary, colors.leaf]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.weatherHero}
      >
        <View style={styles.heroTopLine}>
          <View style={styles.todayPill}>
            <Text style={[styles.todayPillText, { color: colors.leafDark }]}>TODAY</Text>
          </View>
          <Feather name="sun" size={24} color={colors.sun} />
        </View>
        <Text style={styles.heroTemperature}>28°</Text>
        <Text style={styles.heroCondition}>Warm with a gentle breeze</Text>
        <View style={styles.heroDivider} />
        <View style={styles.heroStats}>
          <WeatherStat icon="sunrise" value="6:12 AM" label="Sunrise" />
          <WeatherStat icon="droplet" value="18%" label="Rain chance" />
          <WeatherStat icon="wind" value="12 km/h" label="Wind" />
        </View>
      </LinearGradient>

      <View style={styles.sectionHeading}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Your day at a glance</Text>
        <Text style={[styles.sectionAction, { color: colors.primary }]}>See week</Text>
      </View>
      <View style={styles.weekRow}>
        <DayWeather day="Now" temp="28°" icon="sun" active colors={colors} />
        <DayWeather day="Tue" temp="29°" icon="cloud" colors={colors} />
        <DayWeather day="Wed" temp="26°" icon="cloud-rain" rain colors={colors} />
        <DayWeather day="Thu" temp="27°" icon="cloud" colors={colors} />
        <DayWeather day="Fri" temp="30°" icon="sun" colors={colors} />
      </View>

      <Pressable
        onPress={onChat}
        style={({ pressed }) => [
          styles.adviceCard,
          { backgroundColor: colors.warmSurface, borderColor: colors.warmBorder, opacity: pressed ? 0.88 : 1 },
        ]}
      >
        <View style={[styles.adviceIcon, { backgroundColor: colors.accent }]}>
          <Feather name="check-circle" size={20} color={colors.accentForeground} />
        </View>
        <View style={styles.adviceCopy}>
          <Text style={[styles.adviceKicker, { color: colors.accentForeground }]}>FIELD TIP</Text>
          <Text style={[styles.adviceText, { color: colors.foreground }]}>
            It’s a good day to spray and work in the field.
          </Text>
        </View>
        <Feather name="arrow-up-right" size={18} color={colors.accentForeground} />
      </Pressable>

      <View style={styles.quickActions}>
        <QuickAction icon="message-circle" label="Ask WeatherGPT" onPress={onChat} colors={colors} />
        <QuickAction icon="map" label="Open field map" onPress={onMap} colors={colors} />
        <QuickAction icon="users" label="Ask farmers" onPress={onCommunity} colors={colors} />
      </View>

      <View style={styles.sectionHeading}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>This week on your farm</Text>
        <Feather name="more-horizontal" size={20} color={colors.mutedForeground} />
      </View>
      <View style={[styles.cropCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.cropIcon, { backgroundColor: colors.secondary }]}>
          <Feather name="activity" size={22} color={colors.primary} />
        </View>
        <View style={styles.cropCopy}>
          <Text style={[styles.cropTitle, { color: colors.foreground }]}>Cotton field</Text>
          <Text style={[styles.cropDetail, { color: colors.mutedForeground }]}>Next watering in 2 days</Text>
        </View>
        <View style={[styles.healthPill, { backgroundColor: colors.secondary }]}>
          <Text style={[styles.healthText, { color: colors.primary }]}>Healthy</Text>
        </View>
      </View>
    </>
  );
}

function ChatView({
  colors,
  messages,
  question,
  isSending,
  isListening,
  onQuestionChange,
  onSend,
  onQuickQuestion,
  onListen,
}: {
  colors: ReturnType<typeof useColors>;
  messages: ChatMessage[];
  question: string;
  isSending: boolean;
  isListening: boolean;
  onQuestionChange: (value: string) => void;
  onSend: () => void;
  onQuickQuestion: (value: string) => void;
  onListen: () => void;
}) {
  return (
    <>
      <View style={styles.chatIntro}>
        <View style={[styles.chatAvatar, { backgroundColor: colors.secondary }]}>
          <Feather name="cloud" size={23} color={colors.primary} />
        </View>
        <View>
          <Text style={[styles.chatName, { color: colors.foreground }]}>WeatherGPT</Text>
          <View style={styles.onlineRow}>
            <View style={[styles.onlineDot, { backgroundColor: colors.leaf }]} />
            <Text style={[styles.onlineText, { color: colors.mutedForeground }]}>Ready to help</Text>
          </View>
        </View>
      </View>
      <Text style={[styles.chatDate, { color: colors.mutedForeground }]}>TODAY, 9:41 AM</Text>
      <View style={styles.messageList}>
        {messages.map((item) => (
          <View
            key={item.id}
            style={[
              styles.messageBubble,
              item.role === 'user'
                ? [styles.userBubble, { backgroundColor: colors.primary }]
                : [styles.assistantBubble, { backgroundColor: colors.card, borderColor: colors.border }],
            ]}
          >
            {item.role === 'assistant' ? (
              <View style={[styles.miniBot, { backgroundColor: colors.accent }]}>
                <Feather name="sun" size={12} color={colors.accentForeground} />
              </View>
            ) : null}
            <Text
              style={[
                styles.messageText,
                { color: item.role === 'user' ? colors.primaryForeground : colors.foreground },
              ]}
            >
              {item.message}
            </Text>
          </View>
        ))}
        {isSending ? (
          <View style={[styles.typingBubble, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.typingText, { color: colors.mutedForeground }]}>Thinking about your field…</Text>
          </View>
        ) : null}
      </View>

      <Text style={[styles.askLabel, { color: colors.mutedForeground }]}>TRY ASKING</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickQuestionRow}>
        {quickQuestions.map((item) => (
          <Pressable
            key={item.label}
            onPress={() => onQuickQuestion(item.label)}
            style={({ pressed }) => [
              styles.questionChip,
              { backgroundColor: colors.secondary, opacity: pressed ? 0.75 : 1 },
            ]}
          >
            <Feather name={item.icon} size={15} color={colors.primary} />
            <Text style={[styles.questionChipText, { color: colors.leafDark }]}>{item.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={[styles.chatComposer, { backgroundColor: colors.card, borderColor: colors.input }]}>
        <TextInput
          value={question}
          onChangeText={onQuestionChange}
          placeholder={isListening ? 'Listening…' : 'Ask about your farm'}
          placeholderTextColor={colors.mutedForeground}
          style={[styles.chatInput, { color: colors.foreground }]}
          returnKeyType="send"
          onSubmitEditing={onSend}
          accessibilityLabel="Ask about your farm"
        />
        <Pressable
          onPress={onListen}
          accessibilityLabel={isListening ? 'Stop listening' : 'Ask by voice'}
          style={({ pressed }) => [
            styles.micButton,
            { backgroundColor: isListening ? colors.coral : colors.secondary, opacity: pressed ? 0.75 : 1 },
          ]}
        >
          <Feather name={isListening ? 'square' : 'mic'} size={18} color={isListening ? colors.primaryForeground : colors.primary} />
        </Pressable>
        <Pressable
          onPress={onSend}
          accessibilityLabel="Send question"
          style={({ pressed }) => [
            styles.sendButton,
            { backgroundColor: colors.primary, opacity: pressed ? 0.75 : 1 },
          ]}
        >
          <Feather name="arrow-up" size={18} color={colors.primaryForeground} />
        </Pressable>
      </View>
      <Text style={[styles.chatFootnote, { color: colors.mutedForeground }]}>
        Weather guidance is a helper, not a replacement for local expert advice.
      </Text>
    </>
  );
}

function MapView({
  colors,
  selectedPoint,
  layer,
  onSelectPoint,
  onSelectLayer,
}: {
  colors: ReturnType<typeof useColors>;
  selectedPoint: string;
  layer: 'rain' | 'wind' | 'fields';
  onSelectPoint: (value: string) => void;
  onSelectLayer: (value: 'rain' | 'wind' | 'fields') => void;
}) {
  return (
    <>
      <Text style={[styles.mapSubtitle, { color: colors.mutedForeground }]}>
        Tap a place to see its weather and field advice.
      </Text>
      <View style={[styles.mapCard, { backgroundColor: colors.mapLand, borderColor: colors.border }]}>
        <View style={[styles.mapWaterShape, { backgroundColor: colors.mapWater }]} />
        <View style={[styles.mapRoad, styles.roadOne, { borderColor: colors.card }]} />
        <View style={[styles.mapRoad, styles.roadTwo, { borderColor: colors.card }]} />
        <View style={[styles.mapFieldShape, styles.fieldOne, { backgroundColor: colors.mapField }]} />
        <View style={[styles.mapFieldShape, styles.fieldTwo, { backgroundColor: colors.mapField }]} />
        <View style={[styles.mapFieldShape, styles.fieldThree, { backgroundColor: colors.mapField }]} />
        <MapPoint label="Your farm" x="46%" y="46%" active={selectedPoint === 'Your farm'} colors={colors} onPress={onSelectPoint} />
        <MapPoint label="Dindori" x="23%" y="27%" active={selectedPoint === 'Dindori'} colors={colors} onPress={onSelectPoint} />
        <MapPoint label="Sinnar" x="70%" y="69%" active={selectedPoint === 'Sinnar'} colors={colors} onPress={onSelectPoint} />
        <View style={[styles.mapLegend, { backgroundColor: colors.card }]}>
          <View style={styles.legendRow}><View style={[styles.legendDot, { backgroundColor: colors.rain }]} /><Text style={[styles.legendText, { color: colors.foreground }]}>Light rain</Text></View>
          <View style={styles.legendRow}><View style={[styles.legendDot, { backgroundColor: colors.sun }]} /><Text style={[styles.legendText, { color: colors.foreground }]}>Clear</Text></View>
        </View>
        <View style={[styles.zoomControls, { backgroundColor: colors.card }]}>
          <Feather name="plus" size={18} color={colors.foreground} />
          <View style={[styles.zoomDivider, { backgroundColor: colors.border }]} />
          <Feather name="minus" size={18} color={colors.foreground} />
        </View>
      </View>
      <View style={styles.layerRow}>
        {(['rain', 'wind', 'fields'] as const).map((item) => (
          <Pressable
            key={item}
            onPress={() => onSelectLayer(item)}
            style={({ pressed }) => [
              styles.layerChip,
              {
                backgroundColor: layer === item ? colors.primary : colors.card,
                borderColor: layer === item ? colors.primary : colors.border,
                opacity: pressed ? 0.75 : 1,
              },
            ]}
          >
            <Feather name={item === 'rain' ? 'cloud-rain' : item === 'wind' ? 'wind' : 'grid'} size={15} color={layer === item ? colors.primaryForeground : colors.primary} />
            <Text style={[styles.layerText, { color: layer === item ? colors.primaryForeground : colors.foreground }]}>{item[0].toUpperCase() + item.slice(1)}</Text>
          </Pressable>
        ))}
      </View>
      <View style={[styles.mapDetailCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.detailWeatherIcon, { backgroundColor: colors.sky }]}>
          <Feather name={layer === 'rain' ? 'cloud-rain' : layer === 'wind' ? 'wind' : 'sun'} size={22} color={colors.primary} />
        </View>
        <View style={styles.mapDetailCopy}>
          <Text style={[styles.mapDetailPlace, { color: colors.foreground }]}>{selectedPoint}</Text>
          <Text style={[styles.mapDetailText, { color: colors.mutedForeground }]}>
            {layer === 'rain' ? '18% rain chance · Good field day' : layer === 'wind' ? '12 km/h · Gentle breeze' : 'Cotton and tomato fields'}
          </Text>
        </View>
        <Feather name="chevron-right" size={19} color={colors.mutedForeground} />
      </View>
      <Text style={[styles.mapUpdated, { color: colors.mutedForeground }]}>Updated 6 minutes ago · Based on local forecast</Text>
    </>
  );
}

function CommunityView({
  colors,
  posts,
  isLoading,
  onLike,
  onAdd,
}: {
  colors: ReturnType<typeof useColors>;
  posts: CommunityPost[];
  isLoading: boolean;
  onLike: (id: string) => void;
  onAdd: () => void;
}) {
  return (
    <>
      <View style={styles.communityHeader}>
        <View>
          <Text style={[styles.communityLead, { color: colors.foreground }]}>Learn from the field</Text>
          <Text style={[styles.communitySub, { color: colors.mutedForeground }]}>Local questions, trusted farmer tips.</Text>
        </View>
        <Pressable
          onPress={onAdd}
          accessibilityLabel="Share with farmers"
          style={({ pressed }) => [
            styles.addPostButton,
            { backgroundColor: colors.primary, opacity: pressed ? 0.78 : 1 },
          ]}
        >
          <Feather name="plus" size={20} color={colors.primaryForeground} />
        </Pressable>
      </View>
      <View style={[styles.communityBanner, { backgroundColor: colors.sky }]}>
        <View style={[styles.bannerIcon, { backgroundColor: colors.card }]}>
          <Feather name="users" size={19} color={colors.primary} />
        </View>
        <Text style={[styles.bannerText, { color: colors.leafDark }]}>
          Be kind, share what works, and help a farmer nearby.
        </Text>
      </View>
      <View style={styles.feedHeader}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Nearby conversations</Text>
        <View style={[styles.nearbyPill, { backgroundColor: colors.secondary }]}>
          <View style={[styles.onlineDot, { backgroundColor: colors.leaf }]} />
          <Text style={[styles.nearbyText, { color: colors.primary }]}>Nashik</Text>
        </View>
      </View>
      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={styles.feedLoading} />
      ) : posts.length ? (
        posts.map((post) => (
          <View key={post.id} style={[styles.postCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.postTopLine}>
              <View style={[styles.postAvatar, { backgroundColor: colors.warmSurface }]}>
                <Text style={[styles.postInitials, { color: colors.accentForeground }]}>{post.initials}</Text>
              </View>
              <View style={styles.postIdentity}>
                <Text style={[styles.postName, { color: colors.foreground }]}>{post.name}</Text>
                <Text style={[styles.postTime, { color: colors.mutedForeground }]}>{post.time}</Text>
              </View>
              <View style={[styles.cropTag, { backgroundColor: colors.secondary }]}>
                <Text style={[styles.cropTagText, { color: colors.primary }]}>{post.crop}</Text>
              </View>
            </View>
            <Text style={[styles.postMessage, { color: colors.foreground }]}>{post.message}</Text>
            <View style={styles.postActions}>
              <Pressable
                onPress={() => onLike(post.id)}
                style={({ pressed }) => [styles.postAction, { opacity: pressed ? 0.55 : 1 }]}
              >
                <Feather name="heart" size={17} color={post.liked ? colors.coral : colors.mutedForeground} />
                <Text style={[styles.postActionText, { color: post.liked ? colors.coral : colors.mutedForeground }]}>{post.likes}</Text>
              </Pressable>
              <View style={styles.postAction}>
                <Feather name="message-circle" size={17} color={colors.mutedForeground} />
                <Text style={[styles.postActionText, { color: colors.mutedForeground }]}>Reply</Text>
              </View>
              <Pressable style={({ pressed }) => [styles.postAction, { marginLeft: 'auto', opacity: pressed ? 0.55 : 1 }]}>
                <Feather name="share-2" size={17} color={colors.mutedForeground} />
              </Pressable>
            </View>
          </View>
        ))
      ) : (
        <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="message-square" size={26} color={colors.primary} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Start the first conversation</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Share a question or tip from your field.</Text>
        </View>
      )}
    </>
  );
}

function BottomNav({
  colors,
  active,
  onSelect,
  insets,
}: {
  colors: ReturnType<typeof useColors>;
  active: Screen;
  onSelect: (screen: Screen) => void;
  insets: { bottom: number };
}) {
  const items: { id: Screen; label: string; icon: IconName }[] = [
    { id: 'home', label: 'Today', icon: 'sun' },
    { id: 'chat', label: 'Ask', icon: 'message-circle' },
    { id: 'map', label: 'Map', icon: 'map' },
    { id: 'community', label: 'Farmers', icon: 'users' },
  ];
  return (
    <View style={[styles.bottomNav, { backgroundColor: colors.card, borderColor: colors.border, paddingBottom: Math.max(insets.bottom, Platform.OS === 'web' ? 34 : 10) }]}>
      {items.map((item) => {
        const isActive = active === item.id;
        return (
          <Pressable
            key={item.id}
            onPress={() => onSelect(item.id)}
            accessibilityLabel={item.label}
            style={({ pressed }) => [styles.navItem, { opacity: pressed ? 0.62 : 1 }]}
          >
            <View style={[styles.navIconWrap, { backgroundColor: isActive ? colors.secondary : 'transparent' }]}>
              <Feather name={item.icon} size={20} color={isActive ? colors.primary : colors.mutedForeground} />
            </View>
            <Text style={[styles.navLabel, { color: isActive ? colors.primary : colors.mutedForeground }]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function WeatherStat({ icon, value, label }: { icon: IconName; value: string; label: string }) {
  return (
    <View style={styles.weatherStat}>
      <Feather name={icon} size={15} color="rgba(255,255,255,0.82)" />
      <Text style={styles.weatherStatValue}>{value}</Text>
      <Text style={styles.weatherStatLabel}>{label}</Text>
    </View>
  );
}

function DayWeather({
  day,
  temp,
  icon,
  active,
  rain,
  colors,
}: {
  day: string;
  temp: string;
  icon: IconName;
  active?: boolean;
  rain?: boolean;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[styles.dayWeather, active && { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.dayLabel, { color: active ? colors.foreground : colors.mutedForeground }]}>{day}</Text>
      <Feather name={icon} size={21} color={rain ? colors.rain : colors.sun} />
      <Text style={[styles.dayTemp, { color: colors.foreground }]}>{temp}</Text>
    </View>
  );
}

function QuickAction({
  icon,
  label,
  onPress,
  colors,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.quickAction, { opacity: pressed ? 0.7 : 1 }]}>
      <View style={[styles.quickActionIcon, { backgroundColor: colors.secondary }]}>
        <Feather name={icon} size={19} color={colors.primary} />
      </View>
      <Text style={[styles.quickActionText, { color: colors.foreground }]}>{label}</Text>
    </Pressable>
  );
}

function MapPoint({
  label,
  x,
  y,
  active,
  colors,
  onPress,
}: {
  label: string;
  x: `${number}%`;
  y: `${number}%`;
  active: boolean;
  colors: ReturnType<typeof useColors>;
  onPress: (value: string) => void;
}) {
  return (
    <Pressable
      onPress={() => onPress(label)}
      style={({ pressed }) => [
        styles.mapPoint,
        { left: x, top: y, opacity: pressed ? 0.66 : 1 },
      ]}
      accessibilityLabel={`Show weather for ${label}`}
    >
      <View style={[styles.mapPin, { backgroundColor: active ? colors.coral : colors.card, borderColor: active ? colors.card : colors.primary }]}>
        <Feather name="map-pin" size={16} color={active ? colors.primaryForeground : colors.primary} />
      </View>
      <View style={[styles.mapLabel, { backgroundColor: colors.card }]}>
        <Text style={[styles.mapLabelText, { color: colors.foreground }]}>{label}</Text>
      </View>
    </Pressable>
  );
}

function answerFor(question: string) {
  const lower = question.toLowerCase();
  if (lower.includes('spray')) {
    return 'Yes, today looks suitable for spraying: light wind and only an 18% chance of rain. Finish before 4 PM and avoid the hottest part of the afternoon.';
  }
  if (lower.includes('rain')) {
    return 'Wednesday has the best chance of rain at about 60%. You can plan field work for today and tomorrow, then check again Wednesday morning.';
  }
  if (lower.includes('water')) {
    return 'Your cotton field can wait two more days. Water early in the morning, close to the roots, so less moisture is lost to the sun.';
  }
  return 'For Nashik today: warm, dry, and gently windy. It is a good day for field work. What crop would you like advice for?';
}

const styles = StyleSheet.create({
  app: { flex: 1 },
  headerRow: {
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eyebrow: { fontSize: 11, fontFamily: 'Inter_700Bold', letterSpacing: 1.4 },
  greeting: { fontSize: 28, fontFamily: 'Inter_700Bold', marginTop: 4, letterSpacing: -0.7 },
  avatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 22, marginTop: 8, marginBottom: 20 },
  locationText: { fontFamily: 'Inter_500Medium', fontSize: 13 },
  weatherHero: { marginHorizontal: 18, borderRadius: 26, padding: 22, minHeight: 218, overflow: 'hidden' },
  heroTopLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  todayPill: { backgroundColor: '#D9F2D5', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  todayPillText: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 0.9 },
  heroTemperature: { color: '#FFFFFF', fontFamily: 'Inter_700Bold', fontSize: 58, letterSpacing: -3, marginTop: 5 },
  heroCondition: { color: 'rgba(255,255,255,0.84)', fontFamily: 'Inter_500Medium', fontSize: 14, marginTop: -3 },
  heroDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.22)', marginVertical: 18 },
  heroStats: { flexDirection: 'row', justifyContent: 'space-between' },
  weatherStat: { flex: 1, gap: 3 },
  weatherStatValue: { color: '#FFFFFF', fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  weatherStatLabel: { color: 'rgba(255,255,255,0.66)', fontFamily: 'Inter_400Regular', fontSize: 11 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, marginTop: 27, marginBottom: 12 },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 17, letterSpacing: -0.2 },
  sectionAction: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  weekRow: { flexDirection: 'row', paddingHorizontal: 15, gap: 7 },
  dayWeather: { flex: 1, alignItems: 'center', paddingVertical: 11, borderRadius: 16, borderWidth: 1, borderColor: 'transparent', gap: 8 },
  dayLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  dayTemp: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  adviceCard: { marginHorizontal: 18, marginTop: 22, padding: 14, borderRadius: 19, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 11 },
  adviceIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
  adviceCopy: { flex: 1, gap: 3 },
  adviceKicker: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1 },
  adviceText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, lineHeight: 18 },
  quickActions: { flexDirection: 'row', paddingHorizontal: 18, gap: 10, marginTop: 19 },
  quickAction: { flex: 1, alignItems: 'center', gap: 8 },
  quickActionIcon: { width: 47, height: 47, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  quickActionText: { fontFamily: 'Inter_500Medium', fontSize: 11, textAlign: 'center', lineHeight: 15 },
  cropCard: { marginHorizontal: 18, borderRadius: 18, borderWidth: 1, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  cropIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cropCopy: { flex: 1, gap: 3 },
  cropTitle: { fontFamily: 'Inter_700Bold', fontSize: 14 },
  cropDetail: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  healthPill: { borderRadius: 9, paddingHorizontal: 9, paddingVertical: 6 },
  healthText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  pageTitle: { position: 'absolute', left: 18, right: 18, flexDirection: 'row', alignItems: 'center', gap: 11, zIndex: 4 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#173126', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  pageTitleText: { fontFamily: 'Inter_700Bold', fontSize: 20, letterSpacing: -0.3 },
  chatIntro: { marginHorizontal: 22, marginTop: 69, flexDirection: 'row', alignItems: 'center', gap: 11 },
  chatAvatar: { width: 48, height: 48, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  chatName: { fontFamily: 'Inter_700Bold', fontSize: 17 },
  onlineRow: { flexDirection: 'row', gap: 5, alignItems: 'center', marginTop: 4 },
  onlineDot: { width: 7, height: 7, borderRadius: 4 },
  onlineText: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  chatDate: { textAlign: 'center', fontFamily: 'Inter_600SemiBold', fontSize: 10, letterSpacing: 1, marginTop: 27, marginBottom: 15 },
  messageList: { paddingHorizontal: 18, gap: 11 },
  messageBubble: { maxWidth: '88%', borderRadius: 18, padding: 13, flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  assistantBubble: { alignSelf: 'flex-start', borderWidth: 1, borderBottomLeftRadius: 5 },
  userBubble: { alignSelf: 'flex-end', borderBottomRightRadius: 5 },
  miniBot: { width: 23, height: 23, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  messageText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 20 },
  typingBubble: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 18, padding: 13, flexDirection: 'row', gap: 9, alignItems: 'center' },
  typingText: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  askLabel: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.1, paddingHorizontal: 22, marginTop: 28, marginBottom: 9 },
  quickQuestionRow: { paddingHorizontal: 18, gap: 8 },
  questionChip: { flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10 },
  questionChipText: { fontFamily: 'Inter_500Medium', fontSize: 12 },
  chatComposer: { marginHorizontal: 18, marginTop: 22, borderRadius: 19, borderWidth: 1, padding: 6, flexDirection: 'row', alignItems: 'center', gap: 6 },
  chatInput: { flex: 1, minHeight: 40, paddingHorizontal: 10, fontFamily: 'Inter_400Regular', fontSize: 14 },
  micButton: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  sendButton: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  chatFootnote: { textAlign: 'center', fontFamily: 'Inter_400Regular', fontSize: 10, marginTop: 12, paddingHorizontal: 20 },
  mapSubtitle: { marginHorizontal: 22, marginTop: 69, marginBottom: 15, fontFamily: 'Inter_400Regular', fontSize: 13 },
  mapCard: { marginHorizontal: 18, height: Math.min(Dimensions.get('window').width * 0.95, 370), borderRadius: 24, borderWidth: 1, overflow: 'hidden', position: 'relative' },
  mapWaterShape: { position: 'absolute', width: '80%', height: '26%', borderRadius: 100, right: -35, top: 45, transform: [{ rotate: '-18deg' }] },
  mapRoad: { position: 'absolute', height: '140%', width: 4, top: -50, backgroundColor: 'transparent', borderLeftWidth: 2, transform: [{ rotate: '31deg' }] },
  roadOne: { left: '43%' },
  roadTwo: { left: '70%', transform: [{ rotate: '-49deg' }] },
  mapFieldShape: { position: 'absolute', width: 86, height: 56, borderRadius: 20, transform: [{ rotate: '17deg' }] },
  fieldOne: { left: '8%', top: '57%' },
  fieldTwo: { right: '6%', top: '21%', transform: [{ rotate: '-13deg' }] },
  fieldThree: { right: '17%', bottom: '13%', transform: [{ rotate: '21deg' }] },
  mapPoint: { position: 'absolute', alignItems: 'center', transform: [{ translateX: -30 }, { translateY: -23 }] },
  mapPin: { width: 35, height: 35, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 3 },
  mapLabel: { paddingHorizontal: 7, paddingVertical: 4, borderRadius: 8, marginTop: 3, shadowColor: '#173126', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  mapLabelText: { fontFamily: 'Inter_600SemiBold', fontSize: 10 },
  mapLegend: { position: 'absolute', left: 12, bottom: 12, borderRadius: 11, padding: 9, gap: 5, shadowColor: '#173126', shadowOpacity: 0.08, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  legendText: { fontFamily: 'Inter_500Medium', fontSize: 10 },
  zoomControls: { position: 'absolute', right: 12, bottom: 12, borderRadius: 11, paddingVertical: 5, paddingHorizontal: 7, gap: 5, alignItems: 'center', shadowColor: '#173126', shadowOpacity: 0.08, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  zoomDivider: { width: 18, height: 1 },
  layerRow: { flexDirection: 'row', paddingHorizontal: 18, gap: 8, marginTop: 13 },
  layerChip: { flex: 1, borderWidth: 1, borderRadius: 13, paddingVertical: 10, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5 },
  layerText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  mapDetailCard: { marginHorizontal: 18, marginTop: 16, padding: 13, borderRadius: 18, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 11 },
  detailWeatherIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  mapDetailCopy: { flex: 1, gap: 3 },
  mapDetailPlace: { fontFamily: 'Inter_700Bold', fontSize: 14 },
  mapDetailText: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  mapUpdated: { textAlign: 'center', fontFamily: 'Inter_400Regular', fontSize: 10, marginTop: 12 },
  communityHeader: { marginHorizontal: 22, marginTop: 69, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  communityLead: { fontFamily: 'Inter_700Bold', fontSize: 20, letterSpacing: -0.3 },
  communitySub: { fontFamily: 'Inter_400Regular', fontSize: 13, marginTop: 4 },
  addPostButton: { width: 43, height: 43, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  communityBanner: { marginHorizontal: 18, marginTop: 19, padding: 13, borderRadius: 17, flexDirection: 'row', alignItems: 'center', gap: 10 },
  bannerIcon: { width: 35, height: 35, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  bannerText: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 12, lineHeight: 17 },
  feedHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 22, marginTop: 25, marginBottom: 12 },
  nearbyPill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 5 },
  nearbyText: { fontFamily: 'Inter_600SemiBold', fontSize: 10 },
  feedLoading: { marginTop: 30 },
  postCard: { marginHorizontal: 18, borderWidth: 1, borderRadius: 19, padding: 14, marginBottom: 10 },
  postTopLine: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  postAvatar: { width: 36, height: 36, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  postInitials: { fontFamily: 'Inter_700Bold', fontSize: 11 },
  postIdentity: { flex: 1, gap: 3 },
  postName: { fontFamily: 'Inter_700Bold', fontSize: 13 },
  postTime: { fontFamily: 'Inter_400Regular', fontSize: 10 },
  cropTag: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8 },
  cropTagText: { fontFamily: 'Inter_600SemiBold', fontSize: 10 },
  postMessage: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19, marginTop: 13 },
  postActions: { flexDirection: 'row', alignItems: 'center', gap: 17, marginTop: 16, paddingTop: 11, borderTopWidth: 1, borderTopColor: '#EDF2EA' },
  postAction: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  postActionText: { fontFamily: 'Inter_500Medium', fontSize: 11 },
  emptyState: { marginHorizontal: 18, borderRadius: 19, borderWidth: 1, padding: 28, alignItems: 'center', gap: 8 },
  emptyTitle: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  emptyText: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  bottomNav: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-around', paddingTop: 8, shadowColor: '#173126', shadowOpacity: 0.07, shadowRadius: 10, shadowOffset: { width: 0, height: -3 }, elevation: 8 },
  navItem: { alignItems: 'center', minWidth: 65, gap: 3 },
  navIconWrap: { width: 38, height: 28, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  navLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 10 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(23,49,38,0.24)' },
  composer: { borderTopLeftRadius: 27, borderTopRightRadius: 27, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16 },
  composerHandle: { width: 38, height: 4, backgroundColor: '#DCE9D8', borderRadius: 2, alignSelf: 'center', marginBottom: 17 },
  composerTitle: { fontFamily: 'Inter_700Bold', fontSize: 19 },
  composerHint: { fontFamily: 'Inter_400Regular', fontSize: 13, marginTop: 4 },
  postInput: { minHeight: 110, borderRadius: 16, marginTop: 16, padding: 13, fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 20 },
  publishButton: { marginTop: 12, minHeight: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  publishText: { fontFamily: 'Inter_700Bold', fontSize: 13 },
});