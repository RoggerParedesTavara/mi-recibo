import Clipboard from '@react-native-clipboard/clipboard';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { localServiceBillingConfigRepository } from '../modules/billing/api/localServiceBillingConfigRepository';
import { calculateTenantServiceBill } from '../modules/billing/domain/calculateTenantServiceBill';
import type { ServiceBillingConfig } from '../modules/billing/models/serviceBillingConfig';
import { localMeasurementRepository } from '../modules/consumptions/api/localMeasurementRepository';
import type { UtilityService } from '../modules/consumptions/models/measurement';
import type { LocalProperty, LocalUnit } from '../modules/properties/models/localProperty';
import type { LocalTenant } from '../modules/tenants/models/localTenant';
import { AppText, Card, Header, Page, SectionTitle, StatusPill } from '../shared/ui/components';
import { formatCurrency, formatUnitPrice } from '../shared/ui/formatCurrency';
import { roundUpToTenth } from '../shared/ui/roundUpToTenth';
import { colors } from '../shared/ui/theme';

const services: UtilityService[] = ['LUZ', 'AGUA'];
const emptyReadings: Awaited<ReturnType<typeof localMeasurementRepository.list>> = [];

export function UnitDetailScreen({ property, unit, tenant, onBack, onSelectService }: {
  property: LocalProperty;
  unit: LocalUnit;
  tenant: LocalTenant;
  onBack: () => void;
  onSelectService: (service: UtilityService) => void;
}) {
  const [configs, setConfigs] = useState<ServiceBillingConfig[]>([]);
  const [readings, setReadings] = useState(emptyReadings);
  const [copiedDetail, setCopiedDetail] = useState(false);
  const period = useMemo(() => new Date(), []);

  useEffect(() => {
    let active = true;
    Promise.all([
      localServiceBillingConfigRepository.list(),
      localMeasurementRepository.list({
        propertyId: property.id,
        unitId: unit.id,
        tenantId: tenant.id,
        billingYear: period.getFullYear(),
        billingMonth: period.getMonth() + 1,
      }),
    ]).then(([nextConfigs, nextReadings]) => {
      if (!active) return;
      setConfigs(nextConfigs);
      setReadings(nextReadings);
    });
    return () => { active = false; };
  }, [property.id, unit.id, tenant.id, period]);

  const tenantIndex = tenant.id === 'local-tenant-2' ? 1 : 0;
  const serviceDetails = services.map(service => {
    const config = configs.find(item => item.service === service);
    const reading = readings.find(item => item.service === service);
    const calculation = config && reading
      ? calculateTenantServiceBill(config, reading.consumedUnits, tenantIndex)
      : undefined;
    return { service, config, reading, calculation };
  });
  const totalAmount = serviceDetails.reduce(
    (total, item) => total + roundUpToTenth(Number(item.calculation?.totalAmount ?? 0)),
    0,
  );

  function copyBillDetail() {
    const lines = serviceDetails
      .filter(item => item.calculation)
      .map(({ service, calculation }) => {
        const label = service === 'LUZ' ? 'Electricidad' : 'Agua';
        return `${label}: ${formatCurrency(calculation!.totalAmount)}`;
      });
    lines.push(`Total: ${formatCurrency(totalAmount)}`);
    Clipboard.setString(`Detalle a cobrar\n${lines.join('\n')}`);
    setCopiedDetail(true);
  }

  return (
    <Page>
      <Header title={tenant.displayName} subtitle={unit.name} backLabel={property.name} onBack={onBack} />
      <SectionTitle>Recibos · {period.toLocaleDateString('es-PE', { month: 'long' })}</SectionTitle>
      {serviceDetails.map(({ service, config, reading, calculation }) => {
        const label = service === 'LUZ' ? 'Electricidad' : 'Agua';
        return (
          <Card key={service}>
            <View style={styles.row}>
              <Pressable accessibilityRole="button" style={styles.serviceAction} onPress={() => onSelectService(service)}>
                <View style={styles.details}>
                  <AppText size={19} weight="bold">{label}</AppText>
                  <AppText color={colors.muted}>
                    {calculation ? formatCurrency(calculation.totalAmount) : `${config ? formatUnitPrice(config.unitPrice) : '—'} / ${config?.unit ?? ''}`}
                  </AppText>
                </View>
                <AppText size={22} color={colors.primary}>›</AppText>
              </Pressable>
            </View>
            <StatusPill title={reading?.source === 'example' ? 'Dato de ejemplo' : reading ? 'Lectura guardada localmente' : 'Falta registrar lectura'} />
          </Card>
        );
      })}

      <Card style={styles.totalCard}>
        <AppText size={13} color={colors.muted} weight="medium">Detalle a cobrar</AppText>
        {serviceDetails.filter(item => item.calculation).map(({ service, calculation }) => (
          <View key={service} style={styles.totalRow}>
            <AppText color={colors.muted}>{service === 'LUZ' ? 'Electricidad' : 'Agua'}</AppText>
            <AppText>{formatCurrency(calculation!.totalAmount)}</AppText>
          </View>
        ))}
        <View style={styles.divider} />
        <View style={styles.totalRow}>
          <AppText size={18} weight="bold">Total</AppText>
          <View style={styles.totalAmount}>
            <AppText size={21} weight="bold" color={colors.primary}>{formatCurrency(totalAmount)}</AppText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Copiar detalle a cobrar y total"
              testID="copy-total"
              hitSlop={8}
              onPress={copyBillDetail}
              style={styles.copyButton}
            >
              <AppText size={19} weight="bold" color={colors.primary}>
                {copiedDetail ? '✓' : '⧉'}
              </AppText>
            </Pressable>
          </View>
        </View>
      </Card>
      {copiedDetail ? <AppText size={12} color={colors.muted}>Detalle completo copiado al portapapeles</AppText> : null}
    </Page>
  );
}

const styles = {
  row: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8 },
  serviceAction: { flex: 1, flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const },
  details: { gap: 4 },
  copyButton: { minWidth: 40, minHeight: 40, alignItems: 'center' as const, justifyContent: 'center' as const },
  totalCard: { borderColor: colors.border, gap: 12 },
  totalRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, gap: 8 },
  totalAmount: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8 },
  divider: { height: 1, backgroundColor: colors.border },
};
