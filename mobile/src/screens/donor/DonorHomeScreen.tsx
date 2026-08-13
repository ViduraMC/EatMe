import React from 'react';
import { RoleHomePlaceholder } from '../../components/RoleHomePlaceholder';

/**
 * Stub screen for the Donation and Listing module. Owner: Vidura.
 *
 * Replace this with the real donor screens. Register them in
 * src/navigation/DonorStack.tsx and add their route names to
 * DonorStackParamList in src/navigation/types.ts.
 */
export function DonorHomeScreen() {
  return (
    <RoleHomePlaceholder
      roleLabel="Donor"
      owner="Vidura"
      upcoming={[
        'Create a listing with multiple food items',
        'See incoming requests on my listings',
        'Accept or reject a request',
      ]}
    />
  );
}
