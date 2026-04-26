'use strict';

const rewriteRgGlobal = require('./rewrite-rg-global');

// 4.1 — minified r.g pattern (production build)
describe('rewriteRgGlobal — minified pattern', () => {
  const MINIFIED_RG =
    'r.g=function(){if("object"==typeof globalThis)return globalThis;try{return this||new Function("return this")()}catch(e){if("object"==typeof window)return window}}()';

  it('replaces the minified r.g IIFE with r.g=globalThis', () => {
    const input = `var r={};${MINIFIED_RG};console.log(r.g);`;
    const output = rewriteRgGlobal(input);
    expect(output).toContain('r.g=globalThis');
    expect(output).not.toContain('new Function(');
  });

  it('preserves surrounding code when replacing the minified pattern', () => {
    const prefix = 'var r={};';
    const suffix = ';console.log(r.g);';
    const input = `${prefix}${MINIFIED_RG}${suffix}`;
    const output = rewriteRgGlobal(input);
    expect(output).toContain(prefix);
    expect(output).toContain(suffix);
  });
});

// 4.2 — unminified r.g pattern (development build)
describe('rewriteRgGlobal — unminified pattern', () => {
  const UNMINIFIED_RG = `/* webpack/runtime/global */
!function() {
  r.g = function() {
    if ("object" == typeof globalThis) return globalThis;
    try {
      return this || new Function("return this")();
    } catch (e) {
      if ("object" == typeof window) return window;
    }
  }();
}();`;

  it('replaces the unminified r.g block with r.g=globalThis', () => {
    const input = `var r = {};\n${UNMINIFIED_RG}\nconsole.log(r.g);`;
    const output = rewriteRgGlobal(input);
    expect(output).toContain('r.g = globalThis');
    expect(output).not.toContain('new Function(');
  });

  it('preserves surrounding code when replacing the unminified pattern', () => {
    const prefix = 'var r = {};\n';
    const suffix = '\nconsole.log(r.g);';
    const input = `${prefix}${UNMINIFIED_RG}${suffix}`;
    const output = rewriteRgGlobal(input);
    expect(output).toContain(prefix);
    expect(output).toContain(suffix);
  });
});

// 4.3 — no-op when r.g pattern is absent
describe('rewriteRgGlobal — no-op case', () => {
  it('returns the source unchanged when the r.g pattern is not present', () => {
    const input = 'var x = 1;\nconsole.log("hello world");\n';
    const output = rewriteRgGlobal(input);
    expect(output).toBe(input);
  });

  it('returns an empty string unchanged', () => {
    expect(rewriteRgGlobal('')).toBe('');
  });

  it('does not modify a string that already uses r.g=globalThis directly', () => {
    const input = 'var r={}; r.g=globalThis; console.log(r.g);';
    const output = rewriteRgGlobal(input);
    expect(output).toBe(input);
  });
});
