const Path = require('path');
const webpack = require('webpack');
const WebExtConfig = require('./webext.config');
const rewriteRgGlobal = require('./rewrite-rg-global');

/**
 * Webpack plugin that rewrites the `r.g` global-object detection IIFE in the
 * emitted `background.js` asset to a direct `globalThis` reference.
 *
 * Scoped exclusively to the `background.js` asset — `app.js` and `vendor.js`
 * are left untouched.
 */
class RewriteRgGlobalPlugin {
  apply(compiler) {
    compiler.hooks.thisCompilation.tap('RewriteRgGlobalPlugin', (compilation) => {
      compilation.hooks.processAssets.tap(
        {
          name: 'RewriteRgGlobalPlugin',
          stage: webpack.Compilation.PROCESS_ASSETS_STAGE_SUMMARIZE
        },
        (assets) => {
          // Webpack may name the asset with or without the directory prefix
          const targetNames = ['background.js', 'assets/background.js'];

          for (const assetName of Object.keys(assets)) {
            if (!targetNames.some((t) => assetName === t || assetName.endsWith('/' + t))) {
              continue;
            }

            const original = assets[assetName].source();
            const patched = rewriteRgGlobal(original);

            if (patched !== original) {
              compilation.updateAsset(
                assetName,
                new webpack.sources.RawSource(patched)
              );
            }
          }
        }
      );
    });
  }
}

module.exports = (env, argv) => {
  const webExtConfig = WebExtConfig(env, argv);

  // Base config shared by both entries
  const baseChromiumConfig = {
    ...webExtConfig,
    output: {
      ...webExtConfig.output,
      path: Path.resolve(__dirname, '../build/chromium/assets'),
      globalObject: 'globalThis',
      // The npm build script runs `rimraf ./build/chromium` before webpack,
      // so webpack's own clean is not needed and would cause the two configs
      // to wipe each other's output when running in parallel.
      clean: false
    },
    plugins: [
      ...(webExtConfig.plugins || []),
      new RewriteRgGlobalPlugin()
    ]
  };

  // App (popup) bundle — runs in a normal extension page context
  const appConfig = {
    ...baseChromiumConfig,
    name: 'app',
    entry: {
      ...webExtConfig.entry,
      app: './src/modules/webext/chromium/chromium-app/chromium-app.module.ts'
    }
  };

  // Background service worker bundle — must be self-contained, no importScripts
  const backgroundConfig = {
    ...baseChromiumConfig,
    name: 'background',
    entry: {
      background: {
        import: './src/modules/webext/chromium/chromium-background/chromium-background.module.ts',
        // Disable async chunk loading: Chrome MV3 service workers do not
        // support importScripts(), so the background bundle must be fully
        // self-contained with no dynamic chunk imports.
        asyncChunks: false
      }
    },
    // target: 'webworker' tells webpack to generate a service-worker-compatible
    // runtime (no window/document references in chunk-loading glue code).
    // Only applied to the background entry — NOT to the popup app entry.
    target: 'webworker',
    // Disable vendor chunk splitting for the background bundle so it stays
    // self-contained (no vendor.js dependency).
    optimization: {
      ...(baseChromiumConfig.optimization || {}),
      splitChunks: false
    }
  };

  return [appConfig, backgroundConfig];
};
