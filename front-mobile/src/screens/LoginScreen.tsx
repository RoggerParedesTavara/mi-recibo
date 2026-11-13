import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { authenticateLocalUser } from '../modules/auth/domain/authenticateLocalUser';
import { AppText, Card, Page, PrimaryButton, TextField } from '../shared/ui/components';
import { colors } from '../shared/ui/theme';

export function LoginScreen({ onLogin }: { onLogin: (username: string) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  function submit() {
    if (authenticateLocalUser(username, password)) {
      setError('');
      onLogin('Coral');
      return;
    }
    setError('Usuario o contraseña incorrectos.');
  }

  return (
    <Page>
      <View style={styles.brand}>
        <View style={styles.logo}><AppText size={24} color={colors.surface} weight="bold">M</AppText></View>
        <AppText size={28} weight="bold">miRecibo</AppText>
        <AppText color={colors.muted}>Tus viviendas y servicios, en un solo lugar</AppText>
      </View>
      <Card style={styles.form}>
        <AppText size={22} weight="bold">Iniciar sesión</AppText>
        <AppText color={colors.muted}>Ingresa a tu espacio de propietario</AppText>
        <TextField label="Usuario" value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} placeholder="Usuario" />
        <TextField label="Contraseña" value={password} onChangeText={setPassword} secureTextEntry placeholder="Contraseña" />
        {error ? <AppText color={colors.danger} size={14}>{error}</AppText> : null}
        <PrimaryButton title="Ingresar" onPress={submit} />
        <AppText size={12} color={colors.muted} style={styles.hint}>Acceso local de desarrollo: coral / coral</AppText>
      </Card>
    </Page>
  );
}

const styles = StyleSheet.create({
  brand: { alignItems: 'center', gap: 8, marginTop: 72, marginBottom: 25 },
  logo: { width: 58, height: 58, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  form: { padding: 22, gap: 16 },
  hint: { textAlign: 'center', marginTop: 2 },
});
