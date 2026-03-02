import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapTrifold, Flame, Crosshair, Play, Pause, FastForward, Rewind, SkipForward, SkipBack } from '@phosphor-icons/react';
import type { DeviceProfile, LocationHistoryEntry } from '@/lib/types';
import { cn } from '@/lib/utils';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';

interface HeatmapViewProps {
  devices: DeviceProfile[];
}

type TimeGranularity = 'hour' | 'day' | 'week' | 'month';

interface TimeSlot {
  start: number;
  end: number;
  label: string;
  entries: LocationHistoryEntry[];
}

interface HeatmapControlsProps {
  radius: number;
  onRadiusChange: (value: number) => void;
  blur: number;
  onBlurChange: (value: number) => void;
  intensity: number;
  onIntensityChange: (value: number) => void;
  showAllDevices: boolean;
  onShowAllDevicesChange: (value: boolean) => void;
  selectedDevice: string;
  onDeviceChange: (value: string) => void;
  devices: DeviceProfile[];
  totalPoints: number;
  enableAnimation: boolean;
  onEnableAnimationChange: (value: boolean) => void;
  isPlaying: boolean;
  onPlayPause: () => void;
  animationSpeed: number;
  onAnimationSpeedChange: (value: number) => void;
  currentTimeIndex: number;
  totalTimeSlots: number;
  timeGranularity: TimeGranularity;
  onTimeGranularityChange: (value: TimeGranularity) => void;
  currentTimeLabel: string;
  onStepForward: () => void;
  onStepBackward: () => void;
}

function HeatmapLayer({ 
  heatmapData, 
  radius, 
  blur, 
  intensity 
}: { 
  heatmapData: Array<[number, number, number]>;
  radius: number;
  blur: number;
  intensity: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (!heatmapData || heatmapData.length === 0) return;

    const heatLayer = L.heatLayer(heatmapData, {
      radius: radius,
      blur: blur,
      maxZoom: 17,
      max: intensity,
      minOpacity: 0.4,
      gradient: {
        0.0: '#0000ff',
        0.2: '#00ffff',
        0.4: '#00ff00',
        0.6: '#ffff00',
        0.8: '#ff9900',
        1.0: '#ff0000'
      }
    }).addTo(map);

    return () => {
      map.removeLayer(heatLayer);
    };
  }, [map, heatmapData, radius, blur, intensity]);

  return null;
}

