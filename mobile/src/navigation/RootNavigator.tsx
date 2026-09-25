import React, { useMemo } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import {
  createNativeStackNavigator,
  type NativeStackNavigationOptions,
} from '@react-navigation/native-stack';
import {
  createBottomTabNavigator,
  type BottomTabNavigationOptions,
} from '@react-navigation/bottom-tabs';

import { EatMeTabBar, type TabIcons } from '../components';
import { useAuth } from '../context/AuthContext';
import { useOnboarding } from '../context/OnboardingContext';
import { useT } from '../i18n';
import { useTheme } from '../theme';
import { useReducedMotion } from '../theme/animations';

import { SplashScreen } from '../screens/shared/SplashScreen';
import { ProfileScreen } from '../screens/shared/ProfileScreen';
import { LanguageScreen } from '../screens/onboarding/LanguageScreen';
import { IntroScreen } from '../screens/onboarding/IntroScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { RegisterPendingScreen } from '../screens/auth/RegisterPendingScreen';
import { MyListingsScreen } from '../screens/donor/MyListingsScreen';
import { CreateListingScreen } from '../screens/donor/CreateListingScreen';
import { AddItemsScreen } from '../screens/donor/AddItemsScreen';
import { ListingDetailScreen } from '../screens/donor/ListingDetailScreen';
import { IncomingRequestsScreen } from '../screens/donor/IncomingRequestsScreen';
import { ConfirmPickupScreen } from '../screens/donor/ConfirmPickupScreen';
import { usePendingPickups } from '../screens/donor/pickupBadge';
import { BrowseListingsScreen } from '../screens/recipient/BrowseListingsScreen';
import { ListingDetailScreen as RecipientListingDetailScreen } from '../screens/recipient/ListingDetailScreen';
import { CreateRequestScreen } from '../screens/recipient/CreateRequestScreen';
import { MyRequestsScreen } from '../screens/recipient/MyRequestsScreen';
import { CoordinatorHomeScreen } from '../screens/coordinator/CoordinatorHomeScreen';
import { DriversListScreen } from '../screens/coordinator/DriversListScreen';
import { CreateAssignmentScreen } from '../screens/coordinator/CreateAssignmentScreen';
import { AssignmentsListScreen } from '../screens/coordinator/AssignmentsListScreen';
import { AssignmentDetailScreen } from '../screens/coordinator/AssignmentDetailScreen';
import { DriverDashboardScreen } from '../screens/driver/DriverDashboardScreen';
import { DeliveryHistoryScreen } from '../screens/driver/DeliveryHistoryScreen';
import { AdminHomeScreen } from '../screens/admin/AdminHomeScreen';
import { AdminListingsScreen } from '../screens/admin/AdminListingsScreen';
import { AdminRequestsScreen } from '../screens/admin/AdminRequestsScreen';
import { AdminAssignmentsScreen } from '../screens/admin/AdminAssignmentsScreen';
import { AdminUsersScreen } from '../screens/admin/AdminUsersScreen';
import { AdminReportsScreen } from '../screens/admin/AdminReportsScreen';

import type {
  AdminStackParamList,
  AdminTabParamList,
  AuthStackParamList,
  CoordinatorStackParamList,
  CoordinatorTabParamList,
  DonorStackParamList,
  DonorTabParamList,
  DriverStackParamList,
  DriverTabParamList,
  OnboardingStackParamList,
  RecipientStackParamList,
  RecipientTabParamList,
} from './types';

/**
 * Navigation.
 *
 * The root is a single stack whose one screen depends on state: the splash
 * while the saved session is checked, onboarding on first launch, sign-in
 * when signed out, otherwise the role's own navigator. Because it is one
 * stack, moving between these states crossfades instead of cutting.
 *
 * Each role gets bottom tabs for the places it returns to, inside a stack
 * for the screens it drills into. Only one role's navigator is ever mounted:
 * a donor's app does not merely hide coordinator screens, it does not
 * contain them. That is a convenience, not a security control; the server's
 * requireRole middleware is the real check.
 */

type RootParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Auth: undefined;
  App: undefined;
};

const Root = createNativeStackNavigator<RootParamList>();
const OnboardingStack = createNativeStackNavigator<OnboardingStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const DonorStack = createNativeStackNavigator<DonorStackParamList>();
const DonorTab = createBottomTabNavigator<DonorTabParamList>();
const RecipientStack = createNativeStackNavigator<RecipientStackParamList>();
const RecipientTab = createBottomTabNavigator<RecipientTabParamList>();
const CoordinatorStack = createNativeStackNavigator<CoordinatorStackParamList>();
const CoordinatorTab = createBottomTabNavigator<CoordinatorTabParamList>();
const DriverStack = createNativeStackNavigator<DriverStackParamList>();
const DriverTab = createBottomTabNavigator<DriverTabParamList>();
const AdminStack = createNativeStackNavigator<AdminStackParamList>();
const AdminTab = createBottomTabNavigator<AdminTabParamList>();

