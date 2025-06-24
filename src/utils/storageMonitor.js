// src/utils/storageMonitor.js

class StorageMonitor {
  constructor() {
    this.snapshots = [];
    this.maxSnapshots = 100;
    this.setupMonitoring();
  }

  setupMonitoring() {
    // Override storage methods to track changes
    ['localStorage', 'sessionStorage'].forEach(storageType => {
      const storage = window[storageType];
      const originalSetItem = storage.setItem;
      const originalRemoveItem = storage.removeItem;
      const originalClear = storage.clear;

      storage.setItem = (key, value) => {
        const oldValue = storage.getItem(key);
        originalSetItem.call(storage, key, value);
        
        this.recordChange({
          type: 'setItem',
          storage: storageType,
          key,
          oldValue,
          newValue: value,
          timestamp: new Date().toISOString(),
          stack: new Error().stack
        });
      };

      storage.removeItem = (key) => {
        const oldValue = storage.getItem(key);
        originalRemoveItem.call(storage, key);
        
        this.recordChange({
          type: 'removeItem',
          storage: storageType,
          key,
          oldValue,
          newValue: null,
          timestamp: new Date().toISOString(),
          stack: new Error().stack
        });
      };

      storage.clear = () => {
        const snapshot = this.getStorageSnapshot(storageType);
        originalClear.call(storage);
        
        this.recordChange({
          type: 'clear',
          storage: storageType,
          clearedData: snapshot,
          timestamp: new Date().toISOString(),
          stack: new Error().stack
        });
      };
    });

    // Listen for storage events from other tabs
    window.addEventListener('storage', (event) => {
      this.recordChange({
        type: 'external',
        storage: event.storageArea === localStorage ? 'localStorage' : 'sessionStorage',
        key: event.key,
        oldValue: event.oldValue,
        newValue: event.newValue,
        url: event.url,
        timestamp: new Date().toISOString()
      });
    });
  }

  recordChange(change) {
    this.snapshots.push(change);
    
    // Keep only recent snapshots
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
    }

