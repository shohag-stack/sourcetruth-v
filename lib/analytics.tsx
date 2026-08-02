// lib/deviceMeta.tsx
import { ReactNode } from 'react'
import { Monitor, Smartphone, Tablet } from 'lucide-react'
import {
  SiApple,
  SiAndroid,
} from 'react-icons/si'
import { FaWindows } from 'react-icons/fa'

export const DEVICE_ICON: Record<string, ReactNode> = {
  desktop: <Monitor className="h-4 w-4" />,
  mobile: <Smartphone className="h-4 w-4" />,
  tablet: <Tablet className="h-4 w-4" />,
}

export const OS_ICON: Record<string, ReactNode> = {
  mac: <SiApple className="h-4 w-4" />,
  windows: <FaWindows className="h-4 w-4 text-[#00A4EF]" />,
  ios: <SiApple className="h-4 w-4" />,
  android: <SiAndroid className="h-4 w-4 text-[#3DDC84]" />,
}

export const OS_LABEL: Record<string, string> = {
  mac: 'Mac OS',
  windows: 'Windows',
  ios: 'iOS',
  android: 'Android',
  other: 'Unknown OS',
}

export const BROWSER_ICON: Record<string, ReactNode> = {
  chrome: <img src='/src/images/chrome.svg' className="h-3.5 w-3.5" />,
  safari: <img src='/src/images/safari.svg' className="h-3.5 w-3.5" />,
  firefox: <img src='/src/images/firefox.svg' className="h-3.5 w-3.5" />,
}

export const BROWSER_LABEL: Record<string, string> = {
  chrome: 'Chrome',
  safari: 'Safari',
  firefox: 'Firefox',
  other: 'Unknown browser',
}