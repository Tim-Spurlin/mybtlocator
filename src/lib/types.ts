export interface DeviceProfile {
  id: string;
  macAddress: string;
  customName: string;
  type: 'phone' | 'earbuds' | 'laptop' | 'tablet' | 'watch' | 'other';
  color: string;
  emoji: string;
  notes: string;
  lastLat: number | null;
  lastLon: number | null;
  lastSeen: number | null;
  rssi: number | null;
  isNearby: boolean;
}

export interface ScanResult {
  id: string;
  name: string;
  rssi: number;
}

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export const DEVICE_TYPES = [
  { value: 'phone', label: 'Phone', emoji: '📱' },
  { value: 'earbuds', label: 'Earbuds', emoji: '🎧' },
  { value: 'laptop', label: 'Laptop', emoji: '💻' },
  { value: 'tablet', label: 'Tablet', emoji: '📱' },
  { value: 'watch', label: 'Watch', emoji: '⌚' },
  { value: 'other', label: 'Other', emoji: '📡' },
] as const;

export const MARKER_COLORS = [
  { value: '#3B82F6', label: 'Blue' },
  { value: '#10B981', label: 'Green' },
  { value: '#F59E0B', label: 'Orange' },
  { value: '#EF4444', label: 'Red' },
  { value: '#8B5CF6', label: 'Purple' },
  { value: '#EC4899', label: 'Pink' },
  { value: '#06B6D4', label: 'Cyan' },
  { value: '#F97316', label: 'Amber' },
] as const;
