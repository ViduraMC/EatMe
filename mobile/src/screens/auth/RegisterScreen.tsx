import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Input, ScreenContainer } from '../../components';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../api/client';
import { colours, fontSize, fontWeight, layout, spacing } from '../../constants/theme';
import type { RegisterableRole } from '../../types';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

/**
 * Public registration is available to donors and recipients.
 * Coordinator and driver accounts are created by an administrator.
 */
const ROLE_OPTIONS: Array<{
  value: RegisterableRole;
  title: string;
  description: string;
}> = [
  {
    value: 'donor',
    title: 'Donor',
    description: 'I have surplus food to give away',
  },
  {
    value: 'recipient',
    title: 'Recipient',
    description: 'I collect food for an organisation',
  },
];

/** Roles that act on behalf of an organisation rather than as an individual. */
const ORGANISATION_ROLES: RegisterableRole[] = ['donor', 'recipient'];

export function RegisterScreen({ navigation }: Props) {
  const { register, isSubmitting } = useAuth();

  const [role, setRole] = useState<RegisterableRole | null>(null);
  const [name, setName] = useState('');
  const [organisationName, setOrganisationName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const showsOrganisation = role !== null && ORGANISATION_ROLES.includes(role);

  async function handleRegister() {
    setError(null);

    if (!role) {
      setError('Choose what you will use EatMe for');
      return;
    }
    if (!name.trim() || !email.trim() || !phone.trim() || !address.trim()) {
      setError('Fill in every field');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    try {
      await register({
        name: name.trim(),
        email: email.trim(),
        password,
        phone: phone.trim(),
        address: address.trim(),
        role,
        ...(showsOrganisation && organisationName.trim()
          ? { organisationName: organisationName.trim() }
          : {}),
      });

      if (role === 'recipient') {
        Alert.alert(
          'Registration submitted',
          'Your recipient account is awaiting administrator approval. You can sign in once your account has been approved.',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ],
        );
      }
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <ScreenContainer scroll avoidKeyboard>
      <Text style={styles.title}>Create an account</Text>

      <Text style={styles.sectionLabel}>I am a</Text>
      <View style={styles.roleGrid}>
        {ROLE_OPTIONS.map((option) => {
          const selected = role === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() => setRole(option.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              style={[styles.roleCard, selected && styles.roleCardSelected]}
            >
              <Text style={[styles.roleTitle, selected && styles.roleTitleSelected]}>
                {option.title}
              </Text>
              <Text style={styles.roleDescription}>{option.description}</Text>
            </Pressable>
          );
        })}
      </View>

      <Input
        label="Full name"
        value={name}
        onChangeText={setName}
        placeholder="Nimal Perera"
      />

      {showsOrganisation && (
        <Input
          label="Organisation name (optional)"
          value={organisationName}
          onChangeText={setOrganisationName}
          placeholder="Perera Bakery House"
        />
      )}

      <Input
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.lk"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
      />

      <Input
        label="Phone"
        value={phone}
        onChangeText={setPhone}
        placeholder="0771234567"
        keyboardType="phone-pad"
      />

      <Input
        label="Address"
        value={address}
        onChangeText={setAddress}
        placeholder="45 Galle Road, Colombo 03"
        multiline
      />

      <Input
        label="Password"
        value={password}
        onChangeText={setPassword}
        placeholder="At least 8 characters"
        secureTextEntry
        autoCapitalize="none"
      />

      {!!error && <Text style={styles.error}>{error}</Text>}

      <Button label="Create Account" onPress={handleRegister} loading={isSubmitting} />

      <Button
        label="I already have an account"
        variant="secondary"
        onPress={() => navigation.goBack()}
        style={styles.secondaryAction}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
    color: colours.textPrimary,
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    fontSize: fontSize.secondary,
    fontWeight: fontWeight.medium,
    color: colours.textPrimary,
    marginBottom: spacing.sm,
  },
  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  roleCard: {
    flexGrow: 1,
    flexBasis: '47%',
    borderWidth: layout.borderWidth,
    borderColor: colours.border,
    borderRadius: layout.radius,
    padding: spacing.md,
    backgroundColor: colours.background,
  },
  roleCardSelected: {
    borderColor: colours.accent,
    backgroundColor: colours.surface,
  },
  roleTitle: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colours.textPrimary,
  },
  roleTitleSelected: { color: colours.accent },
  roleDescription: {
    fontSize: fontSize.label,
    color: colours.textSecondary,
    marginTop: spacing.xs,
    lineHeight: 16,
  },
  error: {
    color: colours.critical,
    fontSize: fontSize.secondary,
    marginBottom: spacing.md,
  },
  secondaryAction: { marginTop: spacing.sm },
});
