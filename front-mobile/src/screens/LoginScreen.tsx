import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { login } from '../modules/auth/api/authApi';
import {
  AppText,
  Card,
  Page,
  PrimaryButton,
  TextField,
} from '../shared/ui/components';
import { colors } from '../shared/ui/theme';

export function LoginScreen({ onLogin }: { onLogin: (name: string) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit() {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const owner = await login(email.trim(), password);
      setError('');
      onLogin(owner.name);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'No se pudo iniciar sesión.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Page>
      <View style={styles.brand}>
        <View style={styles.logo}>
          <AppText size={24} color={colors.surface} weight="bold">
            M
          </AppText>
        </View>
        <AppText size={28} weight="bold">
          miRecibo
        </AppText>
        <AppText color={colors.muted}>
          Tus viviendas y servicios, en un solo lugar
        </AppText>
      </View>
      <Card style={styles.form}>
        <AppText size={22} weight="bold">
          Iniciar sesión
        </AppText>
        <AppText color={colors.muted}>
          Ingresa a tu espacio de propietario
        </AppText>
        <TextField
          label="Correo electrónico"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          placeholder="correo@ejemplo.com"
        />
        <TextField
          label="Contraseña"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          placeholder="Contraseña"
        />
        {error ? (
          <AppText color={colors.danger} size={14}>
            {error}
          </AppText>
        ) : null}
        <PrimaryButton
          title={isSubmitting ? 'Ingresando…' : 'Ingresar'}
          onPress={submit}
          disabled={isSubmitting || !email || !password}
        />
      </Card>
    </Page>
  );
}

const styles = StyleSheet.create({
  brand: { alignItems: 'center', gap: 8, marginTop: 72, marginBottom: 25 },
  logo: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  form: { padding: 22, gap: 16 },
  hint: { textAlign: 'center', marginTop: 2 },
});
