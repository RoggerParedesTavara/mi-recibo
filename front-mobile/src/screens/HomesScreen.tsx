import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { localMeasurementRepository } from '../modules/consumptions/api/localMeasurementRepository';
import { localPropertyRepository } from '../modules/properties/api/localPropertyRepository';
import type { LocalProperty } from '../modules/properties/models/localProperty';
import { AppText, Card, Header, Page, SectionTitle, StatusPill } from '../shared/ui/components';
import { colors } from '../shared/ui/theme';

export function HomesScreen({ ownerName, onSelectProperty, onSettings }: {
  ownerName: string;
  onSelectProperty: (property: LocalProperty) => void;
  onSettings: () => void;
}) {
  const [properties, setProperties] = useState<LocalProperty[]>([]);
  const [measurementCount, setMeasurementCount] = useState(0);

  useEffect(() => {
    let active = true;
    Promise.all([localPropertyRepository.list(), localMeasurementRepository.list()]).then(([items, measurements]) => {
      if (!active) return;
      setProperties(items);
      setMeasurementCount(measurements.length);
    });
    return () => { active = false; };
  }, []);

  return (
    <Page>
      <Header title={`Hola, ${ownerName} 👋`} subtitle="Tus viviendas y servicios" />
      <View style={styles.sectionRow}>
        <SectionTitle>Mis viviendas</SectionTitle>
        <Pressable onPress={onSettings}><AppText color={colors.primary} weight="bold">Moneda</AppText></Pressable>
      </View>
      {properties.map(property => (
        <Pressable key={property.id} onPress={() => onSelectProperty(property)} accessibilityRole="button">
          <Card>
            <View style={styles.row}>
              <AppText size={20} weight="bold">{property.name}</AppText>
              <AppText size={24} color={colors.primary}>›</AppText>
            </View>
            <AppText color={colors.muted}>{property.address} · {property.units.length} unidades</AppText>
            <StatusPill title={`${measurementCount} lecturas guardadas`} />
          </Card>
        </Pressable>
      ))}
      <AppText color={colors.muted}>Las lecturas se guardan en este dispositivo mientras el backend está en preparación.</AppText>
    </Page>
  );
}

const styles = StyleSheet.create({
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
