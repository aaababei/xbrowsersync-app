import angular from 'angular';
import { NgModule } from 'angular-ts-decorators';
import { ExceptionHandlerService } from '../../shared/errors/exception-handler/exception-handler.service';
import { GlobalSharedModule } from '../../shared/global-shared.module';
import { WebExtSharedModule } from '../shared/webext-shared.module';
import { WebExtBackgroundService } from './webext-background.service';

@NgModule({
  id: 'WebExtBackgroundModule',
  imports: [GlobalSharedModule, WebExtSharedModule],
  providers: [WebExtBackgroundService]
})
export class WebExtBackgroundModule {}

(WebExtBackgroundModule as NgModule).module
  .config([
    '$compileProvider',
    '$httpProvider',
    ($compileProvider: ng.ICompileProvider, $httpProvider: ng.IHttpProvider) => {
      $compileProvider.debugInfoEnabled(false);
      $httpProvider.interceptors.push('ApiRequestInterceptorFactory');
    }
  ])
  .factory('$exceptionHandler', ['$injector', 'AlertService', 'LogService', ExceptionHandlerService.Factory]);

let injectorPromise: Promise<ng.auto.IInjectorService> | null = null;

export function bootstrapBackground(moduleName: string): Promise<ng.auto.IInjectorService> {
  if (!injectorPromise) {
    injectorPromise = new Promise((resolve, reject) => {
      try {
        // Chrome service workers have no `document`; create a minimal stub so
        // AngularJS can bootstrap without a real DOM.
        // The stub must support the DOM methods AngularJS calls during bootstrap:
        //   - addEventListener/removeEventListener: called by jqLite on the root element
        //   - querySelectorAll: used by AngularJS directive compilation
        //   - getAttribute: used by AngularJS attribute parsing
        const el: Element =
          typeof document !== 'undefined'
            ? document.createElement('div')
            : ({
                nodeType: 1,
                childNodes: [],
                querySelectorAll: () => [],
                getAttribute: () => null,
                setAttribute: () => {},
                addEventListener: () => {},
                removeEventListener: () => {},
                dispatchEvent: () => false
              } as any);
        const injector = angular.bootstrap(el, [moduleName], { strictDi: true });
        resolve(injector);
      } catch (err) {
        console.error('[xBrowserSync] Background bootstrap failed:', err);
        injectorPromise = null;
        reject(err);
      }
    });
  }
  return injectorPromise;
}

export function getBackgroundService(moduleName: string): Promise<WebExtBackgroundService> {
  return bootstrapBackground(moduleName).then((injector) => injector.get('WebExtBackgroundService'));
}
