// src/utils/serviceWorkerDetector.js

class ServiceWorkerDetector {
  async detectServiceWorkers() {
    const report = {
      supported: 'serviceWorker' in navigator,
      registrations: [],
      cacheNames: [],
      cacheContents: {},
      errors: []
    };

    if (!report.supported) {
      return report;
    }

    try {
      // Get all service worker registrations
      const registrations = await navigator.serviceWorker.getRegistrations();
      
      for (const registration of registrations) {
        const swInfo = {
          scope: registration.scope,
          active: registration.active ? {
            scriptURL: registration.active.scriptURL,
            state: registration.active.state
          } : null,
          installing: registration.installing ? {
            scriptURL: registration.installing.scriptURL,
            state: registration.installing.state
          } : null,
          waiting: registration.waiting ? {
            scriptURL: registration.waiting.scriptURL,
            state: registration.waiting.state
          } : null,
          updateFound: false
        };

        // Listen for updates
        registration.addEventListener('updatefound', () => {
          swInfo.updateFound = true;
          console.log('Service Worker update found for scope:', registration.scope);
        });

        report.registrations.push(swInfo);
      }

      // Check cache storage
      if ('caches' in window) {
        report.cacheNames = await caches.keys();
        
        // Inspect cache contents
        for (const cacheName of report.cacheNames) {
          try {
            const cache = await caches.open(cacheName);
            const requests = await cache.keys();
            
            report.cacheContents[cacheName] = {
              count: requests.length,
              urls: requests.map(req => ({
                url: req.url,
                method: req.method,
                mode: req.mode,
                credentials: req.credentials
              }))
            };
          } catch (e) {
            report.errors.push({
              type: 'cache-inspection',
              cacheName,
              error: e.message
            });
          }
        }
      }

      // Check if any cache contains our app files
      report.appFilesInCache = this.checkForAppFiles(report.cacheContents);

    } catch (error) {
      report.errors.push({
        type: 'general',
        error: error.message
      });
    }

    return report;
  }

  checkForAppFiles(cacheContents) {
    const appFilePatterns = [
      'index.html',
      'manifest.json',
      'static/js',
      'static/css',
      '.js',
      '.css'
    ];

    const cachedAppFiles = {};

    Object.entries(cacheContents).forEach(([cacheName, content]) => {
      const appFiles = content.urls.filter(item => 
        appFilePatterns.some(pattern => item.url.includes(pattern))
      );

      if (appFiles.length > 0) {
        cachedAppFiles[cacheName] = appFiles;
      }
    });

    return cachedAppFiles;
  }

  async clearServiceWorkerCaches() {
    const results = {
      unregistered: [],
      cachesCleared: [],
      errors: []
    };

    try {
      // Unregister all service workers
      const registrations = await navigator.serviceWorker.getRegistrations();
      
      for (const registration of registrations) {
        try {
          const success = await registration.unregister();
          results.unregistered.push({
            scope: registration.scope,
            success
          });
        } catch (e) {
          results.errors.push({
            type: 'unregister',
            scope: registration.scope,
            error: e.message
          });
        }
      }

      // Clear all caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        
        for (const cacheName of cacheNames) {
          try {
            const success = await caches.delete(cacheName);
            results.cachesCleared.push({
              name: cacheName,
              success
            });
          } catch (e) {
            results.errors.push({
              type: 'cache-delete',
              cacheName,
              error: e.message
            });
          }
        }
      }
    } catch (error) {
      results.errors.push({
        type: 'general',
        error: error.message
      });
    }

    return results;
  }

  async generateReport() {
    console.group('🔧 Service Worker Analysis');
    
    const detection = await this.detectServiceWorkers();
    console.log('Detection Results:', detection);

    if (detection.registrations.length > 0) {
      console.warn('⚠️ Active Service Workers found:', detection.registrations);
    } else {
      console.log('✅ No active Service Workers');
    }

    if (detection.cacheNames.length > 0) {
      console.warn('⚠️ Caches found:', detection.cacheNames);
      console.log('Cache contents:', detection.cacheContents);
    } else {
      console.log('✅ No caches found');
    }

    if (Object.keys(detection.appFilesInCache).length > 0) {
      console.warn('⚠️ App files found in cache:', detection.appFilesInCache);
    }

    console.groupEnd();

    return detection;
  }

  monitorServiceWorkerMessages() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', event => {
        console.log('📨 Service Worker message received:', event.data);
      });

      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('🔄 Service Worker controller changed');
      });
    }
  }
}

// Create singleton instance
export const serviceWorkerDetector = new ServiceWorkerDetector();