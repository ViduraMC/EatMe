import React from 'react';
import { RoleHomePlaceholder } from '../../components/RoleHomePlaceholder';

/**
 * Stub screen for the Food Requests module. Owner: Haritha.
 *
 * Replace this with the real recipient screens. Register them in
 * src/navigation/RecipientStack.tsx and add their route names to
 * RecipientStackParamList in src/navigation/types.ts.
 */
export function RecipientHomeScreen() {
  return (
    <RoleHomePlaceholder
      roleLabel="Recipient"
      owner="Haritha"
      upcoming={[
        'Browse open listings, urgent food first',
        'Search and filter what is available',
        'Request specific items and quantities',
      ]}
    />
  );
}
