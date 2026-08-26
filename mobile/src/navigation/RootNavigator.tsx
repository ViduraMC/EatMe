import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuth } from '../context/AuthContext';
import { colours, fontSize, fontWeight } from '../constants/theme';

import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { MyListingsScreen } from '../screens/donor/MyListingsScreen';
import { CreateListingScreen } from '../screens/donor/CreateListingScreen';
import { AddItemsScreen } from '../screens/donor/AddItemsScreen';
import { ListingDetailScreen } from '../screens/donor/ListingDetailScreen';
import { RecipientHomeScreen } from '../screens/recipient/RecipientHomeScreen';
import { CoordinatorHomeScreen } from '../screens/coordinator/CoordinatorHomeScreen';
import { DriversListScreen } from '../screens/coordinator/DriversListScreen';
import { DriverHomeScreen } from '../screens/driver/DriverHomeScreen';
import { AdminHomeScreen } from '../screens/admin/AdminHomeScreen';

import type {
  AdminStackParamList,
  AuthStackParamList,
  CoordinatorStackParamList,
  DonorStackParamList,
  DriverStackParamList,
  RecipientStackParamList,
} from './types';

/**
 * Role based navigation.
 *
 * Exactly one stack is mounted at a time. When a donor is signed in, the
 * coordinator screens are not merely hidden, they are not part of the
 * navigation tree at all, so there is no route a donor could navigate to even
 * by mistake.
 *
 * This is a convenience, not a security control. The real check is
 * requireRole on the server, because anyone can send a request without using
 * the app at all.
 */

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const DonorStack = createNativeStackNavigator<DonorStackParamList>();
const RecipientStack = createNativeStackNavigator<RecipientStackParamList>();
const CoordinatorStack = createNativeStackNavigator<CoordinatorStackParamList>();
const DriverStack = createNativeStackNavigator<DriverStackParamList>();
const AdminStack = createNativeStackNavigator<AdminStackParamList>();

const screenOptions = {
  headerStyle: { backgroundColor: colours.background },
  headerTintColor: colours.textPrimary,
  headerTitleStyle: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold as '600',
  },
  contentStyle: { backgroundColor: colours.background },
};

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ ...screenOptions, headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

/** Donation and Food Listing. Owner: Vidura. */
function DonorNavigator() {
  return (
    <DonorStack.Navigator screenOptions={screenOptions}>
      <DonorStack.Screen
        name="MyListings"
        component={MyListingsScreen}
        options={{ title: 'My Listings' }}
      />
      <DonorStack.Screen
        name="CreateListing"
        component={CreateListingScreen}
        options={{ title: 'Create Listing' }}
      />
      <DonorStack.Screen
        name="AddItems"
        component={AddItemsScreen}
        options={{ title: 'Add Food Items' }}
      />
      <DonorStack.Screen
        name="ListingDetail"
        component={ListingDetailScreen}
        options={{ title: 'Listing' }}
      />
    </DonorStack.Navigator>
  );
}

/** Haritha adds recipient screens here. */
function RecipientNavigator() {
  return (
    <RecipientStack.Navigator screenOptions={screenOptions}>
      <RecipientStack.Screen
        name="RecipientHome"
        component={RecipientHomeScreen}
        options={{ title: 'Available Food' }}
      />
    </RecipientStack.Navigator>
  );
}

/** Kaushal adds coordinator screens here. */
function CoordinatorNavigator() {
  return (
    <CoordinatorStack.Navigator screenOptions={screenOptions}>
      <CoordinatorStack.Screen
        name="CoordinatorHome"
        component={CoordinatorHomeScreen}
        options={{ title: 'Deliveries' }}
      />
      <CoordinatorStack.Screen
        name="DriversList"
        component={DriversListScreen}
        options={{ title: 'Drivers' }}
      />
    </CoordinatorStack.Navigator>
  );
}

/** Lakkhana adds driver screens here. */
function DriverNavigator() {
  return (
    <DriverStack.Navigator screenOptions={screenOptions}>
      <DriverStack.Screen
        name="DriverHome"
        component={DriverHomeScreen}
        options={{ title: 'My Deliveries' }}
      />
    </DriverStack.Navigator>
  );
}

/** Naily adds admin screens here. */
function AdminNavigator() {
  return (
    <AdminStack.Navigator screenOptions={screenOptions}>
      <AdminStack.Screen
        name="AdminHome"
        component={AdminHomeScreen}
        options={{ title: 'Administration' }}
      />
    </AdminStack.Navigator>
  );
}

function LoadingScreen() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color={colours.accent} />
    </View>
  );
}

export function RootNavigator() {
  const { user, isRestoring } = useAuth();

  return (
    <NavigationContainer>
      {isRestoring ? (
        // Held here until the stored token has been checked, so the app does
        // not flash the login screen and then jump to a role stack.
        <LoadingScreen />
      ) : !user ? (
        <AuthNavigator />
      ) : user.role === 'donor' ? (
        <DonorNavigator />
      ) : user.role === 'recipient' ? (
        <RecipientNavigator />
      ) : user.role === 'coordinator' ? (
        <CoordinatorNavigator />
      ) : user.role === 'driver' ? (
        <DriverNavigator />
      ) : (
        <AdminNavigator />
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colours.background,
  },
});
