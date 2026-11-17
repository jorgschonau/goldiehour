import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import { StatusBar } from 'expo-status-bar';
import MapView, { Marker, type Region } from 'react-native-maps';

import { SpotCard } from './src/components/SpotCard';
import {
  loadLocationState,
  refreshLocation,
  requestLocation,
} from './src/services/location';
import { searchSpots } from './src/services/spotSearch';
import type { Coordinate, Spot } from './src/types';

const FALLBACK_REGION: Region = {
  latitude: 30,
  longitude: 0,
  latitudeDelta: 75,
  longitudeDelta: 75,
};

export default function App() {
  const mapRef = useRef<MapView>(null);
  const [region, setRegion] = useState<Region>(FALLBACK_REGION);
  const [permission, setPermission] = useState<Location.PermissionStatus>(
    Location.PermissionStatus.UNDETERMINED,
  );
  const [userCoordinate, setUserCoordinate] = useState<Coordinate>();
  const [spots, setSpots] = useState<Spot[]>([]);
  const [selectedSpot, setSelectedSpot] = useState<Spot>();
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [message, setMessage] = useState<string>();

  useEffect(() => {
    void initializeLocation();
  }, []);

  async function initializeLocation() {
    try {
      const state = await loadLocationState();
      setPermission(state.permission);

      if (state.coordinate) {
        applyUserLocation(state.coordinate, false);

        const fresh = await refreshLocation();
        if (fresh) applyUserLocation(fresh, false);
      }
    } catch {
      setMessage('Location is unavailable. You can still explore the map.');
    }
  }

  function applyUserLocation(coordinate: Coordinate, animated = true) {
    setUserCoordinate(coordinate);
    const nextRegion: Region = {
      ...coordinate,
      latitudeDelta: 0.18,
      longitudeDelta: 0.18,
    };
    setRegion(nextRegion);

    if (animated) {
      mapRef.current?.animateToRegion(nextRegion, 500);
    }
  }

  async function handleLocationPress() {
    if (permission === Location.PermissionStatus.DENIED) {
      Alert.alert(
        'Location access needed',
        'Enable location access in Settings to jump to nearby places. The map remains usable without it.',
        [
          { text: 'Not now', style: 'cancel' },
          {
            text: 'Open Settings',
            onPress: () => void Linking.openSettings(),
          },
        ],
      );
      return;
    }

    if (userCoordinate) {
      applyUserLocation(userCoordinate);
      return;
    }

    setIsLocating(true);
    setMessage(undefined);
    try {
      const state = await requestLocation();
      setPermission(state.permission);

      if (!state.servicesEnabled) {
        setMessage('Location Services are turned off.');
      } else if (state.coordinate) {
        applyUserLocation(state.coordinate);
      } else {
        setMessage('Current location is unavailable.');
      }
    } catch {
      setMessage('Current location is unavailable.');
    } finally {
      setIsLocating(false);
    }
  }

  async function handleSearch() {
    setIsSearching(true);
    setSelectedSpot(undefined);
    setMessage(undefined);

    try {
      const results = await searchSpots(region);
      setSpots(results.slice(0, 40));
      setMessage(
        results.length === 0
          ? 'No outdoor places found here. Move the map and try again.'
          : `${Math.min(results.length, 40)} places found`,
      );
    } catch {
      setMessage('Places could not be loaded. Check your connection and try again.');
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={FALLBACK_REGION}
        showsCompass
        showsMyLocationButton={false}
        showsUserLocation={
          permission === Location.PermissionStatus.GRANTED
        }
        onRegionChangeComplete={(nextRegion) => {
          setRegion(nextRegion);
          setMessage(undefined);
        }}
        onPress={() => setSelectedSpot(undefined)}
      >
        {spots.map((spot) => (
          <Marker
            key={spot.id}
            coordinate={spot.coordinate}
            pinColor="#D66D33"
            title={spot.name}
            description={[spot.locality, spot.region].filter(Boolean).join(', ')}
            onPress={() => setSelectedSpot(spot)}
          />
        ))}
      </MapView>

      <SafeAreaView pointerEvents="box-none" style={styles.topOverlay}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>GOLDIEHOUR</Text>
            <Text style={styles.title}>Find your best light</Text>
          </View>
          <View style={styles.datePill}>
            <Text style={styles.dateText}>Today</Text>
          </View>
        </View>
      </SafeAreaView>

      {!selectedSpot && (
        <SafeAreaView pointerEvents="box-none" style={styles.bottomOverlay}>
          {message && <Text style={styles.message}>{message}</Text>}
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              disabled={isLocating}
              onPress={() => void handleLocationPress()}
              style={({ pressed }) => [
                styles.locationButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.locationText}>
                {isLocating ? 'Locating…' : 'Locate'}
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              disabled={isSearching}
              onPress={() => void handleSearch()}
              style={({ pressed }) => [
                styles.searchButton,
                pressed && styles.pressed,
                isSearching && styles.disabled,
              ]}
            >
              <Text style={styles.searchText}>
                {isSearching ? 'Finding places…' : 'Search this area'}
              </Text>
            </Pressable>
          </View>
          <Text style={styles.attribution}>
            Place data © OpenStreetMap contributors
          </Text>
        </SafeAreaView>
      )}

      {selectedSpot && (
        <SpotCard
          spot={selectedSpot}
          onClose={() => setSelectedSpot(undefined)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E9E3D9',
  },
  topOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,252,247,0.94)',
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  eyebrow: {
    color: '#655D53',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.6,
  },
  title: {
    color: '#211E19',
    fontSize: 19,
    fontWeight: '700',
    marginTop: 2,
  },
  datePill: {
    borderRadius: 18,
    backgroundColor: '#F0E9DF',
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  dateText: {
    color: '#4D4841',
    fontSize: 13,
    fontWeight: '700',
  },
  bottomOverlay: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(255,252,247,0.95)',
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  message: {
    color: '#4D4841',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 9,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  locationButton: {
    minWidth: 82,
    height: 48,
    borderWidth: 1,
    borderColor: '#CFC5B8',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFCF7',
  },
  locationText: {
    color: '#4D4841',
    fontSize: 14,
    fontWeight: '700',
  },
  searchButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D66D33',
  },
  searchText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  attribution: {
    color: '#8B8378',
    fontSize: 10,
    textAlign: 'center',
    paddingVertical: 7,
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.65,
  },
});
