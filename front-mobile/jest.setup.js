/* global jest */
jest.mock('react-native-config', () => ({
  API_BASE_URL: 'http://localhost:8080/api/v1',
}));

jest.mock('react-native-mmkv', () => {
  const store = new Map();
  return {
    createMMKV: () => ({
      contains: key => store.has(key),
      getString: key => store.get(key),
      set: (key, value) => store.set(key, value),
      remove: key => store.delete(key),
      clearAll: () => store.clear(),
    }),
  };
});

jest.mock('react-native-keychain', () => ({
  getGenericPassword: jest.fn().mockResolvedValue(false),
  setGenericPassword: jest.fn().mockResolvedValue(true),
  resetGenericPassword: jest.fn().mockResolvedValue(true),
}));
