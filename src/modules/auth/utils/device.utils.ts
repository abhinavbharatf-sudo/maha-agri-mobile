/**
 * Device, Browser, OS, and Location Metadata Utilities
 * Collects rich metadata for security audit logging.
 */

export interface DeviceMetadata {
  device: string;
  browser: string;
  operatingSystem: string;
  userAgent: string;
}

export function getDeviceMetadata(): DeviceMetadata {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      device: 'Server',
      browser: 'Unknown',
      operatingSystem: 'Unknown',
      userAgent: '',
    };
  }

  const ua = navigator.userAgent;
  let browser = 'Unknown Browser';
  let os = 'Unknown OS';
  let device = 'Desktop';

  if (/mobile/i.test(ua)) {
    device = 'Mobile Device';
  } else if (/tablet|ipad/i.test(ua)) {
    device = 'Tablet';
  }

  if (/chrome|crios/i.test(ua) && !/edg/i.test(ua)) {
    browser = 'Google Chrome';
  } else if (/safari/i.test(ua) && !/chrome/i.test(ua)) {
    browser = 'Apple Safari';
  } else if (/firefox|fxios/i.test(ua)) {
    browser = 'Mozilla Firefox';
  } else if (/edg/i.test(ua)) {
    browser = 'Microsoft Edge';
  }

  if (/windows/i.test(ua)) {
    os = 'Windows';
  } else if (/macintosh|mac os x/i.test(ua)) {
    os = 'macOS';
  } else if (/android/i.test(ua)) {
    os = 'Android';
  } else if (/iphone|ipad|ipod/i.test(ua)) {
    os = 'iOS';
  } else if (/linux/i.test(ua)) {
    os = 'Linux';
  }

  return {
    device,
    browser,
    operatingSystem: os,
    userAgent: ua,
  };
}

export async function getGpsCoordinates(): Promise<{ latitude: number; longitude: number } | null> {
  if (typeof window === 'undefined' || !('geolocation' in navigator)) {
    return null;
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      },
      () => {
        resolve(null);
      },
      { timeout: 5000, enableHighAccuracy: false }
    );
  });
}