/** Themed options for pushed screens: native header, no hard shadow, minimal back button. */
function useStackOptions(): NativeStackNavigationOptions {
  const theme = useTheme();
  const reduced = useReducedMotion();
  return useMemo(
    () => ({
      headerStyle: { backgroundColor: theme.colors.background },
      headerTintColor: theme.colors.text,
      headerTitleStyle: { fontFamily: theme.fonts.bold, fontSize: 17 },
      headerShadowVisible: false,
      headerBackButtonDisplayMode: 'minimal',
      contentStyle: { backgroundColor: theme.colors.background },
      animation: reduced ? 'fade' : 'slide_from_right',
    }),
    [theme, reduced],
  );
}

/** Options shared by every role's tabs. Tab roots draw their own large titles. */
function useTabOptions(): BottomTabNavigationOptions {
  const reduced = useReducedMotion();
  return useMemo(
    () => ({ headerShown: false, animation: reduced ? 'none' : 'shift' }),
    [reduced],
  );
}

// ---------------------------------------------------------------------------
// Onboarding and auth
// ---------------------------------------------------------------------------

function OnboardingNavigator() {
  const reduced = useReducedMotion();
  return (
    <OnboardingStack.Navigator
      screenOptions={{
        headerShown: false,
        animation: reduced ? 'fade' : 'slide_from_right',
      }}
    >
      <OnboardingStack.Screen name="Language" component={LanguageScreen} />
      <OnboardingStack.Screen name="Intro" component={IntroScreen} />
    </OnboardingStack.Navigator>
  );
}

function AuthNavigator() {
  const reduced = useReducedMotion();
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
        animation: reduced ? 'fade' : 'slide_from_right',
      }}
    >
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen
        name="Register"
        component={RegisterScreen}
        options={{ animation: reduced ? 'fade' : 'slide_from_bottom' }}
      />
      <AuthStack.Screen name="RegisterPending" component={RegisterPendingScreen} />
    </AuthStack.Navigator>
  );
}

// ---------------------------------------------------------------------------
// Donor: Vidura
// ---------------------------------------------------------------------------

const DONOR_ICONS: TabIcons = {
  MyListings: { icon: 'mc:basket-outline', iconActive: 'mc:basket' },
  IncomingRequests: { icon: 'mail-unread-outline', iconActive: 'mail-unread' },
  ConfirmPickup: { icon: 'mc:handshake-outline', iconActive: 'mc:handshake' },
  DonorProfile: { icon: 'person-circle-outline', iconActive: 'person-circle' },
};

function DonorTabs() {
  const t = useT();
  const options = useTabOptions();
  const pendingPickups = usePendingPickups();
  return (
    <DonorTab.Navigator
      screenOptions={options}
      tabBar={(props) => (
        <EatMeTabBar
          {...props}
          icons={DONOR_ICONS}
          centerAction={{
            label: t('tabs.donate'),
            icon: 'add',
            // Bubbles up from the tabs to the donor stack.
            onPress: () => props.navigation.navigate('CreateListing' as never),
          }}
        />
      )}
    >
      <DonorTab.Screen
        name="MyListings"
        component={MyListingsScreen}
        options={{ title: t('tabs.listings') }}
      />
      <DonorTab.Screen
        name="IncomingRequests"
        component={IncomingRequestsScreen}
        options={{ title: t('tabs.requests') }}
      />
      <DonorTab.Screen
        name="ConfirmPickup"
        component={ConfirmPickupScreen}
        options={{
          title: t('tabs.pickups'),
          tabBarBadge: pendingPickups > 0 ? pendingPickups : undefined,
        }}
      />
      <DonorTab.Screen
        name="DonorProfile"
        component={ProfileScreen}
        options={{ title: t('tabs.profile') }}
      />
    </DonorTab.Navigator>
  );
}

function DonorNavigator() {
  const t = useT();
  const stack = useStackOptions();
  const reduced = useReducedMotion();
  return (
    <DonorStack.Navigator screenOptions={stack}>
      <DonorStack.Screen
        name="DonorTabs"
        component={DonorTabs}
        options={{ headerShown: false }}
      />
      <DonorStack.Screen
        name="CreateListing"
        component={CreateListingScreen}
        options={{
          title: t('nav.createListing'),
          animation: reduced ? 'fade' : 'slide_from_bottom',
        }}
      />
      <DonorStack.Screen
        name="AddItems"
        component={AddItemsScreen}
        options={{ title: t('nav.addItems') }}
      />
      <DonorStack.Screen
        name="ListingDetail"
        component={ListingDetailScreen}
        options={{ title: t('nav.listing') }}
      />
    </DonorStack.Navigator>
  );
}

