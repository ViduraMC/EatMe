import React from 'react';
import { RoleHomePlaceholder } from '../../components/RoleHomePlaceholder';

/**
 * Stub screen for the Delivery Coordination module. Owner: Kaushal.
 *
 * Replace this with the real coordinator screens. Register them in
 * src/navigation/CoordinatorStack.tsx and add their route names to
 * CoordinatorStackParamList in src/navigation/types.ts.
 */
export function CoordinatorHomeScreen() {
  return (
    <RoleHomePlaceholder
      roleLabel="Coordinator"
      owner="Kaushal"
      upcoming={[
        'See accepted requests with no driver yet',
        'Create a delivery assignment',
        'Choose an available driver',
      ]}
    />
  );
}
