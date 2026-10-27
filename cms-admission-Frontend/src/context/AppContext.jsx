import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getInitialDraft } from '../utils/helpers';
import { readStorage, writeStorage, resetStorage, STORAGE_KEYS } from '../services/storage';
import {
  fetchApplicationsApi,
  submitApplicationApi,
  updateApplicationApi,
  fetchSettingApi,
  saveSettingApi,
} from '../services/api';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [auth, setAuth] = useState(() => readStorage(STORAGE_KEYS.cmsAuth, { role: null, username: null }));
  const [draft, setDraft] = useState(() => readStorage(STORAGE_KEYS.cmsDraftApplication, getInitialDraft()));
  const [applications, setApplications] = useState(() => readStorage(STORAGE_KEYS.cmsApplications, []));
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

  // Sync with Backend DB on mount / auth change
  useEffect(() => {
    let isMounted = true;
    fetchApplicationsApi().then((serverApps) => {
      if (isMounted && serverApps && Array.isArray(serverApps)) {
        setApplications((localApps) => {
          // Merge server apps with local apps
          const serverMap = new Map(serverApps.map((a) => [a.id, a]));
          const merged = [...serverApps];
          localApps.forEach((loc) => {
            if (!serverMap.has(loc.id)) {
              merged.push(loc);
              submitApplicationApi(loc);
            }
          });
          return merged;
        });
      }
    });

    fetchSettingApi('paymentSettings').then((val) => {
      if (isMounted && val) setPaymentSettings(val);
    });

    fetchSettingApi('backgroundSettings').then((val) => {
      if (isMounted && val) setBackgroundSettings(val);
    });

    return () => { isMounted = false; };
  }, [auth.role]);

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

  const updateApplication = (applicationId, updates, comment, actor) => {
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
    updateApplicationApi(applicationId, updates, comment, actor);
  };

  const submitApplication = (formData) => {
    const generatedId = formData.id || `CMS-${Date.now()}`;
    const appData = {
      ...formData,
      id: generatedId,
      status: 'Enquiring',
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      confirmationDate: null,
      correctionNotes: formData.correctionNotes || '',
      coursePreference: formData.coursePreference || { firstPreference: '', additionalPreferences: [] },
    };

    setApplications((current) => {
      const filtered = current.filter((item) => item.id !== generatedId);
      return [appData, ...filtered];
    });

    const appRecord = { ...appData, id: generatedId };
    setLastSubmitted(appRecord);
    setDraft(getInitialDraft());
    writeStorage(STORAGE_KEYS.cmsDraftApplication, getInitialDraft());
    submitApplicationApi(appRecord);
    return appRecord;
  };

  const confirmApplication = (applicationId, actor = 'Admission Officer') => {
    const note = 'Application confirmed by admission office.';
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
    updateApplicationApi(applicationId, { status: 'Confirmed' }, note, actor);
  };

  const forwardApplicationToVC = (applicationId, actor = 'Admission Officer') => {
    const note = 'Application forwarded to the VC list by the admission office.';
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
    updateApplicationApi(applicationId, { status: 'Sent to VC' }, note, actor);
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
    forwardApplicationToVC,
    addHistoryEntry,
    dismissDraft,
    resetDemoData,
    setDraft,
    setBackgroundSettings: updateBackgroundSettings,
    setPaymentSettings: updatePaymentSettings,
  }), [auth, draft, applications, backgroundSettings, paymentSettings, correctionHistory, lastSubmitted, saveDraft]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
}
