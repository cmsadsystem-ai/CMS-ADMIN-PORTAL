import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getInitialDraft } from '../utils/helpers';
import { readStorage, writeStorage, resetStorage, STORAGE_KEYS } from '../services/storage';
import {
  fetchApplicationsApi,
  submitApplicationApi,
  updateApplicationApi,
  deleteApplicationApi,
  fetchSettingApi,
  saveSettingApi,
  sendApplicationStatusEmail,
} from '../services/api';
import { getSocket, subscribeToRealtimeEvents } from '../services/socket';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [auth, setAuth] = useState(() => readStorage(STORAGE_KEYS.cmsAuth, { role: null, username: null }));
  const [draft, setDraft] = useState(() => readStorage(STORAGE_KEYS.cmsDraftApplication, getInitialDraft()));
  const [applications, setApplications] = useState(() => readStorage(STORAGE_KEYS.cmsApplications, []));
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [backgroundSettings, setBackgroundSettings] = useState(() => readStorage(STORAGE_KEYS.cmsBackgroundSettings, {
    enabled: true,
    videoDataUrl: '',
    videoMimeType: '',
    playbackMode: 'muted',
  }));
  const [paymentSettings, setPaymentSettings] = useState(() => {
    const settings = readStorage(STORAGE_KEYS.cmsPaymentSettings, {
      feeAmount: '',
      upiId: 'cms@bank',
      paymentQrs: [null, null],
      feeStructure: null,
    });
    return {
      ...settings,
      upiId: settings.upiId ?? 'cms@bank',
      paymentQrs: settings.paymentQrs || [settings.paymentQr || null, null],
    };
  });
  const [correctionHistory, setCorrectionHistory] = useState(() => readStorage(STORAGE_KEYS.cmsCorrectionHistory, []));
  const [lastSubmitted, setLastSubmitted] = useState(() => readStorage(STORAGE_KEYS.cmsLastSubmittedApplication, null));

  // 1. Centralized Data System: Fetch latest authoritative state from central backend on mount & auth change
  const refreshFromDatabase = useCallback(async () => {
    const serverApps = await fetchApplicationsApi();
    if (Array.isArray(serverApps)) {
      setApplications(serverApps);
    }

    const payVal = await fetchSettingApi('paymentSettings');
    if (payVal) setPaymentSettings(payVal);

    const bgVal = await fetchSettingApi('backgroundSettings');
    if (bgVal) setBackgroundSettings(bgVal);
  }, []);

  useEffect(() => {
    refreshFromDatabase();
  }, [refreshFromDatabase, auth.role]);

  // 2. Real-Time Multi-User Synchronization via Socket.IO
  useEffect(() => {
    getSocket(auth);

    const unsubscribe = subscribeToRealtimeEvents({
      onConnectionStatus: (connected) => {
        setIsLiveConnected(connected);
      },
      onReconnect: () => {
        // Automatically reconcile with central DB after internet reconnect
        console.log('[Socket.IO] Reconnected. Reconciling with central database...');
        refreshFromDatabase();
      },
      onApplicationCreated: (newApp) => {
        console.log('[Socket.IO] Real-time: Application created:', newApp.id);
        setApplications((current) => {
          const exists = current.some((a) => a.id === newApp.id);
          if (exists) {
            return current.map((a) => (a.id === newApp.id ? { ...a, ...newApp } : a));
          }
          return [newApp, ...current];
        });
      },
      onApplicationUpdated: (updatedApp) => {
        console.log('[Socket.IO] Real-time: Application updated:', updatedApp.id);
        setApplications((current) => {
          const exists = current.some((a) => a.id === updatedApp.id);
          if (!exists) {
            return [updatedApp, ...current];
          }
          return current.map((a) => (a.id === updatedApp.id ? { ...a, ...updatedApp } : a));
        });
        if (Array.isArray(updatedApp.correctionHistory)) {
          setCorrectionHistory(updatedApp.correctionHistory);
        }
      },
      onApplicationDeleted: ({ id }) => {
        console.log('[Socket.IO] Real-time: Application deleted:', id);
        setApplications((current) => current.filter((a) => a.id !== id));
      },
      onSettingUpdated: ({ key, value }) => {
        console.log('[Socket.IO] Real-time: Setting updated:', key);
        if (key === 'paymentSettings' && value) {
          setPaymentSettings(value);
        } else if (key === 'backgroundSettings' && value) {
          setBackgroundSettings(value);
        }
      },
    });

    return () => {
      unsubscribe();
    };
  }, [auth, refreshFromDatabase]);

  // Persist local cache for fast offline rendering without overriding central database
  useEffect(() => {
    writeStorage(STORAGE_KEYS.cmsAuth, auth);
  }, [auth]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.cmsBackgroundSettings, backgroundSettings);
  }, [backgroundSettings]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.cmsPaymentSettings, paymentSettings);
  }, [paymentSettings]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.cmsDraftApplication, draft);
  }, [draft]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.cmsApplications, applications);
  }, [applications]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.cmsCorrectionHistory, correctionHistory);
  }, [correctionHistory]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.cmsLastSubmittedApplication, lastSubmitted);
  }, [lastSubmitted]);

  const saveDraft = useCallback((nextDraft) => {
    setDraft({ ...getInitialDraft(), ...nextDraft });
  }, []);

  const updateBackgroundSettings = (nextSettings) => {
    setBackgroundSettings((current) => {
      const updated = typeof nextSettings === 'function' ? nextSettings(current) : nextSettings;
      saveSettingApi('backgroundSettings', updated);
      return updated;
    });
  };

  const updatePaymentSettings = (nextSettings) => {
    setPaymentSettings((current) => {
      const updated = typeof nextSettings === 'function' ? nextSettings(current) : nextSettings;
      saveSettingApi('paymentSettings', updated);
      return updated;
    });
  };

  const loginDemoUser = (role, username) => {
    setAuth({ role, username });
  };

  const logoutDemoUser = () => {
    setAuth({ role: null, username: null });
  };

  const dismissDraft = () => {
    const freshDraft = getInitialDraft();
    setDraft(freshDraft);
    writeStorage(STORAGE_KEYS.cmsDraftApplication, freshDraft);
  };

  const addHistoryEntry = (applicationId, note, actor) => {
    const entry = {
      id: `${applicationId}-${Date.now()}`,
      applicationId,
      note,
      actor,
      createdAt: new Date().toISOString(),
    };
    setCorrectionHistory((current) => [entry, ...current]);
  };

  // 3. Concurrency-safe application update with optimistic locking
  const updateApplication = async (applicationId, updates, comment, actor) => {
    const currentItem = applications.find((item) => item.id === applicationId);
    const expectedVersion = currentItem?.version || 1;

    // Optimistically update local state for instantaneous feedback
    setApplications((current) => {
      const next = current.map((item) => {
        if (item.id !== applicationId) return item;
        return {
          ...item,
          ...updates,
          updatedAt: new Date().toISOString(),
        };
      });
      if (comment) {
        addHistoryEntry(applicationId, comment, actor);
      }
      return next;
    });

    // Send update to central backend with expected_version
    const result = await updateApplicationApi(applicationId, updates, comment, actor, expectedVersion);
    if (result && result.ok === false && result.status === 409) {
      alert(`⚠️ Concurrent Update Conflict: Application ${applicationId} was modified by another user. Reloading latest records from the server to prevent accidental overwrites.`);
      refreshFromDatabase();
      return { conflict: true };
    }
    return result;
  };

  const submitApplication = async (formData) => {
    const rawData = {
      ...formData,
      status: formData.status || 'Enquiring',
      submittedAt: formData.submittedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      confirmationDate: formData.status === 'Confirmed' ? new Date().toISOString() : null,
      correctionNotes: formData.correctionNotes || '',
      coursePreference: formData.coursePreference || { firstPreference: '', additionalPreferences: [] },
    };

    // Central backend atomically assigns YYNNNN ID, persists to MySQL, and broadcasts 'application_created'
    let serverResult = null;
    try {
      serverResult = await submitApplicationApi(rawData);
    } catch (err) {
      console.warn('Backend API call fallback:', err);
    }

    const officialId = serverResult?.id || rawData.id || `CMS-${Date.now()}`;
    const appRecord = {
      ...rawData,
      ...(serverResult || {}),
      id: officialId,
    };

    setApplications((current) => {
      const filtered = current.filter((item) => item.id !== officialId);
      return [appRecord, ...filtered];
    });

    setLastSubmitted(appRecord);
    setDraft(getInitialDraft());
    writeStorage(STORAGE_KEYS.cmsDraftApplication, getInitialDraft());

    return appRecord;
  };

  const confirmApplication = async (applicationId, actor = 'Admission Officer') => {
    const note = 'Application confirmed by admission office.';
    const currentItem = applications.find((item) => item.id === applicationId);
    const expectedVersion = currentItem?.version || 1;

    setApplications((current) => current.map((item) => {
      if (item.id !== applicationId) return item;
      return {
        ...item,
        status: 'Confirmed',
        confirmedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }));
    addHistoryEntry(applicationId, note, actor);
    // Backend commits update to DB first, broadcasts to all connected users, and sends status email
    await updateApplicationApi(applicationId, { status: 'Confirmed' }, note, actor, expectedVersion);
  };

  const deleteApplication = async (applicationId) => {
    setApplications((current) => current.filter((item) => item.id !== applicationId));
    await deleteApplicationApi(applicationId).catch(() => {});
  };

  const forwardApplicationToVC = async (applicationId, actor = 'Admission Officer') => {
    const note = 'Application forwarded to the VC list by the admission office.';
    const currentItem = applications.find((item) => item.id === applicationId);
    const expectedVersion = currentItem?.version || 1;

    setApplications((current) => current.map((item) => {
      if (item.id !== applicationId) return item;
      return {
        ...item,
        status: 'Sent to VC',
        forwardedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }));
    addHistoryEntry(applicationId, note, actor);
    await updateApplicationApi(applicationId, { status: 'Sent to VC' }, note, actor, expectedVersion);
  };

  const resetDemoData = () => {
    resetStorage();
    setAuth({ role: null, username: null });
    setDraft(getInitialDraft());
    setApplications([]);
    setBackgroundSettings({ enabled: true, videoDataUrl: '', videoMimeType: '', playbackMode: 'muted' });
    setPaymentSettings({ feeAmount: '', upiId: 'cms@bank', paymentQrs: [null, null], feeStructure: null });
    setCorrectionHistory([]);
    setLastSubmitted(null);
  };

  const value = useMemo(() => ({
    auth,
    draft,
    applications,
    isLiveConnected,
    backgroundSettings,
    paymentSettings,
    correctionHistory,
    lastSubmitted,
    saveDraft,
    loginDemoUser,
    logoutDemoUser,
    submitApplication,
    updateApplication,
    confirmApplication,
    deleteApplication,
    forwardApplicationToVC,
    addHistoryEntry,
    dismissDraft,
    resetDemoData,
    refreshFromDatabase,
    setDraft,
    setBackgroundSettings: updateBackgroundSettings,
    setPaymentSettings: updatePaymentSettings,
  }), [auth, draft, applications, isLiveConnected, backgroundSettings, paymentSettings, correctionHistory, lastSubmitted, saveDraft, refreshFromDatabase]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
}
