'use strict';

/**
 * Property-based tests for rewriteRgGlobal and RewriteRgGlobalPlugin asset scoping.
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6 (Preservation Checking)
 */

const fc = require('fast-check');
const rewriteRgGlobal = require('./rewrite-rg-global');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** The exact minified r.g IIFE that webpack 5 emits in production builds. */
const MINIFIED_RG =
  'r.g=function(){if("object"==typeof globalThis)return globalThis;try{return this||new Function("return this")()}catch(e){if("object"==typeof window)return window}}()';

/**
 * Simulate the asset-scoping logic from RewriteRgGlobalPlugin:
 * only process assets whose name is (or ends with) "background.js".
 *
 * @param {Record<string, string>} assets - map of assetName → source string
 * @returns {Record<string, string>} new map with only background.js patched
 */
function applyPluginLogic(assets) {
  const result = {};
  for (const [name, source] of Object.entries(assets)) {
    const isBackground = name === 'background.js' || name.endsWith('/background.js');
    result[name] = isBackground ? rewriteRgGlobal(source) : source;
  }
  return result;
}

// ---------------------------------------------------------------------------
// 6.1 — PBT: rewriteRgGlobal is a no-op when the r.g pattern is absent
// ---------------------------------------------------------------------------

/**
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**
 *
 * Property: For any JS string that does NOT contain the minified or unminified
 * r.g IIFE pattern, rewriteRgGlobal(source) must return the source unchanged.
 */
describe('PBT 6.1 — rewriteRgGlobal is a no-op when r.g pattern is absent', () => {
  it('returns source unchanged for arbitrary strings without the r.g pattern', () => {
    fc.assert(
      fc.property(
        // Generate arbitrary strings; filter out any that accidentally contain
        // the trigger substring so the property is well-defined.
        fc.string({ minLength: 0, maxLength: 500 }).filter(
          (s) => !s.includes('new Function("return this")')
        ),
        (source) => {
          const result = rewriteRgGlobal(source);
          return result === source;
        }
      ),
      { numRuns: 1000 }
    );
  });

  it('returns source unchanged for strings that look like JS but lack the r.g IIFE', () => {
    // Strings built from realistic JS tokens but without the exact pattern
    const jsLikeArb = fc
      .array(
        fc.oneof(
          fc.constant('var r={};'),
          fc.constant('console.log(r.g);'),
          fc.constant('function foo(){}'),
          fc.constant('r.g=globalThis;'),
          fc.constant('if(typeof globalThis==="object"){}'),
          fc.constant('// comment\n'),
          fc.string({ minLength: 0, maxLength: 20 })
        ),
        { minLength: 0, maxLength: 20 }
      )
      .map((parts) => parts.join(''))
      .filter((s) => !s.includes('new Function("return this")'));

    fc.assert(
      fc.property(jsLikeArb, (source) => {
        const result = rewriteRgGlobal(source);
        return result === source;
      }),
      { numRuns: 500 }
    );
  });
});

// ---------------------------------------------------------------------------
// 6.2 — PBT: plugin only modifies background.js assets
// ---------------------------------------------------------------------------

/**
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**
 *
 * Property: For any asset map, the plugin must only modify assets named
 * "background.js" (or ending with "/background.js"). All other assets must
 * remain unchanged regardless of their content.
 */
describe('PBT 6.2 — plugin only modifies background.js assets', () => {
  // Arbitrary asset name that is NOT background.js and not a prototype-polluting key
  const nonBackgroundName = fc
    .string({ minLength: 1, maxLength: 40 })
    .filter(
      (n) =>
        n !== 'background.js' &&
        !n.endsWith('/background.js') &&
        n !== '__proto__' &&
        n !== 'constructor' &&
        n !== 'prototype'
    );

  // Arbitrary source string (may or may not contain the r.g pattern)
  const sourceArb = fc.oneof(
    fc.string({ minLength: 0, maxLength: 200 }),
    fc.constant(MINIFIED_RG),
    fc.constant(`prefix;${MINIFIED_RG};suffix`)
  );

  it('leaves non-background assets unchanged even when they contain the r.g pattern', () => {
    fc.assert(
      fc.property(
        fc.array(fc.tuple(nonBackgroundName, sourceArb), { minLength: 0, maxLength: 10 }),
        (entries) => {
          // Build an asset map with only non-background assets
          const assets = Object.fromEntries(entries);
          const result = applyPluginLogic(assets);

          // Every non-background asset must be byte-for-byte identical
          return Object.entries(assets).every(([name, src]) => result[name] === src);
        }
      ),
      { numRuns: 500 }
    );
  });

  it('modifies background.js when it contains the r.g pattern, leaves others unchanged', () => {
    fc.assert(
      fc.property(
        // background asset name: either bare or with a path prefix
        fc.oneof(fc.constant('background.js'), fc.constant('assets/background.js')),
        // non-background entries
        fc.array(fc.tuple(nonBackgroundName, sourceArb), { minLength: 0, maxLength: 5 }),
        (bgName, otherEntries) => {
          const bgSource = `prefix;${MINIFIED_RG};suffix`;
          const assets = { [bgName]: bgSource, ...Object.fromEntries(otherEntries) };
          const result = applyPluginLogic(assets);

          // background.js must be patched
          const bgPatched = result[bgName];
          if (bgPatched.includes('new Function(')) return false;
          if (!bgPatched.includes('r.g=globalThis')) return false;

          // All other assets must be unchanged
          return otherEntries.every(([name, src]) => result[name] === src);
        }
      ),
      { numRuns: 500 }
    );
  });

  it('does not modify background.js when it lacks the r.g pattern', () => {
    fc.assert(
      fc.property(
        fc.oneof(fc.constant('background.js'), fc.constant('assets/background.js')),
        fc
          .string({ minLength: 0, maxLength: 200 })
          .filter((s) => !s.includes('new Function("return this")')),
        (bgName, bgSource) => {
          const assets = { [bgName]: bgSource };
          const result = applyPluginLogic(assets);
          // No r.g pattern → no-op
          return result[bgName] === bgSource;
        }
      ),
      { numRuns: 500 }
    );
  });
});
