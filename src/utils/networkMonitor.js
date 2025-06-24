// src/utils/networkMonitor.js

class NetworkMonitor {
  constructor() {
    this.requests = [];
    this.maxRequests = 500;
    this.setupInterceptor();
  }

  setupInterceptor() {
    // Store original fetch
    const originalFetch = window.fetch;

    // Intercept fetch requests
    window.fetch = async (...args) => {
      const [resource, config] = args;
      const requestId = Date.now() + Math.random();
      
      const requestInfo = {
        id: requestId,
        timestamp: new Date().toISOString(),
        url: typeof resource === 'string' ? resource : resource.url,
        method: config?.method || 'GET',
        headers: config?.headers || {},
        body: config?.body,
        startTime: performance.now()
      };

      // Check if this is a relevant request
      const isRelevant = this.isRelevantRequest(requestInfo.url);
      if (isRelevant) {
        requestInfo.category = this.categorizeRequest(requestInfo.url);
      }

      this.requests.push(requestInfo);

      try {
        const response = await originalFetch(...args);
        
        // Clone response to read it without consuming
        const clonedResponse = response.clone();
        
        const responseInfo = {
          ...requestInfo,
          endTime: performance.now(),
          duration: performance.now() - requestInfo.startTime,
          status: response.status,
          statusText: response.statusText,
          responseHeaders: {},
          ok: response.ok
        };

        // Get response headers
        response.headers.forEach((value, key) => {
          responseInfo.responseHeaders[key] = value;
        });

        // Try to get response body for relevant requests
        if (isRelevant && response.headers.get('content-type')?.includes('application/json')) {
          try {
            responseInfo.responseBody = await clonedResponse.json();
          } catch (e) {
            responseInfo.responseBodyError = e.message;
          }
        }

        // Update the request with response info
        const index = this.requests.findIndex(r => r.id === requestId);
        if (index !== -1) {
          this.requests[index] = responseInfo;
        }

        // Trim old requests
        if (this.requests.length > this.maxRequests) {
          this.requests.shift();
        }

        return response;
      } catch (error) {
        // Update request with error info
        const index = this.requests.findIndex(r => r.id === requestId);
        if (index !== -1) {
          this.requests[index] = {
            ...this.requests[index],
            endTime: performance.now(),
            duration: performance.now() - requestInfo.startTime,
            error: error.message,
            errorStack: error.stack
          };
        }
        throw error;
      }
    };

    // Also intercept XMLHttpRequest
    const XHROpen = XMLHttpRequest.prototype.open;
    const XHRSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function(method, url, ...args) {
      this._requestInfo = {
        id: Date.now() + Math.random(),
        timestamp: new Date().toISOString(),
        url: url,
        method: method,
        startTime: performance.now()
      };
      return XHROpen.apply(this, [method, url, ...args]);
    };

    XMLHttpRequest.prototype.send = function(body) {
      const xhr = this;
      const requestInfo = this._requestInfo;
      
      if (requestInfo) {
        requestInfo.body = body;
        
        xhr.addEventListener('load', function() {
          requestInfo.endTime = performance.now();
          requestInfo.duration = requestInfo.endTime - requestInfo.startTime;
          requestInfo.status = xhr.status;
          requestInfo.statusText = xhr.statusText;
          requestInfo.responseHeaders = xhr.getAllResponseHeaders();
          
          if (networkMonitor.isRelevantRequest(requestInfo.url)) {
            requestInfo.category = networkMonitor.categorizeRequest(requestInfo.url);
            try {
              requestInfo.responseBody = JSON.parse(xhr.responseText);
            } catch (e) {
              requestInfo.responseText = xhr.responseText;
            }
          }
          
          networkMonitor.requests.push(requestInfo);
          networkMonitor.trimRequests();
        });

        xhr.addEventListener('error', function() {
          requestInfo.endTime = performance.now();
          requestInfo.duration = requestInfo.endTime - requestInfo.startTime;
          requestInfo.error = 'Network error';
          networkMonitor.requests.push(requestInfo);
          networkMonitor.trimRequests();
        });
      }

      return XHRSend.apply(this, [body]);
    };
  }

  isRelevantRequest(url) {
    const relevantPatterns = [
      '/manifest.json',
      '/auth/v1',
      'supabase',
      '/api/',
      'forecasting-app'
    ];
    
    return relevantPatterns.some(pattern => url.includes(pattern));
  }

  categorizeRequest(url) {
    if (url.includes('/manifest.json')) return 'manifest';
    if (url.includes('/auth/v1')) return 'auth';
    if (url.includes('supabase')) return 'supabase';
    if (url.includes('/api/')) return 'api';
    return 'other';
  }

  trimRequests() {
    if (this.requests.length > this.maxRequests) {
      this.requests = this.requests.slice(-this.maxRequests);
    }
  }

  getRequests(filter = {}) {
    let filtered = this.requests;
    
    if (filter.url) {
      filtered = filtered.filter(r => r.url.includes(filter.url));
    }
    
    if (filter.status) {
      filtered = filtered.filter(r => r.status === filter.status);
    }
    
    if (filter.category) {
      filtered = filtered.filter(r => r.category === filter.category);
    }
    
    if (filter.failed) {
      filtered = filtered.filter(r => r.status >= 400 || r.error);
    }
    
    return filtered;
  }

  getFailedRequests() {
    return this.getRequests({ failed: true });
  }

  getAuthRequests() {
    return this.getRequests({ category: 'auth' });
  }

  getSummary() {
    const summary = {
      totalRequests: this.requests.length,
      byCategory: {},
      byStatus: {},
      failed: [],
      avgDuration: 0
    };

    let totalDuration = 0;
    let countWithDuration = 0;

    this.requests.forEach(req => {
      // By category
      if (req.category) {
        summary.byCategory[req.category] = (summary.byCategory[req.category] || 0) + 1;
      }
      
      // By status
      if (req.status) {
        const statusGroup = `${Math.floor(req.status / 100)}xx`;
        summary.byStatus[statusGroup] = (summary.byStatus[statusGroup] || 0) + 1;
      }
      
      // Failed requests
      if (req.status >= 400 || req.error) {
        summary.failed.push({
          url: req.url,
          status: req.status,
          error: req.error,
          timestamp: req.timestamp
        });
      }
      
      // Duration
      if (req.duration) {
        totalDuration += req.duration;
        countWithDuration++;
      }
    });

    if (countWithDuration > 0) {
      summary.avgDuration = totalDuration / countWithDuration;
    }

    return summary;
  }

  downloadReport() {
    const report = {
      exportTime: new Date().toISOString(),
      summary: this.getSummary(),
      failedRequests: this.getFailedRequests(),
      authRequests: this.getAuthRequests(),
      allRequests: this.requests
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `network-report-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

// Create singleton instance
export const networkMonitor = new NetworkMonitor();