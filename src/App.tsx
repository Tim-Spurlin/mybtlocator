import { useState, useEffect } from 'react';
import { useKV } from '@github/spark/hooks';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bluetooth, MapTrifold, Disc, Plus, Pencil, Trash } from '@phosphor-icons/react';
import { DeviceCard } from '@/components/DeviceCard';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import { toast } from 'sonner';
import type { DeviceProfile } from '@/lib/types';
import { DEVICE_TYPES, MARKER_COLORS } from '@/lib/types';
import { isBluetoothSupported, requestBluetoothDevice, estimateDistance } from '@/lib/bluetooth';
import { getCurrentLocation } from '@/lib/geolocation';
import { cn } from '@/lib/utils';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function App() {
  const [devices, setDevices] = useKV<DeviceProfile[]>('devices', []);
  const [activeTab, setActiveTab] = useState('devices');
  const [isScanning, setIsScanning] = useState(false);
  const [editingDevice, setEditingDevice] = useState<DeviceProfile | null>(null);
  const [showEditor, setShowEditor] = useState(false);

  const [formData, setFormData] = useState<{
    customName: string;
    type: DeviceProfile['type'];
    color: string;
    emoji: string;
    notes: string;
  }>({
    customName: '',
    type: 'phone',
    color: MARKER_COLORS[0].value,
    emoji: '📱',
    notes: '',
  });

  useEffect(() => {
    if (!isBluetoothSupported()) {
      toast.error('Web Bluetooth is not supported in this browser. Please use Chrome, Edge, or Opera.');
    }
  }, []);

  const handleScan = async () => {
    if (!isBluetoothSupported()) {
      toast.error('Bluetooth is not supported in your browser');
      return;
    }

    setIsScanning(true);
    try {
      const result = await requestBluetoothDevice();
      
      if (result) {
        const location = await getCurrentLocation();
        
        const existingDevice = (devices || []).find(d => d.id === result.id);
        
        if (existingDevice) {
          setDevices((currentDevices) =>
            currentDevices.map(d =>
              d.id === result.id
                ? {
                    ...d,
                    lastLat: location?.latitude ?? d.lastLat,
                    lastLon: location?.longitude ?? d.lastLon,
                    lastSeen: Date.now(),
                    rssi: result.rssi,
                    isNearby: true,
                  }
                : d
            )
          );
          toast.success(`Updated location for ${existingDevice.customName}`);
        } else {
          const newDevice: DeviceProfile = {
            id: result.id,
            macAddress: result.id,
            customName: result.name,
            type: 'other',
            color: MARKER_COLORS[0].value,
            emoji: '📡',
            notes: '',
            lastLat: location?.latitude ?? null,
            lastLon: location?.longitude ?? null,
            lastSeen: Date.now(),
            rssi: result.rssi,
            isNearby: true,
          };
          setDevices((currentDevices) => [...currentDevices, newDevice]);
          toast.success(`Found new device: ${result.name}`);
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        toast.error(`Scan failed: ${error.message}`);
      }
    } finally {
      setIsScanning(false);
    }
  };

  const handleEditDevice = (device: DeviceProfile) => {
    setEditingDevice(device);
    setFormData({
      customName: device.customName,
      type: device.type,
      color: device.color,
      emoji: device.emoji,
      notes: device.notes,
    });
    setShowEditor(true);
  };

  const handleSaveDevice = () => {
    if (!editingDevice) return;

    setDevices((currentDevices) =>
      currentDevices.map(d =>
        d.id === editingDevice.id
          ? { ...d, ...formData }
          : d
      )
    );

    toast.success('Device profile updated');
    setShowEditor(false);
    setEditingDevice(null);
  };

  const handleDeleteDevice = (deviceId: string) => {
    setDevices((currentDevices) => currentDevices.filter(d => d.id !== deviceId));
    toast.success('Device removed');
    setShowEditor(false);
    setEditingDevice(null);
  };

  const nearbyDevices = (devices || []).filter(d => d.isNearby);
  const allDevicesSorted = [...(devices || [])].sort((a, b) => {
    if (a.isNearby && !b.isNearby) return -1;
    if (!a.isNearby && b.isNearby) return 1;
    if (a.rssi && b.rssi) return b.rssi - a.rssi;
    return (b.lastSeen || 0) - (a.lastSeen || 0);
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,oklch(0.20_0.05_240),transparent)] opacity-30" />
        <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,oklch(0.15_0.03_240),oklch(0.15_0.03_240)_1px,transparent_1px,transparent_40px)] opacity-20" />
        
        <div className="relative container mx-auto px-4 py-6 max-w-7xl">
          <header className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-heading font-bold tracking-tight mb-2">
                  BlueTrack
                </h1>
                <p className="text-muted-foreground text-sm">
                  Bluetooth device locator with real-time tracking
                </p>
              </div>
              <Button
                onClick={handleScan}
                disabled={isScanning || !isBluetoothSupported()}
                size="lg"
                className={cn(
                  'gap-2',
                  isScanning && 'animate-pulse-scan'
                )}
              >
                <Bluetooth className="w-5 h-5" weight="fill" />
                {isScanning ? 'Scanning...' : 'Scan Device'}
              </Button>
            </div>
          </header>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full max-w-md grid-cols-3 mx-auto">
              <TabsTrigger value="devices" className="gap-2">
                <Bluetooth className="w-4 h-4" weight="fill" />
                Devices
              </TabsTrigger>
              <TabsTrigger value="map" className="gap-2">
                <MapTrifold className="w-4 h-4" weight="fill" />
                Map
              </TabsTrigger>
              <TabsTrigger value="radar" className="gap-2">
                <Disc className="w-4 h-4" weight="fill" />
                Radar
              </TabsTrigger>
            </TabsList>

            <TabsContent value="devices" className="space-y-4">
              {(devices || []).length === 0 ? (
                <div className="text-center py-16">
                  <Bluetooth className="w-16 h-16 mx-auto mb-4 text-muted-foreground" weight="duotone" />
                  <h3 className="text-xl font-heading font-semibold mb-2">
                    No devices tracked yet
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    Click "Scan Device" to discover and track Bluetooth devices
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {allDevicesSorted.map(device => (
                    <DeviceCard
                      key={device.id}
                      device={device}
                      onClick={() => handleEditDevice(device)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="map" className="space-y-4">
              {(devices || []).some(d => d.lastLat && d.lastLon) ? (
                <div className="h-[600px] rounded-lg overflow-hidden border border-border shadow-lg">
                  <MapContainer
                    center={[
                      (devices || []).find(d => d.lastLat)?.lastLat || 0,
                      (devices || []).find(d => d.lastLon)?.lastLon || 0
                    ]}
                    zoom={13}
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    />
                    {(devices || []).map(device => {
                      if (!device.lastLat || !device.lastLon) return null;
                      
                      const distance = device.rssi ? estimateDistance(device.rssi) : null;
                      
                      return (
                        <div key={device.id}>
                          <Marker position={[device.lastLat, device.lastLon]}>
                            <Popup>
                              <div className="text-sm">
                                <div className="font-semibold mb-1">{device.emoji} {device.customName}</div>
                                <div className="text-xs text-gray-600">{device.macAddress}</div>
                                {device.lastSeen && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    Last seen: {new Date(device.lastSeen).toLocaleString()}
                                  </div>
                                )}
                              </div>
                            </Popup>
                          </Marker>
                          {device.isNearby && distance && distance > 0 && (
                            <Circle
                              center={[device.lastLat, device.lastLon]}
                              radius={distance}
                              pathOptions={{
                                color: device.color,
                                fillColor: device.color,
                                fillOpacity: 0.2,
                                weight: 2,
                              }}
                            />
                          )}
                        </div>
                      );
                    })}
                  </MapContainer>
                </div>
              ) : (
                <div className="text-center py-16">
                  <MapTrifold className="w-16 h-16 mx-auto mb-4 text-muted-foreground" weight="duotone" />
                  <h3 className="text-xl font-heading font-semibold mb-2">
                    No location data available
                  </h3>
                  <p className="text-muted-foreground">
                    Scan devices to record their locations on the map
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="radar" className="space-y-4">
              {nearbyDevices.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-heading font-semibold">
                      Nearby Devices ({nearbyDevices.length})
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                      Live
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {nearbyDevices
                      .sort((a, b) => (b.rssi || -100) - (a.rssi || -100))
                      .map(device => (
                        <DeviceCard
                          key={device.id}
                          device={device}
                          onClick={() => handleEditDevice(device)}
                        />
                      ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-16">
                  <Disc className="w-16 h-16 mx-auto mb-4 text-muted-foreground animate-radar-sweep" weight="duotone" />
                  <h3 className="text-xl font-heading font-semibold mb-2">
                    No nearby devices
                  </h3>
                  <p className="text-muted-foreground">
                    Scan to detect devices in Bluetooth range
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading">Edit Device Profile</DialogTitle>
            <DialogDescription>
              Customize the device name, type, appearance, and notes
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="device-name">Device Name</Label>
              <Input
                id="device-name"
                value={formData.customName}
                onChange={(e) => setFormData(prev => ({ ...prev, customName: e.target.value }))}
                placeholder="My Earbuds"
              />
            </div>

            <div>
              <Label htmlFor="device-type">Device Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => {
                  const deviceType = DEVICE_TYPES.find(t => t.value === value);
                  setFormData(prev => ({
                    ...prev,
                    type: value as DeviceProfile['type'],
                    emoji: deviceType?.emoji || prev.emoji
                  }));
                }}
              >
                <SelectTrigger id="device-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEVICE_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.emoji} {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="device-color">Marker Color</Label>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {MARKER_COLORS.map(color => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, color: color.value }))}
                    className={cn(
                      'h-10 rounded-md border-2 transition-all',
                      formData.color === color.value ? 'border-foreground scale-110' : 'border-transparent'
                    )}
                    style={{ backgroundColor: color.value }}
                    title={color.label}
                  />
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="device-emoji">Emoji</Label>
              <Input
                id="device-emoji"
                value={formData.emoji}
                onChange={(e) => setFormData(prev => ({ ...prev, emoji: e.target.value }))}
                placeholder="📱"
                maxLength={2}
              />
            </div>

            <div>
              <Label htmlFor="device-notes">Notes</Label>
              <Textarea
                id="device-notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Add any notes about this device..."
                rows={3}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={handleSaveDevice} className="flex-1 gap-2">
                <Pencil className="w-4 h-4" weight="fill" />
                Save Changes
              </Button>
              {editingDevice && (
                <Button
                  variant="destructive"
                  onClick={() => handleDeleteDevice(editingDevice.id)}
                  className="gap-2"
                >
                  <Trash className="w-4 h-4" weight="fill" />
                  Delete
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default App;
