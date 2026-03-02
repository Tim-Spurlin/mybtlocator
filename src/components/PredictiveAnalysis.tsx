import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  Lightning, 
  Clock, 
  MapPin,
  TrendUp,
  Brain,
  Calendar,
  Target,
  Warning
} from '@phosphor-icons/react';
import type { DeviceProfile, LocationHistoryEntry } from '@/lib/types';
import { cn } from '@/lib/utils';

interface PredictiveAnalysisProps {
  devices: DeviceProfile[];
}

interface DevicePrediction {
  device: DeviceProfile;
  nextLikelyTimes: Array<{
    hour: number;
    dayOfWeek: string;
    confidence: number;
    averageCount: number;
  }>;
  likelyLocations: Array<{
    latitude: number;
    longitude: number;
    confidence: number;
    frequency: number;
    label: string;
  }>;
  detectionPattern: 'daily' | 'weekday' | 'weekend' | 'irregular';
  patternConfidence: number;
  predictedNextDetection: {
    timestamp: number;
    confidence: number;
    reason: string;
  } | null;
}

interface TimePattern {
  hour: number;
  dayOfWeek: number;
  count: number;
}

function analyzeTimePatterns(history: LocationHistoryEntry[]): TimePattern[] {
  const patterns: Map<string, number> = new Map();
  
  history.forEach(entry => {
    const date = new Date(entry.timestamp);
    const hour = date.getHours();
    const dayOfWeek = date.getDay();
    const key = `${dayOfWeek}-${hour}`;
    patterns.set(key, (patterns.get(key) || 0) + 1);
  });

  const result: TimePattern[] = [];
  patterns.forEach((count, key) => {
    const [dayOfWeek, hour] = key.split('-').map(Number);
    result.push({ hour, dayOfWeek, count });
  });

  return result.sort((a, b) => b.count - a.count);
}

function clusterLocations(history: LocationHistoryEntry[], maxDistance: number = 0.0005): Array<{
  latitude: number;
  longitude: number;
  count: number;
}> {
  const clusters: Array<{
    latitude: number;
    longitude: number;
    count: number;
  }> = [];

  history.forEach(entry => {
    let foundCluster = false;
    
    for (const cluster of clusters) {
      const distance = Math.sqrt(
        Math.pow(cluster.latitude - entry.latitude, 2) +
        Math.pow(cluster.longitude - entry.longitude, 2)
      );
      
      if (distance <= maxDistance) {
        cluster.latitude = (cluster.latitude * cluster.count + entry.latitude) / (cluster.count + 1);
        cluster.longitude = (cluster.longitude * cluster.count + entry.longitude) / (cluster.count + 1);
        cluster.count++;
        foundCluster = true;
        break;
      }
    }
    
    if (!foundCluster) {
      clusters.push({
        latitude: entry.latitude,
        longitude: entry.longitude,
        count: 1,
      });
    }
  });

  return clusters.sort((a, b) => b.count - a.count);
}

function detectPattern(history: LocationHistoryEntry[]): {
  pattern: 'daily' | 'weekday' | 'weekend' | 'irregular';
  confidence: number;
} {
  if (history.length < 7) {
    return { pattern: 'irregular', confidence: 0.3 };
  }

  const dayPresence: Record<number, number> = {};
  history.forEach(entry => {
    const day = new Date(entry.timestamp).getDay();
    dayPresence[day] = (dayPresence[day] || 0) + 1;
  });

  const weekdayCount = [1, 2, 3, 4, 5].reduce((sum, day) => sum + (dayPresence[day] || 0), 0);
  const weekendCount = [0, 6].reduce((sum, day) => sum + (dayPresence[day] || 0), 0);
  const totalDays = Object.keys(dayPresence).length;

  if (totalDays >= 6) {
    const variance = Object.values(dayPresence).reduce((sum, count) => {
      const avg = history.length / totalDays;
      return sum + Math.pow(count - avg, 2);
    }, 0) / totalDays;
    const cv = Math.sqrt(variance) / (history.length / totalDays);
    
    if (cv < 0.3) {
      return { pattern: 'daily', confidence: Math.min(0.9, 1 - cv) };
    }
  }

  const weekdayRatio = weekdayCount / (weekdayCount + weekendCount);
  if (weekdayRatio > 0.75 && weekdayCount >= 10) {
    return { pattern: 'weekday', confidence: Math.min(0.85, weekdayRatio) };
  }

  const weekendRatio = weekendCount / (weekdayCount + weekendCount);
  if (weekendRatio > 0.75 && weekendCount >= 4) {
    return { pattern: 'weekend', confidence: Math.min(0.8, weekendRatio) };
  }

  return { pattern: 'irregular', confidence: 0.5 };
}

