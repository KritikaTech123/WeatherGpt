import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
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
  Image,
} from 'react-native';
import type { DimensionValue } from 'react-native';
import { KeyboardAvoidingView, KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { statePaths, mapBounds } from '@/assets/india-states-paths';

import * as Location from 'expo-location';

type Screen = 'home' | 'chat' | 'voice' | 'map' | 'community' | 'profile';
type IconName = React.ComponentProps<typeof Feather>['name'];
type CoreLanguage = 'English' | 'Hindi' | 'Marathi';
type Language =
  | 'English'
  | 'Assamese'
  | 'Bengali'
  | 'Bodo'
  | 'Dogri'
  | 'Gujarati'
  | 'Hindi'
  | 'Kannada'
  | 'Kashmiri'
  | 'Konkani'
  | 'Maithili'
  | 'Malayalam'
  | 'Manipuri'
  | 'Marathi'
  | 'Nepali'
  | 'Odia'
  | 'Punjabi'
  | 'Sanskrit'
  | 'Santali'
  | 'Sindhi'
  | 'Tamil'
  | 'Telugu'
  | 'Urdu';

type CommunityPost = {
  id: string;
  name: string;
  initials: string;
  time: string;
  message: string;
  crop: string;
  likes: number;
  liked?: boolean;
  photoUri?: string;
};

type ChatMessage = {
  id: string;
  role: 'assistant' | 'user';
  message: string;
};

type SimulatedCityWeather = {
  temperature: number;
  rain: number;
  wind: number;
  windDirection: string;
  humidity: number;
  advice: string;
};

const indiaWeatherSimulator: Record<string, Record<string, Record<string, SimulatedCityWeather>>> = {
  Maharashtra: {
    Nashik: {
      Nashik: { temperature: 28, rain: 18, wind: 12, windDirection: 'SW', humidity: 58, advice: 'Good spraying window before late afternoon.' },
      Dindori: { temperature: 26, rain: 34, wind: 9, windDirection: 'W', humidity: 66, advice: 'Watch clouds before spraying grapes.' },
    },
    Pune: {
      Pune: { temperature: 27, rain: 24, wind: 14, windDirection: 'W', humidity: 61, advice: 'Light irrigation is enough today.' },
      Baramati: { temperature: 30, rain: 9, wind: 16, windDirection: 'NW', humidity: 45, advice: 'Protect young plants from dry wind.' },
    },
  },
  Punjab: {
    Ludhiana: {
      Ludhiana: { temperature: 31, rain: 12, wind: 11, windDirection: 'NW', humidity: 51, advice: 'Check wheat soil moisture this evening.' },
      Khanna: { temperature: 30, rain: 15, wind: 10, windDirection: 'N', humidity: 55, advice: 'A calm morning suits field inspection.' },
    },
    Amritsar: {
      Amritsar: { temperature: 29, rain: 20, wind: 13, windDirection: 'NE', humidity: 60, advice: 'Delay fertilizer if clouds thicken.' },
      Ajnala: { temperature: 28, rain: 28, wind: 12, windDirection: 'E', humidity: 64, advice: 'Keep harvested grain covered.' },
    },
  },
  Karnataka: {
    Bengaluru: {
      Bengaluru: { temperature: 24, rain: 42, wind: 15, windDirection: 'SW', humidity: 72, advice: 'Rain is possible; avoid leaf spraying.' },
      Devanahalli: { temperature: 25, rain: 36, wind: 17, windDirection: 'W', humidity: 68, advice: 'Secure shade nets before stronger wind.' },
    },
    Mysuru: {
      Mysuru: { temperature: 27, rain: 31, wind: 10, windDirection: 'SW', humidity: 65, advice: 'Check drainage around vegetable beds.' },
      Nanjangud: { temperature: 28, rain: 27, wind: 8, windDirection: 'S', humidity: 63, advice: 'Morning is best for field work.' },
    },
  },
  'Uttar Pradesh': {
    Lucknow: {
      Lucknow: { temperature: 32, rain: 16, wind: 9, windDirection: 'E', humidity: 56, advice: 'Irrigate only where the topsoil is dry.' },
      Malihabad: { temperature: 31, rain: 22, wind: 8, windDirection: 'SE', humidity: 59, advice: 'Inspect mango leaves for moisture stress.' },
    },
    Varanasi: {
      Varanasi: { temperature: 33, rain: 25, wind: 12, windDirection: 'E', humidity: 62, advice: 'Plan heavy work before noon.' },
      Pindra: { temperature: 32, rain: 29, wind: 11, windDirection: 'SE', humidity: 64, advice: 'Keep a rain cover ready for produce.' },
    },
  },
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

type PlaceBranch = { state: string; districts: Record<string, string[]> };
const allIndiaPlaces: PlaceBranch[] = [
  { state: 'Andhra Pradesh', districts: { Krishna: ['Vijayawada'] } },
  { state: 'Arunachal Pradesh', districts: { 'Papum Pare': ['Itanagar'] } },
  { state: 'Assam', districts: { 'Kamrup Metropolitan': ['Guwahati'] } },
  { state: 'Bihar', districts: { Patna: ['Patna'] } },
  { state: 'Chhattisgarh', districts: { Raipur: ['Raipur'] } },
  { state: 'Goa', districts: { 'North Goa': ['Panaji'] } },
  { state: 'Gujarat', districts: { Ahmedabad: ['Ahmedabad'] } },
  { state: 'Haryana', districts: { Gurugram: ['Gurugram'] } },
  { state: 'Himachal Pradesh', districts: { Shimla: ['Shimla'] } },
  { state: 'Jharkhand', districts: { Ranchi: ['Ranchi'] } },
  { state: 'Kerala', districts: { Ernakulam: ['Kochi'] } },
  { state: 'Madhya Pradesh', districts: { Indore: ['Indore'] } },
  { state: 'Maharashtra', districts: { Nashik: ['Nashik', 'Dindori'], Pune: ['Pune', 'Baramati'] } },
  { state: 'Manipur', districts: { 'Imphal West': ['Imphal'] } },
  { state: 'Meghalaya', districts: { 'East Khasi Hills': ['Shillong'] } },
  { state: 'Mizoram', districts: { Aizawl: ['Aizawl'] } },
  { state: 'Nagaland', districts: { Kohima: ['Kohima'] } },
  { state: 'Odisha', districts: { Khordha: ['Bhubaneswar'] } },
  { state: 'Punjab', districts: { Ludhiana: ['Ludhiana', 'Khanna'], Amritsar: ['Amritsar', 'Ajnala'] } },
  { state: 'Rajasthan', districts: { Jaipur: ['Jaipur'] } },
  { state: 'Sikkim', districts: { 'East Sikkim': ['Gangtok'] } },
  { state: 'Tamil Nadu', districts: { Chennai: ['Chennai'] } },
  { state: 'Telangana', districts: { Hyderabad: ['Hyderabad'] } },
  { state: 'Tripura', districts: { 'West Tripura': ['Agartala'] } },
  { state: 'Uttar Pradesh', districts: { Lucknow: ['Lucknow', 'Malihabad'], Varanasi: ['Varanasi', 'Pindra'] } },
  { state: 'Uttarakhand', districts: { Dehradun: ['Dehradun'] } },
  { state: 'West Bengal', districts: { Kolkata: ['Kolkata'] } },
  { state: 'Andaman and Nicobar Islands', districts: { 'South Andaman': ['Port Blair'] } },
  { state: 'Chandigarh', districts: { Chandigarh: ['Chandigarh'] } },
  { state: 'Dadra and Nagar Haveli and Daman and Diu', districts: { Daman: ['Daman'] } },
  { state: 'Delhi', districts: { 'New Delhi': ['New Delhi'] } },
  { state: 'Jammu and Kashmir', districts: { Srinagar: ['Srinagar'] } },
  { state: 'Ladakh', districts: { Leh: ['Leh'] } },
  { state: 'Lakshadweep', districts: { Kavaratti: ['Kavaratti'] } },
  { state: 'Puducherry', districts: { Puducherry: ['Puducherry'] } },
];

const languageCatalog: { key: Language; nativeName: string; locale: string }[] = [
  { key: 'English', nativeName: 'English', locale: 'en-IN' },
  { key: 'Assamese', nativeName: 'অসমীয়া', locale: 'as-IN' },
  { key: 'Bengali', nativeName: 'বাংলা', locale: 'bn-IN' },
  { key: 'Bodo', nativeName: 'बड़ो', locale: 'brx-IN' },
  { key: 'Dogri', nativeName: 'डोगरी', locale: 'doi-IN' },
  { key: 'Gujarati', nativeName: 'ગુજરાતી', locale: 'gu-IN' },
  { key: 'Hindi', nativeName: 'हिंदी', locale: 'hi-IN' },
  { key: 'Kannada', nativeName: 'ಕನ್ನಡ', locale: 'kn-IN' },
  { key: 'Kashmiri', nativeName: 'कॉशुर', locale: 'ks-IN' },
  { key: 'Konkani', nativeName: 'कोंकणी', locale: 'kok-IN' },
  { key: 'Maithili', nativeName: 'मैथिली', locale: 'mai-IN' },
  { key: 'Malayalam', nativeName: 'മലയാളം', locale: 'ml-IN' },
  { key: 'Manipuri', nativeName: 'মৈতৈলোন্', locale: 'mni-IN' },
  { key: 'Marathi', nativeName: 'मराठी', locale: 'mr-IN' },
  { key: 'Nepali', nativeName: 'नेपाली', locale: 'ne-IN' },
  { key: 'Odia', nativeName: 'ଓଡ଼ିଆ', locale: 'or-IN' },
  { key: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', locale: 'pa-IN' },
  { key: 'Sanskrit', nativeName: 'संस्कृतम्', locale: 'sa-IN' },
  { key: 'Santali', nativeName: 'ᱥᱟᱱᱛᱟᱲᱤ', locale: 'sat-IN' },
  { key: 'Sindhi', nativeName: 'سنڌي', locale: 'sd-IN' },
  { key: 'Tamil', nativeName: 'தமிழ்', locale: 'ta-IN' },
  { key: 'Telugu', nativeName: 'తెలుగు', locale: 'te-IN' },
  { key: 'Urdu', nativeName: 'اردو', locale: 'ur-IN' },
];

const translations = {
  English: {
    home: {
      eyebrow: 'GOOD MORNING',
      greeting: 'Namaste',
      location: 'Nashik, Maharashtra',
      today: 'TODAY',
      condition: 'Warm with a gentle breeze',
      sunrise: 'Sunrise',
      rainChance: 'Rain chance',
      wind: 'Wind',
      dayAtGlance: 'Your day at a glance',
      seeWeek: 'See week',
      fieldTip: 'TODAY’S SIMPLE ADVICE',
      fieldTipText: 'A comfortable day for outdoor plans. Rain is unlikely before late afternoon.',
      askWeather: 'Ask WeatherGPT',
      openMap: 'Open field map',
      askFarmers: 'Ask community',
      thisWeek: 'Your local outlook',
      cottonField: 'Outdoor conditions',
      waterIn: 'Comfortable through the afternoon',
      healthy: 'Healthy',
    },
    chat: {
      title: 'Weather guide',
      welcome: 'Namaste! I’m here to help you plan around the weather. Ask me about rain, watering, spraying, or your crop.',
      ready: 'Ready to help',
      today: 'TODAY, 9:41 AM',
      tryAsking: 'TRY ASKING',
      quickQuestions: [
        { label: 'Can I spray today?', icon: 'droplet' as IconName },
        { label: 'Will it rain this week?', icon: 'cloud-rain' as IconName },
        { label: 'When should I water?', icon: 'sun' as IconName },
      ],
      placeholder: 'Ask about your farm',
      listening: 'Listening…',
      askByVoice: 'Ask by voice',
      stopListening: 'Stop listening',
      sendQuestion: 'Send question',
      thinking: 'Thinking about your field…',
      footnote: 'Weather guidance is a helper, not a replacement for local expert advice.',
      voiceTitle: 'Your weather, out loud',
      voiceDescription: 'Listen to a short briefing about today’s conditions and your field.',
      playBriefing: 'Play weather briefing',
      stopBriefing: 'Stop briefing',
      askAndHear: 'Ask and hear the answer',
      sprayAnswer: 'Yes, today looks suitable for spraying: light wind and only an 18% chance of rain. Finish before 4 PM and avoid the hottest part of the afternoon.',
      rainAnswer: 'Wednesday has the best chance of rain at about 60%. You can plan field work for today and tomorrow, then check again Wednesday morning.',
      waterAnswer: 'Your cotton field can wait two more days. Water early in the morning, close to the roots, so less moisture is lost to the sun.',
      generalAnswer: 'For Nashik today: warm, dry, and gently windy. It is a good day for field work. What crop would you like advice for?',
    },
    map: {
      title: 'Field map',
      subtitle: 'Tap a place to see its weather and field advice.',
      simulatorTitle: 'INDIA WEATHER MAP SIMULATOR',
      simulatorText: 'Demo forecasts for learning and planning',
      stateStep: '1. State',
      districtStep: '2. District',
      cityStep: '3. City',
      districtSuffix: 'district',
      selectOnMap: 'select on India map',
      rainChance: 'rain chance',
      windFrom: 'from',
      humidity: 'Humidity',
      simulatorOnly: 'Simulator data • not a live forecast',
      yourFarm: 'Your farm',
      dindori: 'Dindori',
      sinnar: 'Sinnar',
      lightRain: 'Light rain',
      clear: 'Clear',
      rain: 'Rain',
      wind: 'Wind',
      fields: 'Fields',
      rainDetail: '18% rain chance · Good field day',
      windDetail: '12 km/h · Gentle breeze',
      fieldsDetail: 'Cotton and tomato fields',
      updated: 'Updated 6 minutes ago · Based on local forecast',
    },
    community: {
      title: 'Farmer interaction',
      lead: 'Learn from the field',
      sub: 'Local questions, trusted farmer tips.',
      share: 'Share with farmers',
      shareHint: 'Ask a question or share a tip from your field.',
      placeholder: 'What would you like to share?',
      post: 'Post to community',
      addMoreTitle: 'Add a little more',
      addMoreMessage: 'Write a question or tip for your farmer friends.',
      banner: 'Be kind, share what works, and help a farmer nearby.',
      conversations: 'Nearby conversations',
      nearby: 'Nashik',
      reply: 'Reply',
      justNow: 'Just now',
      you: 'You',
      myField: 'My field',
      emptyTitle: 'Start the first conversation',
      emptyText: 'Share a question or tip from your field.',
    },
    nav: { today: 'Today', ask: 'Ask', voice: 'Voice', map: 'Map', farmers: 'Community', profile: 'Profile' },
    profile: {
      title: 'Farmer Profile',
      location: 'Farm Location',
      locationOn: 'GPS Active',
      locationOff: 'Enable GPS',
      locationError: 'Location off',
      locationPrompt: 'We use location to give precise weather for your field.',
      grantLocation: 'Grant Location Access',
      daily: 'Daily Streak',
      streakDays: '4 Days',
      streakHint: 'Open daily for field tips',
      dailyAction: 'Complete today’s field check',
      dailyDone: 'Today’s field check is complete',
      farmDetails: 'My Farm',
      farmSize: 'Size: 12 Acres',
      mainCrop: 'Crop: Cotton',
      soilType: 'Soil: Black Cotton',
      logout: 'Sign Out',
    },
    language: {
      title: 'Choose your language',
      hint: 'Choose the app language. Voice playback supports all 22 Indian languages.',
      english: 'English',
      hindi: 'हिंदी',
      marathi: 'मराठी',
    },
    common: { back: 'Back to today', profile: 'View farmer profile' },
  },
  Hindi: {
    home: {
      eyebrow: 'सुप्रभात',
      greeting: 'नमस्ते',
      location: 'नासिक, महाराष्ट्र',
      today: 'आज',
      condition: 'गर्म मौसम और हल्की हवा',
      sunrise: 'सूर्योदय',
      rainChance: 'बारिश की संभावना',
      wind: 'हवा',
      dayAtGlance: 'आज का मौसम एक नज़र में',
      seeWeek: 'पूरा सप्ताह',
      fieldTip: 'खेत की सलाह',
      fieldTipText: 'आज दवा छिड़कने और खेत में काम करने के लिए अच्छा दिन है।',
      askWeather: 'WeatherGPT से पूछें',
      openMap: 'खेत का नक्शा',
      askFarmers: 'समुदाय से पूछें',
      thisWeek: 'इस सप्ताह आपके खेत पर',
      cottonField: 'कपास का खेत',
      waterIn: '2 दिन बाद पानी दें',
      healthy: 'स्वस्थ',
    },
    chat: {
      title: 'मौसम सहायक',
      welcome: 'नमस्ते! मौसम के हिसाब से योजना बनाने में मैं आपकी मदद करूँगा। बारिश, पानी, दवा या फसल के बारे में पूछें।',
      ready: 'मदद के लिए तैयार',
      today: 'आज, सुबह 9:41',
      tryAsking: 'ऐसा पूछें',
      quickQuestions: [
        { label: 'क्या आज दवा छिड़कें?', icon: 'droplet' as IconName },
        { label: 'इस सप्ताह बारिश होगी?', icon: 'cloud-rain' as IconName },
        { label: 'पानी कब दें?', icon: 'sun' as IconName },
      ],
      placeholder: 'अपने खेत के बारे में पूछें',
      listening: 'सुन रहा हूँ…',
      askByVoice: 'आवाज़ से पूछें',
      stopListening: 'सुनना बंद करें',
      sendQuestion: 'सवाल भेजें',
      thinking: 'आपके खेत के बारे में सोच रहा हूँ…',
      footnote: 'मौसम की सलाह मदद के लिए है, स्थानीय विशेषज्ञ की जगह नहीं।',
      voiceTitle: 'मौसम की आवाज़',
      voiceDescription: 'आज के मौसम और अपने खेत की छोटी सलाह सुनें।',
      playBriefing: 'मौसम की सलाह सुनें',
      stopBriefing: 'सलाह रोकें',
      askAndHear: 'पूछें और जवाब सुनें',
      sprayAnswer: 'हाँ, आज दवा छिड़कने के लिए अच्छा दिन है। हवा हल्की है और बारिश की संभावना केवल 18% है। दोपहर 4 बजे से पहले काम पूरा करें।',
      rainAnswer: 'बुधवार को बारिश की संभावना सबसे अधिक, लगभग 60% है। आज और कल खेत का काम कर सकते हैं, फिर बुधवार सुबह दोबारा देखें।',
      waterAnswer: 'आपका कपास का खेत दो दिन और रुक सकता है। सुबह जल्दी जड़ों के पास पानी दें, इससे धूप में नमी कम नहीं होगी।',
      generalAnswer: 'आज नासिक में मौसम गर्म, सूखा और हल्की हवा वाला है। खेत में काम करने के लिए अच्छा दिन है। आप किस फसल के बारे में पूछना चाहते हैं?',
    },
    map: {
      title: 'खेत का नक्शा',
      subtitle: 'मौसम और खेत की सलाह के लिए जगह पर टैप करें।',
      simulatorTitle: 'भारत मौसम नक्शा सिम्युलेटर',
      simulatorText: 'सीखने और योजना बनाने के लिए नमूना पूर्वानुमान',
      stateStep: '1. राज्य',
      districtStep: '2. जिला',
      cityStep: '3. शहर',
      districtSuffix: 'जिला',
      selectOnMap: 'भारत के नक्शे पर चुनें',
      rainChance: 'बारिश की संभावना',
      windFrom: 'दिशा',
      humidity: 'नमी',
      simulatorOnly: 'सिम्युलेटर डेटा • लाइव पूर्वानुमान नहीं',
      yourFarm: 'आपका खेत',
      dindori: 'दिंडोरी',
      sinnar: 'सिन्नर',
      lightRain: 'हल्की बारिश',
      clear: 'साफ मौसम',
      rain: 'बारिश',
      wind: 'हवा',
      fields: 'खेत',
      rainDetail: '18% बारिश की संभावना · खेत के लिए अच्छा दिन',
      windDetail: '12 किमी/घंटा · हल्की हवा',
      fieldsDetail: 'कपास और टमाटर के खेत',
      updated: '6 मिनट पहले अपडेट · स्थानीय पूर्वानुमान के आधार पर',
    },
    community: {
      title: 'किसान संपर्क',
      lead: 'खेत से सीखें',
      sub: 'स्थानीय सवाल और भरोसेमंद किसान सलाह।',
      share: 'किसानों के साथ साझा करें',
      shareHint: 'अपने खेत का सवाल पूछें या सलाह साझा करें।',
      placeholder: 'आप क्या साझा करना चाहते हैं?',
      post: 'समुदाय में पोस्ट करें',
      addMoreTitle: 'थोड़ा और लिखें',
      addMoreMessage: 'अपने किसान साथियों के लिए सवाल या सलाह लिखें।',
      banner: 'दयालु रहें, उपयोगी बातें साझा करें और पास के किसान की मदद करें।',
      conversations: 'आस-पास की बातचीत',
      nearby: 'नासिक',
      reply: 'जवाब दें',
      justNow: 'अभी',
      you: 'आप',
      myField: 'मेरा खेत',
      emptyTitle: 'पहली बातचीत शुरू करें',
      emptyText: 'अपने खेत का सवाल या सलाह साझा करें।',
    },
    nav: { today: 'आज', ask: 'पूछें', voice: 'आवाज़', map: 'नक्शा', farmers: 'समुदाय', profile: 'प्रोफ़ाइल' },
    profile: {
      title: 'किसान प्रोफ़ाइल',
      location: 'खेत का स्थान',
      locationOn: 'GPS चालू',
      locationOff: 'GPS चालू करें',
      locationError: 'स्थान बंद',
      locationPrompt: 'हम आपके खेत के लिए सटीक मौसम देने के लिए स्थान का उपयोग करते हैं।',
      grantLocation: 'स्थान की अनुमति दें',
      daily: 'दैनिक स्ट्रीक',
      streakDays: '4 दिन',
      streakHint: 'सलाह के लिए रोज़ खोलें',
      dailyAction: 'आज खेत की जाँच पूरी करें',
      dailyDone: 'आज खेत की जाँच पूरी हुई',
      farmDetails: 'मेरा खेत',
      farmSize: 'आकार: 12 एकड़',
      mainCrop: 'फसल: कपास',
      soilType: 'मिट्टी: काली कपास',
      logout: 'लॉग आउट',
    },
    language: {
      title: 'भाषा चुनें',
      hint: 'ऐप की भाषा चुनें। आवाज़ में भारत की सभी 22 भाषाएँ उपलब्ध हैं।',
      english: 'English',
      hindi: 'हिंदी',
      marathi: 'मराठी',
    },
    common: { back: 'आज पर वापस', profile: 'किसान प्रोफ़ाइल देखें' },
  },
  Marathi: {
    home: {
      eyebrow: 'शुभ सकाळ',
      greeting: 'नमस्कार',
      location: 'नाशिक, महाराष्ट्र',
      today: 'आज',
      condition: 'उबदार हवामान आणि हलका वारा',
      sunrise: 'सूर्योदय',
      rainChance: 'पावसाची शक्यता',
      wind: 'वारा',
      dayAtGlance: 'आजचा हवामान अंदाज',
      seeWeek: 'आठवड्याचा अंदाज',
      fieldTip: 'शेतातील सल्ला',
      fieldTipText: 'आज फवारणी आणि शेतातील कामासाठी चांगला दिवस आहे.',
      askWeather: 'WeatherGPT ला विचारा',
      openMap: 'शेताचा नकाशा',
      askFarmers: 'समुदायाला विचारा',
      thisWeek: 'या आठवड्यात तुमच्या शेतावर',
      cottonField: 'कापसाचे शेत',
      waterIn: '2 दिवसांनी पाणी द्या',
      healthy: 'निरोगी',
    },
    chat: {
      title: 'हवामान मार्गदर्शक',
      welcome: 'नमस्कार! हवामानानुसार नियोजन करण्यास मी मदत करतो. पाऊस, पाणी, फवारणी किंवा पिकाबद्दल विचारा.',
      ready: 'मदतीसाठी तयार',
      today: 'आज, सकाळी 9:41',
      tryAsking: 'असे विचारा',
      quickQuestions: [
        { label: 'आज फवारणी करू का?', icon: 'droplet' as IconName },
        { label: 'या आठवड्यात पाऊस येईल?', icon: 'cloud-rain' as IconName },
        { label: 'पाणी कधी द्यावे?', icon: 'sun' as IconName },
      ],
      placeholder: 'तुमच्या शेताबद्दल विचारा',
      listening: 'ऐकत आहे…',
      askByVoice: 'आवाजाने विचारा',
      stopListening: 'ऐकणे थांबवा',
      sendQuestion: 'प्रश्न पाठवा',
      thinking: 'तुमच्या शेताचा विचार करत आहे…',
      footnote: 'हवामान सल्ला मदतीसाठी आहे, स्थानिक तज्ज्ञांचा पर्याय नाही.',
      voiceTitle: 'तुमचे हवामान, आवाजात',
      voiceDescription: 'आजच्या हवामानाची आणि तुमच्या शेताची छोटी माहिती ऐका.',
      playBriefing: 'हवामान सल्ला ऐका',
      stopBriefing: 'सल्ला थांबवा',
      askAndHear: 'विचारा आणि उत्तर ऐका',
      sprayAnswer: 'होय, आज फवारणीसाठी चांगला दिवस आहे. वारा हलका आहे आणि पावसाची शक्यता फक्त 18% आहे. दुपारी 4 पूर्वी काम पूर्ण करा.',
      rainAnswer: 'बुधवारी पावसाची शक्यता सुमारे 60% आहे. आज आणि उद्या शेतातील काम करा, नंतर बुधवारी सकाळी पुन्हा अंदाज पाहा.',
      waterAnswer: 'तुमच्या कापसाच्या शेताला आणखी दोन दिवस पाणी देण्याची गरज नाही. सकाळी लवकर मुळांजवळ पाणी द्या.',
      generalAnswer: 'आज नाशिकमध्ये हवामान उबदार, कोरडे आणि हलक्या वाऱ्याचे आहे. शेतातील कामासाठी चांगला दिवस आहे. कोणत्या पिकाबद्दल सल्ला हवा?',
    },
    map: {
      title: 'शेताचा नकाशा',
      subtitle: 'हवामान आणि शेतातील सल्ल्यासाठी ठिकाणावर टॅप करा.',
      simulatorTitle: 'भारत हवामान नकाशा सिम्युलेटर',
      simulatorText: 'शिकण्यासाठी आणि नियोजनासाठी नमुना अंदाज',
      stateStep: '1. राज्य',
      districtStep: '2. जिल्हा',
      cityStep: '3. शहर',
      districtSuffix: 'जिल्हा',
      selectOnMap: 'भारताच्या नकाशावर निवडा',
      rainChance: 'पावसाची शक्यता',
      windFrom: 'दिशा',
      humidity: 'आर्द्रता',
      simulatorOnly: 'सिम्युलेटर डेटा • थेट हवामान अंदाज नाही',
      yourFarm: 'तुमचे शेत',
      dindori: 'दिंडोरी',
      sinnar: 'सिन्नर',
      lightRain: 'हलका पाऊस',
      clear: 'निरभ्र',
      rain: 'पाऊस',
      wind: 'वारा',
      fields: 'शेते',
      rainDetail: '18% पावसाची शक्यता · शेतासाठी चांगला दिवस',
      windDetail: '12 किमी/ता · हलका वारा',
      fieldsDetail: 'कापूस आणि टोमॅटोची शेते',
      updated: '6 मिनिटांपूर्वी अपडेट · स्थानिक अंदाजावर आधारित',
    },
    community: {
      title: 'शेतकरी संवाद',
      lead: 'शेतातून शिका',
      sub: 'स्थानिक प्रश्न आणि विश्वासू शेतकरी सल्ले.',
      share: 'शेतकऱ्यांसोबत शेअर करा',
      shareHint: 'तुमच्या शेतातील प्रश्न विचारा किंवा सल्ला शेअर करा.',
      placeholder: 'तुम्हाला काय शेअर करायचे आहे?',
      post: 'समुदायात पोस्ट करा',
      addMoreTitle: 'थोडे अधिक लिहा',
      addMoreMessage: 'तुमच्या शेतकरी मित्रांसाठी प्रश्न किंवा सल्ला लिहा.',
      banner: 'चांगले बोला, उपयोगी गोष्टी शेअर करा आणि जवळच्या शेतकऱ्याला मदत करा.',
      conversations: 'जवळचे संवाद',
      nearby: 'नाशिक',
      reply: 'उत्तर द्या',
      justNow: 'आत्ताच',
      you: 'तुम्ही',
      myField: 'माझे शेत',
      emptyTitle: 'पहिला संवाद सुरू करा',
      emptyText: 'तुमच्या शेतातील प्रश्न किंवा सल्ला शेअर करा.',
    },
    nav: { today: 'आज', ask: 'विचारा', voice: 'आवाज', map: 'नकाशा', farmers: 'समुदाय', profile: 'प्रोफाइल' },
    profile: {
      title: 'शेतकरी प्रोफाइल',
      location: 'शेताचे ठिकाण',
      locationOn: 'GPS चालू',
      locationOff: 'GPS चालू करा',
      locationError: 'स्थान बंद',
      locationPrompt: 'आम्ही तुमच्या शेतासाठी अचूक हवामान देण्यासाठी स्थानाचा वापर करतो.',
      grantLocation: 'स्थानाची परवानगी द्या',
      daily: 'दैनिक स्ट्रीक',
      streakDays: '4 दिवस',
      streakHint: 'सल्ल्यासाठी रोज उघडा',
      dailyAction: 'आजची शेत तपासणी पूर्ण करा',
      dailyDone: 'आजची शेत तपासणी पूर्ण झाली',
      farmDetails: 'माझे शेत',
      farmSize: 'आकार: 12 एकर',
      mainCrop: 'पीक: कापूस',
      soilType: 'माती: काळी कापूस',
      logout: 'लॉग आउट',
    },
    language: {
      title: 'भाषा निवडा',
      hint: 'अॅपची भाषा निवडा. आवाजात भारतातील सर्व 22 भाषा उपलब्ध आहेत.',
      english: 'English',
      hindi: 'हिंदी',
      marathi: 'मराठी',
    },
    common: { back: 'आजवर परत', profile: 'शेतकरी प्रोफाइल पहा' },
  },
} satisfies Record<CoreLanguage, object>;

type Copy = (typeof translations)[CoreLanguage];

const getCopy = (language: Language): Copy => {
  if (language === 'Hindi' || language === 'Marathi') return translations[language];
  return translations.English;
};

const localTranslationPreview = (message: string, target: Language) => {
  if (target === 'English') return message;
  const phraseReplacements: Partial<Record<Language, Array<[RegExp, string]>>> = {
    Hindi: [[/rain/gi, 'बारिश'], [/weather/gi, 'मौसम'], [/field/gi, 'खेत'], [/water/gi, 'पानी'], [/farmer/gi, 'किसान']],
    Marathi: [[/rain/gi, 'पाऊस'], [/weather/gi, 'हवामान'], [/field/gi, 'शेत'], [/water/gi, 'पाणी'], [/farmer/gi, 'शेतकरी']],
  };
  const replacements = phraseReplacements[target];
  if (!replacements) {
    const name = languageCatalog.find((item) => item.key === target)?.nativeName ?? target;
    return `${name}: Full sentence translation needs an online translation service. This offline panel keeps the original safe: ${message}`;
  }
  return replacements.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), message);
};

const hasDisrespectfulLanguage = (message: string) =>
  /\b(idiot|stupid|hate|useless|shut up|fool)\b|बेवकूफ|मूर्ख|गाली|नालायक|मूर्खपणा/i.test(message);

async function withTimeout<T>(promise: Promise<T>, milliseconds: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), milliseconds)),
  ]);
}

