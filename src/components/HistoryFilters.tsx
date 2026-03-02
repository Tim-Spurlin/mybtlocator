import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Funnel, CalendarBlank, DeviceMobile, X } from '@phosphor-icons/react';
import { DEVICE_TYPES } from '@/lib/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export interface HistoryFilterState {
  deviceTypes: string[];
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
}

interface HistoryFiltersProps {
  filters: HistoryFilterState;
  onFiltersChange: (filters: HistoryFilterState) => void;
  deviceTypeOptions: string[];
  isCollapsed?: boolean;
}

export function HistoryFilters({ 
  filters, 
  onFiltersChange, 
  deviceTypeOptions,
  isCollapsed = false 
}: HistoryFiltersProps) {
  const [showFilters, setShowFilters] = useState(!isCollapsed);

  const activeFilterCount = 
    filters.deviceTypes.length + 
    (filters.dateFrom ? 1 : 0) + 
    (filters.dateTo ? 1 : 0);

  const handleDeviceTypeToggle = (type: string) => {
    const newTypes = filters.deviceTypes.includes(type)
      ? filters.deviceTypes.filter(t => t !== type)
      : [...filters.deviceTypes, type];
    onFiltersChange({ ...filters, deviceTypes: newTypes });
  };

  const handleClearFilters = () => {
    onFiltersChange({
      deviceTypes: [],
      dateFrom: undefined,
      dateTo: undefined,
    });
  };

  const hasActiveFilters = activeFilterCount > 0;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Funnel className="w-5 h-5 text-primary" weight="fill" />
          <h3 className="font-heading font-semibold text-lg">Filters</h3>
          {hasActiveFilters && (
            <Badge variant="default" className="ml-2">
              {activeFilterCount}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="h-8 gap-1.5"
            >
              <X className="w-4 h-4" />
              Clear All
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="h-8"
          >
            {showFilters ? 'Hide' : 'Show'}
          </Button>
        </div>
      </div>

      {showFilters && (
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <DeviceMobile className="w-4 h-4 text-muted-foreground" weight="fill" />
              <Label className="text-sm font-medium">Device Type</Label>
            </div>
            <div className="flex flex-wrap gap-2">
              {DEVICE_TYPES.map(deviceType => {
                const isAvailable = deviceTypeOptions.includes(deviceType.value);
                const isSelected = filters.deviceTypes.includes(deviceType.value);
                
                return (
                  <Button
                    key={deviceType.value}
                    variant={isSelected ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleDeviceTypeToggle(deviceType.value)}
                    disabled={!isAvailable}
                    className={cn(
                      'gap-1.5 h-9',
                      !isAvailable && 'opacity-40 cursor-not-allowed'
                    )}
                  >
                    <span>{deviceType.emoji}</span>
                    <span>{deviceType.label}</span>
                  </Button>
                );
              })}
            </div>
            {filters.deviceTypes.length === 0 && (
              <p className="text-xs text-muted-foreground">
                All device types shown
              </p>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CalendarBlank className="w-4 h-4 text-muted-foreground" weight="fill" />
              <Label className="text-sm font-medium">Date Range</Label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="date-from" className="text-xs text-muted-foreground">
                  From
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="date-from"
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !filters.dateFrom && 'text-muted-foreground'
                      )}
                    >
                      <CalendarBlank className="mr-2 h-4 w-4" />
                      {filters.dateFrom ? (
                        format(filters.dateFrom, 'MMM dd, yyyy')
                      ) : (
                        <span>Start date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.dateFrom}
                      onSelect={(date) => 
                        onFiltersChange({ ...filters, dateFrom: date })
                      }
                      disabled={(date) => 
                        date > new Date() || (filters.dateTo ? date > filters.dateTo : false)
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date-to" className="text-xs text-muted-foreground">
                  To
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="date-to"
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !filters.dateTo && 'text-muted-foreground'
                      )}
                    >
                      <CalendarBlank className="mr-2 h-4 w-4" />
                      {filters.dateTo ? (
                        format(filters.dateTo, 'MMM dd, yyyy')
                      ) : (
                        <span>End date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.dateTo}
                      onSelect={(date) => 
                        onFiltersChange({ ...filters, dateTo: date })
                      }
                      disabled={(date) => 
                        date > new Date() || (filters.dateFrom ? date < filters.dateFrom : false)
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            
            {(filters.dateFrom || filters.dateTo) && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {filters.dateFrom && filters.dateTo ? (
                  <span>
                    Showing records from {format(filters.dateFrom, 'MMM dd, yyyy')} to{' '}
                    {format(filters.dateTo, 'MMM dd, yyyy')}
                  </span>
                ) : filters.dateFrom ? (
                  <span>Showing records from {format(filters.dateFrom, 'MMM dd, yyyy')} onwards</span>
                ) : (
                  <span>Showing records until {format(filters.dateTo!, 'MMM dd, yyyy')}</span>
                )}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium">Quick Ranges</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  onFiltersChange({ 
                    ...filters, 
                    dateFrom: today, 
                    dateTo: new Date() 
                  });
                }}
                className="h-8"
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const yesterday = new Date();
                  yesterday.setDate(yesterday.getDate() - 1);
                  yesterday.setHours(0, 0, 0, 0);
                  const yesterdayEnd = new Date(yesterday);
                  yesterdayEnd.setHours(23, 59, 59, 999);
                  onFiltersChange({ 
                    ...filters, 
                    dateFrom: yesterday, 
                    dateTo: yesterdayEnd 
                  });
                }}
                className="h-8"
              >
                Yesterday
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const last7Days = new Date();
                  last7Days.setDate(last7Days.getDate() - 7);
                  last7Days.setHours(0, 0, 0, 0);
                  onFiltersChange({ 
                    ...filters, 
                    dateFrom: last7Days, 
                    dateTo: new Date() 
                  });
                }}
                className="h-8"
              >
                Last 7 Days
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const last30Days = new Date();
                  last30Days.setDate(last30Days.getDate() - 30);
                  last30Days.setHours(0, 0, 0, 0);
                  onFiltersChange({ 
                    ...filters, 
                    dateFrom: last30Days, 
                    dateTo: new Date() 
                  });
                }}
                className="h-8"
              >
                Last 30 Days
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const thisMonth = new Date();
                  thisMonth.setDate(1);
                  thisMonth.setHours(0, 0, 0, 0);
                  onFiltersChange({ 
                    ...filters, 
                    dateFrom: thisMonth, 
                    dateTo: new Date() 
                  });
                }}
                className="h-8"
              >
                This Month
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
