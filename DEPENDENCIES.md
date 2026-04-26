# Dependency Retention Notes

This document records all intentionally-retained unmaintained or end-of-life packages in `package.json`, as required by the Manifest V3 migration (Requirements 9.1, 9.15, 9.16).

---

## Intentionally-Retained Direct Dependencies

| Package | Version | Status | Reason for Retention |
|---|---|---|---|
| `angular` | `^1.8.2` | EOL (LTS ended Dec 2021) | Core framework for the extension UI and background module. Migrating away from AngularJS is out of scope for this release. |
| `angular-animate` | `^1.8.2` | EOL (LTS ended Dec 2021) | Required by the AngularJS animation system used throughout the UI. Retained alongside `angular`. |
| `angular-route` | `^1.8.2` | EOL (LTS ended Dec 2021) | Provides client-side routing for the AngularJS single-page popup UI. Retained alongside `angular`. |
| `angular-sanitize` | `^1.8.2` | EOL (LTS ended Dec 2021) | Provides HTML sanitisation used in AngularJS templates. Retained alongside `angular`. |
| `angular-filter` | `^0.5.17` | Unmaintained | Provides collection filter utilities used in AngularJS templates. No maintained drop-in replacement exists for the AngularJS filter pattern. |
| `angular-hammer` | `^2.2.0` | Unmaintained | Binds HammerJS touch/gesture events to AngularJS directives. No maintained drop-in replacement exists for this AngularJS gesture-binding pattern. |
| `hammerjs` | `^2.0.8` | Unmaintained (last release 2016) | Touch gesture recognition library required by `angular-hammer`. No maintained drop-in replacement exists. |
| `ng-infinite-scroll` | `^1.3.0` | Unmaintained | Provides infinite-scroll directive for AngularJS lists. No maintained drop-in replacement exists for the AngularJS directive pattern. |
| `angular-ts-decorators` | `^3.7.8` | Unmaintained | Provides TypeScript decorators (`@NgModule`, `@Component`, `@Service`, etc.) for AngularJS. The entire codebase relies on this decorator pattern; replacing it is out of scope. |
| `autobind-decorator` | `^2.4.0` | Unmaintained | Provides the `@autobind` method decorator used throughout service and component classes. Replacing it is out of scope for this release. |

> **Note:** `angular-ts-decorators` and `autobind-decorator` are listed under `devDependencies` in `package.json` because they are consumed at compile/bundle time via TypeScript transpilation, but they are functionally required for the extension to operate correctly.

---

## Accepted Transitive Deprecation Warnings

The following deprecation warnings may appear during `npm install` or `npm ci`. They originate from the dependency trees of our direct dependencies and are **not** caused by packages we directly control. They will resolve automatically when the upstream packages update their own dependency trees.

| Package | Introduced by | Notes |
|---|---|---|
| `whatwg-encoding` | `jest-environment-jsdom` | Used internally by jsdom for encoding detection. Deprecated upstream; no action required on our part. |
| `abab` | `jest-environment-jsdom` | Used internally by jsdom for `atob`/`btoa` polyfilling. Deprecated upstream; no action required. |
| `domexception` | `jest-environment-jsdom` | Used internally by jsdom. Deprecated upstream; no action required. |
| `glob@7.x` | Build toolchain (e.g., `rimraf`, `copy-webpack-plugin` transitive deps) | Older `glob` major version pulled in transitively. Will resolve when upstream tools update. |
| `rimraf@3.x` | Build toolchain transitive deps | Older `rimraf` major version pulled in transitively. Our direct `rimraf` dependency is `^6.0.0`. |
| `inflight` | Build toolchain transitive deps | Legacy `inflight` package pulled in transitively via older `glob` versions. Will resolve when upstream tools update. |

These warnings do **not** indicate security vulnerabilities in our direct dependencies and do not affect the correctness of the build output.
