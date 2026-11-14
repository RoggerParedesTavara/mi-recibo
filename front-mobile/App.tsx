/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import { useEffect, useState } from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { localServiceBillingConfigRepository } from './src/modules/billing/api/localServiceBillingConfigRepository';
import { localMeasurementRepository } from './src/modules/consumptions/api/localMeasurementRepository';
import { localPropertyRepository } from './src/modules/properties/api/localPropertyRepository';
import { localTenantRepository } from './src/modules/tenants/api/localTenantRepository';
import { CurrencySettingsScreen } from './src/screens/CurrencySettingsScreen';
import { HomesScreen } from './src/screens/HomesScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { PropertyOverviewScreen } from './src/screens/PropertyOverviewScreen';
import { ServiceReadingScreen } from './src/screens/ServiceReadingScreen';
import { UnitDetailScreen } from './src/screens/UnitDetailScreen';
import type { UtilityService } from './src/modules/consumptions/models/measurement';
import type { LocalProperty, LocalUnit } from './src/modules/properties/models/localProperty';
import type { LocalTenant } from './src/modules/tenants/models/localTenant';

type Route =
  | { name: 'home' }
  | { name: 'property'; property: LocalProperty }
  | { name: 'unit'; property: LocalProperty; unit: LocalUnit; tenant: LocalTenant }
  | { name: 'service'; property: LocalProperty; unit: LocalUnit; tenant: LocalTenant; service: UtilityService }
  | { name: 'settings' };

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  useEffect(() => {
    localMeasurementRepository.initialize();
    localServiceBillingConfigRepository.initialize();
    localPropertyRepository.initialize();
    localTenantRepository.initialize();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <AppContent />
    </SafeAreaProvider>
  );
}

function AppContent() {
  const [ownerName, setOwnerName] = useState('Coral');
  const [route, setRoute] = useState<Route>({ name: 'home' });
  const [authenticated, setAuthenticated] = useState(false);

  if (!authenticated) {
    return <LoginScreen onLogin={name => { setOwnerName(name); setAuthenticated(true); setRoute({ name: 'home' }); }} />;
  }

  if (route.name === 'home') {
    return <HomesScreen ownerName={ownerName} onSelectProperty={property => setRoute({ name: 'property', property })} onSettings={() => setRoute({ name: 'settings' })} />;
  }
  if (route.name === 'property') {
    return <PropertyOverviewScreen property={route.property} onBack={() => setRoute({ name: 'home' })} onSelectUnit={(unit, tenant) => setRoute({ name: 'unit', property: route.property, unit, tenant })} />;
  }
  if (route.name === 'unit') {
    return <UnitDetailScreen property={route.property} unit={route.unit} tenant={route.tenant} onBack={() => setRoute({ name: 'property', property: route.property })} onSelectService={service => setRoute({ name: 'service', property: route.property, unit: route.unit, tenant: route.tenant, service })} />;
  }
  if (route.name === 'service') {
    return <ServiceReadingScreen property={route.property} unit={route.unit} tenant={route.tenant} service={route.service} onBack={() => setRoute({ name: 'unit', property: route.property, unit: route.unit, tenant: route.tenant })} onSaved={() => setRoute({ name: 'unit', property: route.property, unit: route.unit, tenant: route.tenant })} />;
  }
  return <CurrencySettingsScreen onBack={() => setRoute({ name: 'home' })} />;

}

export default App;
