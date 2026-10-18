// __tests__/installPlatform.test.ts
// Picking the right "add to home screen" steps. The costly mistake is the
// in-app browser: someone tapping a link in Instagram cannot install from
// there at all, and Safari-style steps would leave them looking for a Share
// button that does nothing.
import { describe, it, expect } from 'vitest';
import { detectInstallPlatform } from '@/lib/installPlatform';

const UA = {
  iphoneSafari:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1',
  iphoneChrome:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/138.0.7204.156 Mobile/15E148 Safari/604.1',
  iphoneInstagram:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 389.0.0.28.83 (iPhone15,3; iOS 18_5; en_IE; en)',
  iphoneSnapchat:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Snapchat/13.50.0.38 (like Safari/8621.2.5.10.8, panda)',
  ipadAsMac:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15',
  androidChrome:
    'Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36',
  androidWebView:
    'Mozilla/5.0 (Linux; Android 15; Pixel 8; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/138.0.0.0 Mobile Safari/537.36',
  windowsChrome:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
};

describe('detectInstallPlatform', () => {
  it('knows an installed app needs no instructions', () => {
    expect(detectInstallPlatform(UA.iphoneSafari, { standalone: true })).toBe('installed');
  });

  it('tells Safari from other iPhone browsers', () => {
    expect(detectInstallPlatform(UA.iphoneSafari)).toBe('ios-safari');
    expect(detectInstallPlatform(UA.iphoneChrome)).toBe('ios-other');
  });

  it('catches in-app browsers, which cannot install at all', () => {
    expect(detectInstallPlatform(UA.iphoneInstagram)).toBe('in-app');
    expect(detectInstallPlatform(UA.iphoneSnapchat)).toBe('in-app');
    expect(detectInstallPlatform(UA.androidWebView)).toBe('in-app');
  });

  it('sees through an iPad presenting itself as a Mac', () => {
    expect(detectInstallPlatform(UA.ipadAsMac, { touchPoints: 5 })).toBe('ios-safari');
    expect(detectInstallPlatform(UA.ipadAsMac, { touchPoints: 0 })).toBe('desktop');
  });

  it('recognises Android and desktop', () => {
    expect(detectInstallPlatform(UA.androidChrome)).toBe('android');
    expect(detectInstallPlatform(UA.windowsChrome)).toBe('desktop');
  });
});
