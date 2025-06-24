// src/utils/codeAnalyzer.js

class CodeAnalyzer {
  constructor() {
    this.supabaseInstances = [];
    this.createClientCalls = [];
    this.setupDetection();
  }

// Create singleton instance
export const codeAnalyzer = new CodeAnalyzer();

  setupDetection() {
    // Check for Supabase instances in window
    this.detectWindowInstances();
    
    // Monitor for new instances
    this.monitorSupabaseCreation();
  }

  detectWindowInstances() {
    const instances = [];
    
    // Check common locations
    const checkLocations = [
      window.supabase,
      window.supabaseClient,
      window.supabaseAdmin,
      window._supabase
    ];
    
    checkLocations.forEach((location, index) => {
      if (location && typeof location === 'object') {
        instances.push({
          name: `window.${['supabase', 'supabaseClient', 'supabaseAdmin', '_supabase'][index]}`,
          instance: location,
          auth: location.auth,
          storage: this.extractStorageInfo(location)
        });
      }
    });
    
    // Check for instances in loaded modules
    if (window.require && window.require.cache) {
      Object.keys(window.require.cache).forEach(modulePath => {
        if (modulePath.includes('supabase')) {
          const module = window.require.cache[modulePath];
          if (module.exports) {
            instances.push({
              name: `module: ${modulePath}`,
              instance: module.exports,
              auth: module.exports.auth,
              storage: this.extractStorageInfo(module.exports)
            });
          }
        }
      });
    }
    
    this.supabaseInstances = instances;
    return instances;
  }

  extractStorageInfo(instance) {
    try {
      if (instance.auth) {
        // Try to access storage configuration
        const storage = instance.auth.storage || 
                       instance.auth._storage || 
                       instance.auth.localStorage;
        
        if (storage) {
          return {
            type: storage.constructor.name,
            keys: this.getStorageKeys(storage)
          };
        }
      }
    } catch (e) {
      return { error: e.message };
    }
    return null;
  }

  getStorageKeys(storage) {
    const keys = [];
    try {
      // Check if it's using localStorage
      if (storage.getItem) {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.includes('auth') || key.includes('supabase'))) {
            keys.push(key);
          }
        }
      }
    } catch (e) {
      return { error: e.message };
    }
    return keys;
  }

  monitorSupabaseCreation() {
    // Try to intercept createClient calls
    if (window.supabase && window.supabase.createClient) {
      const originalCreateClient = window.supabase.createClient;
      
      window.supabase.createClient = (...args) => {
        console.warn('🔍 createClient called with args:', args);
        
        this.createClientCalls.push({
          timestamp: new Date().toISOString(),
          args: args,
          stack: new Error().stack
        });
        
        const client = originalCreateClient.apply(window.supabase, args);
        
        this.supabaseInstances.push({
          name: `createClient-${this.createClientCalls.length}`,
          instance: client,
          auth: client.auth,
          storage: this.extractStorageInfo(client),
          createdAt: new Date().toISOString()
        });
        
        return client;
      };
    }
  }

  analyzeSupabaseFiles() {
    // This would analyze the actual file content
    // For now, we'll provide a template for what to look for
    return {
      checkPoints: [
        {
          file: 'src/supabase.js',
          lineRange: '20-50',
          lookFor: [
            'createClient calls',
            'storageKey configurations',
            'auth settings',
            'multiple client instances'
          ]
        },
        {
          file: 'src/App.js',
          lookFor: [
            'supabase imports',
            'auth initialization',
            'clearAuthStorage implementation'
          ]
        },
        {
          pattern: '*.js',
          lookFor: [
            'import.*supabase',
            'createClient',
            'supabase.auth',
            'new SupabaseClient'
          ]
        }
      ]
    };
  }

  findDuplicateClients() {
    const duplicates = [];
    const seen = new Map();
    
    this.supabaseInstances.forEach(instance => {
      const key = this.getInstanceKey(instance);
      if (seen.has(key)) {
        duplicates.push({
          first: seen.get(key),
          duplicate: instance,
          key: key
        });
      } else {
        seen.set(key, instance);
      }
    });
    
    return duplicates;
  }

  getInstanceKey(instance) {
    try {
      // Create a unique key based on instance properties
      const auth = instance.auth;
      const storage = instance.storage;
      
      return JSON.stringify({
        hasAuth: !!auth,
        storageType: storage?.type,
        storageKeys: storage?.keys?.length
      });
    } catch (e) {
      return 'unknown';
    }
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      detectedInstances: this.detectWindowInstances(),
      createClientCalls: this.createClientCalls,
      duplicates: this.findDuplicateClients(),
      recommendations: this.getRecommendations()
    };
    
    console.group('🔍 Supabase Code Analysis Report');
    console.log('Detected Instances:', report.detectedInstances);
    console.log('Create Client Calls:', report.createClientCalls);
    console.log('Duplicate Instances:', report.duplicates);
    console.log('Recommendations:', report.recommendations);
    console.groupEnd();
    
    return report;
  }

  getRecommendations() {
    const recommendations = [];
    
    if (this.supabaseInstances.length > 2) {
      recommendations.push({
        severity: 'high',
        issue: 'Multiple Supabase instances detected',
        solution: 'Ensure only one main client and one admin client are created'
      });
    }
    
    const instancesWithoutStorageKey = this.supabaseInstances.filter(
      i => !i.storage || !i.storage.keys || i.storage.keys.length === 0
    );
    
    if (instancesWithoutStorageKey.length > 0) {
      recommendations.push({
        severity: 'medium',
        issue: 'Instances without proper storage configuration',
        solution: 'Add storageKey configuration to all createClient calls'
      });
    }
    
    if (this.findDuplicateClients().length > 0) {
      recommendations.push({
        severity: 'high',
        issue: 'Duplicate client configurations detected',
        solution: 'Remove duplicate client instantiations'
      });
    }
    
    return recommendations;
  }
}