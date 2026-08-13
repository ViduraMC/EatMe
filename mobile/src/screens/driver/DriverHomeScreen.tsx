import React from 'react';
import { RoleHomePlaceholder } from '../../components/RoleHomePlaceholder';

/**
 * Stub screen for the Driver and Delivery module. Owner: Lakkhana.
 *
 * Replace this with the real driver screens. Register them in
 * src/navigation/DriverStack.tsx and add their route names to
 * DriverStackParamList in src/navigation/types.ts.
 */
export function DriverHomeScreen() {
  return (
    <RoleHomePlaceholder
      roleLabel="Driver"
      owner="Lakkhana"
      upcoming={[
        'See deliveries assigned to me',
        'Accept or decline with a reason',
        'Confirm pickup and drop off',
      ]}
    />
  );
}
