/**
 * Route names and their parameters, one list per role stack.
 *
 * Each module owner adds their own screens to their own list. Because the lists
 * are separate, five people can add routes without editing the same lines.
 */

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

/** Vidura. Donation and Listing. */
export type DonorStackParamList = {
  DonorHome: undefined;
  // CreateListing: undefined;
  // MyListings: undefined;
  // ListingDetail: { listingId: number };
};

/** Haritha. Food Requests. */
export type RecipientStackParamList = {
  RecipientHome: undefined;
  // BrowseListings: undefined;
  // MyRequests: undefined;
};

/** Kaushal. Delivery Coordination. */
export type CoordinatorStackParamList = {
  CoordinatorHome: undefined;
  // PendingAssignments: undefined;
};

/** Lakkhana. Driver and Delivery. */
export type DriverTabParamList = {
  DriverDashboard: undefined;
  DriverHistory: undefined;
  DriverProfile: undefined;
};

export type DriverStackParamList = {
  DriverTabs: undefined;
  // DeliveryDetail: { assignmentId: number };   // US-DR02
  // DeclineAssignment: { assignmentId: number };// US-DR02
};

/** Naily. Administration. */
export type AdminStackParamList = {
  AdminHome: undefined;
  // AllListings: undefined;
};
