import React from 'react';
import { RoleHomePlaceholder } from '../../components/RoleHomePlaceholder';

/**
 * Stub screen for the Administration module. Owner: Naily.
 *
 * Replace this with the real admin screens. Register them in
 * src/navigation/AdminStack.tsx and add their route names to
 * AdminStackParamList in src/navigation/types.ts.
 */
export function AdminHomeScreen() {
  return (
    <RoleHomePlaceholder
      roleLabel="Administrator"
      owner="Naily"
      upcoming={[
        'Platform statistics',
        'Oversee all listings, requests and deliveries',
        'Moderate a listing or a user account',
      ]}
    />
  );
}
