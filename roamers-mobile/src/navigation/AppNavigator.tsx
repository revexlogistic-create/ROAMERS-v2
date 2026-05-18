import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

import { COLORS } from '../constants/theme';
const LOGO_URI = 'data:image/png;base64,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';


/* â”€â”€ Screen imports â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
import HomeScreen             from '../screens/HomeScreen';
import ExplorerScreen         from '../screens/ExplorerScreen';
import MapScreen              from '../screens/MapScreen';
import PlanScreen             from '../screens/PlanScreen';
import ActivitiesScreen       from '../screens/ActivitiesScreen';
import ExperienceDetailScreen from '../screens/ExperienceDetailScreen';
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

/* â”€â”€ Icon components (pure View, no SVG dep) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

/** Two mountain peaks â€” Explorer / adventure */
function PeaksIcon({ color }: { color: string }) {
  return (
    <View style={{ width: 26, height: 20, alignItems: 'center', justifyContent: 'flex-end' }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
        <View style={{
          width: 0, height: 0, borderStyle: 'solid',
          borderLeftWidth: 6, borderRightWidth: 6, borderBottomWidth: 10,
          borderLeftColor: 'transparent', borderRightColor: 'transparent',
          borderBottomColor: color, marginRight: 3, marginBottom: 2,
        }} />
        <View style={{
          width: 0, height: 0, borderStyle: 'solid',
          borderLeftWidth: 9, borderRightWidth: 9, borderBottomWidth: 15,
          borderLeftColor: 'transparent', borderRightColor: 'transparent',
          borderBottomColor: color,
        }} />
      </View>
    </View>
  );
}

/** Location pin â€” Map */
function PinIcon({ color }: { color: string }) {
  return (
    <View style={{ alignItems: 'center', height: 22, paddingTop: 1 }}>
      <View style={{
        width: 14, height: 14, borderRadius: 7,
        borderWidth: 2.5, borderColor: color,
      }} />
      <View style={{ width: 3, height: 7, backgroundColor: color }} />
      <View style={{ width: 7, height: 3, borderRadius: 2, backgroundColor: color, marginTop: -1.5 }} />
    </View>
  );
}

/** Compass rose â€” Plan my trip */
function CompassIcon({ color }: { color: string }) {
  return (
    <View style={{
      width: 22, height: 22, borderRadius: 11,
      borderWidth: 2, borderColor: color,
      alignItems: 'center', justifyContent: 'center',
    }}>
      <View style={{ alignItems: 'center' }}>
        <View style={{
          width: 0, height: 0, borderStyle: 'solid',
          borderLeftWidth: 3, borderRightWidth: 3, borderBottomWidth: 5,
          borderLeftColor: 'transparent', borderRightColor: 'transparent',
          borderBottomColor: color,
        }} />
        <View style={{
          width: 0, height: 0, borderStyle: 'solid',
          borderLeftWidth: 3, borderRightWidth: 3, borderTopWidth: 5,
          borderLeftColor: 'transparent', borderRightColor: 'transparent',
          borderTopColor: color + '55',
        }} />
      </View>
    </View>
  );
}

/** Person silhouette â€” Profile */
function PersonIcon({ color }: { color: string }) {
  return (
    <View style={{ alignItems: 'center', height: 22, paddingTop: 1 }}>
      <View style={{
        width: 10, height: 10, borderRadius: 5,
        borderWidth: 2, borderColor: color, marginBottom: 2,
      }} />
      <View style={{
        width: 18, height: 9,
        borderTopLeftRadius: 9, borderTopRightRadius: 9,
        borderWidth: 2, borderColor: color, borderBottomWidth: 0,
      }} />
    </View>
  );
}

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
    case 'Explorer': return <PeaksIcon   color={color} />;
    case 'Map':      return <PinIcon     color={color} />;
    case 'Plan':     return <CompassIcon color={color} />;
    case 'Profile':  return <PersonIcon  color={color} />;
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
        <Stack.Screen name="Team"             component={TeamScreen}             options={{ presentation: 'card' }} />
        <Stack.Screen name="Contact"          component={ContactScreen}          options={{ presentation: 'card' }} />
        <Stack.Screen name="Login"            component={LoginScreen}            options={{ presentation: 'modal' }} />
        <Stack.Screen name="Register"         component={RegisterScreen}         options={{ presentation: 'modal' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
