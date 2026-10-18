// src/lib/installPlatform.ts
// Which "add Deadeye to your home screen" instructions fit this browser.
//
// Deadeye is a web app, so installing it is a browser feature, and every
// browser hides it somewhere different. Showing iPhone steps to an Android
// player, or Safari steps to someone inside Instagram's browser (where there is
// no way to install at all), loses them at the one step between "heard about
// it" and "has it on their phone".

export type InstallPlatform =
  /** Already opened from the home screen icon. */
  | 'installed'
  /** Inside Instagram, Snapchat, TikTok and the like: has to be opened in a real browser first. */
  | 'in-app'
  | 'ios-safari'
  /** Chrome, Firefox or Edge on iPhone: Share → Add to Home Screen works there too since iOS 16.4. */
  | 'ios-other'
  | 'android'
  | 'desktop';

const IN_APP = /FBAN|FBAV|FB_IAB|Instagram|Snapchat|musical_ly|TikTok|BytedanceWebview|LinkedInApp|Line\/|Twitter|GSA\//i;

export function detectInstallPlatform(
  userAgent: string,
  { standalone = false, touchPoints = 0 }: { standalone?: boolean; touchPoints?: number } = {}
): InstallPlatform {
  if (standalone) return 'installed';
  if (IN_APP.test(userAgent)) return 'in-app';
  // iPadOS presents itself as a Mac; a touchscreen gives it away
  const ios = /iPhone|iPad|iPod/i.test(userAgent) || (/Macintosh/i.test(userAgent) && touchPoints > 1);
  if (ios) return /CriOS|FxiOS|EdgiOS|OPiOS/i.test(userAgent) ? 'ios-other' : 'ios-safari';
  if (/Android/i.test(userAgent)) {
    // An Android app's built-in browser ("; wv)") cannot install either
    return /; wv\)/i.test(userAgent) ? 'in-app' : 'android';
  }
  return 'desktop';
}

/**
 * Which app's built-in browser this is, for telling the player by name -
 * "you are in TikTok's browser" is understood at once, "an in-app browser" is
 * not. null when it is not one of the apps people mostly arrive from.
 */
export function inAppBrowserName(userAgent: string): string | null {
  if (/musical_ly|TikTok|BytedanceWebview/i.test(userAgent)) return 'TikTok';
  if (/Instagram/i.test(userAgent)) return 'Instagram';
  if (/Snapchat/i.test(userAgent)) return 'Snapchat';
  if (/FBAN|FBAV|FB_IAB/i.test(userAgent)) return 'Facebook';
  if (/LinkedInApp/i.test(userAgent)) return 'LinkedIn';
  if (/Twitter/i.test(userAgent)) return 'X';
  return null;
}
