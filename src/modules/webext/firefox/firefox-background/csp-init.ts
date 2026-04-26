// This module must be imported before any AngularJS module.
// AngularJS runs a `new Function("")` probe at load time to detect CSP mode.
// In Firefox MV3 background module scripts the browser applies a strict
// "script-src 'self'" policy regardless of the manifest extension_pages CSP,
// causing that probe to trigger a CSP violation report.
// Setting ng-csp on the document element before AngularJS initialises tells it
// to skip the probe and go straight into CSP-safe mode.
if (typeof document !== 'undefined' && document.documentElement) {
  document.documentElement.setAttribute('ng-csp', '');
}
