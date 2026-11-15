import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { localMeasurementRepository } from '../modules/consumptions/api/localMeasurementRepository';
import { localPropertyRepository } from '../modules/properties/api/localPropertyRepository';
import type { LocalProperty } from '../modules/properties/models/localProperty';
import { executeFullSync } from '../modules/sync/syncService';
import {
  AppText,
  Card,
  Header,
  Page,
  SectionTitle,
  StatusPill,
} from '../shared/ui/components';
import { colors } from '../shared/ui/theme';

export function HomesScreen({
  ownerName,
  onSelectProperty,
  onSettings,
}: {
  ownerName: string;
  onSelectProperty: (property: LocalProperty) => void;
  onSettings: () => void;
}) {
  const [properties, setProperties] = useState<LocalProperty[]>([]);
  const [measurementCount, setMeasurementCount] = useState(0);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const [items, measurements] = await Promise.all([
      localPropertyRepository.list(),
      localMeasurementRepository.list(),
    ]);
    setProperties(items);
    setMeasurementCount(measurements.length);
    setPendingSyncCount(
      measurements.filter(m => m.syncState === 'pending').length,
    );
  }, []);

  const handleSync = useCallback(async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      const result = await executeFullSync();
      setSyncMessage(result.message);
      await loadData();
    } catch {
      setSyncMessage(
        'No se pudo conectar con el backend. Operando sin conexión.',
      );
    } finally {
      setIsSyncing(false);
    }
  }, [ownerName, loadData]);

  useEffect(() => {
    loadData();
    // Intenta sincronización silenciosa en background al iniciar
    executeFullSync()
      .then(() => loadData())
      .catch(() => {});
  }, [ownerName, loadData]);

  return (
    <Page>
      <Header
        title={`Hola, ${ownerName} 👋`}
        subtitle="Tus viviendas y servicios"
      />
      <View style={styles.sectionRow}>
        <SectionTitle>Mis viviendas</SectionTitle>
        <View style={styles.actionsRow}>
          <Pressable
            onPress={handleSync}
            disabled={isSyncing}
            accessibilityRole="button"
          >
            {isSyncing ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <AppText color={colors.primary} weight="bold">
                {pendingSyncCount > 0
                  ? `Sincronizar (${pendingSyncCount})`
                  : 'Sincronizar'}
              </AppText>
            )}
          </Pressable>
          <Pressable onPress={onSettings}>
            <AppText color={colors.primary} weight="bold">
              Moneda
            </AppText>
          </Pressable>
        </View>
      </View>

      {syncMessage ? (
        <View style={styles.syncFeedback}>
          <AppText size={12} color={colors.muted}>
            {syncMessage}
          </AppText>
        </View>
      ) : null}

      {properties.map(property => (
        <Pressable
          key={property.id}
          onPress={() => onSelectProperty(property)}
          accessibilityRole="button"
        >
          <Card>
            <View style={styles.row}>
              <AppText size={20} weight="bold">
                {property.name}
              </AppText>
              <AppText size={24} color={colors.primary}>
                ›
              </AppText>
            </View>
            <AppText color={colors.muted}>
              {property.address} · {property.units.length} unidades
            </AppText>
            <View style={styles.pillRow}>
              <StatusPill title={`${measurementCount} lecturas guardadas`} />
              {pendingSyncCount > 0 ? (
                <StatusPill title={`${pendingSyncCount} pendientes`} />
              ) : (
                <StatusPill title="Al día" />
              )}
            </View>
          </Card>
        </Pressable>
      ))}

      <AppText color={colors.muted} size={12}>
        Las lecturas se calculan y guardan en el dispositivo al instante (modo
        offline) y se sincronizan con el backend cuando hay conexión a internet.
      </AppText>
    </Page>
  );
}

const styles = StyleSheet.create({
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pillRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  syncFeedback: { paddingVertical: 4 },
});
