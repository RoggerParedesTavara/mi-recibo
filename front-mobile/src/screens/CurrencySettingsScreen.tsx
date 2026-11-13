import React, { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { getCurrencyPreference, saveCurrencyPreference } from '../modules/preferences/api/localCurrencyPreference';
import { AppText, Card, Header, Page, PrimaryButton, TextField } from '../shared/ui/components';
import { colors } from '../shared/ui/theme';

export function CurrencySettingsScreen({ onBack }: { onBack: () => void }) {
  const [currencyCode, setCurrencyCode] = useState('PEN');
  const [locale, setLocale] = useState('es-PE');

  useEffect(() => {
    const preference = getCurrencyPreference();
    setCurrencyCode(preference.currencyCode);
    setLocale(preference.locale);
  }, []);

  function save() {
    try {
      saveCurrencyPreference({ currencyCode: currencyCode.trim().toUpperCase(), locale: locale.trim() });
      Alert.alert('Preferencia guardada', 'La moneda se aplicará a los importes de la app.');
      onBack();
    } catch (error) {
      Alert.alert('Configuración no válida', error instanceof Error ? error.message : 'Revisa los datos.');
    }
  }

  return (
    <Page>
      <Header title="Moneda" subtitle="Formato usado en todos los recibos" backLabel="Inicio" onBack={onBack} />
      <Card>
        <TextField label="Código de moneda (ISO 4217)" value={currencyCode} onChangeText={setCurrencyCode} autoCapitalize="characters" maxLength={3} />
        <TextField label="Configuración regional" value={locale} onChangeText={setLocale} autoCapitalize="none" placeholder="es-PE" />
        <AppText size={13} color={colors.muted}>Valor inicial: PEN · es-PE</AppText>
      </Card>
      <PrimaryButton title="Guardar preferencia" onPress={save} />
    </Page>
  );
}
