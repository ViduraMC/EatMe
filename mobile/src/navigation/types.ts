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
export type DriverStackParamList = {
  DriverHome: undefined;
  // MyDeliveries: undefined;
};

/** Naily. Administration. */
export type AdminStackParamList = {
  AdminHome: undefined;
  AdminListings: undefined;
};
