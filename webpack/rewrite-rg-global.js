/**
 * Patches the Chromium background service-worker bundle to remove all
 * references that would throw a ReferenceError in a service worker context.
 *
 * Two classes of issues are fixed:
 *
 * 1. Webpack runtime `r.g` IIFE — contains `new Function("return this")()`
 *    which violates Chrome MV3 CSP and causes parse-time rejection.
 *    Fix: replace the entire IIFE with `r.g=globalThis`.
 *
 * 2. AngularJS IIFE global argument — AngularJS wraps itself in an IIFE and
 *    passes `window` as the global context: `}(window)`.  In a service worker
 *    `window` is not defined, so this throws a ReferenceError immediately.
 *    Fix: replace `}(window)` with `}(globalThis)` and patch the immediately
 *    following `window.angular.*` inline-style injection call.
 *
 * 3. AngularJS jqLite `Node.prototype.contains` — AngularJS accesses
 *    `e.Node.prototype.contains` at module parse time.  In a service worker
 *    `globalThis.Node` is undefined → TypeError.
 *    Fix: guard the access with `(e.Node && e.Node.prototype.contains) || ...`
 *
 * @param {string} source - The JS source to patch.
 * @returns {string} The patched source.
 */
function rewriteRgGlobal(source) {
  let result = source;

  // ------------------------------------------------------------------
  // Fix 1: webpack runtime r.g IIFE (minified — production build)
  // ------------------------------------------------------------------
  const minifiedRgPattern =
    /r\.g=function\(\)\{if\("object"==typeof globalThis\)return globalThis;try\{return this\|\|new Function\("return this"\)\(\)\}catch\(e\)\{if\("object"==typeof window\)return window\}\}\(\)/g;

  result = result.replace(minifiedRgPattern, 'r.g=globalThis');

  // ------------------------------------------------------------------
  // Fix 1b: webpack runtime r.g IIFE (unminified — development build)
  // ------------------------------------------------------------------
  const unminifiedRgPattern =
    /\/\*\s*webpack\/runtime\/global\s*\*\/\s*[\s\S]*?r\.g\s*=\s*function\s*\(\)\s*\{[\s\S]*?new Function\("return this"\)[\s\S]*?\}\s*\(\)\s*;[\s\S]*?\}\s*\(\)\s*;/g;

  result = result.replace(
    unminifiedRgPattern,
    '/* webpack/runtime/global */\n!function() {\n  r.g = globalThis;\n}();'
  );

  // ------------------------------------------------------------------
  // Fix 2: AngularJS IIFE global argument + inline-style injection
  //
  // AngularJS ends its IIFE with:
  //   }(window),!window.angular.$$csp().noInlineStyle&&
  //     window.angular.element(document.head).prepend(window.angular.element(...))
  //
  // In a service worker `window` is undefined → ReferenceError at parse time.
  //
  // Strategy: replace `}(window)` with `}(globalThis)`, then replace all
  // `window.angular` references (the inline-style injection that immediately
  // follows) with `globalThis.angular`.  We anchor to `}(window)` so we only
  // touch the AngularJS IIFE section, not guarded `typeof window` checks.
  // ------------------------------------------------------------------

  // Step 2a: replace the IIFE argument itself
  result = result.replace(/\}\(window\)/g, '}(globalThis)');

  // Step 2b: replace window.angular.* calls that immediately follow the IIFE.
  // These are the inline-style injection calls that run at module init time.
  result = result.replace(/\bwindow\.angular\b/g, 'globalThis.angular');

  // ------------------------------------------------------------------
  // Fix 3: AngularJS jqLite Node.prototype.contains access
  //
  // AngularJS 1.8.3 jqLite init (angular.js ~line 1750):
  //   var ft = e.Node.prototype.contains || function(e) { ... }
  //
  // In a service worker globalThis.Node is undefined → TypeError:
  //   "Cannot read properties of undefined (reading 'prototype')"
  //
  // Fix: guard the access so it short-circuits to the fallback function
  // when Node is not available, matching the intent of the || fallback.
  // ------------------------------------------------------------------
  result = result.replace(
    /var ft=e\.Node\.prototype\.contains\|\|/g,
    'var ft=(e.Node&&e.Node.prototype.contains)||'
  );

  // ------------------------------------------------------------------
  // Fix 4: AngularJS $browser/$location URL-parser anchor element
  //
  // AngularJS creates an <a> element at module init time to use as a URL
  // parser (angular.js ~line 1850):
  //   var co = e.document.createElement("a"), lo = ho(e.location.href);
  //   co.href = "http://[::1]"; var fo = "[::1]" === co.hostname;
  //
  // In a service worker e.document is our stub, but the stub's createElement
  // returns an object without setAttribute/hostname, so co.setAttribute(...)
  // throws later.  Fix: replace the anchor-based IPv6 detection with a
  // direct false assignment (IPv6 detection is irrelevant in a service worker).
  // ------------------------------------------------------------------
  result = result.replace(
    /var so,co=e\.document\.createElement\("a"\),lo=ho\(e\.location\.href\);co\.href="http:\/\/\[::1\]";var fo="\[::1\]"===co\.hostname;/g,
    'var so,co={setAttribute:function(){},getAttribute:function(){return null},href:"",hostname:"",pathname:"",search:"",hash:"",port:"",protocol:"",host:"",origin:""},lo=ho(e.location?e.location.href:""),fo=false;'
  );

  // ------------------------------------------------------------------
  // Fix 5: AngularJS jqLite ready() — document.readyState + addEventListener
  //
  // angular-ts-decorators calls angular.element(document).ready(fn) at module
  // init time.  jqLite's ready() (function Bt) checks:
  //   "complete" === e.document.readyState
  //     ? e.setTimeout(t)
  //     : e.document.addEventListener("DOMContentLoaded", r)
  //
  // Our document stub has no readyState or addEventListener.  Fix: patch the
  // ready() function body so it always uses setTimeout (treating the document
  // as already loaded), which is correct for a service worker that has no DOM
  // loading lifecycle.
  // ------------------------------------------------------------------
  result = result.replace(
    /function Bt\(t\)\{function r\(\)\{e\.document\.removeEventListener\("DOMContentLoaded",r\),e\.removeEventListener\("load",r\),t\(\)\}"complete"===e\.document\.readyState\?e\.setTimeout\(t\):\(e\.document\.addEventListener\("DOMContentLoaded",r\),e\.addEventListener\("load",r\)\)\}/g,
    'function Bt(t){e.setTimeout(t)}'
  );

  // ------------------------------------------------------------------
  // Fix 6: Prepend a comprehensive DOM stub for service worker context.
  //
  // AngularJS and its services access document.readyState, document.body,
  // document.head, document.addEventListener, etc. at bootstrap time.
  // Since csp-init.ts runs after AngularJS in the webpack bundle (module
  // ordering), we must inject the stub BEFORE the bundle executes.
  //
  // This prepended IIFE installs globalThis.document (if not already present)
  // with all the properties AngularJS needs during bootstrap.
  // ------------------------------------------------------------------
  const domStubCode = `
(function() {
  if (typeof document === "undefined") {
    var _noop = function() {};
    var _el = function() {
      return {
        nodeType: 1, childNodes: [], querySelectorAll: _noop,
        getAttribute: function() { return null; }, setAttribute: _noop,
        addEventListener: _noop, removeEventListener: _noop,
        dispatchEvent: function() { return false; },
        appendChild: function(n) { return n; }, removeChild: _noop,
        insertBefore: _noop, cloneNode: function() { return this; },
        textContent: "", innerHTML: "", style: {}, className: "",
        tagName: "DIV", nodeName: "DIV", ownerDocument: null,
        parentNode: null, nextSibling: null, previousSibling: null,
        firstChild: null, lastChild: null, hidden: false
      };
    };
    globalThis.document = {
      nodeType: 9,
      documentElement: { nodeType: 1, getAttribute: function() { return null; }, setAttribute: _noop, addEventListener: _noop, removeEventListener: _noop, style: {}, className: "", tagName: "HTML", nodeName: "HTML" },
      readyState: "complete",
      head: _el(), body: _el(),
      querySelector: function(s) { return s.includes("ng-csp") ? { getAttribute: function() { return ""; } } : null; },
      querySelectorAll: function() { return []; },
      createElement: function() { return _el(); },
      createTextNode: function() { return { nodeType: 3, textContent: "" }; },
      createDocumentFragment: function() { return { nodeType: 11, childNodes: [], appendChild: function(n) { return n; } }; },
      addEventListener: _noop, removeEventListener: _noop,
      dispatchEvent: function() { return false; },
      createEvent: function() { return { initEvent: _noop }; },
      createRange: function() { return { setStart: _noop, setEnd: _noop, commonAncestorContainer: { nodeName: "BODY", ownerDocument: null } }; }
    };
    globalThis.window = globalThis;
  }

  if (typeof Node === "undefined") {
    globalThis.Node = { prototype: { contains: function() { return false; }, compareDocumentPosition: function() { return 0; } } };
  }

  if (typeof XMLHttpRequest === "undefined") {
    globalThis.XMLHttpRequest = function() {
      this._headers = {}; this._responseHeaders = {};
      this.readyState = 0; this.status = 0; this.statusText = "";
      this.responseText = ""; this.response = null; this.responseType = "";
      this.timeout = 0; this.withCredentials = false;
      this.upload = { addEventListener: function() {} };
      this.onload = null; this.onerror = null; this.ontimeout = null;
      this.onabort = null; this.onreadystatechange = null;
      this._aborted = false; this._controller = null;
    };
    globalThis.XMLHttpRequest.prototype.open = function(method, url) {
      this._method = method; this._url = url; this.readyState = 1;
    };
    globalThis.XMLHttpRequest.prototype.setRequestHeader = function(k, v) {
      this._headers[k] = v;
    };
    globalThis.XMLHttpRequest.prototype.getResponseHeader = function(k) {
      return this._responseHeaders[k.toLowerCase()] || null;
    };
    globalThis.XMLHttpRequest.prototype.getAllResponseHeaders = function() {
      return Object.entries(this._responseHeaders).map(function(e) { return e[0] + ": " + e[1]; }).join("\\r\\n");
    };
    globalThis.XMLHttpRequest.prototype.abort = function() {
      this._aborted = true;
      if (this._controller) this._controller.abort();
      if (this.onabort) this.onabort();
    };
    globalThis.XMLHttpRequest.prototype.send = function(body) {
      var self = this;
      self._controller = new AbortController();
      var opts = { method: self._method, headers: self._headers, signal: self._controller.signal };
      if (body != null && self._method !== "GET" && self._method !== "HEAD") opts.body = body;
      var timeoutId = null;
      if (self.timeout > 0) {
        timeoutId = setTimeout(function() { self._controller.abort(); if (self.ontimeout) self.ontimeout(); }, self.timeout);
      }
      fetch(self._url, opts).then(function(res) {
        if (self._aborted) return;
        if (timeoutId) clearTimeout(timeoutId);
        self.status = res.status; self.statusText = res.statusText;
        res.headers.forEach(function(v, k) { self._responseHeaders[k.toLowerCase()] = v; });
        return res.text().then(function(data) {
          if (self._aborted) return;
          self.readyState = 4; self.responseText = data; self.response = data;
          if (self.onload) self.onload();
          if (self.onreadystatechange) self.onreadystatechange();
        });
      }).catch(function(err) {
        if (self._aborted) return;
        if (timeoutId) clearTimeout(timeoutId);
        self.readyState = 4; self.status = 0;
        if (self.onerror) self.onerror(err);
        if (self.onreadystatechange) self.onreadystatechange();
      });
    };
  }
}());
`;
  // Minify the stub to a single line for the bundle
  const domStub = domStubCode.replace(/\s*\n\s*/g, '').replace(/\s{2,}/g, ' ') + '\n';

  result = domStub + result;

  return result;
}

module.exports = rewriteRgGlobal;
