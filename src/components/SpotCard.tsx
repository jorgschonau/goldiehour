import { useMemo } from 'react';
import {
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  formatLocalDate,
  formatTime,
  solarSchedule,
  todayInTimeZone,
} from '../services/solar';
import type { Spot } from '../types';

type Props = {
  spot: Spot;
  onClose: () => void;
};

export function SpotCard({ spot, onClose }: Props) {
  const schedule = useMemo(() => {
    const localDate = todayInTimeZone(spot.timeZone);
    return solarSchedule(localDate, spot.coordinate, spot.timeZone);
  }, [spot]);

  const region = [spot.locality, spot.region].filter(Boolean).join(', ');

  async function openDirections() {
    const { latitude, longitude } = spot.coordinate;
    const label = encodeURIComponent(spot.name);
    await Linking.openURL(
      `http://maps.apple.com/?daddr=${latitude},${longitude}&q=${label}&dirflg=d`,
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.handle} />

      <View style={styles.headingRow}>
        <View style={styles.heading}>
          <Text style={styles.name} numberOfLines={1}>
            {spot.name}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {[region, formatLocalDate(schedule.localDate, spot.timeZone)]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        </View>
        <Pressable
          accessibilityLabel="Close place details"
          hitSlop={12}
          onPress={onClose}
          style={styles.closeButton}
        >
          <Text style={styles.closeText}>×</Text>
        </Pressable>
      </View>

      {schedule.status === 'normal' ? (
        <>
          <View style={styles.goldenRow}>
            <GoldenTime
              label="Morning"
              value={formatInterval(
                schedule.morningGoldenHour,
                spot.timeZone,
              )}
            />
            <GoldenTime
              label="Evening"
              value={formatInterval(
                schedule.eveningGoldenHour,
                spot.timeZone,
              )}
            />
          </View>

          <View style={styles.events}>
            <EventRow
              label="Sunrise"
              value={formatTime(schedule.sunrise, spot.timeZone)}
            />
            <View style={styles.divider} />
            <EventRow
              label="Sunset"
              value={formatTime(schedule.sunset, spot.timeZone)}
            />
          </View>
        </>
      ) : (
        <View style={styles.statusBox}>
          <Text style={styles.statusText}>
            {statusDescription(schedule.status)}
          </Text>
        </View>
      )}

      <Pressable
        accessibilityRole="button"
        onPress={() => void openDirections()}
        style={({ pressed }) => [
          styles.directionsButton,
          pressed && styles.pressed,
        ]}
      >
        <Text style={styles.directionsText}>Directions in Apple Maps</Text>
      </Pressable>
    </View>
  );
}

function GoldenTime({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.goldenBox}>
      <Text style={styles.goldenLabel}>{label}</Text>
      <Text style={styles.goldenTime} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

function EventRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.eventRow}>
      <Text style={styles.eventLabel}>{label}</Text>
      <Text style={styles.eventTime}>{value}</Text>
    </View>
  );
}

function formatInterval(
  interval: { start: Date; end: Date } | undefined,
  timeZone: string,
) {
  if (!interval) return 'Unavailable';
  return `${formatTime(interval.start, timeZone)}–${formatTime(interval.end, timeZone)}`;
}

function statusDescription(
  status: 'noSunrise' | 'noSunset' | 'polarDay' | 'polarNight',
) {
  switch (status) {
    case 'noSunrise':
      return 'The sun does not rise on this local date.';
    case 'noSunset':
      return 'The sun does not set on this local date.';
    case 'polarDay':
      return 'Midnight sun: the sun stays above the horizon.';
    case 'polarNight':
      return 'Polar night: the sun stays below the horizon.';
  }
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    left: 12,
    borderRadius: 24,
    backgroundColor: '#FFFCF7',
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 18,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D6D0C6',
    marginBottom: 12,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  heading: {
    flex: 1,
  },
  name: {
    color: '#211E19',
    fontSize: 22,
    fontWeight: '700',
  },
  meta: {
    color: '#777066',
    fontSize: 13,
    marginTop: 4,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0EBE2',
  },
  closeText: {
    color: '#4D4841',
    fontSize: 24,
    lineHeight: 25,
  },
  goldenRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  goldenBox: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: '#F7E7D2',
    padding: 13,
  },
  goldenLabel: {
    color: '#72543C',
    fontSize: 12,
    fontWeight: '600',
  },
  goldenTime: {
    color: '#211E19',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 5,
  },
  events: {
    marginTop: 10,
  },
  eventRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  eventLabel: {
    color: '#777066',
    fontSize: 15,
  },
  eventTime: {
    color: '#211E19',
    fontSize: 15,
    fontWeight: '700',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#DDD6CC',
  },
  statusBox: {
    borderRadius: 16,
    backgroundColor: '#F7E7D2',
    padding: 15,
    marginTop: 16,
  },
  statusText: {
    color: '#211E19',
    fontSize: 15,
    fontWeight: '600',
  },
  directionsButton: {
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D66D33',
    marginTop: 12,
  },
  directionsText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.8,
  },
});
