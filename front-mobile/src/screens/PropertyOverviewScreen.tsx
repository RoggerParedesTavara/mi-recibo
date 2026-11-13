import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { localTenantRepository } from '../modules/tenants/api/localTenantRepository';
import type { LocalProperty, LocalUnit } from '../modules/properties/models/localProperty';
import type { LocalTenant } from '../modules/tenants/models/localTenant';
import { AppText, Card, Header, Page, SectionTitle } from '../shared/ui/components';
import { colors } from '../shared/ui/theme';

export function PropertyOverviewScreen({ property, onBack, onSelectUnit }: {
  property: LocalProperty;
  onBack: () => void;
  onSelectUnit: (unit: LocalUnit, tenant: LocalTenant) => void;
}) {
  const [tenants, setTenants] = useState<LocalTenant[]>([]);
  useEffect(() => { localTenantRepository.listActive().then(setTenants); }, []);

  return (
    <Page>
      <Header title={property.name} subtitle={property.address} backLabel="Mis viviendas" onBack={onBack} />
      <SectionTitle>Pisos e inquilinos</SectionTitle>
      {property.units.map(unit => {
        const tenant = tenants.find(item => item.unitId === unit.id);
        return (
          <Pressable key={unit.id} disabled={!tenant} onPress={() => tenant && onSelectUnit(unit, tenant)}>
            <Card>
              <View style={styles.row}>
                <View style={styles.copy}>
                  <AppText size={19} weight="bold">{unit.name}</AppText>
                  <AppText color={colors.muted}>{tenant?.displayName ?? 'Sin inquilino'}</AppText>
                </View>
                <AppText size={23} color={colors.primary}>›</AppText>
              </View>
            </Card>
          </Pressable>
        );
      })}
      <Card style={styles.summary}>
        <AppText size={17} weight="bold">Servicios del período</AppText>
        <AppText color={colors.muted}>Luz y agua · dos inquilinos</AppText>
      </Card>
    </Page>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  copy: { gap: 3 },
  summary: { marginTop: 10, backgroundColor: colors.soft },
});
