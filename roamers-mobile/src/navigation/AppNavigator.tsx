import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

import { COLORS } from '../constants/theme';
import Icon from '../components/Icons';
import { LOGO_URI } from '../components/AppBottomBar';


/* â”€â”€ Screen imports â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
import HomeScreen             from '../screens/HomeScreen';
import ExplorerScreen         from '../screens/ExplorerScreen';
import MapScreen              from '../screens/MapScreen';
import PlanScreen             from '../screens/PlanScreen';
import ActivitiesScreen       from '../screens/ActivitiesScreen';
import ExperienceDetailScreen from '../screens/ExperienceDetailScreen';
import ActivityDetailScreen   from '../screens/ActivityDetailScreen';
import BookingScreen          from '../screens/BookingScreen';
import BookingSuccessScreen   from '../screens/BookingSuccessScreen';
import MyBookingsScreen       from '../screens/MyBookingsScreen';
import ProfileScreen          from '../screens/ProfileScreen';
import LoginScreen            from '../screens/LoginScreen';
import RegisterScreen         from '../screens/RegisterScreen';
import TeamScreen             from '../screens/TeamScreen';
import ContactScreen          from '../screens/ContactScreen';

const Tab   = createBottomTabNavigator();
const Stack = createStackNavigator();

/* â”€â”€ Custom bottom tab bar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

const TAB_LABELS: Record<string, string> = {
  Explorer: 'Explorer',
  Map:      'Carte',
  Home:     'Accueil',
  Plan:     'Planifier',
  Profile:  'Profil',
};

function TabIcon({ routeName, focused }: { routeName: string; focused: boolean }) {
  const color = focused ? COLORS.primary : COLORS.muted;
  switch (routeName) {
    case 'Explorer': return <Icon.Mountain size={22} color={color} />;
    case 'Map':      return <Icon.Pin      size={22} color={color} />;
    case 'Plan':     return <Icon.Compass  size={22} color={color} />;
    case 'Profile':  return <Icon.Person   size={22} color={color} />;
    default:         return null;
  }
}

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[tb.bar, { paddingBottom: (insets.bottom || 8) }]}>
      {state.routes.map((route, idx) => {
        const focused  = state.index === idx;
        const isCenter = idx === 2; // Home is the 3rd tab

        const onPress = () => {
          const evt = navigation.emit({
            type: 'tabPress', target: route.key, canPreventDefault: true,
          });
          if (!focused && !evt.defaultPrevented) navigation.navigate(route.name);
        };

        /* â”€â”€ Center "R" button â”€â”€ */
        if (isCenter) {
          return (
            <TouchableOpacity
              key={route.key}
              style={tb.centerTab}
              onPress={onPress}
              activeOpacity={0.85}
            >
              <View style={[tb.rBtn, { backgroundColor: COLORS.primaryDk, overflow: 'hidden' }]}>
                <Image
                  source={{ uri: LOGO_URI }}
                  style={{ width: 56, height: 56 }}
                  resizeMode="cover"
                />
              </View>
              <Text style={[tb.label, focused && tb.labelActive]}>Accueil</Text>
            </TouchableOpacity>
          );
        }

        /* â”€â”€ Regular tab â”€â”€ */
        return (
          <TouchableOpacity
            key={route.key}
            style={tb.tab}
            onPress={onPress}
            activeOpacity={0.75}
          >
            {focused && <View style={tb.activeBar} />}
            <TabIcon routeName={route.name} focused={focused} />
            <Text style={[tb.label, focused && tb.labelActive]}>
              {TAB_LABELS[route.name] || route.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const tb = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 8,
    overflow: 'visible',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingBottom: 2,
    position: 'relative',
  },
  centerTab: {
    flex: 1,
    alignItems: 'center',
    paddingBottom: 2,
  },
  activeBar: {
    position: 'absolute',
    top: -9,
    width: 22,
    height: 2.5,
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  /* Elevated R button */
  rBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -26,
    borderWidth: 3,
    borderColor: COLORS.card,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.55,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 14,
    elevation: 14,
  },
  label: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
    includeFontPadding: false,
  },
  labelActive: {
    color: COLORS.primary,
    fontWeight: '800',
  },
});

/* â”€â”€ Tab navigator â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function Tabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      {/* Order: Explorer | Map | HOME (center) | Plan | Profile */}
      <Tab.Screen name="Explorer" component={ExplorerScreen} />
      <Tab.Screen name="Map"      component={MapScreen}      />
      <Tab.Screen name="Home"     component={HomeScreen}     />
      <Tab.Screen name="Plan"     component={PlanScreen}     />
      <Tab.Screen name="Profile"  component={ProfileScreen}  />
    </Tab.Navigator>
  );
}

/* â”€â”€ Root stack navigator â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, cardStyle: { backgroundColor: COLORS.bg } }}>
        <Stack.Screen name="Tabs"             component={Tabs} />
        <Stack.Screen name="ExperienceDetail" component={ExperienceDetailScreen} options={{ presentation: 'card' }} />
        <Stack.Screen name="Booking"          component={BookingScreen}          options={{ presentation: 'modal' }} />
        <Stack.Screen name="BookingSuccess"   component={BookingSuccessScreen}   options={{ presentation: 'modal', gestureEnabled: false }} />
        <Stack.Screen name="MyBookings"       component={MyBookingsScreen}       options={{ presentation: 'card' }} />
        <Stack.Screen name="Activities"       component={ActivitiesScreen}       options={{ presentation: 'card' }} />
        <Stack.Screen name="ActivityDetail"   component={ActivityDetailScreen}   options={{ presentation: 'card' }} />
        <Stack.Screen name="Team"             component={TeamScreen}             options={{ presentation: 'card' }} />
        <Stack.Screen name="Contact"          component={ContactScreen}          options={{ presentation: 'card' }} />
        <Stack.Screen name="Login"            component={LoginScreen}            options={{ presentation: 'modal' }} />
        <Stack.Screen name="Register"         component={RegisterScreen}         options={{ presentation: 'modal' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
