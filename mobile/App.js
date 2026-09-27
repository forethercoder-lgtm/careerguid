import 'react-native-gesture-handler';
import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import WelcomeScreen from './src/screens/WelcomeScreen';
import AuthScreen from './src/screens/AuthScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import MainTabs from './src/screens/MainTabs';
import OrientationChatScreen from './src/screens/OrientationChatScreen';
import OrientationResultsScreen from './src/screens/OrientationResultsScreen';
import EssayFeedbackScreen from './src/screens/EssayFeedbackScreen';
import PreferencesSurveyScreen from './src/screens/PreferencesSurveyScreen';
import IeltsScreen from './src/screens/IeltsScreen';
import IeltsPretestScreen from './src/screens/IeltsPretestScreen';
import PremiumScreen from './src/screens/PremiumScreen';
import { getItem, getJSON } from './src/storage';
import { C } from './src/theme';
import { configureNotifications } from './src/notifications';
import { EntitlementsProvider } from './src/entitlements';

const Stack = createNativeStackNavigator();

export default function App() {
  const [initial, setInitial] = useState(null); // { route, params } | null while loading

  useEffect(() => {
    configureNotifications();
    (async () => {
      const token = await getItem('token');
      const user = await getJSON('user');
      if (!token || !user) { setInitial({ route: 'Welcome', params: undefined }); return; }
      const onboarding = await getJSON(`onboarding_${user.email}`);
      if (onboarding) setInitial({ route: 'Main', params: { token, user, onboarding } });
      else setInitial({ route: 'Onboarding', params: { token, user } });
    })();
  }, []);

  if (!initial) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <EntitlementsProvider>
          <NavigationContainer>
            <Stack.Navigator initialRouteName={initial.route} screenOptions={{ headerShown: false }}>
              <Stack.Screen name="Welcome" component={WelcomeScreen} initialParams={initial.route === 'Welcome' ? initial.params : undefined} />
              <Stack.Screen name="Auth" component={AuthScreen} initialParams={initial.route === 'Auth' ? initial.params : undefined} />
              <Stack.Screen name="Onboarding" component={OnboardingScreen} initialParams={initial.route === 'Onboarding' ? initial.params : undefined} />
              <Stack.Screen name="Main" component={MainTabs} initialParams={initial.route === 'Main' ? initial.params : undefined} />
              <Stack.Screen name="OrientationChat" component={OrientationChatScreen} />
              <Stack.Screen name="OrientationResults" component={OrientationResultsScreen} />
              <Stack.Screen name="EssayFeedback" component={EssayFeedbackScreen} />
              <Stack.Screen name="PreferencesSurvey" component={PreferencesSurveyScreen} />
              <Stack.Screen name="Ielts" component={IeltsScreen} />
              <Stack.Screen name="IeltsPretest" component={IeltsPretestScreen} />
              <Stack.Screen name="Premium" component={PremiumScreen} />
            </Stack.Navigator>
          </NavigationContainer>
        </EntitlementsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
