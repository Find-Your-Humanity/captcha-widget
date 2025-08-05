export type DeviceType = 'mobile' | 'desktop';

// 디바이스 타입 감지
export function detectDevice(): DeviceType {
  const userAgent = navigator.userAgent.toLowerCase();
  const isMobile = /iphone|ipad|ipod|android|blackberry|windows phone/i.test(userAgent) ||
    ('maxTouchPoints' in navigator && navigator.maxTouchPoints > 0);
  return isMobile ? 'mobile' : 'desktop';
}