function HeatmapControls({
  radius,
  onRadiusChange,
  blur,
  onBlurChange,
  intensity,
  onIntensityChange,
  showAllDevices,
  onShowAllDevicesChange,
  selectedDevice,
  onDeviceChange,
  devices,
  totalPoints,
  enableAnimation,
  onEnableAnimationChange,
  isPlaying,
  onPlayPause,
  animationSpeed,
  onAnimationSpeedChange,
  currentTimeIndex,
  totalTimeSlots,
  timeGranularity,
  onTimeGranularityChange,
  currentTimeLabel,
  onStepForward,
  onStepBackward,
}: HeatmapControlsProps) {
  const devicesWithHistory = devices.filter(d => d.locationHistory && d.locationHistory.length > 0);

  return (
    <Card className="p-6 space-y-6">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-heading font-semibold">Heatmap Controls</h3>
          <Badge variant="secondary">
            {totalPoints} detection{totalPoints !== 1 ? 's' : ''}
          </Badge>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="show-all" className="text-sm font-medium">
              Show All Devices
            </Label>
            <Switch
              id="show-all"
              checked={showAllDevices}
              onCheckedChange={onShowAllDevicesChange}
            />
          </div>

          {!showAllDevices && (
            <div>
              <Label htmlFor="device-select" className="text-sm font-medium mb-2 block">
                Select Device
              </Label>
              <Select value={selectedDevice} onValueChange={onDeviceChange}>
                <SelectTrigger id="device-select">
                  <SelectValue placeholder="Choose a device" />
                </SelectTrigger>
                <SelectContent>
                  {devicesWithHistory.map(device => (
                    <SelectItem key={device.id} value={device.id}>
                      <div className="flex items-center gap-2">
                        <span>{device.emoji}</span>
                        <span>{device.customName}</span>
                        <span className="text-xs text-muted-foreground">
                          ({device.locationHistory?.length || 0})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-border pt-6">
        <div className="flex items-center justify-between mb-4">
          <Label htmlFor="enable-animation" className="text-sm font-medium">
            Time-Based Animation
          </Label>
          <Switch
            id="enable-animation"
            checked={enableAnimation}
            onCheckedChange={onEnableAnimationChange}
          />
        </div>

        {enableAnimation && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="time-granularity" className="text-sm font-medium mb-2 block">
                Time Scale
              </Label>
              <Select value={timeGranularity} onValueChange={onTimeGranularityChange}>
                <SelectTrigger id="time-granularity">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hour">Hourly</SelectItem>
                  <SelectItem value="day">Daily</SelectItem>
                  <SelectItem value="week">Weekly</SelectItem>
                  <SelectItem value="month">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium">Current Period</Label>
                <Badge variant="outline" className="font-mono text-xs">
                  {currentTimeIndex + 1} / {totalTimeSlots}
                </Badge>
              </div>
              <div className="text-sm text-primary font-medium mb-3 text-center py-2 px-3 bg-primary/10 rounded-md">
                {currentTimeLabel}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={onStepBackward}
                disabled={currentTimeIndex === 0}
                className="flex-shrink-0"
              >
                <SkipBack className="w-4 h-4" weight="fill" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={onPlayPause}
                className="flex-shrink-0"
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4" weight="fill" />
                ) : (
                  <Play className="w-4 h-4" weight="fill" />
                )}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={onStepForward}
                disabled={currentTimeIndex >= totalTimeSlots - 1}
                className="flex-shrink-0"
              >
                <SkipForward className="w-4 h-4" weight="fill" />
              </Button>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="animation-speed" className="text-sm font-medium">
                  Animation Speed
                </Label>
                <span className="text-sm text-muted-foreground">{animationSpeed}x</span>
              </div>
              <Slider
                id="animation-speed"
                value={[animationSpeed]}
                onValueChange={([value]) => onAnimationSpeedChange(value)}
                min={0.5}
                max={4}
                step={0.5}
              />
            </div>

            <div className="w-full">
              <Slider
                value={[currentTimeIndex]}
                onValueChange={([value]) => {
                  if (value >= 0 && value < totalTimeSlots) {
                    onStepForward();
                  }
                }}
                min={0}
                max={Math.max(0, totalTimeSlots - 1)}
                step={1}
                className="cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4 border-t border-border pt-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label htmlFor="radius-slider" className="text-sm font-medium">
              Radius
            </Label>
            <span className="text-sm text-muted-foreground">{radius}px</span>
          </div>
          <Slider
            id="radius-slider"
            value={[radius]}
            onValueChange={([value]) => onRadiusChange(value)}
            min={10}
            max={50}
            step={5}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <Label htmlFor="blur-slider" className="text-sm font-medium">
              Blur
            </Label>
            <span className="text-sm text-muted-foreground">{blur}px</span>
          </div>
          <Slider
            id="blur-slider"
            value={[blur]}
            onValueChange={([value]) => onBlurChange(value)}
            min={5}
            max={30}
            step={5}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <Label htmlFor="intensity-slider" className="text-sm font-medium">
              Intensity
            </Label>
            <span className="text-sm text-muted-foreground">{intensity.toFixed(1)}</span>
          </div>
          <Slider
            id="intensity-slider"
            value={[intensity]}
            onValueChange={([value]) => onIntensityChange(value)}
            min={0.5}
            max={5}
            step={0.5}
          />
        </div>
      </div>

      <div className="pt-4 border-t border-border">
        <h4 className="text-sm font-medium mb-3">Heatmap Legend</h4>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#0000ff' }} />
            <span className="text-xs text-muted-foreground">Low activity</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#00ff00' }} />
            <span className="text-xs text-muted-foreground">Medium activity</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ffff00' }} />
            <span className="text-xs text-muted-foreground">High activity</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ff0000' }} />
            <span className="text-xs text-muted-foreground">Peak activity</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

function createTimeSlots(
  devices: DeviceProfile[],
  granularity: TimeGranularity,
  showAllDevices: boolean,
  selectedDevice: string
): TimeSlot[] {
  const targetDevices = showAllDevices 
    ? devices.filter(d => d.locationHistory && d.locationHistory.length > 0)
    : devices.filter(d => d.id === selectedDevice && d.locationHistory && d.locationHistory.length > 0);

  if (targetDevices.length === 0) return [];

  const allEntries: LocationHistoryEntry[] = [];
  targetDevices.forEach(device => {
    if (device.locationHistory) {
      allEntries.push(...device.locationHistory);
    }
  });

  if (allEntries.length === 0) return [];

  allEntries.sort((a, b) => a.timestamp - b.timestamp);
  const minTime = allEntries[0].timestamp;
  const maxTime = allEntries[allEntries.length - 1].timestamp;

  let slotDuration: number;
  let formatLabel: (date: Date) => string;

  switch (granularity) {
    case 'hour':
      slotDuration = 60 * 60 * 1000;
      formatLabel = (date: Date) => 
        `${date.toLocaleDateString()} ${date.getHours()}:00`;
      break;
    case 'day':
      slotDuration = 24 * 60 * 60 * 1000;
      formatLabel = (date: Date) => date.toLocaleDateString();
      break;
    case 'week':
      slotDuration = 7 * 24 * 60 * 60 * 1000;
      formatLabel = (date: Date) => {
        const endDate = new Date(date.getTime() + slotDuration);
        return `${date.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
      };
      break;
    case 'month':
      slotDuration = 30 * 24 * 60 * 60 * 1000;
      formatLabel = (date: Date) => 
        `${date.toLocaleDateString('default', { month: 'long', year: 'numeric' })}`;
      break;
  }

  const slots: TimeSlot[] = [];
  let currentStart = minTime;

  while (currentStart <= maxTime) {
    const currentEnd = currentStart + slotDuration;
    const slotEntries = allEntries.filter(
      entry => entry.timestamp >= currentStart && entry.timestamp < currentEnd
    );

    if (slotEntries.length > 0) {
      slots.push({
        start: currentStart,
        end: currentEnd,
        label: formatLabel(new Date(currentStart)),
        entries: slotEntries,
      });
    }

    currentStart = currentEnd;
  }

  return slots;
}

export function HeatmapView({ devices }: HeatmapViewProps) {
  const [radius, setRadius] = useState(25);
  const [blur, setBlur] = useState(15);
  const [intensity, setIntensity] = useState(1.0);
  const [showAllDevices, setShowAllDevices] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [enableAnimation, setEnableAnimation] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState(1);
  const [currentTimeIndex, setCurrentTimeIndex] = useState(0);
  const [timeGranularity, setTimeGranularity] = useState<TimeGranularity>('day');
  const animationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const devicesWithHistory = useMemo(
    () => devices.filter(d => d.locationHistory && d.locationHistory.length > 0),
    [devices]
  );

  useEffect(() => {
    if (devicesWithHistory.length > 0 && !selectedDevice) {
      setSelectedDevice(devicesWithHistory[0].id);
    }
  }, [devicesWithHistory, selectedDevice]);

  const timeSlots = useMemo(() => {
    return createTimeSlots(devices, timeGranularity, showAllDevices, selectedDevice);
  }, [devices, timeGranularity, showAllDevices, selectedDevice]);

  useEffect(() => {
    if (currentTimeIndex >= timeSlots.length) {
      setCurrentTimeIndex(Math.max(0, timeSlots.length - 1));
    }
  }, [timeSlots.length, currentTimeIndex]);

  useEffect(() => {
    if (!enableAnimation) {
      setIsPlaying(false);
    }
  }, [enableAnimation]);

  useEffect(() => {
    if (isPlaying && enableAnimation && timeSlots.length > 0) {
      const interval = 1000 / animationSpeed;
      animationIntervalRef.current = setInterval(() => {
        setCurrentTimeIndex(prev => {
          if (prev >= timeSlots.length - 1) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, interval);
    }

    return () => {
      if (animationIntervalRef.current) {
        clearInterval(animationIntervalRef.current);
      }
    };
  }, [isPlaying, enableAnimation, animationSpeed, timeSlots.length]);

  const handlePlayPause = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  const handleStepForward = useCallback(() => {
    setCurrentTimeIndex(prev => Math.min(prev + 1, timeSlots.length - 1));
  }, [timeSlots.length]);

  const handleStepBackward = useCallback(() => {
    setCurrentTimeIndex(prev => Math.max(prev - 1, 0));
  }, []);

  const { heatmapData, center, hasData } = useMemo(() => {
    let allPoints: Array<[number, number, number]> = [];

    if (enableAnimation && timeSlots.length > 0) {
      const currentSlot = timeSlots[currentTimeIndex];
      if (currentSlot) {
        currentSlot.entries.forEach(entry => {
          if (entry.latitude && entry.longitude) {
            allPoints.push([entry.latitude, entry.longitude, 1]);
          }
        });
      }
    } else {
      let targetDevices = showAllDevices 
        ? devicesWithHistory 
        : devicesWithHistory.filter(d => d.id === selectedDevice);

      targetDevices.forEach(device => {
        (device.locationHistory || []).forEach(entry => {
          if (entry.latitude && entry.longitude) {
            allPoints.push([entry.latitude, entry.longitude, 1]);
          }
        });
      });
    }

    const centerLat = allPoints.length > 0
      ? allPoints.reduce((sum, point) => sum + point[0], 0) / allPoints.length
      : 0;
    const centerLon = allPoints.length > 0
      ? allPoints.reduce((sum, point) => sum + point[1], 0) / allPoints.length
      : 0;

    return {
      heatmapData: allPoints,
      center: [centerLat, centerLon] as [number, number],
      hasData: allPoints.length > 0,
    };
  }, [devicesWithHistory, showAllDevices, selectedDevice, enableAnimation, timeSlots, currentTimeIndex]);

  const currentTimeLabel = useMemo(() => {
    if (!enableAnimation || timeSlots.length === 0) return '';
    return timeSlots[currentTimeIndex]?.label || '';
  }, [enableAnimation, timeSlots, currentTimeIndex]);

  const handleRecenter = () => {
    window.location.reload();
  };

  if (devicesWithHistory.length === 0) {
    return (
      <div className="space-y-6">
        <div className="text-center py-16">
          <Flame className="w-16 h-16 mx-auto mb-4 text-muted-foreground" weight="duotone" />
          <h3 className="text-xl font-heading font-semibold mb-2">
            No location data for heatmap
          </h3>
          <p className="text-muted-foreground">
            Scan devices with location data to generate the heatmap visualization
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-heading font-bold flex items-center gap-2">
            <Flame className="w-6 h-6 text-primary" weight="fill" />
            Detection Heatmap
            {enableAnimation && (
              <Badge variant="secondary" className="ml-2">
                Time Animation
              </Badge>
            )}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {enableAnimation 
              ? 'Watch detection patterns evolve over time'
              : 'Visualize device detection patterns by location'
            }
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleRecenter}
          className="gap-2"
        >
          <Crosshair className="w-4 h-4" weight="bold" />
          Recenter Map
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <HeatmapControls
            radius={radius}
            onRadiusChange={setRadius}
            blur={blur}
            onBlurChange={setBlur}
            intensity={intensity}
            onIntensityChange={setIntensity}
            showAllDevices={showAllDevices}
            onShowAllDevicesChange={setShowAllDevices}
            selectedDevice={selectedDevice}
            onDeviceChange={setSelectedDevice}
            devices={devices}
            totalPoints={heatmapData.length}
            enableAnimation={enableAnimation}
            onEnableAnimationChange={setEnableAnimation}
            isPlaying={isPlaying}
            onPlayPause={handlePlayPause}
            animationSpeed={animationSpeed}
            onAnimationSpeedChange={setAnimationSpeed}
            currentTimeIndex={currentTimeIndex}
            totalTimeSlots={timeSlots.length}
            timeGranularity={timeGranularity}
            onTimeGranularityChange={setTimeGranularity}
            currentTimeLabel={currentTimeLabel}
            onStepForward={handleStepForward}
            onStepBackward={handleStepBackward}
          />
        </div>

        <div className="lg:col-span-3">
          <div className="h-[700px] rounded-lg overflow-hidden border border-border shadow-lg">
            <MapContainer
              center={center}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              />
              <HeatmapLayer
                heatmapData={heatmapData}
                radius={radius}
                blur={blur}
                intensity={intensity}
              />
            </MapContainer>
          </div>
        </div>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-heading font-semibold mb-4">
          {enableAnimation ? 'Animation Insights' : 'Heatmap Insights'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">
              {enableAnimation ? 'Current Detections' : 'Total Detection Points'}
            </p>
            <p className="text-2xl font-heading font-bold">{heatmapData.length}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Devices Displayed</p>
            <p className="text-2xl font-heading font-bold">
              {showAllDevices ? devicesWithHistory.length : 1}
            </p>
          </div>
          {enableAnimation && (
            <>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Time Periods</p>
                <p className="text-2xl font-heading font-bold">{timeSlots.length}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Time Scale</p>
                <p className="text-2xl font-heading font-bold capitalize">{timeGranularity}</p>
              </div>
            </>
          )}
          {!enableAnimation && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Map Coverage</p>
              <p className="text-2xl font-heading font-bold">
                {devicesWithHistory.reduce((acc, d) => {
                  const uniqueLocs = new Set(
                    (d.locationHistory || []).map(h => `${h.latitude.toFixed(4)},${h.longitude.toFixed(4)}`)
                  );
                  return acc + uniqueLocs.size;
                }, 0)} locations
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
