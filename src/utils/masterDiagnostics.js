// src/utils/masterDiagnostics.js

import { getBrowserDetails } from './diagnostics';
import { consoleLogger } from './consoleLogger';
import { networkMonitor } from './networkMonitor';
import { storageMonitor } from './storageMonitor';
import { codeAnalyzer } from './codeAnalyzer';
import { serviceWorkerDetector } from './serviceWorkerDetector';

class MasterDiagnostics {
  constructor() {
    this.isRunning = false;
    this.report = null;
  }

  async runFullDiagnostics() {
    if (this.isRunning) {
      console.warn('Diagnostics already running...');
      return;
    }

    this.isRunning = true;
    console.group('🏥 Running Full Diagnostics');
    console.log('Starting comprehensive diagnostic scan...');

    try {
      // 1. Browser Details
      console.log('\n📊 Collecting browser details...');
      const browserDetails = getBrowserDetails();

      // 2. Console Logs
      console.log('\n📝 Analyzing console logs...');
      const goTrueWarnings = consoleLogger.getGoTrueWarnings();
      const recentErrors = consoleLogger.getLogs({ type: 'error', since: new Date(Date.now() - 300000) }); // Last 5 mins

      // 3. Network Analysis
      console.log('\n🌐 Analyzing network requests...');
      const networkSummary = networkMonitor.getSummary();
      const failedRequests = networkMonitor.getFailedRequests();
      const authRequests = networkMonitor.getAuthRequests();

      // 4. Storage Analysis
      console.log('\n💾 Analyzing storage...');
      const storageSnapshot = storageMonitor.getStorageSnapshot();
      const authKeys = storageMonitor.getAuthRelatedKeys();
      storageMonitor.validateClearAuthStorage();

      // 5. Code Analysis
      console.log('\n🔍 Analyzing Supabase instances...');
      const codeReport = codeAnalyzer.generateReport();

      // 6. Service Worker Analysis
      console.log('\n⚙️ Checking service workers...');
      const serviceWorkerReport = await serviceWorkerDetector.detectServiceWorkers();

      // Compile full report
      this.report = {
        timestamp: new Date().toISOString(),
        summary: this.generateSummary({
          browserDetails,
          goTrueWarnings,
          recentErrors,
          networkSummary,
          failedRequests,
          authKeys,
          codeReport,
          serviceWorkerReport
        }),
        details: {
          browser: browserDetails,
          console: {
            goTrueWarnings,
            recentErrors,
            totalLogs: consoleLogger.logs.length
          },
          network: {
            summary: networkSummary,
            failedRequests,
            authRequests
          },
          storage: {
            snapshot: storageSnapshot,
            authKeys
          },
          code: codeReport,
          serviceWorker: serviceWorkerReport
        }
      };

      console.log('\n✅ Diagnostics complete!');
      console.log('Summary:', this.report.summary);
      console.groupEnd();

      return this.report;

    } catch (error) {
      console.error('Diagnostic error:', error);
      this.report = { error: error.message, stack: error.stack };
    } finally {
      this.isRunning = false;
    }
  }

  generateSummary(data) {
    const issues = [];
    const warnings = [];
    const info = [];

    // Check for GoTrue warnings
    if (data.goTrueWarnings.length > 0) {
      issues.push({
        severity: 'high',
        type: 'Multiple GoTrueClient instances',
        count: data.goTrueWarnings.length,
        message: 'Multiple Supabase client instances detected'
      });
    }

    // Check for recent errors
    if (data.recentErrors.length > 0) {
      warnings.push({
        severity: 'medium',
        type: 'Console errors',
        count: data.recentErrors.length,
        message: 'Recent console errors detected'
      });
    }

    // Check for failed network requests
    if (data.failedRequests.length > 0) {
      const authFailures = data.failedRequests.filter(r => r.url.includes('auth'));
      if (authFailures.length > 0) {
        issues.push({
          severity: 'high',
          type: 'Auth request failures',
          count: authFailures.length,
          message: 'Authentication requests are failing'
        });
      }
    }

    // Check for duplicate Supabase instances
    if (data.codeReport.duplicates.length > 0) {
      issues.push({
        severity: 'high',
        type: 'Duplicate Supabase clients',
        count: data.codeReport.duplicates.length,
        message: 'Duplicate Supabase client configurations found'
      });
    }

    // Check for service workers
    if (data.serviceWorkerReport.registrations.length > 0) {
      warnings.push({
        severity: 'medium',
        type: 'Active service workers',
        count: data.serviceWorkerReport.registrations.length,
        message: 'Service workers may be caching old content'
      });
    }

    // Browser info
    info.push({
      type: 'Browser',
      value: `Chrome ${data.browserDetails.chromeVersion || 'Unknown'} on ${data.browserDetails.operatingSystem || 'Unknown'}`
    });

    return {
      hasIssues: issues.length > 0,
      issues,
      warnings,
      info,
      score: this.calculateHealthScore(issues, warnings)
    };
  }

