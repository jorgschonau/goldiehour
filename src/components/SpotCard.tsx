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
  const profile = spotProfile(spot);
  const strengths = [
    ...profile.strengths,
    ...(spot.elevationMeters !== undefined
      ? [`${Math.round(spot.elevationMeters)} m elevation`]
      : []),
    ...accessStrength(spot.access),
  ];

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

      <View style={styles.qualityBox}>
        <Text style={styles.qualityEyebrow}>WHY THIS SPOT WORKS</Text>
        <Text style={styles.qualityReason}>{profile.reason}</Text>
        <View style={styles.strengths}>
          {strengths.map((strength) => (
            <View key={strength} style={styles.strengthChip}>
              <Text style={styles.strengthText}>{strength}</Text>
            </View>
          ))}
        </View>
      </View>

      {schedule.status === 'normal' ? (
        <>
          <View style={styles.lightIntro}>
            <Text style={styles.lightEyebrow}>BEST LIGHT TODAY</Text>
            <Text style={styles.lightExplanation}>
              Warm, low-angle light around sunrise and sunset.
            </Text>
          </View>
          <View style={styles.goldenRow}>
            <GoldenTime
              label="Morning golden hour"
              value={formatInterval(
                schedule.morningGoldenHour,
                spot.timeZone,
              )}
            />
            <GoldenTime
              label="Evening golden hour"
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
      <Text style={styles.goldenLabel} numberOfLines={1} adjustsFontSizeToFit>
        {label}
      </Text>
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

function spotProfile(spot: Spot) {
  switch (spot.category) {
    case 'viewpoint':
      return {
        reason:
          'Mapped specifically as a viewpoint, so it is intended to offer clear outward sightlines when the sun is low.',
        strengths: ['Purpose-built view', 'Wide sightlines'],
      };
    case 'beach':
      return {
        reason:
          'The water edge usually gives a lower, more open horizon and can add reflected color around sunrise or sunset.',
        strengths: ['Low horizon', 'Water reflections'],
      };
    case 'park':
      return {
        reason:
          'Open space gives you room to reposition as the light changes and find a clean foreground.',
        strengths: ['Open space', 'Room to reposition'],
      };
    case 'nature':
      return {
        reason:
          'Natural surroundings can provide stronger foregrounds and less visual clutter than a built-up location.',
        strengths: ['Natural foregrounds', 'Lower urban clutter'],
      };
    case 'camp':
      return {
        reason:
          'A nearby base makes very early sunrise and late blue-hour sessions easier to plan.',
        strengths: ['Early starts', 'Late finishes'],
      };
  }
}

function accessStrength(access: string | undefined): string[] {
  if (access === 'yes' || access === 'public') return ['Public access'];
  if (access === 'permissive') return ['Permissive access'];
  return [];
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
  qualityBox: {
    borderRadius: 16,
    backgroundColor: '#F0EEE7',
    padding: 13,
    marginTop: 14,
  },
  qualityEyebrow: {
    color: '#8B5B3D',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  qualityReason: {
    color: '#3D3933',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 5,
  },
  strengths: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 9,
  },
  strengthChip: {
    borderRadius: 12,
    backgroundColor: '#FFFCF7',
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  strengthText: {
    color: '#655D53',
    fontSize: 11,
    fontWeight: '700',
  },
  lightIntro: {
    marginTop: 15,
  },
  lightEyebrow: {
    color: '#8B5B3D',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  lightExplanation: {
    color: '#655D53',
    fontSize: 12,
    marginTop: 4,
  },
  goldenRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 9,
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
