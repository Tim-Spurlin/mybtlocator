import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { 
  Lightning, 
  Clock, 
  MapPin,
  TrendUp,
  Brain,
  Calendar,
  Target,
  Warning,
  Sliders,
  ChartLine
} from '@phosphor-icons/react';
import type { DeviceProfile, LocationHistoryEntry } from '@/lib/types';
import { cn } from '@/lib/utils';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';

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

interface ConfidenceTrendPoint {
  dataPoints: number;
  patternConfidence: number;
  timeConfidence: number;
  locationConfidence: number;
  overallConfidence: number;
  date: string;
}

function calculateConfidenceTrend(devices: DeviceProfile[]): ConfidenceTrendPoint[] {
  const allHistory: Array<{ timestamp: number; deviceId: string }> = [];
  
  devices.forEach(device => {
    if (device.locationHistory) {
      device.locationHistory.forEach(entry => {
        allHistory.push({
          timestamp: entry.timestamp,
          deviceId: device.id,
        });
      });
    }
  });

  allHistory.sort((a, b) => a.timestamp - b.timestamp);

  if (allHistory.length === 0) return [];

  const trendPoints: ConfidenceTrendPoint[] = [];
  const minDataPoints = 5;
  const stepSize = Math.max(5, Math.floor(allHistory.length / 20));

  for (let i = minDataPoints; i <= allHistory.length; i += stepSize) {
    const historicalSlice = allHistory.slice(0, i);
    const latestTimestamp = historicalSlice[historicalSlice.length - 1].timestamp;
    
    const deviceDataCounts: Record<string, number> = {};
    historicalSlice.forEach(h => {
      deviceDataCounts[h.deviceId] = (deviceDataCounts[h.deviceId] || 0) + 1;
    });

    let totalPatternConf = 0;
    let totalTimeConf = 0;
    let totalLocationConf = 0;
    let deviceCount = 0;

    devices.forEach(device => {
      const deviceHistory = historicalSlice
        .filter(h => h.deviceId === device.id)
        .map(h => {
          const fullEntry = device.locationHistory?.find(e => e.timestamp === h.timestamp);
          return fullEntry!;
        })
        .filter(e => e);

      if (deviceHistory.length >= 3) {
        deviceCount++;

        const { pattern, confidence: patternConf } = detectPattern(deviceHistory);
        totalPatternConf += patternConf;

        const timePatterns = analyzeTimePatterns(deviceHistory);
        const timeConf = timePatterns.length > 0 
          ? Math.min(0.95, timePatterns[0].count / Math.max(deviceHistory.length * 0.1, 1))
          : 0;
        totalTimeConf += timeConf;

        const locationClusters = clusterLocations(deviceHistory);
        const locationConf = locationClusters.length > 0
          ? Math.min(0.95, locationClusters[0].count / deviceHistory.length)
          : 0;
        totalLocationConf += locationConf;
      }
    });

    if (deviceCount > 0) {
      const avgPatternConf = totalPatternConf / deviceCount;
      const avgTimeConf = totalTimeConf / deviceCount;
      const avgLocationConf = totalLocationConf / deviceCount;
      const overallConf = (avgPatternConf + avgTimeConf + avgLocationConf) / 3;

      trendPoints.push({
        dataPoints: i,
        patternConfidence: avgPatternConf,
        timeConfidence: avgTimeConf,
        locationConfidence: avgLocationConf,
        overallConfidence: overallConf,
        date: new Date(latestTimestamp).toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        }),
      });
    }
  }

  if (trendPoints.length === 0 && allHistory.length >= minDataPoints) {
    const latestTimestamp = allHistory[allHistory.length - 1].timestamp;
    trendPoints.push({
      dataPoints: allHistory.length,
      patternConfidence: 0.3,
      timeConfidence: 0.3,
      locationConfidence: 0.3,
      overallConfidence: 0.3,
      date: new Date(latestTimestamp).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      }),
    });
  }

  return trendPoints;
}

