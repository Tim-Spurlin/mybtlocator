import { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapTrifold, Flame, Crosshair } from '@phosphor-icons/react';
import type { DeviceProfile } from '@/lib/types';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';

interface HeatmapViewProps {
  devices: DeviceProfile[];
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

      <div className="space-y-4">
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

export function HeatmapView({ devices }: HeatmapViewProps) {
  const [radius, setRadius] = useState(25);
  const [blur, setBlur] = useState(15);
  const [intensity, setIntensity] = useState(1.0);
  const [showAllDevices, setShowAllDevices] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState<string>('');

  const devicesWithHistory = useMemo(
    () => devices.filter(d => d.locationHistory && d.locationHistory.length > 0),
    [devices]
  );

  useEffect(() => {
    if (devicesWithHistory.length > 0 && !selectedDevice) {
      setSelectedDevice(devicesWithHistory[0].id);
    }
  }, [devicesWithHistory, selectedDevice]);

  const { heatmapData, center, hasData } = useMemo(() => {
    let targetDevices = showAllDevices 
      ? devicesWithHistory 
      : devicesWithHistory.filter(d => d.id === selectedDevice);

    const allPoints: Array<[number, number, number]> = [];
    
    targetDevices.forEach(device => {
      (device.locationHistory || []).forEach(entry => {
        if (entry.latitude && entry.longitude) {
          allPoints.push([
            entry.latitude,
            entry.longitude,
            1
          ]);
        }
      });
    });

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
  }, [devicesWithHistory, showAllDevices, selectedDevice]);

  const handleRecenter = () => {
    window.location.reload();
  };

  if (!hasData) {
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
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Visualize device detection patterns by location
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
        <h3 className="text-lg font-heading font-semibold mb-4">Heatmap Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Total Detection Points</p>
            <p className="text-2xl font-heading font-bold">{heatmapData.length}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Devices Displayed</p>
            <p className="text-2xl font-heading font-bold">
              {showAllDevices ? devicesWithHistory.length : 1}
            </p>
          </div>
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
        </div>
      </Card>
    </div>
  );
}
