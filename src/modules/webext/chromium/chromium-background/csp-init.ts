// Must be imported before any AngularJS module.
//
// AngularJS 1.8.3 detects CSP mode lazily via its `csp()` function
// (angular.js ~line 1265).  When first called, it runs:
//
//   var ngCspElement = (window.document.querySelector('[ng-csp]') ||
//                       window.document.querySelector('[data-ng-csp]'));
//   if (ngCspElement) {
//     var ngCspAttribute = ngCspElement.getAttribute('ng-csp') ||
//                          ngCspElement.getAttribute('data-ng-csp');
//     csp.rules = {
//       noUnsafeEval: !ngCspAttribute || (ngCspAttribute.indexOf('no-unsafe-eval') !== -1),
//       noInlineStyle: !ngCspAttribute || (ngCspAttribute.indexOf('no-inline-style') !== -1)
//     };
//   } else {
//     csp.rules = { noUnsafeEval: noUnsafeEval(), ... };  // ← calls new Function("")
//   }
//
// With webpack `target: 'webworker'`, webpack rewrites the `window` parameter
// of AngularJS's IIFE to `self` (the service-worker global === globalThis), so
// `window.document` inside AngularJS resolves to `globalThis.document`.
//
// This stub patches `globalThis.document` so that:
//   1. `querySelector('[ng-csp]')` returns a truthy element object (selector
//      contains 'ng-csp', which covers both '[ng-csp]' and '[data-ng-csp]').
//   2. `getAttribute('ng-csp')` on that element returns '' (empty string).
//      AngularJS checks `!ngCspAttribute` — empty string is falsy, so
//      `!ngCspAttribute` is true → `noUnsafeEval = true`.  This causes
//      AngularJS to enter CSP-safe mode and skip the `new Function("")` probe.
//
// The stub must be in place before `csp()` is first called.  Since `csp()` is
// lazy (not an IIFE), importing this module first in chromium-background.module.ts
// guarantees the stub is installed before AngularJS's `csp()` runs.
if (typeof document === 'undefined') {
  // Provide a minimal document stub so AngularJS CSP detection finds ng-csp
  // without needing a real DOM. Only used during AngularJS module init.
  (globalThis as any).document = {
    documentElement: { getAttribute: () => '' },
    // querySelector: returns a truthy stub element for any selector containing
    // 'ng-csp' (covers both '[ng-csp]' and '[data-ng-csp]' as used by
    // AngularJS 1.8.3 csp() at angular.js ~line 1269-1270).
    querySelector: (sel: string) =>
      sel.includes('ng-csp')
        ? {
            // getAttribute returns '' (empty string, not null).
            // AngularJS checks: !ngCspAttribute || ngCspAttribute.indexOf('no-unsafe-eval') !== -1
            // '' is falsy → !'' is true → noUnsafeEval = true → CSP-safe mode enabled.
            // (angular.js ~line 1273-1279)
            getAttribute: (_attr: string) => ''
          }
        : null,
    // createElement stub: returns a minimal element-like object.
    // AngularJS calls document.createElement("a") at module init time to use
    // as a URL parser (angular.js $browser/$location service init).
    // The stub must support setAttribute/getAttribute/href/hostname so the
    // URL-parsing logic doesn't throw.
    createElement: (_tag: string) => ({
      nodeType: 1,
      childNodes: [] as any[],
      querySelectorAll: () => [] as any[],
      getAttribute: (_attr: string) => null as string | null,
      setAttribute: (_attr: string, _val: string) => {},
      get href() {
        return '';
      },
      set href(_val: string) {},
      hostname: '',
      pathname: '',
      search: '',
      hash: '',
      port: '',
      protocol: '',
      host: '',
      origin: ''
    }),
    createTextNode: () => ({}),
    createDocumentFragment: () => ({
      nodeType: 11,
      childNodes: [] as any[],
      appendChild: (_node: any) => _node
    }),
    head: null,
    body: null
  };

  // AngularJS 1.8.3 accesses Node.prototype.contains at module parse time
  // (angular.js jqLite init: `var ft = e.Node.prototype.contains || ...`).
  // In a service worker globalThis.Node is undefined → TypeError.
  // Stub it with a no-op contains() so the assignment doesn't throw.
  if (typeof (globalThis as any).Node === 'undefined') {
    (globalThis as any).Node = {
      prototype: {
        contains: function (_other: any) {
          return false;
        }
      }
    };
  }
} else if (document.documentElement) {
  document.documentElement.setAttribute('ng-csp', '');
}