    // Special handling for forecasting-app keys
    if (change.key && change.key.includes('forecasting-app')) {
      console.warn('🔍 Forecasting app storage change detected:', change);
    }
  }

  getStorageSnapshot(storageType = 'both') {
    const snapshot = {
      timestamp: new Date().toISOString(),
      data: {}
    };

    const storages = storageType === 'both' 
      ? ['localStorage', 'sessionStorage'] 
      : [storageType];

    storages.forEach(type => {
      snapshot.data[type] = {};
      const storage = window[type];
      
      try {
        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i);
          const value = storage.getItem(key);
          
          // Try to parse JSON values
          let parsedValue;
          try {
            parsedValue = JSON.parse(value);
          } catch (e) {
            parsedValue = value;
          }
          
          snapshot.data[type][key] = {
            raw: value,
            parsed: parsedValue,
            size: value ? value.length : 0
          };
        }
      } catch (e) {
        snapshot.data[type].error = e.message;
      }
    });

    return snapshot;
  }

  getAuthRelatedKeys() {
    const snapshot = this.getStorageSnapshot();
    const authKeys = {};
    
    ['localStorage', 'sessionStorage'].forEach(storageType => {
      authKeys[storageType] = {};
      const data = snapshot.data[storageType];
      
      Object.keys(data).forEach(key => {
        if (key.includes('auth') || 
            key.includes('forecasting-app') || 
            key.includes('supabase') ||
            key.includes('gotrue')) {
          authKeys[storageType][key] = data[key];
        }
      });
    });
    
    return authKeys;
  }

  compareSnapshots(before, after) {
    const changes = {
      added: {},
      removed: {},
      modified: {}
    };

    ['localStorage', 'sessionStorage'].forEach(storageType => {
      changes.added[storageType] = {};
      changes.removed[storageType] = {};
      changes.modified[storageType] = {};

      const beforeData = before.data[storageType] || {};
      const afterData = after.data[storageType] || {};

      // Check for added and modified keys
      Object.keys(afterData).forEach(key => {
        if (!beforeData[key]) {
          changes.added[storageType][key] = afterData[key];
        } else if (beforeData[key].raw !== afterData[key].raw) {
          changes.modified[storageType][key] = {
            before: beforeData[key],
            after: afterData[key]
          };
        }
      });

      // Check for removed keys
      Object.keys(beforeData).forEach(key => {
        if (!afterData[key]) {
          changes.removed[storageType][key] = beforeData[key];
        }
      });
    });

    return changes;
  }

  monitorRefresh() {
    // Take snapshot before refresh
    const beforeRefresh = this.getStorageSnapshot();
    
    // Store it temporarily
    sessionStorage.setItem('__storage_monitor_before_refresh__', 
      JSON.stringify(beforeRefresh));
    
    // After page load, compare
    window.addEventListener('load', () => {
      const storedBefore = sessionStorage.getItem('__storage_monitor_before_refresh__');
      if (storedBefore) {
        const before = JSON.parse(storedBefore);
        const after = this.getStorageSnapshot();
        const changes = this.compareSnapshots(before, after);
        
        console.group('📦 Storage Changes After Refresh');
        console.log('Before:', before);
        console.log('After:', after);
        console.log('Changes:', changes);
        console.groupEnd();
        
        // Clean up
        sessionStorage.removeItem('__storage_monitor_before_refresh__');
      }
    });
  }

  validateClearAuthStorage() {
    console.group('🔍 Validating clearAuthStorage()');
    
    // Take snapshot before
    const before = this.getStorageSnapshot();
    console.log('Before clear:', this.getAuthRelatedKeys());
    
    // Simulate clearAuthStorage
    const keysToRemove = [];
    ['localStorage', 'sessionStorage'].forEach(storageType => {
      const storage = window[storageType];
      for (let i = storage.length - 1; i >= 0; i--) {
        const key = storage.key(i);
        if (key && (key.includes('auth') || key.includes('forecasting-app'))) {
          keysToRemove.push({ storage: storageType, key });
        }
      }
    });
    
    // Clear the keys
    keysToRemove.forEach(({ storage, key }) => {
      window[storage].removeItem(key);
    });
    
    // Take snapshot after
    const after = this.getStorageSnapshot();
    console.log('After clear:', this.getAuthRelatedKeys());
    
    // Check for any remaining auth keys
    const remainingAuthKeys = this.getAuthRelatedKeys();
    let hasRemaining = false;
    
    ['localStorage', 'sessionStorage'].forEach(storageType => {
      if (Object.keys(remainingAuthKeys[storageType]).length > 0) {
        hasRemaining = true;
        console.warn(`⚠️ Auth keys still present in ${storageType}:`, 
          remainingAuthKeys[storageType]);
      }
    });
    
    if (!hasRemaining) {
      console.log('✅ All auth keys successfully cleared');
    }
    
    console.groupEnd();
    
    return !hasRemaining;
  }

  downloadReport() {
    const report = {
      exportTime: new Date().toISOString(),
      currentSnapshot: this.getStorageSnapshot(),
      authRelatedKeys: this.getAuthRelatedKeys(),
      recentChanges: this.snapshots.slice(-50), // Last 50 changes
      storageSizes: {
        localStorage: this.getStorageSize('localStorage'),
        sessionStorage: this.getStorageSize('sessionStorage')
      }
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `storage-report-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  getStorageSize(storageType) {
    const storage = window[storageType];
    let totalSize = 0;
    
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      const value = storage.getItem(key);
      totalSize += key.length + (value ? value.length : 0);
    }
    
    return {
      bytes: totalSize,
      kb: (totalSize / 1024).toFixed(2),
      itemCount: storage.length
    };
  }
}

// Create singleton instance
export const storageMonitor = new StorageMonitor();