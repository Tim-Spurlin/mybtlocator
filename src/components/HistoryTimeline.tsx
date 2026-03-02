import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, MapPin, Waveform, Calendar } from '@phosphor-icons/react';
import type { LocationHistoryEntry } from '@/lib/types';
import { formatDistance, estimateDistance, formatTimeAgo } from '@/lib/bluetooth';

interface HistoryTimelineProps {
  history: LocationHistoryEntry[];
  deviceColor: string;
  deviceEmoji: string;
}

export function HistoryTimeline({ history, deviceColor, deviceEmoji }: HistoryTimelineProps) {
  if (history.length === 0) {
    return (
      <div className="text-center py-12">
        <Clock className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" weight="duotone" />
        <p className="text-muted-foreground text-sm">No location history recorded yet</p>
      </div>
    );
  }

  const sortedHistory = [...history].sort((a, b) => b.timestamp - a.timestamp);

  const groupByDate = (entries: LocationHistoryEntry[]) => {
    const groups: Record<string, LocationHistoryEntry[]> = {};
    
    entries.forEach(entry => {
      const date = new Date(entry.timestamp);
      const dateKey = date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
      
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(entry);
    });
    
    return groups;
  };

  const groupedHistory = groupByDate(sortedHistory);

  return (
    <ScrollArea className="h-[500px] pr-4">
      <div className="space-y-6">
        {Object.entries(groupedHistory).map(([date, entries]) => (
          <div key={date}>
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-4 h-4 text-muted-foreground" weight="fill" />
              <h4 className="font-heading font-semibold text-sm">{date}</h4>
              <Separator className="flex-1" />
              <Badge variant="secondary" className="text-xs">
                {entries.length} {entries.length === 1 ? 'detection' : 'detections'}
              </Badge>
            </div>

            <div className="space-y-3 ml-1">
              {entries.map((entry, idx) => {
                const distance = entry.rssi ? estimateDistance(entry.rssi) : null;
                const time = new Date(entry.timestamp);
                
                return (
                  <div key={`${entry.timestamp}-${idx}`} className="relative pl-6">
                    <div 
                      className="absolute left-0 top-2 w-3 h-3 rounded-full border-2 border-background"
                      style={{ backgroundColor: deviceColor }}
                    />
                    {idx < entries.length - 1 && (
                      <div 
                        className="absolute left-[5px] top-5 w-[2px] h-[calc(100%+0.5rem)] opacity-30"
                        style={{ backgroundColor: deviceColor }}
                      />
                    )}
                    
                    <Card className="p-3 hover:border-primary/30 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5 text-muted-foreground" weight="fill" />
                            <span className="text-sm font-medium">
                              {time.toLocaleTimeString('en-US', { 
                                hour: 'numeric', 
                                minute: '2-digit',
                                hour12: true 
                              })}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              ({formatTimeAgo(entry.timestamp)})
                            </span>
                          </div>

                          <div className="flex items-start gap-2 text-xs text-muted-foreground">
                            <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" weight="fill" />
                            <span className="font-mono">
                              {entry.latitude.toFixed(6)}, {entry.longitude.toFixed(6)}
                            </span>
                          </div>

                          {entry.rssi && (
                            <div className="flex items-center gap-2 text-xs">
                              <Waveform className="w-3.5 h-3.5 text-muted-foreground" weight="fill" />
                              <span className="font-mono text-muted-foreground">
                                {entry.rssi} dBm
                              </span>
                              {distance !== null && (
                                <>
                                  <span className="text-muted-foreground">•</span>
                                  <span className="font-medium">
                                    ~{formatDistance(distance)}
                                  </span>
                                </>
                              )}
                            </div>
                          )}

                          {entry.accuracy && (
                            <div className="text-xs text-muted-foreground">
                              Accuracy: ±{entry.accuracy.toFixed(0)}m
                            </div>
                          )}
                        </div>

                        <div className="text-xl flex-shrink-0">
                          {deviceEmoji}
                        </div>
                      </div>
                    </Card>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
