import type { ScanResult } from './types';

export function isBluetoothSupported(): boolean {
  return 'bluetooth' in navigator;
}

export async function requestBluetoothDevice(): Promise<ScanResult | null> {
  try {
    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: ['battery_service', 'device_information']
    });

    if (!device.gatt) {
      return null;
    }

    const server = await device.gatt.connect();
    
    return {
      id: device.id,
      name: device.name || 'Unknown Device',
      rssi: -60,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'NotFoundError') {
      return null;
    }
    throw error;
  }
}

export function estimateDistance(rssi: number, measuredPower: number = -59): number {
  if (rssi === 0) {
    return -1;
  }

  const ratio = rssi / measuredPower;
  if (ratio < 1.0) {
    return Math.pow(ratio, 10);
  } else {
    return 0.89976 * Math.pow(ratio, 7.7095) + 0.111;
  }
}

export function getSignalQuality(rssi: number): 'excellent' | 'good' | 'fair' | 'poor' {
  if (rssi >= -60) return 'excellent';
  if (rssi >= -70) return 'good';
  if (rssi >= -80) return 'fair';
  return 'poor';
}

export function formatDistance(meters: number): string {
  if (meters < 0) return 'Unknown';
  if (meters < 1) return `${Math.round(meters * 100)}cm`;
  if (meters < 10) return `${meters.toFixed(1)}m`;
  return `${Math.round(meters)}m`;
}

export function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}
