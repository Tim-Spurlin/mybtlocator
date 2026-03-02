import { useEffect, useRef } from 'react';
import { useKV } from '@github/spark/hooks';
import type { DeviceProfile, PredictionRecord } from '@/lib/types';
import { toast } from 'sonner';

interface NotificationSettings {
  enabled: boolean;
  advanceMinutes: number;
  onlyHighConfidence: boolean;
  minConfidence: number;
  notifiedPredictions: string[];
}

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: true,
  advanceMinutes: 15,
  onlyHighConfidence: true,
  minConfidence: 0.6,
  notifiedPredictions: [],
};

export function usePredictionNotifications(devices: DeviceProfile[]) {
  const [settings, setSettings] = useKV<NotificationSettings>(
    'prediction-notification-settings',
    DEFAULT_SETTINGS
  );
  
  const checkIntervalRef = useRef<number | null>(null);
  const lastCheckRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!settings?.enabled) {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
      return;
    }

    const checkPredictions = () => {
      const now = Date.now();
      const notificationWindow = (settings.advanceMinutes || 15) * 60 * 1000;
      const upcomingPredictions: Array<{
        device: DeviceProfile;
        prediction: PredictionRecord;
      }> = [];

      devices.forEach((device) => {
        if (!device.predictionRecords) return;

        device.predictionRecords.forEach((prediction) => {
          if (prediction.actualTimestamp !== undefined) return;

          const timeUntilPrediction = prediction.predictedTimestamp - now;
          
          if (timeUntilPrediction > 0 && timeUntilPrediction <= notificationWindow) {
            if (settings.onlyHighConfidence && prediction.confidence < settings.minConfidence) {
              return;
            }

            const alreadyNotified = settings.notifiedPredictions?.includes(prediction.id);
            if (!alreadyNotified) {
              upcomingPredictions.push({ device, prediction });
            }
          }
        });
      });

      if (upcomingPredictions.length > 0) {
        upcomingPredictions.forEach(({ device, prediction }) => {
          const minutesUntil = Math.round(
            (prediction.predictedTimestamp - now) / (60 * 1000)
          );

          toast.info(
            `${device.emoji} ${device.customName} expected nearby`,
            {
              description: `Predicted to be detected in ~${minutesUntil} minutes (${(prediction.confidence * 100).toFixed(0)}% confidence)`,
              duration: 10000,
              action: {
                label: 'View',
                onClick: () => {
                  const predictionsTab = document.querySelector('[value="predictions"]');
                  if (predictionsTab) {
                    (predictionsTab as HTMLElement).click();
                  }
                },
              },
            }
          );

          setSettings((current) => {
            const currentSettings = current || DEFAULT_SETTINGS;
            return {
              ...currentSettings,
              notifiedPredictions: [
                ...(currentSettings.notifiedPredictions || []),
                prediction.id,
              ],
            };
          });
        });
      }

      const oneHourAgo = now - (60 * 60 * 1000);
      setSettings((current) => {
        const currentSettings = current || DEFAULT_SETTINGS;
        return {
          ...currentSettings,
          notifiedPredictions: (currentSettings.notifiedPredictions || []).filter((id) => {
            const allPredictions = devices.flatMap(d => d.predictionRecords || []);
            const pred = allPredictions.find(p => p.id === id);
            return pred && pred.predictedTimestamp > oneHourAgo;
          }),
        };
      });

      lastCheckRef.current = now;
    };

    checkPredictions();

    checkIntervalRef.current = window.setInterval(checkPredictions, 60 * 1000);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
    };
  }, [devices, settings?.enabled, settings?.advanceMinutes, settings?.onlyHighConfidence, settings?.minConfidence, settings?.notifiedPredictions, setSettings]);

  const updateSettings = (updates: Partial<NotificationSettings>) => {
    setSettings((current) => {
      const currentSettings = current || DEFAULT_SETTINGS;
      return {
        ...currentSettings,
        ...updates,
      };
    });
  };

  const clearNotificationHistory = () => {
    setSettings((current) => {
      const currentSettings = current || DEFAULT_SETTINGS;
      return {
        ...currentSettings,
        notifiedPredictions: [],
      };
    });
  };

  return {
    settings: settings || DEFAULT_SETTINGS,
    updateSettings,
    clearNotificationHistory,
  };
}
