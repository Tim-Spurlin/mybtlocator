import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, BellSlash, Lightning } from '@phosphor-icons/react';

interface NotificationSettings {
  enabled: boolean;
  advanceMinutes: number;
  onlyHighConfidence: boolean;
  minConfidence: number;
  notifiedPredictions: string[];
}

interface NotificationSettingsCardProps {
  settings: NotificationSettings;
  onUpdateSettings: (updates: Partial<NotificationSettings>) => void;
  onClearHistory: () => void;
}

export function NotificationSettingsCard({
  settings,
  onUpdateSettings,
  onClearHistory,
}: NotificationSettingsCardProps) {
  return (
    <Card className="p-6 bg-card border-2">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {settings.enabled ? (
              <Bell className="w-6 h-6 text-primary" weight="fill" />
            ) : (
              <BellSlash className="w-6 h-6 text-muted-foreground" weight="fill" />
            )}
            <div>
              <h3 className="text-lg font-heading font-semibold">Prediction Notifications</h3>
              <p className="text-xs text-muted-foreground">
                Get alerted when devices are expected to be nearby
              </p>
            </div>
          </div>
          <Switch
            checked={settings.enabled}
            onCheckedChange={(enabled) => onUpdateSettings({ enabled })}
          />
        </div>

        {settings.enabled && (
          <>
            <div className="space-y-3 pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <Label htmlFor="advance-time" className="text-sm font-medium">
                  Notification Advance Time
                </Label>
                <Badge variant="secondary" className="font-mono">
                  {settings.advanceMinutes} min
                </Badge>
              </div>
              <Slider
                id="advance-time"
                value={[settings.advanceMinutes]}
                onValueChange={(values) =>
                  onUpdateSettings({ advanceMinutes: values[0] })
                }
                min={5}
                max={60}
                step={5}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Receive notifications this many minutes before predicted detection time
              </p>
            </div>

            <div className="space-y-3 pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="high-confidence-only" className="text-sm font-medium">
                    High Confidence Only
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Only notify for predictions above {(settings.minConfidence * 100).toFixed(0)}% confidence
                  </p>
                </div>
                <Switch
                  id="high-confidence-only"
                  checked={settings.onlyHighConfidence}
                  onCheckedChange={(onlyHighConfidence) =>
                    onUpdateSettings({ onlyHighConfidence })
                  }
                />
              </div>

              {settings.onlyHighConfidence && (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="min-confidence" className="text-xs font-medium">
                      Minimum Confidence Threshold
                    </Label>
                    <Badge variant="outline" className="font-mono text-xs">
                      {(settings.minConfidence * 100).toFixed(0)}%
                    </Badge>
                  </div>
                  <Slider
                    id="min-confidence"
                    value={[settings.minConfidence * 100]}
                    onValueChange={(values) =>
                      onUpdateSettings({ minConfidence: values[0] / 100 })
                    }
                    min={50}
                    max={95}
                    step={5}
                    className="w-full"
                  />
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-border">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-medium">Notification History</p>
                  <p className="text-xs text-muted-foreground">
                    {settings.notifiedPredictions.length} notification{settings.notifiedPredictions.length !== 1 ? 's' : ''} sent
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClearHistory}
                  disabled={settings.notifiedPredictions.length === 0}
                >
                  Clear History
                </Button>
              </div>
            </div>

            <div className="pt-4 border-t border-border bg-primary/5 -mx-6 -mb-6 px-6 py-4 rounded-b-lg">
              <div className="flex items-start gap-3">
                <Lightning className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" weight="fill" />
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">How it works</p>
                  <p className="text-xs leading-relaxed">
                    BlueTrack analyzes your device detection patterns and predicts when each device is likely to be nearby. 
                    Notifications are sent automatically based on these predictions, helping you prepare for when devices 
                    are expected to enter Bluetooth range.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
