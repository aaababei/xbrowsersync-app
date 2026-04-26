import './csp-init';
import { NgModule } from 'angular-ts-decorators';
import browser from 'webextension-polyfill';
import { getBackgroundService, WebExtBackgroundModule } from '../../webext-background/webext-background.module';
import { ChromiumBookmarkService } from '../shared/chromium-bookmark/chromium-bookmark.service';
import { ChromiumPlatformService } from '../shared/chromium-platform/chromium-platform.service';

@NgModule({
  id: 'ChromiumBackgroundModule',
  imports: [WebExtBackgroundModule],
  providers: [ChromiumBookmarkService, ChromiumPlatformService]
})
export class ChromiumBackgroundModule {}

const moduleName = (ChromiumBackgroundModule as NgModule).module.name;

// Register synchronous event handlers at top level (before any async work)
browser.runtime.onInstalled.addListener((details) => {
  getBackgroundService(moduleName)
    .then((svc) => svc.onInstall(details))
    .catch((err) => console.error('[xBrowserSync] onInstalled handler failed:', err));
});

browser.runtime.onStartup.addListener(() => {
  getBackgroundService(moduleName)
    .then((svc) => svc.init())
    .catch((err) => console.error('[xBrowserSync] onStartup handler failed:', err));
});

// Register message listener synchronously so the background responds to popup messages
// even if it was woken by a message rather than onInstalled/onStartup
browser.runtime.onMessage.addListener((message) => {
  return getBackgroundService(moduleName).then((svc) => svc.onMessage(message));
});