  calculateHealthScore(issues, warnings) {
    let score = 100;
    issues.forEach(issue => {
      score -= issue.severity === 'high' ? 20 : 10;
    });
    warnings.forEach(warning => {
      score -= warning.severity === 'high' ? 10 : 5;
    });
    return Math.max(0, score);
  }

  async monitorRefreshBehavior() {
    console.group('🔄 Monitoring Refresh Behavior');
    
    // Set up monitoring before refresh
    storageMonitor.monitorRefresh();
    
    // Add refresh listener
    window.addEventListener('beforeunload', () => {
      console.log('Page refresh detected - capturing state...');
      const state = {
        timestamp: new Date().toISOString(),
        storage: storageMonitor.getStorageSnapshot(),
        activeRequests: networkMonitor.requests.filter(r => !r.endTime),
        consoleLogs: consoleLogger.logs.slice(-20)
      };
      
      // Store state for comparison after refresh
      sessionStorage.setItem('__diagnostic_before_refresh__', JSON.stringify(state));
    });

    // Check after page load
    window.addEventListener('load', () => {
      const beforeState = sessionStorage.getItem('__diagnostic_before_refresh__');
      if (beforeState) {
        const before = JSON.parse(beforeState);
        const after = {
          timestamp: new Date().toISOString(),
          storage: storageMonitor.getStorageSnapshot(),
          consoleLogs: consoleLogger.logs.slice(0, 20)
        };
        
        console.log('Before refresh:', before);
        console.log('After refresh:', after);
        
        // Clean up
        sessionStorage.removeItem('__diagnostic_before_refresh__');
      }
    });

    console.groupEnd();
  }

  downloadFullReport() {
    if (!this.report) {
      console.error('No diagnostic report available. Run diagnostics first.');
      return;
    }

    const blob = new Blob([JSON.stringify(this.report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `diagnostic-report-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log('📥 Diagnostic report downloaded');
  }

  getQuickSummary() {
    if (!this.report) {
      return 'No diagnostic report available. Run diagnostics first.';
    }

    const { summary } = this.report;
    let output = `\n🏥 Diagnostic Summary (Health Score: ${summary.score}/100)\n`;
    output += '='.repeat(50) + '\n';

    if (summary.issues.length > 0) {
      output += '\n❌ ISSUES:\n';
      summary.issues.forEach(issue => {
        output += `  • ${issue.message} (${issue.count} occurrences)\n`;
      });
    }

    if (summary.warnings.length > 0) {
      output += '\n⚠️  WARNINGS:\n';
      summary.warnings.forEach(warning => {
        output += `  • ${warning.message} (${warning.count} occurrences)\n`;
      });
    }

    output += '\nℹ️  INFO:\n';
    summary.info.forEach(item => {
      output += `  • ${item.type}: ${item.value}\n`;
    });

    output += '\n' + '='.repeat(50);
    return output;
  }
}

// Create singleton instance and make it globally available
const masterDiagnostics = new MasterDiagnostics();

// Expose to window for easy access
window.diagnostics = {
  run: () => masterDiagnostics.runFullDiagnostics(),
  monitor: () => masterDiagnostics.monitorRefreshBehavior(),
  download: () => masterDiagnostics.downloadFullReport(),
  summary: () => console.log(masterDiagnostics.getQuickSummary()),
  report: () => masterDiagnostics.report,
  
  // Individual tools
  browser: getBrowserDetails,
  console: consoleLogger,
  network: networkMonitor,
  storage: storageMonitor,
  code: codeAnalyzer,
  serviceWorker: serviceWorkerDetector
};

// Ensure global access via `diagnostics` in browser consoles
if (typeof globalThis !== 'undefined') {
  globalThis.diagnostics = window.diagnostics;
}

console.log(`
🏥 Diagnostics Loaded! Available commands:
  • diagnostics.run()      - Run full diagnostic scan
  • diagnostics.monitor()  - Monitor refresh behavior
  • diagnostics.summary()  - Show quick summary
  • diagnostics.download() - Download full report
  • diagnostics.report()   - Get report object
`);

export default masterDiagnostics;