function predictNextDetection(
  history: LocationHistoryEntry[],
  pattern: 'daily' | 'weekday' | 'weekend' | 'irregular',
  timePatterns: TimePattern[]
): {
  timestamp: number;
  confidence: number;
  reason: string;
} | null {
  if (history.length < 3) return null;

  const now = new Date();
  const currentDay = now.getDay();
  const currentHour = now.getHours();

  const topPattern = timePatterns[0];
  if (!topPattern) return null;

  let nextDate = new Date();
  
  if (pattern === 'daily') {
    if (topPattern.hour > currentHour) {
      nextDate.setHours(topPattern.hour, 0, 0, 0);
    } else {
      nextDate.setDate(nextDate.getDate() + 1);
      nextDate.setHours(topPattern.hour, 0, 0, 0);
    }
    
    const confidence = Math.min(0.9, topPattern.count / Math.max(history.length / 7, 1));
    return {
      timestamp: nextDate.getTime(),
      confidence,
      reason: `Usually detected around ${topPattern.hour}:00 daily`,
    };
  }

  if (pattern === 'weekday') {
    let daysAhead = 0;
    if (currentDay === 0) daysAhead = 1;
    else if (currentDay === 6) daysAhead = 2;
    else if (topPattern.hour <= currentHour) daysAhead = 1;

    nextDate.setDate(nextDate.getDate() + daysAhead);
    while (nextDate.getDay() === 0 || nextDate.getDay() === 6) {
      nextDate.setDate(nextDate.getDate() + 1);
    }
    nextDate.setHours(topPattern.hour, 0, 0, 0);

    return {
      timestamp: nextDate.getTime(),
      confidence: 0.75,
      reason: `Typically detected on weekdays around ${topPattern.hour}:00`,
    };
  }

  if (pattern === 'weekend') {
    let daysAhead = 0;
    if (currentDay < 6) daysAhead = 6 - currentDay;
    else if (currentDay === 6 && topPattern.hour <= currentHour) daysAhead = 1;

    nextDate.setDate(nextDate.getDate() + daysAhead);
    nextDate.setHours(topPattern.hour, 0, 0, 0);

    return {
      timestamp: nextDate.getTime(),
      confidence: 0.7,
      reason: `Usually detected on weekends around ${topPattern.hour}:00`,
    };
  }

  const sortedHistory = [...history].sort((a, b) => b.timestamp - a.timestamp);
  const recentDetections = sortedHistory.slice(0, Math.min(5, sortedHistory.length));
  const intervals = [];
  
  for (let i = 1; i < recentDetections.length; i++) {
    intervals.push(recentDetections[i - 1].timestamp - recentDetections[i].timestamp);
  }

  if (intervals.length > 0) {
    const avgInterval = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
    const lastSeen = sortedHistory[0].timestamp;
    
    return {
      timestamp: lastSeen + avgInterval,
      confidence: 0.4,
      reason: 'Based on recent detection intervals',
    };
  }

  return null;
}

