import React, { useState, useCallback } from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import { AppContext } from '../AppContext';
import { getJSON } from '../storage';
import { C } from '../theme';
import PlanTab from './tabs/PlanTab';
import TodayTab from './tabs/TodayTab';
import DiscoverTab from './tabs/DiscoverTab';
import MoreTab from './tabs/MoreTab';
import AccountScreen from './AccountScreen';

const Tab = createBottomTabNavigator();

const ICONS = { Plan: '📋', Today: '✅', Discover: '🎓', More: '⋯', Profile: '👤' };
const TITLES = { Plan: 'План', Today: 'Сегодня', Discover: 'Подбор', More: 'Ещё', Profile: 'Профиль' };

export default function MainTabs({ route }) {
  const params = route.params || {};
  const { token } = params;
  const [user, setUser] = useState(params.user);
  const [onboarding, setOnboarding] = useState(params.onboarding);

  useFocusEffect(useCallback(() => {
    (async () => {
      const u = await getJSON('user');
      if (u) setUser(u);
      const email = u?.email || params.user?.email;
      if (email) {
        const o = await getJSON(`onboarding_${email}`);
        if (o) setOnboarding(o);
      }
    })();
  }, []));

  return (
    <AppContext.Provider value={{ token, user, onboarding }}>
      <Tab.Navigator
        screenOptions={({ route: r }) => ({
          headerShown: false,
          tabBarActiveTintColor: C.primary,
          tabBarInactiveTintColor: C.faint,
          tabBarStyle: { backgroundColor: C.bg2, borderTopColor: C.border, borderTopWidth: 1 },
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
          title: TITLES[r.name],
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 17, color }}>{ICONS[r.name]}</Text>,
        })}
      >
        <Tab.Screen name="Plan" component={PlanTab} />
        <Tab.Screen name="Today" component={TodayTab} />
        <Tab.Screen name="Discover" component={DiscoverTab} />
        <Tab.Screen name="More" component={MoreTab} />
        <Tab.Screen name="Profile" component={AccountScreen} />
      </Tab.Navigator>
    </AppContext.Provider>
  );
}
