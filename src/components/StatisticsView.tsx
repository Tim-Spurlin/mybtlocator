import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  TrendUp, 
  Clock, 
  Trophy, 
  ChartBar, 
  CalendarDots,
  MapPin,
  ChartLineUp
} from '@phosphor-icons/react';
import type { DeviceProfile } from '@/lib/types';
import { cn } from '@/lib/utils';

interface StatisticsViewProps {
  devices: DeviceProfile[];
}

interface DeviceStats {
  device: DeviceProfile;
  detectionCount: number;
  lastSeen: number;
  firstSeen: number;
  daysActive: number;
  averageRSSI: number | null;
  uniqueLocations: number;
}

interface HourStats {
  hour: number;
  count: number;
}

interface DayStats {
  day: string;
  count: number;
}

export function StatisticsView({ devices }: StatisticsViewProps) {
  const statistics = useMemo(() => {
    const deviceStats: DeviceStats[] = devices
      .filter(d => d.locationHistory && d.locationHistory.length > 0)
      .map(device => {
        const history = device.locationHistory || [];
        const detectionCount = history.length;
        const timestamps = history.map(h => h.timestamp).sort((a, b) => a - b);
        const firstSeen = timestamps[0] || 0;
        const lastSeen = timestamps[timestamps.length - 1] || 0;
        const daysActive = Math.ceil((lastSeen - firstSeen) / (1000 * 60 * 60 * 24));
        
        const rssiValues = history.filter(h => h.rssi !== null).map(h => h.rssi!);
        const averageRSSI = rssiValues.length > 0
          ? rssiValues.reduce((sum, val) => sum + val, 0) / rssiValues.length
          : null;
        
        const uniqueLocationStrings = new Set(
          history.map(h => `${h.latitude.toFixed(5)},${h.longitude.toFixed(5)}`)
        );
        const uniqueLocations = uniqueLocationStrings.size;
        
        return {
          device,
          detectionCount,
          lastSeen,
          firstSeen,
          daysActive: Math.max(daysActive, 1),
          averageRSSI,
          uniqueLocations,
        };
      })
      .sort((a, b) => b.detectionCount - a.detectionCount);

    const allHistory = devices.flatMap(d => d.locationHistory || []);
    
    const hourCounts = new Array(24).fill(0);
    allHistory.forEach(entry => {
      const hour = new Date(entry.timestamp).getHours();
      hourCounts[hour]++;
    });
    
    const hourStats: HourStats[] = hourCounts.map((count, hour) => ({
      hour,
      count,
    }));
    
    const maxHourCount = Math.max(...hourCounts, 1);
    const peakHours = hourStats
      .filter(h => h.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    const dayCounts: Record<string, number> = {};
    allHistory.forEach(entry => {
      const date = new Date(entry.timestamp);
      const dayKey = date.toLocaleDateString('en-US', { 
        weekday: 'long' 
      });
      dayCounts[dayKey] = (dayCounts[dayKey] || 0) + 1;
    });
    
    const dayOrder = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayStats: DayStats[] = dayOrder.map(day => ({
      day,
      count: dayCounts[day] || 0,
    }));
    
    const maxDayCount = Math.max(...dayStats.map(d => d.count), 1);
    const peakDays = dayStats
      .filter(d => d.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    const totalDetections = allHistory.length;
    const uniqueDays = new Set(
      allHistory.map(h => {
        const date = new Date(h.timestamp);
        return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      })
    ).size;

    const avgDetectionsPerDay = uniqueDays > 0 ? (totalDetections / uniqueDays).toFixed(1) : '0';

    const deviceTypeBreakdown = devices.reduce((acc, device) => {
      const count = device.locationHistory?.length || 0;
      if (count > 0) {
        acc[device.type] = (acc[device.type] || 0) + count;
      }
      return acc;
    }, {} as Record<string, number>);

    return {
      deviceStats,
      hourStats,
      peakHours,
      maxHourCount,
      dayStats,
      peakDays,
      maxDayCount,
      totalDetections,
      uniqueDays,
      avgDetectionsPerDay,
      deviceTypeBreakdown,
    };
  }, [devices]);

  if (devices.length === 0 || statistics.totalDetections === 0) {
    return (
      <div className="text-center py-16">
        <ChartBar className="w-16 h-16 mx-auto mb-4 text-muted-foreground" weight="duotone" />
        <h3 className="text-xl font-heading font-semibold mb-2">
          No statistics available yet
        </h3>
        <p className="text-muted-foreground">
          Start scanning devices to see analytics and patterns
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Detections</p>
              <p className="text-3xl font-heading font-bold">{statistics.totalDetections}</p>
            </div>
            <ChartLineUp className="w-8 h-8 text-primary" weight="duotone" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Active Days</p>
              <p className="text-3xl font-heading font-bold">{statistics.uniqueDays}</p>
            </div>
            <CalendarDots className="w-8 h-8 text-accent" weight="duotone" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Avg. Per Day</p>
              <p className="text-3xl font-heading font-bold">{statistics.avgDetectionsPerDay}</p>
            </div>
            <TrendUp className="w-8 h-8 text-green-500" weight="duotone" />
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Trophy className="w-6 h-6 text-primary" weight="fill" />
          <h3 className="text-xl font-heading font-bold">Most Detected Devices</h3>
        </div>

        <div className="space-y-4">
          {statistics.deviceStats.slice(0, 5).map((stat, index) => {
            const percentage = (stat.detectionCount / statistics.totalDetections) * 100;
            const isTopDevice = index === 0;

            return (
              <div key={stat.device.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-heading font-bold text-muted-foreground w-6">
                        #{index + 1}
                      </span>
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0"
                        style={{ backgroundColor: stat.device.color }}
                      >
                        {stat.device.emoji}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-heading font-semibold truncate">
                          {stat.device.customName}
                        </p>
                        {isTopDevice && (
                          <Badge variant="default" className="bg-yellow-500 text-black">
                            <Trophy className="w-3 h-3 mr-1" weight="fill" />
                            Top
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{stat.detectionCount} detections</span>
                        <span>•</span>
                        <span>{stat.uniqueLocations} locations</span>
                        <span>•</span>
                        <span>{stat.daysActive} {stat.daysActive === 1 ? 'day' : 'days'} active</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <p className="text-lg font-heading font-bold">{percentage.toFixed(1)}%</p>
                  </div>
                </div>
                <Progress value={percentage} className="h-2" />
              </div>
            );
          })}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <Clock className="w-6 h-6 text-primary" weight="fill" />
            <h3 className="text-xl font-heading font-bold">Peak Hours</h3>
          </div>

          <div className="space-y-4 mb-6">
            {statistics.peakHours.map((hourStat, index) => {
              const percentage = (hourStat.count / statistics.maxHourCount) * 100;
              const hour = hourStat.hour;
              const hourLabel = hour === 0 
                ? '12 AM' 
                : hour < 12 
                  ? `${hour} AM` 
                  : hour === 12 
                    ? '12 PM' 
                    : `${hour - 12} PM`;

              return (
                <div key={hour} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge 
                        variant={index === 0 ? 'default' : 'secondary'}
                        className={cn('w-6 h-6 flex items-center justify-center p-0', index === 0 && 'bg-primary')}
                      >
                        {index + 1}
                      </Badge>
                      <span className="font-medium">{hourLabel}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{hourStat.count} detections</span>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              );
            })}
          </div>

          <Separator className="my-4" />

          <div className="grid grid-cols-6 gap-1">
            {statistics.hourStats.map((hourStat) => {
              const percentage = (hourStat.count / statistics.maxHourCount) * 100;
              const opacity = percentage > 0 ? Math.max(0.2, percentage / 100) : 0.1;

              return (
                <div
                  key={hourStat.hour}
                  className="h-12 rounded flex items-end justify-center p-1 group relative"
                  style={{ 
                    backgroundColor: `oklch(0.65 0.19 240 / ${opacity})` 
                  }}
                  title={`${hourStat.hour}:00 - ${hourStat.count} detections`}
                >
                  <span className="text-[10px] text-foreground/60 font-mono">
                    {hourStat.hour}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <CalendarDots className="w-6 h-6 text-accent" weight="fill" />
            <h3 className="text-xl font-heading font-bold">Peak Days</h3>
          </div>

          <div className="space-y-4">
            {statistics.peakDays.map((dayStat, index) => {
              const percentage = (dayStat.count / statistics.maxDayCount) * 100;

              return (
                <div key={dayStat.day} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge 
                        variant={index === 0 ? 'default' : 'secondary'}
                        className={cn('w-6 h-6 flex items-center justify-center p-0', index === 0 && 'bg-accent text-accent-foreground')}
                      >
                        {index + 1}
                      </Badge>
                      <span className="font-medium">{dayStat.day}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{dayStat.count} detections</span>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              );
            })}
          </div>

          <Separator className="my-4" />

          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground mb-3">All Days</h4>
            {statistics.dayStats.map((dayStat) => {
              const percentage = (dayStat.count / statistics.maxDayCount) * 100;
              const opacity = percentage > 0 ? Math.max(0.2, percentage / 100) : 0.1;

              return (
                <div key={dayStat.day} className="flex items-center gap-3">
                  <span className="text-xs w-16 text-muted-foreground">{dayStat.day.slice(0, 3)}</span>
                  <div className="flex-1 h-6 rounded overflow-hidden bg-muted">
                    <div
                      className="h-full transition-all"
                      style={{ 
                        width: `${percentage}%`,
                        backgroundColor: 'oklch(0.75 0.15 200)'
                      }}
                    />
                  </div>
                  <span className="text-xs w-8 text-right text-muted-foreground">{dayStat.count}</span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <MapPin className="w-6 h-6 text-primary" weight="fill" />
          <h3 className="text-xl font-heading font-bold">Device Activity Summary</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {statistics.deviceStats.map((stat) => (
            <Card key={stat.device.id} className="p-4 border-l-4" style={{ borderLeftColor: stat.device.color }}>
              <div className="flex items-start gap-3">
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0"
                  style={{ backgroundColor: stat.device.color }}
                >
                  {stat.device.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-heading font-semibold text-sm mb-2 truncate">
                    {stat.device.customName}
                  </h4>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div className="flex items-center justify-between">
                      <span>Detections:</span>
                      <span className="font-medium text-foreground">{stat.detectionCount}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Locations:</span>
                      <span className="font-medium text-foreground">{stat.uniqueLocations}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Days Active:</span>
                      <span className="font-medium text-foreground">{stat.daysActive}</span>
                    </div>
                    {stat.averageRSSI !== null && (
                      <div className="flex items-center justify-between">
                        <span>Avg. Signal:</span>
                        <span className="font-medium text-foreground font-mono">{stat.averageRSSI.toFixed(0)} dBm</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Card>
    </div>
  );
}