// ---------------------------------------------------------------------------
// Recipient: Haritha
// ---------------------------------------------------------------------------

const RECIPIENT_ICONS: TabIcons = {
  BrowseListings: { icon: 'mc:food-outline', iconActive: 'mc:food' },
  MyRequests: { icon: 'mc:clipboard-list-outline', iconActive: 'mc:clipboard-list' },
  RecipientProfile: { icon: 'person-circle-outline', iconActive: 'person-circle' },
};

function RecipientTabs() {
  const t = useT();
  const options = useTabOptions();
  return (
    <RecipientTab.Navigator
      screenOptions={options}
      tabBar={(props) => <EatMeTabBar {...props} icons={RECIPIENT_ICONS} />}
    >
      <RecipientTab.Screen
        name="BrowseListings"
        component={BrowseListingsScreen}
        options={{ title: t('tabs.browse') }}
      />
      <RecipientTab.Screen
        name="MyRequests"
        component={MyRequestsScreen}
        options={{ title: t('tabs.myRequests') }}
      />
      <RecipientTab.Screen
        name="RecipientProfile"
        component={ProfileScreen}
        options={{ title: t('tabs.profile') }}
      />
    </RecipientTab.Navigator>
  );
}

function RecipientNavigator() {
  const t = useT();
  const stack = useStackOptions();
  return (
    <RecipientStack.Navigator screenOptions={stack}>
      <RecipientStack.Screen
        name="RecipientTabs"
        component={RecipientTabs}
        options={{ headerShown: false }}
      />
      <RecipientStack.Screen
        name="ListingDetail"
        component={RecipientListingDetailScreen}
        options={{ title: t('nav.listing') }}
      />
      <RecipientStack.Screen
        name="CreateRequest"
        component={CreateRequestScreen}
        options={{ title: t('nav.requestFood') }}
      />
    </RecipientStack.Navigator>
  );
}

// ---------------------------------------------------------------------------
// Coordinator: Kaushal
// ---------------------------------------------------------------------------

const COORDINATOR_ICONS: TabIcons = {
  CoordinatorHome: {
    icon: 'mc:inbox-arrow-down-outline',
    iconActive: 'mc:inbox-arrow-down',
  },
  AssignmentsList: { icon: 'mc:truck-fast-outline', iconActive: 'mc:truck-fast' },
  DriversList: { icon: 'people-outline', iconActive: 'people' },
  CoordinatorProfile: { icon: 'person-circle-outline', iconActive: 'person-circle' },
};

function CoordinatorTabs() {
  const t = useT();
  const options = useTabOptions();
  return (
    <CoordinatorTab.Navigator
      screenOptions={options}
      tabBar={(props) => <EatMeTabBar {...props} icons={COORDINATOR_ICONS} />}
    >
      <CoordinatorTab.Screen
        name="CoordinatorHome"
        component={CoordinatorHomeScreen}
        options={{ title: t('tabs.queue') }}
      />
      <CoordinatorTab.Screen
        name="AssignmentsList"
        component={AssignmentsListScreen}
        options={{ title: t('tabs.deliveries') }}
      />
      <CoordinatorTab.Screen
        name="DriversList"
        component={DriversListScreen}
        options={{ title: t('tabs.drivers') }}
      />
      <CoordinatorTab.Screen
        name="CoordinatorProfile"
        component={ProfileScreen}
        options={{ title: t('tabs.profile') }}
      />
    </CoordinatorTab.Navigator>
  );
}

function CoordinatorNavigator() {
  const t = useT();
  const stack = useStackOptions();
  return (
    <CoordinatorStack.Navigator screenOptions={stack}>
      <CoordinatorStack.Screen
        name="CoordinatorTabs"
        component={CoordinatorTabs}
        options={{ headerShown: false }}
      />
      <CoordinatorStack.Screen
        name="CreateAssignment"
        component={CreateAssignmentScreen}
        options={{ title: t('nav.assignDriver') }}
      />
      <CoordinatorStack.Screen
        name="AssignmentDetail"
        component={AssignmentDetailScreen}
        options={{ title: t('nav.delivery') }}
      />
    </CoordinatorStack.Navigator>
  );
}

