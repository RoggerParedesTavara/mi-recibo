import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { localServiceBillingConfigRepository } from '../modules/billing/api/localServiceBillingConfigRepository';
import { calculateConsumedUnits } from '../modules/consumptions/domain/calculateConsumedUnits';
import { calculateTenantServiceBill } from '../modules/billing/domain/calculateTenantServiceBill';
import type { ServiceBillingConfig } from '../modules/billing/models/serviceBillingConfig';
import { localMeasurementRepository } from '../modules/consumptions/api/localMeasurementRepository';
import type { UtilityService } from '../modules/consumptions/models/measurement';
import type { LocalProperty, LocalUnit } from '../modules/properties/models/localProperty';
import type { LocalTenant } from '../modules/tenants/models/localTenant';
import { AppText, Card, Header, Page, PrimaryButton, SectionTitle, TextField } from '../shared/ui/components';
import { formatCurrency, formatUnitPrice } from '../shared/ui/formatCurrency';
import { colors } from '../shared/ui/theme';

export function ServiceReadingScreen({ property, unit, tenant, service, onBack, onSaved }: {
  property: LocalProperty;
  unit: LocalUnit;
  tenant: LocalTenant;
  service: UtilityService;
  onBack: () => void;
  onSaved: () => void;
}) {
  const now = useMemo(() => new Date(), []);
  const [config, setConfig] = useState<ServiceBillingConfig>();
  const [previousReading, setPreviousReading] = useState('0');
  const [automaticPreviousReading, setAutomaticPreviousReading] = useState('0');
  const [currentReading, setCurrentReading] = useState('');
  const [isPreviousReadingReset, setIsPreviousReadingReset] = useState(false);
  const [isExampleReading, setIsExampleReading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const tenantIndex = tenant.id === 'local-tenant-2' ? 1 : 0;
  const consumedUnits = useMemo(() => {
    if (!currentReading.trim()) return undefined;
    try {
      return calculateConsumedUnits(previousReading, currentReading);
    } catch {
      return undefined;
    }
  }, [currentReading, previousReading]);
  const readingError = useMemo(() => {
    if (!currentReading.trim()) return undefined;
    try {
      calculateConsumedUnits(previousReading, currentReading);
      return undefined;
    } catch (error) {
      return error instanceof Error ? error.message : 'Ingresa una lectura válida.';
    }
  }, [currentReading, previousReading]);
  const calculation = useMemo(() => {
    if (!config || consumedUnits === undefined) return undefined;
    try {
      return calculateTenantServiceBill(config, consumedUnits, tenantIndex);
    } catch {
      return undefined;
    }
  }, [config, consumedUnits, tenantIndex]);

  useEffect(() => {
    let active = true;
    Promise.all([
      localServiceBillingConfigRepository.get(service),
      localMeasurementRepository.list({
        propertyId: property.id,
        unitId: unit.id,
        tenantId: tenant.id,
        service,
      }),
    ]).then(([serviceConfig, readings]) => {
      if (!active) return;
      setConfig(serviceConfig);
      const currentPeriodReading = readings.find(reading =>
        reading.billingYear === now.getFullYear() && reading.billingMonth === now.getMonth() + 1,
      );
      const currentPeriodKey = now.getFullYear() * 12 + now.getMonth() + 1;
      const previousPeriodReading = readings
        .filter(reading => (
          reading.billingYear * 12 + reading.billingMonth < currentPeriodKey
          && reading.currentReading !== undefined
        ))
        .sort((a, b) => b.billingYear * 12 + b.billingMonth - (a.billingYear * 12 + a.billingMonth))[0];
      const previousValue = previousPeriodReading?.currentReading ?? currentPeriodReading?.previousReading ?? '0';
      const selectedPreviousReading = currentPeriodReading?.previousReading ?? previousValue;
      setAutomaticPreviousReading(previousValue);
      setPreviousReading(selectedPreviousReading);
      setIsPreviousReadingReset(selectedPreviousReading === '0' && previousValue !== '0');
      const existingCurrentReading = currentPeriodReading?.currentReading ?? (
        currentPeriodReading
          ? String(Number(selectedPreviousReading) + Number(currentPeriodReading.consumedUnits))
          : ''
      );
      setCurrentReading(existingCurrentReading);
      setIsExampleReading(currentPeriodReading?.source === 'example');
    });
    return () => { active = false; };
  }, [property.id, unit.id, tenant.id, service, now]);

  async function save() {
    if (!config || !calculation || consumedUnits === undefined) return;
    setIsSaving(true);
    try {
      await localMeasurementRepository.register({
        service,
        propertyId: property.id,
        unitId: unit.id,
        tenantId: tenant.id,
        billingYear: now.getFullYear(),
        billingMonth: now.getMonth() + 1,
        previousReading,
        currentReading: currentReading.trim().replace(',', '.'),
      });
      Alert.alert('Lectura guardada', 'Se guardó en este dispositivo y queda pendiente de sincronización.');
      onSaved();
    } catch (error) {
      Alert.alert('No se pudo guardar', error instanceof Error ? error.message : 'Intenta nuevamente.');
    } finally {
      setIsSaving(false);
    }
  }

  function togglePreviousReadingReset() {
    if (isPreviousReadingReset) {
      setPreviousReading(automaticPreviousReading);
      setIsPreviousReadingReset(false);
    } else {
      setPreviousReading('0');
      setIsPreviousReadingReset(true);
    }
  }

  const serviceLabel = service === 'LUZ' ? 'Electricidad' : 'Agua';

  return (
    <Page>
      <Header
        title={serviceLabel}
        subtitle={`Período ${now.toLocaleDateString('es-PE', { month: 'long' })} · ${tenant.displayName}`}
        backLabel={tenant.displayName}
        onBack={onBack}
      />
      <AppText color={colors.muted}>{unit.name} · {property.name}</AppText>

      <Card>
        <AppText size={13} color={colors.muted} weight="medium">Precio por {config?.unit ?? (service === 'LUZ' ? 'kWh' : 'm³')}</AppText>
        <AppText size={24} weight="bold">{config ? `${formatUnitPrice(config.unitPrice)} / ${config.unit}` : 'Cargando tarifa…'}</AppText>
      </Card>

      <Card>
        <SectionTitle>Consumo del período</SectionTitle>
        <View style={styles.readingField}>
          <AppText size={13} weight="medium" color={colors.muted}>Lectura anterior · solo lectura</AppText>
          <View style={styles.previousReadingRow}>
            <AppText size={18} weight="bold">{previousReading} {config?.unit ?? ''}</AppText>
            {Number(automaticPreviousReading) > 0 || isPreviousReadingReset ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={isPreviousReadingReset ? 'Restaurar lectura anterior' : 'Reiniciar lectura anterior a cero'}
                onPress={togglePreviousReadingReset}
                hitSlop={8}
              >
                <AppText size={13} weight="bold" color={colors.primary}>
                  {isPreviousReadingReset ? 'Restaurar' : 'Medidor nuevo · reiniciar'}
                </AppText>
              </Pressable>
            ) : null}
          </View>
        </View>
        <TextField
          label={`Lectura actual (${config?.unit ?? (service === 'LUZ' ? 'kWh' : 'm³')})`}
          value={currentReading}
          onChangeText={value => {
            setCurrentReading(value);
            setIsExampleReading(false);
          }}
          keyboardType="decimal-pad"
          placeholder="Ingresar lectura actual"
        />
        <AppText weight="medium" color={colors.muted}>
          Consumo calculado: {consumedUnits ?? '—'} {config?.unit ?? ''}
        </AppText>
        {readingError ? <AppText size={12} color={colors.primary}>{readingError}</AppText> : null}
        {isExampleReading ? (
          <AppText size={12} color={colors.muted}>Lecturas de ejemplo de la planilla. Reemplázalas por las mediciones reales antes de cobrar.</AppText>
        ) : null}
      </Card>

      <View style={styles.extraCharges}>
        <SectionTitle>Cargos extra</SectionTitle>
        {config?.extraCharges.map(charge => (
          <Card key={charge.id}>
            <View style={styles.chargeRow}>
              <View style={styles.chargeCopy}>
                <AppText>{charge.description}</AppText>
                <AppText size={12} color={colors.muted}>
                  {charge.taxable ? 'Gravado con IGV' : 'No gravado'} · se divide entre {config.activeTenantCount}
                </AppText>
              </View>
              <AppText weight="bold">{formatCurrency(Number(charge.totalAmount) / config.activeTenantCount)}</AppText>
            </View>
          </Card>
        ))}
      </View>

      <Card style={styles.summary}>
        <AppText size={13} color={colors.muted}>Resumen automático</AppText>
        <AmountRow label="Costo de consumo" value={calculation ? formatCurrency(calculation.consumptionAmount) : '—'} />
        <AmountRow label="Base imponible" value={calculation ? formatCurrency(calculation.taxableBase) : '—'} />
        <AmountRow label={`IGV (${config ? Number(config.taxRate) * 100 : 18}%)`} value={calculation ? formatCurrency(calculation.taxAmount) : '—'} highlight />
        <AmountRow label="Cargos no gravados" value={calculation ? formatCurrency(calculation.nonTaxableExtraCharges) : '—'} />
        <View style={styles.divider} />
        <AmountRow label="Total cobrado" value={calculation ? formatCurrency(calculation.totalAmount) : '—'} total />
      </Card>

      <AppText size={12} color={colors.muted}>La tarifa y cargos provienen de la configuración local. El IGV se calcula automáticamente sobre la base gravada.</AppText>
      <PrimaryButton title={isSaving ? 'Guardando…' : 'Guardar lectura'} onPress={save} disabled={!calculation || isSaving} />
    </Page>
  );
}

function AmountRow({ label, value, highlight = false, total = false }: {
  label: string;
  value: string;
  highlight?: boolean;
  total?: boolean;
}) {
  return (
    <View style={styles.amountRow}>
      <AppText size={total ? 18 : 14} weight={total || highlight ? 'bold' : 'regular'} color={highlight ? colors.primary : colors.text}>{label}</AppText>
      <AppText size={total ? 22 : 15} weight="bold" color={highlight ? colors.primary : colors.text}>{value}</AppText>
    </View>
  );
}

const styles = {
  readingField: { gap: 7 },
  previousReadingRow: { minHeight: 48, flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, borderColor: colors.border, borderWidth: 1, borderRadius: 12, backgroundColor: colors.background, paddingHorizontal: 13, gap: 8 },
  extraCharges: { gap: 10 },
  chargeRow: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, gap: 10 },
  chargeCopy: { flex: 1, gap: 3 },
  summary: { borderColor: colors.primaryLight, gap: 13 },
  amountRow: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, gap: 8 },
  divider: { height: 1, backgroundColor: colors.border },
};
