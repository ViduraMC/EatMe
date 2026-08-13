import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Input, ScreenContainer } from '../../components';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../api/client';
import { colours, fontSize, fontWeight, spacing } from '../../constants/theme';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const { login, isSubmitting } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    setError(null);

    if (!email.trim() || !password) {
      setError('Enter your email and password');
      return;
    }

    try {
      await login({ email: email.trim(), password });
      // No navigation call. The root navigator swaps to the role stack as soon
      // as user stops being null.
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <ScreenContainer scroll avoidKeyboard>
      <View style={styles.header}>
        <Text style={styles.title}>EatMe</Text>
        <Text style={styles.subtitle}>Share surplus food before it goes to waste</Text>
      </View>

      <Input
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="donor@eatme.lk"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        textContentType="emailAddress"
      />

      <Input
        label="Password"
        value={password}
        onChangeText={setPassword}
        placeholder="Your password"
        secureTextEntry
        autoCapitalize="none"
        textContentType="password"
      />

      {!!error && <Text style={styles.error}>{error}</Text>}

      <Button label="Log In" onPress={handleLogin} loading={isSubmitting} />

      <View style={styles.footer}>
        <Text style={styles.footerText}>Do not have an account?</Text>
        <Button
          label="Create one"
          variant="secondary"
          onPress={() => navigation.navigate('Register')}
          style={styles.footerButton}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: spacing.xl, marginBottom: spacing.xl },
  title: {
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
    color: colours.accent,
  },
  subtitle: {
    fontSize: fontSize.secondary,
    color: colours.textSecondary,
    marginTop: spacing.xs,
  },
  error: {
    color: colours.critical,
    fontSize: fontSize.secondary,
    marginBottom: spacing.md,
  },
  footer: { marginTop: spacing.xl, alignItems: 'center' },
  footerText: { color: colours.textSecondary, fontSize: fontSize.secondary },
  footerButton: { marginTop: spacing.sm, alignSelf: 'stretch' },
});