// ---------------------------------------------------------------------------
// Driver: Lakkhana
// ---------------------------------------------------------------------------

const DRIVER_ICONS: TabIcons = {
  DriverDashboard: { icon: 'mc:truck-outline', iconActive: 'mc:truck' },
  DriverHistory: { icon: 'time-outline', iconActive: 'time' },
  DriverProfile: { icon: 'person-circle-outline', iconActive: 'person-circle' },
};

function DriverTabs() {
  const t = useT();
  const options = useTabOptions();
  return (
    <DriverTab.Navigator
      screenOptions={options}
      tabBar={(props) => <EatMeTabBar {...props} icons={DRIVER_ICONS} />}
    >
      <DriverTab.Screen
        name="DriverDashboard"
        component={DriverDashboardScreen}
        options={{ title: t('tabs.deliveries') }}
      />
      <DriverTab.Screen
        name="DriverHistory"
        component={DeliveryHistoryScreen}
        options={{ title: t('tabs.history') }}
      />
      <DriverTab.Screen
        name="DriverProfile"
        component={ProfileScreen}
        options={{ title: t('tabs.profile') }}
      />
    </DriverTab.Navigator>
  );
}

function DriverNavigator() {
  const stack = useStackOptions();
  return (
    <DriverStack.Navigator screenOptions={stack}>
      <DriverStack.Screen
        name="DriverTabs"
        component={DriverTabs}
        options={{ headerShown: false }}
      />
    </DriverStack.Navigator>
  );
}

// ---------------------------------------------------------------------------
// Administrator: Naily
// ---------------------------------------------------------------------------

const ADMIN_ICONS: TabIcons = {
  AdminHome: { icon: 'grid-outline', iconActive: 'grid' },
  AdminUsers: { icon: 'people-outline', iconActive: 'people' },
  AdminReports: { icon: 'document-text-outline', iconActive: 'document-text' },
  AdminProfile: { icon: 'person-circle-outline', iconActive: 'person-circle' },
};

function AdminTabs() {
  const t = useT();
  const options = useTabOptions();
  return (
    <AdminTab.Navigator
      screenOptions={options}
      tabBar={(props) => <EatMeTabBar {...props} icons={ADMIN_ICONS} />}
    >
      <AdminTab.Screen
        name="AdminHome"
        component={AdminHomeScreen}
        options={{ title: t('tabs.overview') }}
      />
      <AdminTab.Screen
        name="AdminUsers"
        component={AdminUsersScreen}
        options={{ title: t('tabs.users') }}
      />
      <AdminTab.Screen
        name="AdminReports"
        component={AdminReportsScreen}
        options={{ title: t('tabs.reports') }}
      />
      <AdminTab.Screen
        name="AdminProfile"
        component={ProfileScreen}
        options={{ title: t('tabs.profile') }}
      />
    </AdminTab.Navigator>
  );
}

function AdminNavigator() {
  const t = useT();
  const stack = useStackOptions();
  return (
    <AdminStack.Navigator screenOptions={stack}>
      <AdminStack.Screen
        name="AdminTabs"
        component={AdminTabs}
        options={{ headerShown: false }}
      />
      <AdminStack.Screen
        name="AdminListings"
        component={AdminListingsScreen}
        options={{ title: t('nav.listings') }}
      />
      <AdminStack.Screen
        name="AdminRequests"
        component={AdminRequestsScreen}
        options={{ title: t('nav.requests') }}
      />
      <AdminStack.Screen
        name="AdminAssignments"
        component={AdminAssignmentsScreen}
        options={{ title: t('nav.deliveries') }}
      />
    </AdminStack.Navigator>
  );
}

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------

function RoleNavigator() {
  const { user } = useAuth();
  switch (user?.role) {
    case 'donor':
      return <DonorNavigator />;
    case 'recipient':
      return <RecipientNavigator />;
    case 'coordinator':
      return <CoordinatorNavigator />;
    case 'driver':
      return <DriverNavigator />;
    default:
      return <AdminNavigator />;
  }
}

export function RootNavigator() {
  const { user, isRestoring } = useAuth();
  const { onboarded } = useOnboarding();
  const theme = useTheme();

  return (
    <NavigationContainer theme={theme.navigation}>
      <Root.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        {isRestoring ? (
          <Root.Screen name="Splash" component={SplashScreen} />
        ) : !onboarded ? (
          <Root.Screen name="Onboarding" component={OnboardingNavigator} />
        ) : !user ? (
          <Root.Screen name="Auth" component={AuthNavigator} />
        ) : (
          <Root.Screen name="App" component={RoleNavigator} />
        )}
      </Root.Navigator>
    </NavigationContainer>
  );
}