export function PredictiveAnalysis({ devices }: PredictiveAnalysisProps) {
  const predictions = useMemo<DevicePrediction[]>(() => {
    return devices
      .filter(d => d.locationHistory && d.locationHistory.length >= 3)
      .map(device => {
        const history = device.locationHistory || [];
        
        const timePatterns = analyzeTimePatterns(history);
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        
        const topTimePatterns = timePatterns.slice(0, 5).map(pattern => {
          const totalInHour = history.filter(h => {
            const d = new Date(h.timestamp);
            return d.getHours() === pattern.hour && d.getDay() === pattern.dayOfWeek;
          }).length;
          
          const weeksOfData = Math.max(1, (Date.now() - history[0].timestamp) / (1000 * 60 * 60 * 24 * 7));
          const avgPerWeek = totalInHour / weeksOfData;
          
          return {
            hour: pattern.hour,
            dayOfWeek: dayNames[pattern.dayOfWeek],
            confidence: Math.min(0.95, pattern.count / Math.max(history.length * 0.1, 1)),
            averageCount: avgPerWeek,
          };
        });

        const locationClusters = clusterLocations(history);
        const likelyLocations = locationClusters.slice(0, 3).map((cluster, index) => ({
          latitude: cluster.latitude,
          longitude: cluster.longitude,
          confidence: Math.min(0.95, cluster.count / history.length),
          frequency: cluster.count,
          label: index === 0 ? 'Primary Location' : index === 1 ? 'Secondary Location' : 'Tertiary Location',
        }));

        const { pattern, confidence: patternConfidence } = detectPattern(history);
        const predictedNext = predictNextDetection(history, pattern, timePatterns);

        return {
          device,
          nextLikelyTimes: topTimePatterns,
          likelyLocations,
          detectionPattern: pattern,
          patternConfidence,
          predictedNextDetection: predictedNext,
        };
      })
      .sort((a, b) => {
        if (a.predictedNextDetection && b.predictedNextDetection) {
          return a.predictedNextDetection.timestamp - b.predictedNextDetection.timestamp;
        }
        if (a.predictedNextDetection) return -1;
        if (b.predictedNextDetection) return 1;
        return b.patternConfidence - a.patternConfidence;
      });
  }, [devices]);

  if (predictions.length === 0) {
    return (
      <div className="text-center py-16">
        <Brain className="w-16 h-16 mx-auto mb-4 text-muted-foreground" weight="duotone" />
        <h3 className="text-xl font-heading font-semibold mb-2">
          Insufficient Data for Predictions
        </h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          Predictive analysis requires at least 3 detection records per device. Keep scanning to build a pattern history.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Lightning className="w-6 h-6 text-primary" weight="fill" />
        <div>
          <h2 className="text-2xl font-heading font-bold">Predictive Analysis</h2>
          <p className="text-sm text-muted-foreground">
            AI-powered predictions based on historical detection patterns
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-6 border-l-4 border-l-primary">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Active Predictions</p>
              <p className="text-3xl font-heading font-bold">{predictions.length}</p>
            </div>
            <Target className="w-8 h-8 text-primary" weight="duotone" />
          </div>
        </Card>

        <Card className="p-6 border-l-4 border-l-accent">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">High Confidence</p>
              <p className="text-3xl font-heading font-bold">
                {predictions.filter(p => p.patternConfidence > 0.7).length}
              </p>
            </div>
            <TrendUp className="w-8 h-8 text-accent" weight="duotone" />
          </div>
        </Card>

        <Card className="p-6 border-l-4 border-l-yellow-500">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Next Detection</p>
              <p className="text-lg font-heading font-bold">
                {predictions[0]?.predictedNextDetection
                  ? new Date(predictions[0].predictedNextDetection.timestamp).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                    })
                  : 'Unknown'}
              </p>
            </div>
            <Clock className="w-8 h-8 text-yellow-500" weight="duotone" />
          </div>
        </Card>
      </div>

      <div className="space-y-6">
        {predictions.map((prediction) => {
          const patternLabels = {
            daily: 'Daily Pattern',
            weekday: 'Weekday Pattern',
            weekend: 'Weekend Pattern',
            irregular: 'Irregular Pattern',
          };

          const patternColors = {
            daily: 'bg-green-500',
            weekday: 'bg-blue-500',
            weekend: 'bg-purple-500',
            irregular: 'bg-yellow-500',
          };

          return (
            <Card key={prediction.device.id} className="overflow-hidden">
              <div className="p-6">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div
                      className="w-14 h-14 rounded-full flex items-center justify-center text-2xl flex-shrink-0"
                      style={{ backgroundColor: prediction.device.color }}
                    >
                      {prediction.device.emoji}
                    </div>
                    <div>
                      <h3 className="text-xl font-heading font-bold mb-1">
                        {prediction.device.customName}
                      </h3>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={cn(patternColors[prediction.detectionPattern], 'text-white')}>
                          {patternLabels[prediction.detectionPattern]}
                        </Badge>
                        <Badge variant="outline">
                          {(prediction.patternConfidence * 100).toFixed(0)}% confidence
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {prediction.device.locationHistory?.length} detections analyzed
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {prediction.predictedNextDetection && (
                  <Card className="p-4 mb-6 bg-primary/5 border-primary/20">
                    <div className="flex items-start gap-3">
                      <Lightning className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" weight="fill" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-heading font-semibold">Next Predicted Detection</h4>
                          <Badge variant="default" className="bg-primary">
                            {(prediction.predictedNextDetection.confidence * 100).toFixed(0)}%
                          </Badge>
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">
                              {new Date(prediction.predictedNextDetection.timestamp).toLocaleDateString('en-US', {
                                weekday: 'long',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">
                              {new Date(prediction.predictedNextDetection.timestamp).toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            {prediction.predictedNextDetection.reason}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Card>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Clock className="w-5 h-5 text-primary" weight="fill" />
                      <h4 className="font-heading font-semibold">Most Likely Detection Times</h4>
                    </div>

                    {prediction.nextLikelyTimes.length > 0 ? (
                      <div className="space-y-3">
                        {prediction.nextLikelyTimes.map((time, index) => {
                          const hourLabel =
                            time.hour === 0
                              ? '12 AM'
                              : time.hour < 12
                              ? `${time.hour} AM`
                              : time.hour === 12
                              ? '12 PM'
                              : `${time.hour - 12} PM`;

                          return (
                            <div key={`${time.dayOfWeek}-${time.hour}`} className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                  <Badge variant={index === 0 ? 'default' : 'secondary'} className="w-6 h-6 flex items-center justify-center p-0">
                                    {index + 1}
                                  </Badge>
                                  <span className="font-medium">
                                    {time.dayOfWeek} at {hourLabel}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground">
                                    {time.averageCount.toFixed(1)}x/week
                                  </span>
                                  <span className="text-xs font-medium">
                                    {(time.confidence * 100).toFixed(0)}%
                                  </span>
                                </div>
                              </div>
                              <Progress value={time.confidence * 100} className="h-1.5" />
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No clear time patterns detected</p>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <MapPin className="w-5 h-5 text-accent" weight="fill" />
                      <h4 className="font-heading font-semibold">Most Frequent Locations</h4>
                    </div>

                    {prediction.likelyLocations.length > 0 ? (
                      <div className="space-y-3">
                        {prediction.likelyLocations.map((location, index) => (
                          <div key={index} className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <Badge 
                                  variant={index === 0 ? 'default' : 'secondary'}
                                  className={cn('w-6 h-6 flex items-center justify-center p-0', index === 0 && 'bg-accent text-accent-foreground')}
                                >
                                  {index + 1}
                                </Badge>
                                <span className="font-medium">{location.label}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">
                                  {location.frequency} times
                                </span>
                                <span className="text-xs font-medium">
                                  {(location.confidence * 100).toFixed(0)}%
                                </span>
                              </div>
                            </div>
                            <Progress value={location.confidence * 100} className="h-1.5" />
                            <p className="text-xs text-muted-foreground font-mono">
                              {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No location clusters detected</p>
                    )}
                  </div>
                </div>

                {prediction.patternConfidence < 0.5 && (
                  <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-md flex items-start gap-2">
                    <Warning className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" weight="fill" />
                    <div>
                      <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
                        Low Pattern Confidence
                      </p>
                      <p className="text-xs text-yellow-600 dark:text-yellow-500 mt-1">
                        This device has an irregular detection pattern. More data needed for accurate predictions.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
