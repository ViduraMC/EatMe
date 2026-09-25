import type {
  CompositeScreenProps,
  NavigatorScreenParams,
} from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { AssignmentStatus } from '../types/assignment';

/**
 * Route names and their parameters.
 *
 * Every signed-in role has the same shape: a stack whose first screen is the
 * role's bottom tabs, with detail and flow screens pushed on top. Tabs hold
 * the places a role returns to; the stack holds the things they drill into.
 *
 * Each module still owns its own lists here, so five people can add routes
 * without editing the same lines.
 */

/** First run only: language, then the three-slide introduction. */
export type OnboardingStackParamList = {
  Language: undefined;
  Intro: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  /** A recipient who has just registered and is waiting for approval. */
  RegisterPending: { name: string; organisation: string };
};

// ---------------------------------------------------------------------------
// Donor (Vidura, Donation and Listing)
// ---------------------------------------------------------------------------

export type DonorTabParamList = {
  MyListings: undefined;
  /** Read only. The Donation Coordinator approves requests, not the donor. */
  IncomingRequests: undefined;
  /** Omit assignmentId to see everything awaiting this donor's confirmation. */
  ConfirmPickup: { assignmentId?: number } | undefined;
  DonorProfile: undefined;
};

/**
 * Creating a listing is two steps, matching the wireframes: the details are
 * collected on CreateListing and handed to AddItems, which collects the food
 * items and publishes both together. The details travel as plain strings so
 * the params stay serialisable.
 */
export type DonorStackParamList = {
  DonorTabs: NavigatorScreenParams<DonorTabParamList> | undefined;
  CreateListing: undefined;
  AddItems: {
    title: string;
    description: string;
    pickupAddress: string;
    /** ISO 8601. */
    pickupWindowStart: string;
    /** ISO 8601. */
    pickupWindowEnd: string;
  };
  ListingDetail: { listingId: number };
};

export type DonorTabProps<T extends keyof DonorTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<DonorTabParamList, T>,
  NativeStackScreenProps<DonorStackParamList>
>;
export type DonorStackProps<T extends keyof DonorStackParamList> = NativeStackScreenProps<
  DonorStackParamList,
  T
>;

// ---------------------------------------------------------------------------
// Recipient (Haritha, Food Requests)
// ---------------------------------------------------------------------------

export type RecipientTabParamList = {
  BrowseListings: undefined;
  MyRequests: undefined;
  RecipientProfile: undefined;
};

export type RecipientStackParamList = {
  RecipientTabs: NavigatorScreenParams<RecipientTabParamList> | undefined;
  ListingDetail: { listingId: number };
  CreateRequest: { listingId: number };
};

export type RecipientTabProps<T extends keyof RecipientTabParamList> =
  CompositeScreenProps<
    BottomTabScreenProps<RecipientTabParamList, T>,
    NativeStackScreenProps<RecipientStackParamList>
  >;
export type RecipientStackProps<T extends keyof RecipientStackParamList> =
  NativeStackScreenProps<RecipientStackParamList, T>;

// ---------------------------------------------------------------------------
// Coordinator (Kaushal, Delivery Coordination)
// ---------------------------------------------------------------------------

export type CoordinatorTabParamList = {
  CoordinatorHome: undefined;
  /** US-C02: Live status tracking of all delivery assignments. Optionally pre-filtered. */
  AssignmentsList: { status?: AssignmentStatus } | undefined;
  DriversList: undefined;
  CoordinatorProfile: undefined;
};

export type CoordinatorStackParamList = {
  CoordinatorTabs: NavigatorScreenParams<CoordinatorTabParamList> | undefined;
  /** US-C02: Coordinator picks a driver for a specific accepted request. */
  CreateAssignment: { requestId: number };
  /** US-C03: Assignment detail with timeline and reassign functionality. */
  AssignmentDetail: { assignmentId: number };
};

export type CoordinatorTabProps<T extends keyof CoordinatorTabParamList> =
  CompositeScreenProps<
    BottomTabScreenProps<CoordinatorTabParamList, T>,
    NativeStackScreenProps<CoordinatorStackParamList>
  >;
export type CoordinatorStackProps<T extends keyof CoordinatorStackParamList> =
  NativeStackScreenProps<CoordinatorStackParamList, T>;

// ---------------------------------------------------------------------------
// Driver (Lakkhana, Driver and Delivery)
// ---------------------------------------------------------------------------

export type DriverTabParamList = {
  DriverDashboard: undefined;
  DriverHistory: undefined;
  DriverProfile: undefined;
};

export type DriverStackParamList = {
  DriverTabs: NavigatorScreenParams<DriverTabParamList> | undefined;
};

export type DriverTabProps<T extends keyof DriverTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<DriverTabParamList, T>,
  NativeStackScreenProps<DriverStackParamList>
>;

// ---------------------------------------------------------------------------
// Administrator (Naily, Administration)
// ---------------------------------------------------------------------------

export type AdminTabParamList = {
  AdminHome: undefined;
  /** Opens Users already filtered, e.g. to the recipients awaiting approval. */
  AdminUsers: { filter?: 'pending' } | undefined;
  AdminReports: undefined;
  AdminProfile: undefined;
};

export type AdminStackParamList = {
  AdminTabs: NavigatorScreenParams<AdminTabParamList> | undefined;
  AdminListings: undefined;
  AdminRequests: undefined;
  AdminAssignments: undefined;
};

export type AdminTabProps<T extends keyof AdminTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<AdminTabParamList, T>,
  NativeStackScreenProps<AdminStackParamList>
>;
export type AdminStackProps<T extends keyof AdminStackParamList> = NativeStackScreenProps<
  AdminStackParamList,
  T
>;
