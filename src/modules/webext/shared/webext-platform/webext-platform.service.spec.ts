import '../../../../test/mock-angular';
import { $injector, $q } from '../../../../test/mock-services';

// Mock webextension-polyfill before importing the service
const mockExecuteScript = jest.fn();
const mockTabsQuery = jest.fn();

jest.mock('webextension-polyfill', () => ({
  default: {
    scripting: {
      executeScript: mockExecuteScript
    },
    tabs: {
      query: mockTabsQuery
    }
  },
  __esModule: true
}));

jest.mock('detect-browser', () => ({
  detect: () => ({ name: 'chrome', version: '100.0', os: 'Windows 10' })
}));

import { WebExtPlatformService } from './webext-platform.service';

// Concrete subclass to instantiate the abstract service
class TestWebExtPlatformService extends WebExtPlatformService {
  getNewTabUrl(): string {
    return 'chrome://newtab/';
  }
}

describe('WebExtPlatformService', () => {
  let service: TestWebExtPlatformService;

  const mockLogSvc = { logInfo: jest.fn(), logWarning: jest.fn(), logError: jest.fn() } as any;
  const mockStoreSvc = { get: jest.fn(), set: jest.fn() } as any;
  const mockAlertSvc = {} as any;
  const mockBookmarkHelperSvc = {} as any;
  const mockBookmarkIdMapperSvc = {} as any;
  const mockUtilitySvc = { getBrowserName: jest.fn().mockReturnValue('chrome') } as any;
  const mockWorkingSvc = { hide: jest.fn() } as any;
  const mock$interval = {} as any;
  const mock$timeout = { cancel: jest.fn() } as any;

  beforeEach(() => {
    service = new TestWebExtPlatformService(
      $injector,
      mock$interval,
      $q,
      mock$timeout,
      mockAlertSvc,
      mockBookmarkHelperSvc,
      mockBookmarkIdMapperSvc,
      mockLogSvc,
      mockStoreSvc,
      mockUtilitySvc,
      mockWorkingSvc
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Requirements: 3.1
  describe('getPageMetadata — Scripting API', () => {
    test('17.1: calls browser.scripting.executeScript (not browser.tabs.executeScript) when getPageMetadata(true) is invoked', async () => {
      const activeTab = { id: 42, title: 'Test Page', url: 'https://example.com' };
      mockTabsQuery.mockResolvedValue([activeTab]);
      mockExecuteScript
        .mockResolvedValueOnce([]) // first call: inject file
        .mockResolvedValueOnce([{ result: { title: 'Test Page', url: 'https://example.com' } }]); // second call: func

      await service.getPageMetadata(true);

      expect(mockExecuteScript).toHaveBeenCalled();
      // Ensure it was called with the scripting API shape (object with target), not the tabs API shape (tabId, options)
      expect(mockExecuteScript).toHaveBeenCalledWith(
        expect.objectContaining({ target: expect.objectContaining({ tabId: 42 }) })
      );
    });

    // Requirements: 3.2
    test('17.2: first executeScript call uses files parameter containing the content script URL', async () => {
      const activeTab = { id: 42, title: 'Test Page', url: 'https://example.com' };
      mockTabsQuery.mockResolvedValue([activeTab]);
      mockExecuteScript
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ result: { title: 'Test Page', url: 'https://example.com' } }]);

      await service.getPageMetadata(true);

      expect(mockExecuteScript).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ files: ['assets/webpage-metadata-collecter.js'] })
      );
    });

    // Requirements: 3.3
    test('17.3: second executeScript call uses func parameter (not code string)', async () => {
      const activeTab = { id: 42, title: 'Test Page', url: 'https://example.com' };
      mockTabsQuery.mockResolvedValue([activeTab]);
      mockExecuteScript
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ result: { title: 'Test Page', url: 'https://example.com' } }]);

      await service.getPageMetadata(true);

      const secondCall = mockExecuteScript.mock.calls[1][0];
      expect(typeof secondCall.func).toBe('function');
      expect(secondCall.code).toBeUndefined();
    });

    // Requirements: 3.4
    test('17.4: extracts metadata from results[0].result', async () => {
      const activeTab = { id: 42, title: 'Tab Title', url: 'https://example.com' };
      const expectedMetadata = { title: 'Script Title', url: 'https://example.com/page', description: 'A page' };
      mockTabsQuery.mockResolvedValue([activeTab]);
      mockExecuteScript.mockResolvedValueOnce([]).mockResolvedValueOnce([{ result: expectedMetadata }]);

      const result = await service.getPageMetadata(true);

      expect(result.title).toBe(expectedMetadata.title);
      expect(result.url).toBe(expectedMetadata.url);
    });

    // Requirements: 3.5
    test('17.5: skips executeScript and returns partial tab metadata when URL is a native config page', async () => {
      // Override urlIsNativeConfigPage to return true for chrome:// URLs
      jest.spyOn(service, 'urlIsNativeConfigPage').mockReturnValue(true);
      const activeTab = { id: 42, title: 'Settings', url: 'chrome://settings/' };
      mockTabsQuery.mockResolvedValue([activeTab]);

      const result = await service.getPageMetadata(true);

      expect(mockExecuteScript).not.toHaveBeenCalled();
      expect(result.title).toBe('Settings');
      expect(result.url).toBe('chrome://settings/');
    });

    // Requirements: 3.6
    test('17.6: returns partial tab metadata when scripting.executeScript rejects', async () => {
      const activeTab = { id: 42, title: 'Tab Title', url: 'https://example.com' };
      mockTabsQuery.mockResolvedValue([activeTab]);
      mockExecuteScript.mockRejectedValue(new Error('Script injection failed'));

      const result = await service.getPageMetadata(true);

      expect(result.title).toBe('Tab Title');
      expect(result.url).toBe('https://example.com');
      expect(mockLogSvc.logWarning).toHaveBeenCalled();
    });
  });
});