export function PredictiveAnalysis({ devices }: PredictiveAnalysisProps) {
  const [confidenceThreshold, setConfidenceThreshold] = useState(0);

  const confidenceTrend = useMemo(() => {
    return calculateConfidenceTrend(devices);
  }, [devices]);

  const allPredictions = useMemo<DevicePrediction[]>(() => {
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

  const predictions = useMemo(() => {
    return allPredictions.filter(p => {
      const maxConfidence = Math.max(
        p.patternConfidence,
        p.predictedNextDetection?.confidence || 0,
        ...p.nextLikelyTimes.map(t => t.confidence),
        ...p.likelyLocations.map(l => l.confidence)
      );
      return maxConfidence >= confidenceThreshold;
    });
  }, [allPredictions, confidenceThreshold]);

  if (allPredictions.length === 0) {
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
        <div className="flex-1">
          <h2 className="text-2xl font-heading font-bold">Predictive Analysis</h2>
          <p className="text-sm text-muted-foreground">
            AI-powered predictions based on historical detection patterns
          </p>
        </div>
      </div>

      <Card className="p-6 bg-card border-2">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-primary" weight="fill" />
              <Label htmlFor="confidence-threshold" className="text-base font-heading font-semibold">
                Confidence Threshold
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-lg font-mono px-3 py-1">
                {Math.round(confidenceThreshold * 100)}%
              </Badge>
              {confidenceThreshold > 0 && (
                <Badge variant="outline" className="text-xs">
                  {predictions.length} of {allPredictions.length} shown
                </Badge>
              )}
            </div>
          </div>
          
          <div className="space-y-2">
            <Slider
              id="confidence-threshold"
              value={[confidenceThreshold * 100]}
              onValueChange={(values) => setConfidenceThreshold(values[0] / 100)}
              min={0}
              max={95}
              step={5}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>All Predictions</span>
              <span>High Confidence Only (≥{Math.round(confidenceThreshold * 100)}%)</span>
            </div>
          </div>

          <p className="text-sm text-muted-foreground mt-2">
            Filter predictions by minimum confidence level. Higher thresholds show only the most reliable predictions.
          </p>
        </div>
      </Card>

      {confidenceTrend.length > 0 && (
        <Card className="p-6 bg-card">
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <ChartLine className="w-6 h-6 text-accent" weight="fill" />
                <div>
                  <h3 className="text-lg font-heading font-semibold">Prediction Accuracy Improvement</h3>
                  <p className="text-xs text-muted-foreground">
                    Confidence trend showing how prediction accuracy improves with more data
                  </p>
                </div>
              </div>
              {confidenceTrend.length > 1 && (
                <Badge 
                  variant="default" 
                  className={cn(
                    'gap-1',
                    confidenceTrend[confidenceTrend.length - 1].overallConfidence > 
                    confidenceTrend[0].overallConfidence 
                      ? 'bg-green-500' 
                      : 'bg-yellow-500'
                  )}
                >
                  <TrendUp className="w-3 h-3" weight="fill" />
                  {((confidenceTrend[confidenceTrend.length - 1].overallConfidence - 
                     confidenceTrend[0].overallConfidence) * 100).toFixed(1)}% improvement
                </Badge>
              )}
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={confidenceTrend}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorOverall" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="oklch(0.65 0.19 240)" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="oklch(0.65 0.19 240)" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorPattern" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="oklch(0.75 0.15 200)" stopOpacity={0.6}/>
                      <stop offset="95%" stopColor="oklch(0.75 0.15 200)" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorTime" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="oklch(0.6 0.22 25)" stopOpacity={0.6}/>
                      <stop offset="95%" stopColor="oklch(0.6 0.22 25)" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorLocation" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="oklch(0.7 0.15 150)" stopOpacity={0.6}/>
                      <stop offset="95%" stopColor="oklch(0.7 0.15 150)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.30 0.02 240)" opacity={0.3} />
                  <XAxis 
                    dataKey="dataPoints" 
                    stroke="oklch(0.60 0.01 240)"
                    fontSize={12}
                    tickFormatter={(value) => `${value} pts`}
                  />
                  <YAxis 
                    stroke="oklch(0.60 0.01 240)"
                    fontSize={12}
                    domain={[0, 1]}
                    tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'oklch(0.20 0.02 240)',
                      border: '1px solid oklch(0.30 0.02 240)',
                      borderRadius: '8px',
                      color: 'oklch(0.95 0.01 240)',
                    }}
                    formatter={(value: number) => `${(value * 100).toFixed(1)}%`}
                    labelFormatter={(label) => `${label} data points`}
                  />
                  <Legend 
                    wrapperStyle={{ 
                      paddingTop: '20px',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="overallConfidence"
                    stroke="oklch(0.65 0.19 240)"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorOverall)"
                    name="Overall Confidence"
                  />
                  <Area
                    type="monotone"
                    dataKey="patternConfidence"
                    stroke="oklch(0.75 0.15 200)"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorPattern)"
                    name="Pattern Detection"
                  />
                  <Area
                    type="monotone"
                    dataKey="timeConfidence"
                    stroke="oklch(0.6 0.22 25)"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorTime)"
                    name="Time Prediction"
                  />
                  <Area
                    type="monotone"
                    dataKey="locationConfidence"
                    stroke="oklch(0.7 0.15 150)"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorLocation)"
                    name="Location Clustering"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t border-border">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary" />
                  <p className="text-xs font-medium text-muted-foreground">Overall</p>
                </div>
                <p className="text-2xl font-heading font-bold">
                  {(confidenceTrend[confidenceTrend.length - 1].overallConfidence * 100).toFixed(0)}%
                </p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-accent" />
                  <p className="text-xs font-medium text-muted-foreground">Pattern</p>
                </div>
                <p className="text-2xl font-heading font-bold">
                  {(confidenceTrend[confidenceTrend.length - 1].patternConfidence * 100).toFixed(0)}%
                </p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'oklch(0.6 0.22 25)' }} />
                  <p className="text-xs font-medium text-muted-foreground">Time</p>
                </div>
                <p className="text-2xl font-heading font-bold">
                  {(confidenceTrend[confidenceTrend.length - 1].timeConfidence * 100).toFixed(0)}%
                </p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'oklch(0.7 0.15 150)' }} />
                  <p className="text-xs font-medium text-muted-foreground">Location</p>
                </div>
                <p className="text-2xl font-heading font-bold">
                  {(confidenceTrend[confidenceTrend.length - 1].locationConfidence * 100).toFixed(0)}%
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground leading-relaxed">
                <strong className="text-foreground">Analysis:</strong> This graph shows how prediction confidence 
                improves as more detection data is collected. The overall confidence (primary line) is calculated from 
                pattern detection accuracy, time prediction reliability, and location clustering precision. More data 
                points lead to better pattern recognition and more accurate future predictions.
              </p>
            </div>
          </div>
        </Card>
      )}

      {predictions.length === 0 && allPredictions.length > 0 ? (
        <div className="text-center py-16">
          <Warning className="w-16 h-16 mx-auto mb-4 text-yellow-500" weight="duotone" />
          <h3 className="text-xl font-heading font-semibold mb-2">
            No Predictions Meet Threshold
          </h3>
          <p className="text-muted-foreground max-w-md mx-auto mb-4">
            No predictions have confidence levels at or above {Math.round(confidenceThreshold * 100)}%. 
            Lower the threshold to see more predictions.
          </p>
          <Button
            variant="outline"
            onClick={() => setConfidenceThreshold(0)}
            className="gap-2"
          >
            <Sliders className="w-4 h-4" weight="fill" />
            Reset Filter
          </Button>
        </div>
      ) : predictions.length === 0 ? (
        <div className="text-center py-16">
          <Brain className="w-16 h-16 mx-auto mb-4 text-muted-foreground" weight="duotone" />
          <h3 className="text-xl font-heading font-semibold mb-2">
            No Predictions Available
          </h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Keep scanning devices to build prediction data.
          </p>
        </div>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}