const starterMessages = (copy: Copy): ChatMessage[] => [
  { id: 'welcome', role: 'assistant', message: copy.chat.welcome },
];

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [screen, setScreen] = useState<Screen>('home');
  const [language, setLanguage] = useState<Language>('English');
  const [posts, setPosts] = useState<CommunityPost[]>(initialPosts);
  const [chat, setChat] = useState<ChatMessage[]>(starterMessages(translations.English));
  const [question, setQuestion] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showPostComposer, setShowPostComposer] = useState(false);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [newPost, setNewPost] = useState('');
  const [selectedMapPoint, setSelectedMapPoint] = useState('Your farm');
  const [mapLayer, setMapLayer] = useState<'rain' | 'wind' | 'fields'>('rain');
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const copy = getCopy(language);
  const selectedLanguage = languageCatalog.find((item) => item.key === language) ?? languageCatalog[0];
  const [voiceQuestion, setVoiceQuestion] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [locationState, setLocationState] = useState<'prompt' | 'loading' | 'granted' | 'denied'>('prompt');
  const [geoLabel, setGeoLabel] = useState<string | null>(null);
  const [dailyCheckDone, setDailyCheckDone] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showTodayForecast, setShowTodayForecast] = useState(false);
  const [placeSelection, setPlaceSelection] = useState({ state: 'Maharashtra', district: 'Nashik', city: 'Nashik' });
  const [expandedPlace, setExpandedPlace] = useState<string | null>('Maharashtra');
  const [photoUri, setPhotoUri] = useState<string | undefined>();
  const [isVoicePostListening, setIsVoicePostListening] = useState(false);
  const postNeedsKindness = hasDisrespectfulLanguage(newPost);

  const loadCurrentLocation = async () => {
    const position =
      (await Location.getLastKnownPositionAsync().catch(() => null)) ??
      (await withTimeout(
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => null),
        6000,
      ));
    if (!position) {
      setGeoLabel('Location available, waiting for GPS fix');
      return;
    }
    if (Platform.OS === 'web') {
      setGeoLabel(`${position.coords.latitude.toFixed(2)}, ${position.coords.longitude.toFixed(2)}`);
      return;
    }
    const geo = await Location.reverseGeocodeAsync(position.coords).catch(() => null);
    const place = geo?.[0];
    setGeoLabel(
      place
        ? [place.city || place.district || place.subregion, place.region].filter(Boolean).join(', ')
        : `${position.coords.latitude.toFixed(2)}, ${position.coords.longitude.toFixed(2)}`,
    );
  };

  useEffect(() => {
    AsyncStorage.getItem('weathergpt-community-posts')
      .then((saved) => {
        if (saved) setPosts(JSON.parse(saved) as CommunityPost[]);
      })
      .catch(() => undefined)
      .finally(() => setIsLoadingPosts(false));
  }, []);

  useEffect(() => {
    const todayKey = new Date().toISOString().slice(0, 10);
    AsyncStorage.getItem('weathergpt-daily-field-check')
      .then((savedDate) => setDailyCheckDone(savedDate === todayKey))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!isLoadingPosts) {
      AsyncStorage.setItem('weathergpt-community-posts', JSON.stringify(posts)).catch(
        () => undefined,
      );
    }
  }, [isLoadingPosts, posts]);

  useEffect(() => () => {
    Speech.stop();
  }, []);

  useEffect(() => {
    Location.getForegroundPermissionsAsync().then((res) => {
      if (res.granted) {
        setLocationState('granted');
        loadCurrentLocation().catch(() => undefined);
      } else if (!res.canAskAgain) {
        setLocationState('denied');
      }
    });
  }, []);

  const requestLocation = async () => {
    setLocationState('loading');
    const permission = await withTimeout(Location.requestForegroundPermissionsAsync(), 6000).catch(() => null);
    if (!permission?.granted) {
      setLocationState('denied');
      return;
    }
    setLocationState('granted');
    await loadCurrentLocation().catch(() => {
      setGeoLabel('GPS is on, but a location fix is not available yet');
    });
  };

  const completeDailyCheck = () => {
    const todayKey = new Date().toISOString().slice(0, 10);
    setDailyCheckDone(true);
    AsyncStorage.setItem('weathergpt-daily-field-check', todayKey).catch(() => undefined);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  };

  const activeTitle = useMemo(() => {
    if (screen === 'chat') return copy.chat.title;
    if (screen === 'voice') return copy.chat.voiceTitle;
    if (screen === 'map') return copy.map.title;
    if (screen === 'community') return copy.community.title;
    if (screen === 'profile') return copy.profile.title;
    return '';
  }, [copy, screen]);

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
          message: answerFor(trimmed, copy, placeSelection),
        },
      ]);
      setIsSending(false);
    }, 550);
  };

  const toggleListening = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    setScreen('voice');
    setIsListening(false);
  };

  const changeLanguage = (next: Language) => {
    setLanguage(next);
    setShowLanguagePicker(false);
    setIsListening(false);
    setQuestion('');
    setChat((current) =>
      current.length === 1 ? starterMessages(getCopy(next)) : current,
    );
    Haptics.selectionAsync().catch(() => undefined);
  };

  const speakBriefing = () => {
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
      return;
    }
    setIsSpeaking(true);
    Speech.speak(copy.chat.generalAnswer, {
      language: selectedLanguage.locale,
      rate: 0.88,
      onDone: () => setIsSpeaking(false),
      onStopped: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  };

  const askAndHear = () => {
    const trimmed = voiceQuestion.trim();
    if (!trimmed || isSending) return;
    setVoiceQuestion('');
    setScreen('chat');
    sendQuestion(trimmed);
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
      Alert.alert(copy.community.addMoreTitle, copy.community.addMoreMessage);
      return;
    }
    if (hasDisrespectfulLanguage(trimmed)) {
      Alert.alert('Please rephrase kindly', 'This community is for helpful, respectful conversations. Please remove hurtful language before posting.');
      return;
    }
    const post: CommunityPost = {
      id: `${Date.now()}`,
      name: copy.community.you,
      initials: 'YO',
      time: copy.community.justNow,
      message: trimmed,
      crop: copy.community.myField,
      likes: 0,
      photoUri,
    };
    setPosts((current) => [post, ...current]);
    setNewPost('');
    setPhotoUri(undefined);
    setIsVoicePostListening(false);
    setShowPostComposer(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => undefined,
    );
  };

  return (
    <View style={[styles.app, { backgroundColor: colors.background }]}>
      <KeyboardAwareScrollView
        bounces={false}
        directionalLockEnabled={true}
        overScrollMode="never"
        bottomOffset={20}
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
            copy={copy}
            onChat={() => selectScreen('chat')}
            onMap={() => selectScreen('map')}
            onCommunity={() => selectScreen('community')}
            onProfile={() => selectScreen('profile')}
            onLocation={() => setShowLocationPicker(true)}
            onToday={() => setShowTodayForecast(true)}
            onVoice={() => selectScreen('voice')}
            locationLabel={`${placeSelection.city}, ${placeSelection.state}`}
          />
        ) : screen === 'chat' ? (
          <ChatView
            colors={colors}
            copy={copy}
            messages={chat}
            question={question}
            isSending={isSending}
            isListening={isListening}
            onQuestionChange={setQuestion}
            onSend={() => sendQuestion()}
            onQuickQuestion={sendQuestion}
            onListen={toggleListening}
          />
        ) : screen === 'voice' ? (
          <VoiceView
            colors={colors}
            copy={copy}
            language={language}
            languageName={selectedLanguage.nativeName}
            isSpeaking={isSpeaking}
            question={voiceQuestion}
            onQuestionChange={setVoiceQuestion}
            onSpeak={speakBriefing}
            onAsk={askAndHear}
            onLanguage={() => setShowLanguagePicker(true)}
          />
        ) : screen === 'map' ? (
          <MapView
            colors={colors}
            copy={copy}
            language={language}
            selectedPoint={selectedMapPoint}
            layer={mapLayer}
            onSelectPoint={setSelectedMapPoint}
            onSelectLayer={setMapLayer}
          />
        ) : screen === 'community' ? (
          <CommunityView
            colors={colors}
            copy={copy}
            posts={posts}
            isLoading={isLoadingPosts}
            onLike={toggleLike}
            onAdd={() => setShowPostComposer(true)}
          />
        ) : (
          <ProfileView
            colors={colors}
            copy={copy}
            locationState={locationState}
            geoLabel={geoLabel}
            dailyCheckDone={dailyCheckDone}
            onRequestLocation={requestLocation}
            onCompleteDailyCheck={completeDailyCheck}
            onLanguage={() => setShowLanguagePicker(true)}
          />
        )}
      </KeyboardAwareScrollView>

      {screen !== 'home' ? (
        <View style={[styles.pageTitle, { top: Math.max(insets.top, Platform.OS === 'web' ? 67 : 16) }]}>
          <Pressable
            onPress={() => selectScreen('home')}
            accessibilityLabel={copy.common.back}
            hitSlop={12}
            style={({ pressed }) => [styles.backButton, { opacity: pressed ? 0.65 : 1 }]}
          >
            <Feather name="arrow-left" size={20} color={colors.leafDark} />
          </Pressable>
          <Text style={[styles.pageTitleText, { color: colors.foreground }]}>{activeTitle}</Text>
        </View>
      ) : null}

      <BottomNav colors={colors} copy={copy} active={screen} onSelect={selectScreen} insets={insets} />

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
            <Text style={[styles.composerTitle, { color: colors.foreground }]}>{copy.community.share}</Text>
            <Text style={[styles.composerHint, { color: colors.mutedForeground }]}>
              {copy.community.shareHint}
            </Text>
            <TextInput
              autoFocus
              multiline
              value={newPost}
              onChangeText={setNewPost}
              placeholder={copy.community.placeholder}
              placeholderTextColor={colors.mutedForeground}
              style={[styles.postInput, { backgroundColor: colors.muted, color: colors.foreground }]}
              textAlignVertical="top"
            />
            <View style={styles.composerTools}>
              <Pressable
                onPress={async () => {
                  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
                  if (!permission.granted) return;
                  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.82 });
                  if (!result.canceled) setPhotoUri(result.assets[0]?.uri);
                }}
                style={[styles.toolButton, { backgroundColor: colors.secondary }]}
              >
                <Feather name="image" size={17} color={colors.primary} />
                <Text style={[styles.toolButtonText, { color: colors.primary }]}>Add photo</Text>
              </Pressable>
              <Pressable
                onPress={() => setIsVoicePostListening((value) => !value)}
                style={[styles.toolButton, { backgroundColor: isVoicePostListening ? colors.coral : colors.secondary }]}
              >
                <Feather name={isVoicePostListening ? 'square' : 'mic'} size={17} color={isVoicePostListening ? colors.primaryForeground : colors.primary} />
                <Text style={[styles.toolButtonText, { color: isVoicePostListening ? colors.primaryForeground : colors.primary }]}>
                  {isVoicePostListening ? 'Listening…' : 'Voice input'}
                </Text>
              </Pressable>
            </View>
            {photoUri ? (
              <View style={styles.composerPreview}>
                <Image source={{ uri: photoUri }} style={styles.previewImage} />
                <Pressable onPress={() => setPhotoUri(undefined)} style={[styles.removePhoto, { backgroundColor: colors.card }]}>
                  <Feather name="x" size={16} color={colors.foreground} />
                </Pressable>
              </View>
            ) : null}
            <Text style={[styles.respectStatus, { color: postNeedsKindness ? colors.coral : colors.primary }]}>
              {postNeedsKindness
                ? 'Please rephrase kindly before posting.'
                : 'Respect check passed. Keep the community helpful and kind.'}
            </Text>
            <Pressable
              onPress={publishPost}
              style={({ pressed }) => [
                styles.publishButton,
                { backgroundColor: colors.primary, opacity: pressed ? 0.86 : 1 },
              ]}
            >
              <Feather name="send" size={17} color={colors.primaryForeground} />
              <Text style={[styles.publishText, { color: colors.primaryForeground }]}>{copy.community.post}</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showLocationPicker} animationType="slide" transparent onRequestClose={() => setShowLocationPicker(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowLocationPicker(false)}>
          <Pressable style={[styles.selectorSheet, { backgroundColor: colors.card }]} onPress={(event) => event.stopPropagation()}>
            <View style={styles.composerHandle} />
            <Text style={[styles.composerTitle, { color: colors.foreground }]}>Choose your place</Text>
            <Text style={[styles.composerHint, { color: colors.mutedForeground }]}>India · State, district, city</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {allIndiaPlaces.map((place) => {
                const open = expandedPlace === place.state;
                return <View key={place.state}>
                  <Pressable onPress={() => setExpandedPlace(open ? null : place.state)} style={[styles.treeRow, { borderColor: colors.border }]}>
                    <Feather name={open ? 'chevron-down' : 'chevron-right'} size={17} color={colors.primary} />
                    <Text style={[styles.treeText, { color: colors.foreground }]}>{place.state}</Text>
                    <Text style={[styles.treeMeta, { color: colors.mutedForeground }]}>{Object.keys(place.districts).length} district</Text>
                  </Pressable>
                  {open && Object.entries(place.districts).map(([district, cities]) => (
                    <View key={district} style={styles.treeNested}>
                      <Text style={[styles.nestedLabel, { color: colors.mutedForeground }]}>{district}</Text>
                      {cities.map((city) => <Pressable key={city} onPress={() => { setPlaceSelection({ state: place.state, district, city }); setShowLocationPicker(false); }} style={[styles.cityRow, { backgroundColor: placeSelection.city === city ? colors.secondary : colors.muted }]}>
                        <Feather name="map-pin" size={14} color={colors.primary} />
                        <Text style={[styles.treeText, { color: colors.foreground }]}>{city}</Text>
                        {placeSelection.city === city ? <Feather name="check" size={16} color={colors.primary} /> : null}
                      </Pressable>)}
                    </View>
                  ))}
                </View>;
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={showTodayForecast} animationType="slide" transparent onRequestClose={() => setShowTodayForecast(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowTodayForecast(false)}>
          <Pressable style={[styles.selectorSheet, { backgroundColor: colors.card }]} onPress={(event) => event.stopPropagation()}>
            <View style={styles.composerHandle} />
            <Text style={[styles.composerTitle, { color: colors.foreground }]}>Today in {placeSelection.city}</Text>
            <Text style={[styles.composerHint, { color: colors.mutedForeground }]}>Warm, with a gentle breeze · 28°</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.hourGrid}>{['Now 28°', '11 AM 29°', '1 PM 31°', '3 PM 30°', '5 PM 27°', '8 PM 23°'].map((item, i) => <View key={item} style={[styles.hourCell, { backgroundColor: colors.secondary }]}><Feather name={i === 4 ? 'cloud-rain' : 'sun'} size={17} color={colors.primary} /><Text style={[styles.hourText, { color: colors.foreground }]}>{item}</Text></View>)}</View>
              <View style={styles.forecastRows}>
                <ForecastLine icon="thermometer" title="Feels like" value="30° · a little warmer in the sun" colors={colors} />
                <ForecastLine icon="cloud-rain" title="Rain" value="18% · a small chance, mostly after 4 PM" colors={colors} />
                <ForecastLine icon="wind" title="Wind" value="12 km/h · gentle breeze from the southwest" colors={colors} />
                <ForecastLine icon="droplet" title="Humidity" value="58% · comfortable now, slightly sticky later" colors={colors} />
                <ForecastLine icon="sunrise" title="Sunrise / sunset" value="6:12 AM / 6:48 PM" colors={colors} />
                <ForecastLine icon="sun" title="UV / visibility" value="UV 6 (use cover) · 8 km visibility" colors={colors} />
              </View>
              <View style={[styles.recommendation, { backgroundColor: colors.warmSurface, borderColor: colors.warmBorder }]}><Feather name="check-circle" size={19} color={colors.accent} /><Text style={[styles.recommendationText, { color: colors.foreground }]}>Best plan: inspect and spray before late afternoon. Keep a light rain cover ready.</Text></View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={showLanguagePicker}
        animationType="fade"
        transparent
        onRequestClose={() => setShowLanguagePicker(false)}
      >
        <Pressable
          style={styles.languageOverlay}
          onPress={() => setShowLanguagePicker(false)}
        >
          <Pressable
            style={[styles.languageSheet, { backgroundColor: colors.card }]}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={styles.composerHandle} />
            <Text style={[styles.composerTitle, { color: colors.foreground }]}>{copy.language.title}</Text>
            <Text style={[styles.composerHint, { color: colors.mutedForeground }]}>{copy.language.hint}</Text>
            <ScrollView style={styles.languageList} showsVerticalScrollIndicator={false}>
              {languageCatalog.map(({ key, nativeName }) => (
                <Pressable
                  key={key}
                  onPress={() => changeLanguage(key)}
                  style={({ pressed }) => [
                    styles.languageOption,
                    {
                      backgroundColor: language === key ? colors.secondary : colors.muted,
                      opacity: pressed ? 0.72 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.languageOptionText, { color: colors.foreground }]}>{nativeName}</Text>
                  <Text style={[styles.languageEnglishName, { color: colors.mutedForeground }]}>{key}</Text>
                  {language === key ? <Feather name="check" size={19} color={colors.primary} /> : null}
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function HomeView({
  colors,
  copy,
  onChat,
  onMap,
  onCommunity,
  onProfile,
  onLocation,
  onToday,
  onVoice,
  locationLabel,
}: {
  colors: ReturnType<typeof useColors>;
  copy: Copy;
  onChat: () => void;
  onMap: () => void;
  onCommunity: () => void;
  onProfile: () => void;
  onLocation: () => void;
  onToday: () => void;
  onVoice: () => void;
  locationLabel: string;
}) {
  return (
    <>
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.eyebrow, { color: colors.primary }]}>{copy.home.eyebrow}</Text>
          <Text style={[styles.greeting, { color: colors.foreground }]}>{copy.home.greeting}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Pressable
            accessibilityLabel="Voice"
            onPress={onVoice}
            style={({ pressed }) => [
              styles.avatar,
              { backgroundColor: colors.coral, borderColor: colors.accent, opacity: pressed ? 0.75 : 1 },
            ]}
          >
            <Feather name="mic" size={18} color="#FFF" />
          </Pressable>
          <Pressable
            accessibilityLabel={copy.common.profile}
          onPress={onProfile}
          style={({ pressed }) => [
            styles.avatar,
            { backgroundColor: colors.warmSurface, borderColor: colors.warmBorder, opacity: pressed ? 0.75 : 1 },
          ]}
        >
          <Feather name="user" size={20} color={colors.accentForeground} />
        </Pressable>
      </View>

      <Pressable onPress={onLocation} accessibilityLabel="Choose location" style={({ pressed }) => [styles.locationRow, { opacity: pressed ? 0.65 : 1 }]}>
        <Feather name="map-pin" size={14} color={colors.coral} />
        <Text style={[styles.locationText, { color: colors.mutedForeground }]}>{locationLabel}</Text>
        <Feather name="chevron-down" size={14} color={colors.mutedForeground} />
      </Pressable>

      <Pressable onPress={onToday} accessibilityLabel="Open today forecast">
      <LinearGradient
        colors={[colors.leafDark, colors.primary, colors.leaf]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.weatherHero}
      >
        <View style={styles.heroTopLine}>
          <View style={styles.todayPill}>
            <Text style={[styles.todayPillText, { color: colors.leafDark }]}>{copy.home.today}</Text>
          </View>
          <Feather name="sun" size={24} color={colors.sun} />
        </View>
        <Text style={styles.heroTemperature}>28°</Text>
        <Text style={styles.heroCondition}>{copy.home.condition}</Text>
        <View style={styles.heroDivider} />
        <View style={styles.heroStats}>
          <WeatherStat icon="sunrise" value="6:12 AM" label={copy.home.sunrise} />
          <WeatherStat icon="droplet" value="18%" label={copy.home.rainChance} />
          <WeatherStat icon="wind" value="12 km/h" label={copy.home.wind} />
        </View>
      </LinearGradient>
      </Pressable>

      <View style={styles.sectionHeading}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{copy.home.dayAtGlance}</Text>
        <Text style={[styles.sectionAction, { color: colors.primary }]}>{copy.home.seeWeek}</Text>
      </View>
      <View style={styles.weekRow}>
        <DayWeather day={copy.home.today} temp="28°" icon="sun" active colors={colors} />
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
          <Text style={[styles.adviceKicker, { color: colors.accentForeground }]}>{copy.home.fieldTip}</Text>
          <Text style={[styles.adviceText, { color: colors.foreground }]}>
            {copy.home.fieldTipText}
          </Text>
        </View>
        <Feather name="arrow-up-right" size={18} color={colors.accentForeground} />
      </Pressable>

      <View style={styles.quickActions}>
        <QuickAction icon="message-circle" label={copy.home.askWeather} onPress={onChat} colors={colors} />
        <QuickAction icon="map" label={copy.home.openMap} onPress={onMap} colors={colors} />
        <QuickAction icon="users" label={copy.home.askFarmers} onPress={onCommunity} colors={colors} />
      </View>

      <View style={styles.sectionHeading}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{copy.home.thisWeek}</Text>
        <Feather name="more-horizontal" size={20} color={colors.mutedForeground} />
      </View>
      <View style={[styles.cropCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.cropIcon, { backgroundColor: colors.secondary }]}>
          <Feather name="activity" size={22} color={colors.primary} />
        </View>
        <View style={styles.cropCopy}>
          <Text style={[styles.cropTitle, { color: colors.foreground }]}>{copy.home.cottonField}</Text>
          <Text style={[styles.cropDetail, { color: colors.mutedForeground }]}>{copy.home.waterIn}</Text>
        </View>
        <View style={[styles.healthPill, { backgroundColor: colors.secondary }]}>
          <Text style={[styles.healthText, { color: colors.primary }]}>{copy.home.healthy}</Text>
        </View>
      </View>
    </>
  );
}

function ChatView({
  colors,
  copy,
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
  copy: Copy;
  messages: ChatMessage[];
  question: string;
  isSending: boolean;
  isListening: boolean;
  onQuestionChange: (value: string) => void;
  onSend: () => void;
  onQuickQuestion: (value: string) => void;
  onListen: () => void;
}) {
  const [translatingId, setTranslatingId] = useState<string | null>(null);
  const [targetLanguage, setTargetLanguage] = useState<Language>('Hindi');

  const toggleTranslate = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    setTranslatingId(current => current === id ? null : id);
  };
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
            <Text style={[styles.onlineText, { color: colors.mutedForeground }]}>{copy.chat.ready}</Text>
          </View>
        </View>
      </View>
      <Text style={[styles.chatDate, { color: colors.mutedForeground }]}>{copy.chat.today}</Text>
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
            <View style={styles.messageContentWrap}>
              <Text
                style={[
                  styles.messageText,
                  { color: item.role === 'user' ? colors.primaryForeground : colors.foreground },
                ]}
              >
                {item.message}
              </Text>
              <Pressable
                onPress={() => toggleTranslate(item.id)}
                style={({ pressed }) => [styles.translateChatButton, { opacity: pressed ? 0.6 : 1 }]}
              >
                <Feather name="globe" size={12} color={translatingId === item.id ? colors.primary : item.role === 'user' ? colors.primaryForeground : colors.mutedForeground} />
                <Text style={[styles.translateChatText, { color: translatingId === item.id ? colors.primary : item.role === 'user' ? colors.primaryForeground : colors.mutedForeground }]}>Translate</Text>
              </Pressable>
              {translatingId === item.id && (
                <View style={[styles.chatTranslationBox, { backgroundColor: colors.secondary }]}>
                  <Text style={[styles.translationLabel, { color: colors.leafDark }]}>OFFLINE TRANSLATION DEMO</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.translationLanguageRow}>
                    {languageCatalog.map((languageItem) => (
                      <Pressable
                        key={languageItem.key}
                        onPress={() => setTargetLanguage(languageItem.key)}
                        style={[
                          styles.translationLanguageChip,
                          { backgroundColor: targetLanguage === languageItem.key ? colors.primary : colors.card },
                        ]}
                      >
                        <Text style={[styles.translationLanguageText, { color: targetLanguage === languageItem.key ? colors.primaryForeground : colors.foreground }]}>
                          {languageItem.nativeName}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                  <Text style={[styles.chatTranslationText, { color: colors.leafDark }]}>
                    {localTranslationPreview(item.message, targetLanguage)}
                  </Text>
                </View>
              )}
            </View>
          </View>
        ))}
        {isSending ? (
          <View style={[styles.typingBubble, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.typingText, { color: colors.mutedForeground }]}>{copy.chat.thinking}</Text>
          </View>
        ) : null}
      </View>

      <Text style={[styles.askLabel, { color: colors.mutedForeground }]}>{copy.chat.tryAsking}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickQuestionRow}>
        {copy.chat.quickQuestions.map((item) => (
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
          placeholder={isListening ? copy.chat.listening : copy.chat.placeholder}
          placeholderTextColor={colors.mutedForeground}
          style={[styles.chatInput, { color: colors.foreground }]}
          returnKeyType="send"
          onSubmitEditing={onSend}
          accessibilityLabel={copy.chat.placeholder}
        />
        <Pressable
          onPress={onListen}
          accessibilityLabel={isListening ? copy.chat.stopListening : copy.chat.askByVoice}
          style={({ pressed }) => [
            styles.micButton,
            { backgroundColor: isListening ? colors.coral : colors.secondary, opacity: pressed ? 0.75 : 1 },
          ]}
        >
          <Feather name={isListening ? 'square' : 'mic'} size={18} color={isListening ? colors.primaryForeground : colors.primary} />
        </Pressable>
        <Pressable
          onPress={onSend}
          accessibilityLabel={copy.chat.sendQuestion}
          style={({ pressed }) => [
            styles.sendButton,
            { backgroundColor: colors.primary, opacity: pressed ? 0.75 : 1 },
          ]}
        >
          <Feather name="arrow-up" size={18} color={colors.primaryForeground} />
        </Pressable>
      </View>
      <Text style={[styles.chatFootnote, { color: colors.mutedForeground }]}>
        {copy.chat.footnote}
      </Text>
    </>
  );
}

function VoiceView({
  colors,
  copy,
  languageName,
  isSpeaking,
  question,
  onQuestionChange,
  onSpeak,
  onAsk,
  onLanguage,
}: {
  colors: ReturnType<typeof useColors>;
  copy: Copy;
  language: Language;
  languageName: string;
  isSpeaking: boolean;
  question: string;
  onQuestionChange: (value: string) => void;
  onSpeak: () => void;
  onAsk: () => void;
  onLanguage: () => void;
}) {
  const voiceState = isSpeaking ? 'speaking' : question ? 'thinking' : 'ready';
  return (
    <>
      <View style={styles.voiceIntro}>
        <View style={[styles.voiceBadge, { backgroundColor: colors.accent }]}>
          <Feather name="volume-2" size={16} color={colors.accentForeground} />
          <Text style={[styles.voiceBadgeText, { color: colors.accentForeground }]}>VOICE MODULE</Text>
        </View>
        <Text style={[styles.voiceTitle, { color: colors.foreground }]}>{copy.chat.voiceTitle}</Text>
        <Text style={[styles.voiceDescription, { color: colors.mutedForeground }]}>
          {copy.chat.voiceDescription}
        </Text>
      </View>

      <Pressable
        onPress={onLanguage}
        accessibilityLabel={copy.language.title}
        style={({ pressed }) => [
          styles.voiceLanguage,
          { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.76 : 1 },
        ]}
      >
        <View style={[styles.voiceLanguageIcon, { backgroundColor: colors.secondary }]}>
          <Feather name="globe" size={17} color={colors.primary} />
        </View>
        <View style={styles.voiceLanguageCopy}>
          <Text style={[styles.voiceLanguageLabel, { color: colors.mutedForeground }]}>VOICE LANGUAGE</Text>
          <Text style={[styles.voiceLanguageName, { color: colors.foreground }]}>{languageName}</Text>
        </View>
        <Feather name="chevron-down" size={18} color={colors.mutedForeground} />
      </Pressable>

      <View style={[styles.voiceCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.voiceOrb, { backgroundColor: isSpeaking ? colors.coral : voiceState === 'thinking' ? colors.warmBorder : colors.secondary }]}>
          <View style={[styles.voiceOrbInner, { backgroundColor: colors.card }]}>
            <Feather
              name={isSpeaking ? 'volume-2' : voiceState === 'thinking' ? 'loader' : 'mic'}
              size={30}
              color={isSpeaking ? colors.coral : colors.primary}
            />
          </View>
        </View>
        <Text style={[styles.voiceCardTitle, { color: colors.foreground }]}>
          {isSpeaking ? 'Speaking' : voiceState === 'thinking' ? 'Thinking' : 'Ready to talk'}
        </Text>
        <Text style={[styles.voiceCardHint, { color: colors.mutedForeground }]}>
          {isSpeaking ? 'Tap to stop' : `Ask in ${languageName}`}
        </Text>
        <Pressable
          onPress={onSpeak}
          accessibilityLabel="Tap to talk"
          style={({ pressed }) => [
            styles.voicePlayButton,
            { backgroundColor: isSpeaking ? colors.coral : colors.primary, opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <Feather name={isSpeaking ? 'square' : 'mic'} size={17} color={colors.primaryForeground} />
          <Text style={[styles.voicePlayText, { color: colors.primaryForeground }]}>
            {isSpeaking ? 'Stop speaking' : 'Tap to talk'}
          </Text>
        </Pressable>
      </View>
      <View style={[styles.voiceTranscript, { backgroundColor: colors.secondary }]}>
        <Text style={[styles.voiceTranscriptLabel, { color: colors.primary }]}>CONVERSATION</Text>
        <Text style={[styles.voiceTranscriptText, { color: colors.foreground }]}>“Ask me about today’s rain, wind, or your plans.”</Text>
        {question ? <Text style={[styles.voiceTranscriptText, { color: colors.leafDark }]}>You: {question}</Text> : null}
      </View>

      <Text style={[styles.voiceAskLabel, { color: colors.foreground }]}>{copy.chat.askAndHear}</Text>
      <View style={[styles.voiceAskBox, { backgroundColor: colors.card, borderColor: colors.input }]}>
        <TextInput
          value={question}
          onChangeText={onQuestionChange}
          placeholder={copy.chat.placeholder}
          placeholderTextColor={colors.mutedForeground}
          style={[styles.voiceInput, { color: colors.foreground }]}
          accessibilityLabel={copy.chat.placeholder}
          returnKeyType="send"
          onSubmitEditing={onAsk}
        />
        <Pressable
          onPress={onAsk}
          accessibilityLabel={copy.chat.sendQuestion}
          style={({ pressed }) => [
            styles.sendButton,
            { backgroundColor: colors.primary, opacity: pressed ? 0.75 : 1 },
          ]}
        >
          <Feather name="arrow-up" size={18} color={colors.primaryForeground} />
        </Pressable>
      </View>
      <Text style={[styles.voiceNote, { color: colors.mutedForeground }]}>
        Voice playback uses the selected language when your phone has a matching voice installed.
      </Text>
    </>
  );
}

// Political boundaries derived from AbhinavSwami28/india-official-geojson (MIT).
// City markers are spaced slightly for uncluttered tap targets on mobile.
const cityCoords: Record<string, { x: string; y: string }> = {
  Nashik: { x: '17.0%', y: '58.0%' },
  Dindori: { x: '21.0%', y: '56.0%' },
  Pune: { x: '17.0%', y: '64.0%' },
  Baramati: { x: '24.0%', y: '66.0%' },

  Ludhiana: { x: '25.0%', y: '21.0%' },
  Khanna: { x: '29.0%', y: '24.0%' },
  Amritsar: { x: '20.0%', y: '18.0%' },
  Ajnala: { x: '24.0%', y: '16.0%' },

  Bengaluru: { x: '30.0%', y: '79.0%' },
  Devanahalli: { x: '35.0%', y: '82.0%' },
  Mysuru: { x: '26.0%', y: '82.0%' },
  Nanjangud: { x: '29.0%', y: '86.0%' },

  Lucknow: { x: '45.0%', y: '34.0%' },
  Malihabad: { x: '41.0%', y: '38.0%' },
  Varanasi: { x: '52.0%', y: '40.0%' },
  Pindra: { x: '48.0%', y: '43.0%' },
};

const stateHotspots: Record<string, { x: DimensionValue; y: DimensionValue; shortLabel: string }> = {
  Punjab: { x: '23%', y: '19%', shortLabel: 'PB' },
  'Uttar Pradesh': { x: '46%', y: '36%', shortLabel: 'UP' },
  Maharashtra: { x: '20%', y: '58%', shortLabel: 'MH' },
  Karnataka: { x: '29%', y: '78%', shortLabel: 'KA' },
};

const placeTranslations: Partial<Record<CoreLanguage, Record<string, string>>> = {
  Hindi: {
    Maharashtra: 'महाराष्ट्र', Punjab: 'पंजाब', Karnataka: 'कर्नाटक', 'Uttar Pradesh': 'उत्तर प्रदेश',
    Nashik: 'नासिक', Dindori: 'दिंडोरी', Pune: 'पुणे', Baramati: 'बारामती',
    Ludhiana: 'लुधियाना', Khanna: 'खन्ना', Amritsar: 'अमृतसर', Ajnala: 'अजनाला',
    Bengaluru: 'बेंगलुरु', Devanahalli: 'देवनहल्ली', Mysuru: 'मैसूर', Nanjangud: 'नंजनगुड',
    Lucknow: 'लखनऊ', Malihabad: 'मलिहाबाद', Varanasi: 'वाराणसी', Pindra: 'पिंडरा',
  },
  Marathi: {
    Maharashtra: 'महाराष्ट्र', Punjab: 'पंजाब', Karnataka: 'कर्नाटक', 'Uttar Pradesh': 'उत्तर प्रदेश',
    Nashik: 'नाशिक', Dindori: 'दिंडोरी', Pune: 'पुणे', Baramati: 'बारामती',
    Ludhiana: 'लुधियाना', Khanna: 'खन्ना', Amritsar: 'अमृतसर', Ajnala: 'अजनाला',
    Bengaluru: 'बेंगळुरू', Devanahalli: 'देवनहळ्ळी', Mysuru: 'म्हैसूर', Nanjangud: 'नंजनगुड',
    Lucknow: 'लखनऊ', Malihabad: 'मलिहाबाद', Varanasi: 'वाराणसी', Pindra: 'पिंडरा',
  },
};

const adviceTranslations: Partial<Record<CoreLanguage, Record<string, string>>> = {
  Hindi: {
    Nashik: 'आज दोपहर बाद छिड़काव करें, जब हवा हल्की हो।',
    Dindori: 'शाम की सिंचाई से पहले मिट्टी की नमी जाँचें।',
    Pune: 'हल्की बारिश संभव है; कटी हुई फसल ढककर रखें।',
    Baramati: 'गर्मी में पौधों की जड़ों के पास पानी दें।',
    Ludhiana: 'आज शाम गेहूँ के खेत की नमी जाँचें।',
    Khanna: 'शांत सुबह खेत की जाँच के लिए अच्छी है।',
    Amritsar: 'बादल घने हों तो खाद डालना टालें।',
    Ajnala: 'कटी हुई फसल को ढककर रखें।',
    Bengaluru: 'बारिश संभव है; पत्तियों पर छिड़काव न करें।',
    Devanahalli: 'तेज़ हवा से पहले छाया-जाल सुरक्षित करें।',
    Mysuru: 'सब्जियों की क्यारियों के आसपास जल निकासी जाँचें।',
    Nanjangud: 'सुबह का समय खेत के काम के लिए अच्छा है।',
    Lucknow: 'जहाँ ऊपरी मिट्टी सूखी हो, केवल वहीं सिंचाई करें।',
    Malihabad: 'आम के पत्तों में नमी की कमी के संकेत देखें।',
    Varanasi: 'भारी काम दोपहर से पहले पूरा करें।',
    Pindra: 'उपज के लिए बारिश का कवर तैयार रखें।',
  },
};

const localizePlace = (place: string, language: Language) =>
  (language === 'Hindi' || language === 'Marathi' ? placeTranslations[language]?.[place] : undefined) ?? place;

const localizeAdvice = (city: string, advice: string, language: Language) =>
  (language === 'Hindi' || language === 'Marathi' ? adviceTranslations[language]?.[city] : undefined) ?? advice;

function MapView({
  colors,
  copy,
  language,
  selectedPoint,
  layer,
  onSelectPoint,
  onSelectLayer,
}: {
  colors: ReturnType<typeof useColors>;
  copy: Copy;
  language: Language;
  selectedPoint: string;
  layer: 'rain' | 'wind' | 'fields';
  onSelectPoint: (value: string) => void;
  onSelectLayer: (value: 'rain' | 'wind' | 'fields') => void;
}) {
  const [selectedState, setSelectedState] = useState('Maharashtra');
  const [selectedDistrict, setSelectedDistrict] = useState('Nashik');
  const [expandedState, setExpandedState] = useState<string | null>('Maharashtra');
  const states = allIndiaPlaces.map((place) => place.state);
  const selectedBranch = allIndiaPlaces.find((place) => place.state === selectedState) ?? allIndiaPlaces[0];
  const districts = Object.keys(selectedBranch.districts);
  const cityWeather = indiaWeatherSimulator[selectedState]?.[selectedDistrict] ?? Object.fromEntries(
    (selectedBranch.districts[selectedDistrict] ?? [selectedBranch.state]).map((city) => [city, { temperature: 28, rain: 18, wind: 12, windDirection: 'SW', humidity: 58, advice: 'A calm window suits a morning plan.' }]),
  );
  const cities = Object.keys(cityWeather);
  const selectedCity = cityWeather[selectedPoint] ? selectedPoint : cities[0];
  const weather = cityWeather[selectedCity];

  const chooseState = (state: string) => {
    const branch = allIndiaPlaces.find((place) => place.state === state) ?? allIndiaPlaces[0];
    const district = Object.keys(branch.districts)[0];
    const city = branch.districts[district][0];
    setSelectedState(state);
    setSelectedDistrict(district);
    onSelectPoint(city);
    Haptics.selectionAsync().catch(() => undefined);
  };

  const chooseDistrict = (district: string) => {
    setSelectedDistrict(district);
    onSelectPoint((selectedBranch.districts[district] ?? [selectedBranch.state])[0]);
    Haptics.selectionAsync().catch(() => undefined);
  };

  const chooseCity = (city: string) => {
    onSelectPoint(city);
    Haptics.selectionAsync().catch(() => undefined);
  };

  return (
    <>
      <Text style={[styles.mapSubtitle, { color: colors.mutedForeground }]}>
        {copy.map.subtitle}
      </Text>
      <View style={[styles.simulatorNotice, { backgroundColor: colors.warmSurface, borderColor: colors.warmBorder }]}>
        <Feather name="compass" size={16} color={colors.accent} />
        <View style={styles.simulatorNoticeCopy}>
          <Text style={[styles.simulatorNoticeTitle, { color: colors.foreground }]}>{copy.map.simulatorTitle}</Text>
          <Text style={[styles.simulatorNoticeText, { color: colors.mutedForeground }]}>{copy.map.simulatorText}</Text>
        </View>
      </View>
      <Text style={[styles.mapPickerLabel, { color: colors.foreground }]}>{copy.map.stateStep} · tap arrows to browse</Text>
      <View style={styles.mapTree}>
        {states.map((state) => (
          <View key={state}>
            <Pressable onPress={() => { setExpandedState(expandedState === state ? null : state); chooseState(state); }} style={[styles.treeRow, { borderColor: colors.border, backgroundColor: selectedState === state ? colors.secondary : colors.card }]}>
              <Feather name={expandedState === state ? 'chevron-down' : 'chevron-right'} size={16} color={colors.primary} />
              <Text style={[styles.treeText, { color: colors.foreground }]}>{localizePlace(state, language)}</Text>
            </Pressable>
          </View>
        ))}
      </View>
      <Text style={[styles.mapPickerLabel, { color: colors.foreground }]}>{copy.map.districtStep}</Text>
      <View style={styles.mapTree}>
        {districts.map((district) => (
          <View key={district}>
            <Pressable onPress={() => { chooseDistrict(district); setExpandedState(expandedState === `district:${district}` ? selectedState : `district:${district}`); }} style={[styles.treeRow, { borderColor: colors.border, backgroundColor: selectedDistrict === district ? colors.secondary : colors.card }]}>
              <Feather name={expandedState === `district:${district}` ? 'chevron-down' : 'chevron-right'} size={16} color={colors.primary} />
              <Text style={[styles.treeText, { color: colors.foreground }]}>{localizePlace(district, language)}</Text>
            </Pressable>
            {expandedState === `district:${district}` ? (selectedBranch.districts[district] ?? []).map((city) => (
              <Pressable key={city} onPress={() => chooseCity(city)} style={[styles.cityRow, { marginLeft: 22, backgroundColor: selectedCity === city ? colors.secondary : colors.muted }]}>
                <Feather name="map-pin" size={14} color={colors.primary} /><Text style={[styles.treeText, { color: colors.foreground }]}>{localizePlace(city, language)}</Text>{selectedCity === city ? <Feather name="check" size={16} color={colors.primary} /> : null}
              </Pressable>
            )) : null}
          </View>
        ))}
      </View>
      <Text style={[styles.mapPickerLabel, styles.cityPickerLabel, { color: colors.foreground }]}>{copy.map.cityStep}</Text>
      <Text style={[styles.mapHint, { color: colors.mutedForeground }]}>
        {expandedState?.startsWith('district:')
          ? 'Choose a city from the expanded district above.'
          : 'Open a district with the arrow to reveal its cities.'}
      </Text>
      <View style={[styles.mapCard, { backgroundColor: colors.mapWater, borderColor: colors.border, padding: 0, overflow: 'hidden' }]}>
        <Svg viewBox={`${mapBounds.minX} ${mapBounds.minY} ${mapBounds.width} ${mapBounds.height}`} width="100%" height="100%" style={StyleSheet.absoluteFill}>
          {Object.entries(statePaths).map(([name, d]) => {
            const isSupported = states.includes(name);
            const isSelected = selectedState === name;
            return (
              <Path
                key={name}
                d={d}
                fill={isSupported ? (isSelected ? colors.mapField : colors.mapLand) : colors.card}
                fillOpacity={isSupported ? 1 : 0.82}
                stroke={isSelected ? colors.primary : colors.border}
                strokeWidth={isSelected ? mapBounds.width / 210 : mapBounds.width / 500}
              />
            );
          })}
        </Svg>
        {Object.entries(stateHotspots).map(([state, hotspot]) => {
          return (
            <Pressable
              key={state}
              accessibilityRole="button"
              accessibilityLabel={`${localizePlace(state, language)} ${copy.map.selectOnMap}`}
              onPress={() => chooseState(state)}
              style={({ pressed }) => [
                styles.stateHotspot,
                {
                  left: hotspot.x,
                  top: hotspot.y,
                  backgroundColor: selectedState === state ? colors.primary : colors.card,
                  borderColor: selectedState === state ? colors.primaryForeground : colors.primary,
                  opacity: pressed ? 0.68 : 1,
                },
              ]}
            >
              <Text style={[styles.stateHotspotText, { color: selectedState === state ? colors.primaryForeground : colors.primary }]}>
                {hotspot.shortLabel}
              </Text>
            </Pressable>
          );
        })}
        {cities.map(city => (
          <MapPoint
            key={city}
            id={city}
            label={localizePlace(city, language)}
            x={cityCoords[city]?.x || '50%'}
            y={cityCoords[city]?.y || '50%'}
            active={selectedCity === city}
            colors={colors}
            onPress={onSelectPoint}
          />
        ))}
        <View style={[styles.mapLegend, { backgroundColor: colors.card }]}>
          <Text style={[styles.legendHeading, { color: colors.foreground }]}>{localizePlace(selectedState, language)}</Text>
          <Text style={[styles.legendText, { color: colors.mutedForeground }]}>{localizePlace(selectedDistrict, language)} {copy.map.districtSuffix}</Text>
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
            <Text style={[styles.layerText, { color: layer === item ? colors.primaryForeground : colors.foreground }]}>
              {item === 'rain' ? copy.map.rain : item === 'wind' ? copy.map.wind : copy.map.fields}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={[styles.mapDetailCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.detailWeatherIcon, { backgroundColor: colors.sky }]}>
          <Feather name={layer === 'rain' ? 'cloud-rain' : layer === 'wind' ? 'wind' : 'sun'} size={22} color={colors.primary} />
        </View>
        <View style={styles.mapDetailCopy}>
          <Text style={[styles.mapDetailPlace, { color: colors.foreground }]}>
            {localizePlace(selectedCity, language)}, {localizePlace(selectedDistrict, language)}
          </Text>
          <Text style={[styles.mapDetailText, { color: colors.mutedForeground }]}>
            {layer === 'rain'
              ? `${weather.rain}% ${copy.map.rainChance}`
              : layer === 'wind'
                ? `${weather.wind} km/h • ${copy.map.windFrom} ${weather.windDirection}`
                : localizeAdvice(selectedCity, weather.advice, language)}
          </Text>
        </View>
        <Text style={[styles.mapTemperature, { color: colors.foreground }]}>{weather.temperature}°</Text>
      </View>
      <View style={styles.weatherMetricRow}>
        {[
          { icon: 'cloud-rain' as IconName, value: `${weather.rain}%`, label: copy.map.rain },
          { icon: 'wind' as IconName, value: `${weather.wind} km/h`, label: weather.windDirection },
          { icon: 'droplet' as IconName, value: `${weather.humidity}%`, label: copy.map.humidity },
        ].map((metric) => (
          <View key={metric.label} style={[styles.weatherMetric, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name={metric.icon} size={16} color={colors.primary} />
            <Text style={[styles.weatherMetricValue, { color: colors.foreground }]}>{metric.value}</Text>
            <Text style={[styles.weatherMetricLabel, { color: colors.mutedForeground }]}>{metric.label}</Text>
          </View>
        ))}
      </View>
      <View style={[styles.simulatorAdvice, { backgroundColor: colors.secondary }]}>
        <Feather name="check-circle" size={18} color={colors.primary} />
        <Text style={[styles.simulatorAdviceText, { color: colors.leafDark }]}>{localizeAdvice(selectedCity, weather.advice, language)}</Text>
      </View>
      <Text style={[styles.mapUpdated, { color: colors.mutedForeground }]}>{copy.map.simulatorOnly}</Text>
    </>
  );
}

function CommunityView({
  colors,
  copy,
  posts,
  isLoading,
  onLike,
  onAdd,
}: {
  colors: ReturnType<typeof useColors>;
  copy: Copy;
  posts: CommunityPost[];
  isLoading: boolean;
  onLike: (id: string) => void;
  onAdd: () => void;
}) {
  const [translatingId, setTranslatingId] = useState<string | null>(null);
  const [targetLanguage, setTargetLanguage] = useState<Language>('Hindi');

  const toggleTranslate = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    setTranslatingId(current => current === id ? null : id);
  };
  return (
    <>
      <View style={styles.communityHeader}>
        <View>
          <Text style={[styles.communityLead, { color: colors.foreground }]}>{copy.community.lead}</Text>
          <Text style={[styles.communitySub, { color: colors.mutedForeground }]}>{copy.community.sub}</Text>
        </View>
        <Pressable
          onPress={onAdd}
          accessibilityLabel={copy.community.share}
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
          {copy.community.banner}
        </Text>
      </View>
      <View style={styles.feedHeader}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{copy.community.conversations}</Text>
        <View style={[styles.nearbyPill, { backgroundColor: colors.secondary }]}>
          <View style={[styles.onlineDot, { backgroundColor: colors.leaf }]} />
          <Text style={[styles.nearbyText, { color: colors.primary }]}>{copy.community.nearby}</Text>
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
            {post.photoUri ? <Image source={{ uri: post.photoUri }} style={styles.postPhoto} /> : null}
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
                <Text style={[styles.postActionText, { color: colors.mutedForeground }]}>{copy.community.reply}</Text>
              </View>
              <Pressable
                onPress={() => toggleTranslate(post.id)}
                style={({ pressed }) => [styles.postAction, { opacity: pressed ? 0.55 : 1 }]}
              >
                <Feather name="globe" size={17} color={translatingId === post.id ? colors.primary : colors.mutedForeground} />
                <Text style={[styles.postActionText, { color: translatingId === post.id ? colors.primary : colors.mutedForeground }]}>A/अ</Text>
              </Pressable>
              <Pressable style={({ pressed }) => [styles.postAction, { marginLeft: 'auto', opacity: pressed ? 0.55 : 1 }]}>
                <Feather name="share-2" size={17} color={colors.mutedForeground} />
              </Pressable>
            </View>
            {translatingId === post.id && (
              <View style={[styles.translationBox, { backgroundColor: colors.secondary }]}>
                <View style={styles.translationTop}>
                  <Text style={[styles.translationLabel, { color: colors.leafDark }]}>OFFLINE TRANSLATION DEMO</Text>
                  <Feather name="x" size={14} color={colors.leafDark} onPress={() => setTranslatingId(null)} />
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.translationLanguageRow}>
                  {languageCatalog.map((languageItem) => (
                    <Pressable
                      key={languageItem.key}
                      onPress={() => setTargetLanguage(languageItem.key)}
                      style={[
                        styles.translationLanguageChip,
                        { backgroundColor: targetLanguage === languageItem.key ? colors.primary : colors.card },
                      ]}
                    >
                      <Text style={[styles.translationLanguageText, { color: targetLanguage === languageItem.key ? colors.primaryForeground : colors.foreground }]}>
                        {languageItem.nativeName}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
                <Text style={[styles.translationText, { color: colors.foreground }]}>
                  {localTranslationPreview(post.message, targetLanguage)}
                </Text>
              </View>
            )}
          </View>
        ))
      ) : (
        <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="message-square" size={26} color={colors.primary} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{copy.community.emptyTitle}</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{copy.community.emptyText}</Text>
        </View>
      )}
    </>
  );
}

function BottomNav({
  colors,
  copy,
  active,
  onSelect,
  insets,
}: {
  colors: ReturnType<typeof useColors>;
  copy: Copy;
  active: Screen;
  onSelect: (screen: Screen) => void;
  insets: { bottom: number };
}) {
  const items: { id: Screen; label: string; icon: IconName }[] = [
    { id: 'home', label: copy.nav.today, icon: 'sun' },
    { id: 'chat', label: copy.nav.ask, icon: 'message-circle' },
    { id: 'voice', label: copy.nav.voice, icon: 'volume-2' },
    { id: 'map', label: copy.nav.map, icon: 'map' },
    { id: 'community', label: copy.nav.farmers, icon: 'users' },
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

function ForecastLine({ icon, title, value, colors }: { icon: IconName; title: string; value: string; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={styles.forecastLine}>
      <View style={[styles.forecastIcon, { backgroundColor: colors.secondary }]}><Feather name={icon} size={16} color={colors.primary} /></View>
      <View style={styles.forecastCopy}><Text style={[styles.forecastTitle, { color: colors.mutedForeground }]}>{title}</Text><Text style={[styles.forecastValue, { color: colors.foreground }]}>{value}</Text></View>
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
  id,
  label,
  x,
  y,
  active,
  colors,
  onPress,
}: {
  id: string;
  label: string;
  x: string;
  y: string;
  active: boolean;
  colors: ReturnType<typeof useColors>;
  onPress: (value: string) => void;
}) {
  return (
    <View style={{ position: 'absolute', left: x as any, top: y as any, width: 0, height: 0, zIndex: active ? 10 : 1 }}>
      <Pressable
        onPress={() => onPress(id)}
        style={({ pressed }) => [
          styles.mapPoint,
          { opacity: pressed ? 0.66 : 1 },
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
    </View>
  );
}

function answerFor(question: string, copy: Copy, placeSelection: { state: string; city: string }) {

  let locationContext = placeSelection.city;
  let stateContext = placeSelection.state;
  for (const place of allIndiaPlaces) {
    if (question.toLowerCase().includes(place.state.toLowerCase())) {
      locationContext = Object.values(place.districts)[0][0];
      stateContext = place.state;
    }
    for (const dist of Object.values(place.districts)) {
      for (const city of dist) {
        if (question.toLowerCase().includes(city.toLowerCase())) {
          locationContext = city;
          stateContext = place.state;
        }
      }
    }
  }
  let weather = indiaWeatherSimulator[stateContext]?.[Object.keys(indiaWeatherSimulator[stateContext] || {})[0]]?.[locationContext];
  if (!weather) {
    for (const dist of Object.values(indiaWeatherSimulator[stateContext] || {})) {
      if (dist[locationContext]) weather = dist[locationContext];
    }
  }
  const fallbackAdvice = 'General advice: check soil moisture.';
  const weatherStr = weather ? `Currently ${weather.temperature}°C, ${weather.rain}% chance of rain. Advice: ${weather.advice}` : fallbackAdvice;
  const intro = `(Simulated for ${locationContext}, ${stateContext}) `;

  const lower = question.toLowerCase();
  if (lower.includes('spray') || question.includes('दवा') || question.includes('फवारणी')) {
    return intro + copy.chat.sprayAnswer;
  }
  if (lower.includes('rain') || question.includes('बारिश') || question.includes('पाऊस')) {
    return intro + copy.chat.rainAnswer;
  }
  if (lower.includes('water') || question.includes('पानी') || question.includes('पाणी')) {
    return intro + copy.chat.waterAnswer;
  }
  return intro + weatherStr;

}

function ProfileView({
  colors,
  copy,
  locationState,
  geoLabel,
  dailyCheckDone,
  onRequestLocation,
  onCompleteDailyCheck,
  onLanguage,
}: {
  colors: ReturnType<typeof useColors>;
  copy: Copy;
  locationState: 'prompt' | 'loading' | 'granted' | 'denied';
  geoLabel: string | null;
  dailyCheckDone: boolean;
  onRequestLocation: () => void;
  onCompleteDailyCheck: () => void;
  onLanguage: () => void;
}) {
  return (
    <>
      <View style={styles.profileHeader}>
        <View style={[styles.profileAvatar, { backgroundColor: colors.accent, borderColor: colors.warmBorder }]}>
          <Feather name="user" size={32} color={colors.accentForeground} />
        </View>
        <Text style={[styles.profileName, { color: colors.foreground }]}>{copy.home.greeting}</Text>
      </View>

      <View style={styles.profileSection}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{copy.profile.location}</Text>
        <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.profileRow}>
            <View style={[styles.profileIconWrap, { backgroundColor: locationState === 'granted' ? colors.secondary : colors.muted }]}>
              <Feather name="map-pin" size={18} color={locationState === 'granted' ? colors.primary : colors.mutedForeground} />
            </View>
            <View style={styles.profileRowCopy}>
              <Text style={[styles.profileRowTitle, { color: colors.foreground }]}>
                {locationState === 'granted' ? geoLabel || copy.profile.locationOn : locationState === 'prompt' ? copy.profile.locationPrompt : copy.profile.locationError}
              </Text>
              {locationState === 'granted' && <Text style={[styles.profileRowSubtitle, { color: colors.primary }]}>{copy.profile.locationOn}</Text>}
            </View>
          </View>
          {locationState !== 'granted' && (
            <Pressable
              onPress={onRequestLocation}
              disabled={locationState === 'loading'}
              style={({ pressed }) => [styles.actionButton, { backgroundColor: colors.primary, opacity: pressed || locationState === 'loading' ? 0.7 : 1 }]}
            >
              {locationState === 'loading' ? (
                <ActivityIndicator size="small" color={colors.primaryForeground} />
              ) : (
                <Text style={[styles.actionButtonText, { color: colors.primaryForeground }]}>{copy.profile.grantLocation}</Text>
              )}
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.profileSection}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{copy.profile.daily}</Text>
        <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.profileRow}>
            <View style={[styles.profileIconWrap, { backgroundColor: colors.warmSurface }]}>
              <Feather name="zap" size={18} color={colors.sun} />
            </View>
            <View style={styles.profileRowCopy}>
              <Text style={[styles.profileRowTitle, { color: colors.foreground }]}>{copy.profile.streakDays}</Text>
              <Text style={[styles.profileRowSubtitle, { color: colors.mutedForeground }]}>{copy.profile.streakHint}</Text>
            </View>
          </View>
          <Pressable
            onPress={onCompleteDailyCheck}
            disabled={dailyCheckDone}
            style={({ pressed }) => [
              styles.dailyCheckButton,
              {
                backgroundColor: dailyCheckDone ? colors.secondary : colors.accent,
                opacity: pressed ? 0.76 : 1,
              },
            ]}
          >
            <Feather
              name={dailyCheckDone ? 'check-circle' : 'circle'}
              size={17}
              color={dailyCheckDone ? colors.primary : colors.accentForeground}
            />
            <Text style={[styles.dailyCheckText, { color: dailyCheckDone ? colors.leafDark : colors.accentForeground }]}>
              {dailyCheckDone ? copy.profile.dailyDone : copy.profile.dailyAction}
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.profileSection}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{copy.profile.farmDetails}</Text>
        <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.profileRow}>
            <View style={[styles.profileIconWrap, { backgroundColor: colors.secondary }]}>
              <Feather name="grid" size={18} color={colors.primary} />
            </View>
            <View style={styles.profileRowCopy}>
              <Text style={[styles.profileRowTitle, { color: colors.foreground }]}>{copy.profile.farmSize}</Text>
              <Text style={[styles.profileRowSubtitle, { color: colors.mutedForeground }]}>{copy.profile.mainCrop}</Text>
            </View>
          </View>
          <View style={styles.profileDivider} />
          <View style={styles.profileRow}>
            <View style={[styles.profileIconWrap, { backgroundColor: colors.secondary }]}>
              <Feather name="layers" size={18} color={colors.primary} />
            </View>
            <View style={styles.profileRowCopy}>
              <Text style={[styles.profileRowTitle, { color: colors.foreground }]}>{copy.profile.soilType}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.profileSection}>
        <Pressable
          onPress={onLanguage}
          style={({ pressed }) => [styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
        >
          <View style={styles.profileRow}>
            <View style={[styles.profileIconWrap, { backgroundColor: colors.muted }]}>
              <Feather name="globe" size={18} color={colors.foreground} />
            </View>
            <View style={styles.profileRowCopy}>
              <Text style={[styles.profileRowTitle, { color: colors.foreground }]}>{copy.language.title}</Text>
            </View>
            <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
          </View>
        </Pressable>
      </View>

      <Text style={[styles.profileLocalNote, { color: colors.mutedForeground }]}>
        This profile and daily activity are stored only on this device.
      </Text>
    </>
  );
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
  chatComposer: { marginHorizontal: 18, marginTop: 22, marginBottom: 20, borderRadius: 19, borderWidth: 1, padding: 6, flexDirection: 'row', alignItems: 'center', gap: 6 },
  chatInput: { flex: 1, minHeight: 40, paddingHorizontal: 10, fontFamily: 'Inter_400Regular', fontSize: 14 },
  micButton: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  sendButton: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  chatFootnote: { textAlign: 'center', fontFamily: 'Inter_400Regular', fontSize: 10, marginTop: 12, paddingHorizontal: 20 },
  mapSubtitle: { marginHorizontal: 22, marginTop: 69, marginBottom: 12, fontFamily: 'Inter_400Regular', fontSize: 13 },
  simulatorNotice: { marginHorizontal: 18, borderWidth: 1, borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  simulatorNoticeCopy: { flex: 1, gap: 2 },
  simulatorNoticeTitle: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 0.8 },
  simulatorNoticeText: { fontFamily: 'Inter_400Regular', fontSize: 11 },
  mapPickerLabel: { marginHorizontal: 22, marginTop: 16, marginBottom: 8, fontFamily: 'Inter_700Bold', fontSize: 12 },
  cityPickerLabel: { marginTop: 2 },
  mapPickerRow: { paddingHorizontal: 18, gap: 8 },
  mapChoice: { minHeight: 40, borderRadius: 13, borderWidth: 1, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  mapChoiceText: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  districtRow: { flexDirection: 'row', paddingHorizontal: 18, gap: 8, marginBottom: 14 },
  districtChoice: { flex: 1, minHeight: 42, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  districtChoiceText: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  mapCard: { marginHorizontal: 18, aspectRatio: 29.229 / 33.204, borderRadius: 24, borderWidth: 1, overflow: 'hidden', position: 'relative' },
  stateHotspot: { position: 'absolute', width: 38, height: 30, marginLeft: -19, marginTop: -15, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  stateHotspotText: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 0.3 },
  mapPoint: { position: 'absolute', alignItems: 'center', transform: [{ translateX: -20 }, { translateY: -17.5 }] },
  mapPin: { width: 35, height: 35, borderRadius: 17.5, alignItems: 'center', justifyContent: 'center', borderWidth: 3 },
  mapLabel: { paddingHorizontal: 7, paddingVertical: 4, borderRadius: 8, marginTop: 3, shadowColor: '#173126', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  mapLabelText: { fontFamily: 'Inter_600SemiBold', fontSize: 10 },
  mapLegend: { position: 'absolute', left: 12, bottom: 12, borderRadius: 11, padding: 9, gap: 5, shadowColor: '#173126', shadowOpacity: 0.08, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  legendText: { fontFamily: 'Inter_500Medium', fontSize: 10 },
  legendHeading: { fontFamily: 'Inter_700Bold', fontSize: 11 },
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
  mapTemperature: { fontFamily: 'Inter_700Bold', fontSize: 25 },
  weatherMetricRow: { flexDirection: 'row', marginHorizontal: 18, marginTop: 10, gap: 8 },
  weatherMetric: { flex: 1, borderWidth: 1, borderRadius: 14, paddingVertical: 12, alignItems: 'center', gap: 3 },
  weatherMetricValue: { fontFamily: 'Inter_700Bold', fontSize: 12 },
  weatherMetricLabel: { fontFamily: 'Inter_400Regular', fontSize: 9 },
  simulatorAdvice: { marginHorizontal: 18, marginTop: 10, borderRadius: 15, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 10 },
  simulatorAdviceText: { flex: 1, fontFamily: 'Inter_600SemiBold', fontSize: 12, lineHeight: 17 },
  mapUpdated: { textAlign: 'center', fontFamily: 'Inter_400Regular', fontSize: 10, marginTop: 12 },
  voiceIntro: { marginHorizontal: 22, marginTop: 69 },
  voiceBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 6 },
  voiceBadgeText: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1 },
  voiceTitle: { fontFamily: 'Inter_700Bold', fontSize: 27, letterSpacing: -0.6, marginTop: 15 },
  voiceDescription: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19, marginTop: 6, maxWidth: 300 },
  voiceLanguage: { marginHorizontal: 18, marginTop: 19, padding: 11, borderRadius: 17, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  voiceLanguageIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  voiceLanguageCopy: { flex: 1, gap: 3 },
  voiceLanguageLabel: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1 },
  voiceLanguageName: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  voiceCard: { marginHorizontal: 18, marginTop: 18, borderRadius: 23, borderWidth: 1, alignItems: 'center', padding: 22 },
  voiceOrb: { width: 118, height: 118, borderRadius: 59, alignItems: 'center', justifyContent: 'center' },
  voiceOrbInner: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center' },
  voiceCardTitle: { fontFamily: 'Inter_700Bold', fontSize: 17, marginTop: 17 },
  voiceCardHint: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 4 },
  voicePlayButton: { width: '100%', minHeight: 48, borderRadius: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 18 },
  voicePlayText: { fontFamily: 'Inter_700Bold', fontSize: 13 },
  voiceAskLabel: { fontFamily: 'Inter_700Bold', fontSize: 15, marginHorizontal: 22, marginTop: 25, marginBottom: 10 },
  voiceAskBox: { marginHorizontal: 18, borderWidth: 1, borderRadius: 18, padding: 6, flexDirection: 'row', alignItems: 'center', gap: 6 },
  voiceInput: { flex: 1, minHeight: 40, paddingHorizontal: 10, fontFamily: 'Inter_400Regular', fontSize: 14 },
  voiceNote: { textAlign: 'center', fontFamily: 'Inter_400Regular', fontSize: 10, lineHeight: 15, marginTop: 12, paddingHorizontal: 24 },
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
  postPhoto: { width: '100%', height: 168, borderRadius: 14, marginTop: 12, backgroundColor: '#E9EFE6' },
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
  languageOverlay: { flex: 1, alignItems: 'flex-end', justifyContent: 'flex-start', paddingTop: 78, paddingHorizontal: 18, backgroundColor: 'rgba(23,49,38,0.18)' },
  languageSheet: { width: '100%', maxWidth: 390, alignSelf: 'center', borderRadius: 24, paddingHorizontal: 18, paddingTop: 10, paddingBottom: 18 },
  languageList: { maxHeight: 470, flexGrow: 0, marginTop: 3 },
  languageOption: { minHeight: 51, borderRadius: 14, marginTop: 9, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 9 },
  languageOptionText: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  languageEnglishName: { fontFamily: 'Inter_400Regular', fontSize: 11, flex: 1 },
  composer: { borderTopLeftRadius: 27, borderTopRightRadius: 27, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16 },
  selectorSheet: { maxHeight: '86%', borderTopLeftRadius: 27, borderTopRightRadius: 27, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 18 },
  composerHandle: { width: 38, height: 4, backgroundColor: '#DCE9D8', borderRadius: 2, alignSelf: 'center', marginBottom: 17 },
  composerTitle: { fontFamily: 'Inter_700Bold', fontSize: 19 },
  composerHint: { fontFamily: 'Inter_400Regular', fontSize: 13, marginTop: 4 },
  postInput: { minHeight: 110, borderRadius: 16, marginTop: 16, padding: 13, fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 20 },
  publishButton: { marginTop: 12, minHeight: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  publishText: { fontFamily: 'Inter_700Bold', fontSize: 13 },
  composerTools: { flexDirection: 'row', gap: 8, marginTop: 12 },
  toolButton: { minHeight: 40, borderRadius: 12, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 7 },
  toolButtonText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  composerPreview: { marginTop: 12, height: 120, borderRadius: 14, overflow: 'hidden' },
  previewImage: { width: '100%', height: '100%' },
  removePhoto: { position: 'absolute', right: 8, top: 8, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  respectStatus: { fontFamily: 'Inter_500Medium', fontSize: 11, lineHeight: 16, marginTop: 12 },
  treeRow: { minHeight: 48, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 8 },
  mapTree: { borderRadius: 15, overflow: 'hidden', marginBottom: 8 },
  mapHint: { fontFamily: 'Inter_400Regular', fontSize: 11, marginBottom: 9 },
  treeText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, flex: 1 },
  treeMeta: { fontFamily: 'Inter_400Regular', fontSize: 10 },
  treeNested: { paddingLeft: 31, paddingVertical: 3 },
  nestedLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 11, paddingVertical: 6 },
  cityRow: { minHeight: 38, borderRadius: 10, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  cityRowText: { fontFamily: 'Inter_500Medium', fontSize: 12, flex: 1 },
  hourGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 17 },
  hourCell: { width: '31%', minHeight: 72, borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 7 },
  hourText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  forecastRows: { marginTop: 15, gap: 10 },
  forecastLine: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  forecastIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  forecastCopy: { flex: 1, gap: 2 },
  forecastTitle: { fontFamily: 'Inter_500Medium', fontSize: 10 },
  forecastValue: { fontFamily: 'Inter_600SemiBold', fontSize: 12, lineHeight: 17 },
  recommendation: { flexDirection: 'row', gap: 9, borderWidth: 1, borderRadius: 15, padding: 13, marginTop: 17, marginBottom: 12 },
  recommendationText: { flex: 1, fontFamily: 'Inter_600SemiBold', fontSize: 12, lineHeight: 18 },
  voiceTranscript: { borderRadius: 16, padding: 14, marginTop: 14, gap: 7 },
  voiceTranscriptLabel: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1 },
  voiceTranscriptText: { fontFamily: 'Inter_500Medium', fontSize: 13, lineHeight: 19 },
  translationBox: { marginHorizontal: -14, marginBottom: -14, marginTop: 12, padding: 12, borderBottomLeftRadius: 18, borderBottomRightRadius: 18 },
  translationTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  translationLabel: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 0.8 },
  translationText: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 18 },
  translationLanguageRow: { gap: 6, paddingVertical: 8 },
  translationLanguageChip: { minHeight: 31, borderRadius: 10, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' },
  translationLanguageText: { fontFamily: 'Inter_600SemiBold', fontSize: 10 },
  messageContentWrap: { flex: 1, gap: 6 },
  translateChatButton: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginTop: 4 },
  translateChatText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  chatTranslationBox: { padding: 8, borderRadius: 8, marginTop: 2 },
  chatTranslationText: { fontFamily: 'Inter_500Medium', fontSize: 12, fontStyle: 'italic' },
  profileHeader: { alignItems: 'center', marginTop: 40, marginBottom: 30 },
  profileAvatar: { width: 80, height: 80, borderRadius: 40, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  profileName: { fontFamily: 'Inter_700Bold', fontSize: 24, letterSpacing: -0.5 },
  profileSection: { paddingHorizontal: 18, marginBottom: 24 },
  profileCard: { borderRadius: 20, borderWidth: 1, padding: 16, marginTop: 12 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  profileIconWrap: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  profileRowCopy: { flex: 1, gap: 2 },
  profileRowTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  profileRowSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 13 },
  profileDivider: { height: 1, backgroundColor: '#EDF2EA', marginVertical: 14 },
  dailyCheckButton: { minHeight: 46, borderRadius: 14, marginTop: 15, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  dailyCheckText: { fontFamily: 'Inter_700Bold', fontSize: 12 },
  actionButton: { minHeight: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  actionButtonText: { fontFamily: 'Inter_700Bold', fontSize: 14 },
  profileLocalNote: { marginHorizontal: 30, marginTop: 2, marginBottom: 38, textAlign: 'center', fontFamily: 'Inter_400Regular', fontSize: 10, lineHeight: 15 },
  logoutButton: { marginHorizontal: 18, marginTop: 20, marginBottom: 40, minHeight: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF5F5' },
  logoutText: { fontFamily: 'Inter_700Bold', fontSize: 15 },
});