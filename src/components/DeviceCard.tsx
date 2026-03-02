import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Clock, MapPin, Waveform } from '@phosphor-icons/react';
import type { DeviceProfile } from '@/lib/types';
import { estimateDistance, formatDistance, formatTimeAgo, getSignalQuality } from '@/lib/bluetooth';
import { cn } from '@/lib/utils';

interface DeviceCardProps {
  device: DeviceProfile;
  onClick?: () => void;
}

export function DeviceCard({ device, onClick }: DeviceCardProps) {
  const distance = device.rssi ? estimateDistance(device.rssi) : null;
  const signalQuality = device.rssi ? getSignalQuality(device.rssi) : null;
  const signalStrength = device.rssi ? Math.min(100, Math.max(0, (device.rssi + 100) * 2)) : 0;

  const qualityColors = {
    excellent: 'bg-green-500',
    good: 'bg-blue-500',
    fair: 'bg-yellow-500',
    poor: 'bg-red-500',
  };

  return (
    <Card
      className={cn(
        'p-4 cursor-pointer transition-all hover:shadow-lg hover:border-primary/50',
        device.isNearby && 'border-accent/70 shadow-md'
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-4">
        <Avatar
          className="h-12 w-12 flex-shrink-0"
          style={{ backgroundColor: device.color }}
        >
          <span className="text-2xl">{device.emoji}</span>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <h3 className="font-heading font-semibold text-lg leading-tight">
                {device.customName}
              </h3>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">
                {device.macAddress}
              </p>
            </div>
            {device.isNearby && (
              <Badge variant="default" className="bg-accent text-accent-foreground animate-pulse-scan flex-shrink-0">
                Nearby
              </Badge>
            )}
          </div>

          {device.isNearby && device.rssi && signalQuality && (
            <div className="space-y-2 mb-3">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1.5">
                  <Waveform className="w-4 h-4 text-muted-foreground" weight="fill" />
                  <span className="font-mono text-muted-foreground">
                    {device.rssi} dBm
                  </span>
                </div>
                {distance !== null && (
                  <span className="font-mono text-sm text-foreground font-medium">
                    {formatDistance(distance)}
                  </span>
                )}
              </div>
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className={cn('h-full transition-all', qualityColors[signalQuality])}
                  style={{ width: `${signalStrength}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {device.lastSeen && (
              <div className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" weight="fill" />
                <span>{formatTimeAgo(device.lastSeen)}</span>
              </div>
            )}
            {device.lastLat && device.lastLon && (
              <div className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" weight="fill" />
                <span className="font-mono">
                  {device.lastLat.toFixed(4)}, {device.lastLon.toFixed(4)}
                </span>
              </div>
            )}
          </div>

          {device.notes && (
            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
              {device.notes}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
