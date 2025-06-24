// src/utils/diagnostics.js

export const getBrowserDetails = () => {
  const details = {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    onLine: navigator.onLine,
    cookieEnabled: navigator.cookieEnabled,
    doNotTrack: navigator.doNotTrack,
    hardwareConcurrency: navigator.hardwareConcurrency,
    maxTouchPoints: navigator.maxTouchPoints,
  };

  // Parse Chrome version
  const chromeMatch = navigator.userAgent.match(/Chrome\/(\d+\.\d+\.\d+\.\d+)/);
  if (chromeMatch) {
    details.chromeVersion = chromeMatch[1];
  }

  // Detect OS
  const os = navigator.userAgent.match(/(Windows|Mac|Linux|Android|iOS)/);
  if (os) {
    details.operatingSystem = os[1];
  }

  // Check if incognito (not 100% reliable but helps)
  details.possibleIncognito = false;
  if (window.webkitRequestFileSystem) {
    window.webkitRequestFileSystem(
      window.TEMPORARY,
      1,
      () => { details.possibleIncognito = false; },
      () => { details.possibleIncognito = true; }
    );
  }

  return details;
};

export const logBrowserDetails = () => {
  const details = getBrowserDetails();
  console.group('🌐 Browser Details');
  console.table(details);
  console.groupEnd();
  return details;
};