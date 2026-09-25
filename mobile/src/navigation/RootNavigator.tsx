import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme';
import { colours, fontSize, fontWeight } from '../constants/theme';

import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { MyListingsScreen } from '../screens/donor/MyListingsScreen';
import { CreateListingScreen } from '../screens/donor/CreateListingScreen';
import { AddItemsScreen } from '../screens/donor/AddItemsScreen';
import { ListingDetailScreen } from '../screens/donor/ListingDetailScreen';
import { IncomingRequestsScreen } from '../screens/donor/IncomingRequestsScreen';
import { ConfirmPickupScreen } from '../screens/donor/ConfirmPickupScreen';
import { BrowseListingsScreen } from '../screens/recipient/BrowseListingsScreen';
import { ListingDetailScreen as RecipientListingDetailScreen } from '../screens/recipient/ListingDetailScreen';
import { CreateRequestScreen } from '../screens/recipient/CreateRequestScreen';
import { MyRequestsScreen } from '../screens/recipient/MyRequestsScreen';
import { CoordinatorHomeScreen } from '../screens/coordinator/CoordinatorHomeScreen';
import { DriverDashboardScreen } from '../screens/driver/DriverDashboardScreen';
import { DeliveryHistoryScreen } from '../screens/driver/DeliveryHistoryScreen';
import { DriverProfileScreen } from '../screens/driver/DriverProfileScreen';
import { DriversListScreen } from '../screens/coordinator/DriversListScreen';
import { CreateAssignmentScreen } from '../screens/coordinator/CreateAssignmentScreen';
import { AssignmentsListScreen } from '../screens/coordinator/AssignmentsListScreen';
import { AssignmentDetailScreen } from '../screens/coordinator/AssignmentDetailScreen';
import { AdminHomeScreen } from '../screens/admin/AdminHomeScreen';
import { AdminListingsScreen } from '../screens/admin/AdminListingsScreen';
import { AdminRequestsScreen } from '../screens/admin/AdminRequestsScreen';
import { AdminAssignmentsScreen } from '../screens/admin/AdminAssignmentsScreen';
import { AdminUsersScreen } from '../screens/admin/AdminUsersScreen';
import { AdminReportsScreen } from '../screens/admin/AdminReportsScreen';
import { AdminMenu } from '../components/admin/AdminMenu';

import type {
  AdminStackParamList,
  AuthStackParamList,
  CoordinatorStackParamList,
  DonorStackParamList,
  DriverStackParamList,
  DriverTabParamList,
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
      <DonorStack.Screen
        name="IncomingRequests"
        component={IncomingRequestsScreen}
        options={{ title: 'Requests' }}
      />
      <DonorStack.Screen
        name="ConfirmPickup"
        component={ConfirmPickupScreen}
        options={{ title: 'Confirm Pickup' }}
      />
    </DonorStack.Navigator>
  );
}

/** Food Requests. Owner: Haritha. */
function RecipientNavigator() {
  return (
    <RecipientStack.Navigator screenOptions={screenOptions}>
      <RecipientStack.Screen
        name="BrowseListings"
        component={BrowseListingsScreen}
        options={{ title: 'Available Food' }}
      />
      <RecipientStack.Screen
        name="ListingDetail"
        component={RecipientListingDetailScreen}
        options={{ title: 'Listing' }}
      />
      <RecipientStack.Screen
        name="CreateRequest"
        component={CreateRequestScreen}
        options={{ title: 'Request Food' }}
      />
      <RecipientStack.Screen
        name="MyRequests"
        component={MyRequestsScreen}
        options={{ title: 'My Requests' }}
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
      <CoordinatorStack.Screen
        name="CreateAssignment"
        component={CreateAssignmentScreen}
        options={{ title: 'Assign Driver' }}
      />
      <CoordinatorStack.Screen
        name="AssignmentsList"
        component={AssignmentsListScreen}
        options={{ title: 'Assignments' }}
      />
      <CoordinatorStack.Screen
        name="AssignmentDetail"
        component={AssignmentDetailScreen}
        options={{ title: 'Assignment Detail' }}
      />
    </CoordinatorStack.Navigator>
  );
}

/** Lakkhana adds driver screens here. */
const DriverTab = createBottomTabNavigator<DriverTabParamList>();
const DRIVER_TAB_ICON: Record<keyof DriverTabParamList, string> = {
  DriverDashboard: '\u{1F69A}',
  DriverHistory: '\u2261',
  DriverProfile: '\u25D1',
};

function DriverNavigator() {
  return (
    <DriverTab.Navigator
      screenOptions={({ route }: { route: { name: string } }) => ({
        headerShown: false,
        tabBarActiveTintColor: colours.accent,
        tabBarInactiveTintColor: colours.textSecondary,
        tabBarStyle: {
          backgroundColor: colours.background,
          borderTopColor: colours.border,
        },
        tabBarLabelStyle: { fontSize: fontSize.label },
        tabBarIcon: ({ color }: { color: string }) => (
          <Text style={{ color, fontSize: 18 }}>
            {DRIVER_TAB_ICON[route.name as keyof DriverTabParamList]}
          </Text>
        ),
      })}
    >
      <DriverTab.Screen
        name="DriverDashboard"
        component={DriverDashboardScreen}
        options={{ title: 'Deliveries' }}
      />
      <DriverTab.Screen
        name="DriverHistory"
        component={DeliveryHistoryScreen}
        options={{ title: 'History' }}
      />
      <DriverTab.Screen
        name="DriverProfile"
        component={DriverProfileScreen}
        options={{ title: 'Profile' }}
      />
    </DriverTab.Navigator>
  );
}

/** Naily adds admin screens here. */
function AdminNavigator() {
  const [menuNavigation, setMenuNavigation] = useState<any>(null);
  return (
    <>
      <AdminStack.Navigator
        screenOptions={({ navigation }) => ({
          ...screenOptions,
          headerLeft: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open admin menu"
              onPress={() => {
                setMenuNavigation(navigation);
              }}
              style={({ pressed }) => [
                styles.adminMenuButton,
                pressed && styles.adminMenuButtonPressed,
              ]}
            >
              <Text style={styles.adminMenuIcon}>☰</Text>
            </Pressable>
          ),
        })}
      >
        <AdminStack.Screen
          name="AdminHome"
          component={AdminHomeScreen}
          options={{ title: 'Administration' }}
        />

        <AdminStack.Screen
          name="AdminListings"
          component={AdminListingsScreen}
          options={{ title: 'Donation Listings' }}
        />

        <AdminStack.Screen
          name="AdminRequests"
          component={AdminRequestsScreen}
          options={{ title: 'Donation Requests' }}
        />

        <AdminStack.Screen
          name="AdminAssignments"
          component={AdminAssignmentsScreen}
          options={{ title: 'Delivery Assignments' }}
        />

        <AdminStack.Screen
          name="AdminUsers"
          component={AdminUsersScreen}
          options={{ title: 'Users' }}
        />

        <AdminStack.Screen
          name="AdminReports"
          component={AdminReportsScreen}
          options={{ title: 'Reports' }}
        />
      </AdminStack.Navigator>

      {menuNavigation ? (
        <AdminMenu
          visible
          navigation={menuNavigation}
          onClose={() => {
            setMenuNavigation(null);
          }}
        />
      ) : null}
    </>
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
  const theme = useTheme();

  return (
    <NavigationContainer theme={theme.navigation}>
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

  adminMenuButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  adminMenuButtonPressed: {
    opacity: 0.5,
  },

  adminMenuIcon: {
    color: colours.textPrimary,
    fontSize: 24,
    lineHeight: 28,
  },
});
