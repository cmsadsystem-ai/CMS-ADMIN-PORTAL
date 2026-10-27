const defaultStorage = {
  cmsAuth: { role: null, username: null },
  cmsDraftApplication: null,
  cmsApplications: [],
  cmsBackgroundSettings: {
    enabled: true,
    videoDataUrl: '',
    videoMimeType: '',
    playbackMode: 'muted',
  },
  cmsPaymentSettings: {
    feeAmount: '',
    upiId: 'cms@bank',
    paymentQrs: [null, null],
    feeStructure: null,
  },
  cmsLastSubmittedApplication: null,
  cmsCorrectionHistory: [],
};

export const STORAGE_KEYS = Object.keys(defaultStorage).reduce((acc, key) => {
  acc[key] = key;
  return acc;
}, {});

export function readStorage(key, fallback) {
  try {
    const value = window.localStorage.getItem(key);
    if (value === null) return fallback;
    return JSON.parse(value);
  } catch (error) {
    console.warn(`Unable to read storage key ${key}:`, error);
    return fallback;
  }
}

export function writeStorage(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Unable to write storage key ${key}:`, error);
  }
}

export function clearStorageKey(key) {
  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    console.warn(`Unable to clear storage key ${key}:`, error);
  }
}

export function getDefaultStorage() {
  return JSON.parse(JSON.stringify(defaultStorage));
}

export function resetStorage() {
  Object.entries(defaultStorage).forEach(([key, value]) => {
    writeStorage(key, value);
  });
}
