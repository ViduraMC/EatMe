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

/**
 * Vidura. Donation and Listing.
 *
 * Creating a listing is a two step flow, matching the wireframes: the details
 * are collected on CreateListing and handed to AddItems, which collects the
 * food items and publishes both together. The details travel as plain strings
 * so the params stay serialisable.
 */
export type DonorStackParamList = {
  MyListings: undefined;
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
  /** Read only. The Donation Coordinator approves requests, not the donor. */
  IncomingRequests: undefined;
  /** Omit assignmentId to see everything awaiting this donor's confirmation. */
  ConfirmPickup: { assignmentId?: number } | undefined;
};

/** Haritha. Food Requests. */
export type RecipientStackParamList = {
  BrowseListings: undefined;
  ListingDetail: { listingId: number };
  CreateRequest: { listingId: number };
  MyRequests: undefined;
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
  // AllListings: undefined;
};
