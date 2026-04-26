/**
 * @jest-environment node
 */
// Tests for csp-init.ts — the document stub installed in service worker context.
//
// csp-init.ts runs side effects at module load time:
//   - If `document` is undefined → installs a stub on globalThis.document
//   - Else if document.documentElement exists → sets the ng-csp attribute on the real DOM
//
// These tests exercise the `document === undefined` branch (service worker context).
// Each test uses jest.resetModules() + require() to re-execute the module from scratch
// so the side effects run fresh with the desired global state.

describe('csp-init.ts — document stub (service worker branch)', () => {
  let originalDocument: Document | undefined;

  beforeEach(() => {
    // Save whatever jest/jsdom put on global.document
    originalDocument = (global as any).document;
    // Simulate service worker environment: no document
    delete (global as any).document;
    // Ensure globalThis.document is also cleared
    delete (globalThis as any).document;
    // Reset module registry so csp-init.ts re-executes on next require()
    jest.resetModules();
  });

  afterEach(() => {
    // Restore original document so other tests are unaffected
    (global as any).document = originalDocument;
    (globalThis as any).document = originalDocument;
  });

  // 5.1 — querySelector('[ng-csp]') returns a truthy element
  test('querySelector("[ng-csp]") returns a truthy element', () => {
    require('./csp-init');
    const doc = (globalThis as any).document;
    const el = doc.querySelector('[ng-csp]');
    expect(el).toBeTruthy();
  });

  // 5.2 — querySelector('[data-ng-csp]') returns a truthy element
  test('querySelector("[data-ng-csp]") returns a truthy element', () => {
    require('./csp-init');
    const doc = (globalThis as any).document;
    const el = doc.querySelector('[data-ng-csp]');
    expect(el).toBeTruthy();
  });

  // 5.3 — querySelector for an unrelated selector returns null
  test('querySelector(".some-class") returns null', () => {
    require('./csp-init');
    const doc = (globalThis as any).document;
    const el = doc.querySelector('.some-class');
    expect(el).toBeNull();
  });

  // 5.4 — getAttribute('ng-csp') on the returned element is non-null
  test('getAttribute("ng-csp") on the [ng-csp] element returns a non-null value', () => {
    require('./csp-init');
    const doc = (globalThis as any).document;
    const el = doc.querySelector('[ng-csp]');
    const attr = el.getAttribute('ng-csp');
    expect(attr).not.toBeNull();
  });
});
