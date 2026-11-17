import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import MapView, { Marker, type Region } from 'react-native-maps';

import { BrandSplash } from './src/components/BrandSplash';
import { FilterChip } from './src/components/FilterChip';
import { SpotCard } from './src/components/SpotCard';
import { SpotMarker } from './src/components/SpotMarker';
import {
  loadLocationState,
  refreshLocation,
  requestLocation,
} from './src/services/location';
import { filterAndSortSpots } from './src/services/spotQuality';
import { searchSpots } from './src/services/spotSearch';
import type {
  Coordinate,
  Spot,
  SpotCategory,
  SpotQualityFilter,
  SpotSort,
} from './src/types';

const PLACE_FILTERS: Array<{ category: SpotCategory; label: string }> = [
  { category: 'viewpoint', label: 'Viewpoints' },
  { category: 'beach', label: 'Water' },
  { category: 'nature', label: 'Nature' },
  { category: 'park', label: 'Parks' },
  { category: 'camp', label: 'Camping' },
];
const DEFAULT_FILTERS: SpotCategory[] = ['viewpoint', 'beach', 'nature'];
const QUALITY_FILTERS: Array<{
  value: SpotQualityFilter;
  label: string;
}> = [
  { value: 'all', label: 'All' },
  { value: 'good', label: 'Good+' },
  { value: 'top', label: 'Top only' },
];
const SORT_OPTIONS: Array<{ value: SpotSort; label: string }> = [
  { value: 'quality', label: 'Best first' },
  { value: 'distance', label: 'Nearest' },
];

const FALLBACK_REGION: Region = {
  latitude: 30,
  longitude: 0,
  latitudeDelta: 75,
  longitudeDelta: 75,
};

void SplashScreen.preventAutoHideAsync().catch(() => {});

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
  const [showsBrandSplash, setShowsBrandSplash] = useState(true);
  const [selectedCategories, setSelectedCategories] =
    useState<SpotCategory[]>(DEFAULT_FILTERS);
  const [qualityFilter, setQualityFilter] =
    useState<SpotQualityFilter>('all');
  const [spotSort, setSpotSort] = useState<SpotSort>('quality');
  const visibleSpots = useMemo(
    () => filterAndSortSpots(spots, qualityFilter, spotSort, region),
    [qualityFilter, region, spotSort, spots],
  );
  const resultMessage =
    spots.length === 0
      ? undefined
      : visibleSpots.length === 0
        ? 'No places match this quality filter.'
        : `${visibleSpots.length} of ${spots.length} places shown`;

  const finishBrandSplash = useCallback(() => {
    setShowsBrandSplash(false);
  }, []);

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

  function toggleCategory(category: SpotCategory) {
    const isSelected = selectedCategories.includes(category);
    if (isSelected && selectedCategories.length === 1) return;

    setSelectedCategories(
      isSelected
        ? selectedCategories.filter((value) => value !== category)
        : [...selectedCategories, category],
    );
    setSpots([]);
    setSelectedSpot(undefined);
    setMessage('Search again to apply the filters.');
  }

  async function handleSearch() {
    setIsSearching(true);
    setSelectedSpot(undefined);
    setMessage(undefined);

    try {
      const results = await searchSpots(region, selectedCategories);
      setSpots(results);
      setMessage(
        results.length === 0
          ? 'No outdoor places found here. Move the map and try again.'
          : undefined,
      );
    } catch {
      setMessage('Places could not be loaded. Check your connection and try again.');
    } finally {
      setIsSearching(false);
    }
  }

  if (showsBrandSplash) {
    return (
      <BrandSplash
        onReady={() => void SplashScreen.hideAsync()}
        onFinish={finishBrandSplash}
      />
    );
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
        {visibleSpots.map((spot, index) => (
          <Marker
            anchor={{ x: 0.5, y: 1 }}
            key={spot.id}
            coordinate={spot.coordinate}
            zIndex={visibleSpots.length - index}
            stopPropagation
            tappable
            onPress={() => setSelectedSpot(spot)}
            onSelect={() => setSelectedSpot(spot)}
          >
            <SpotMarker
              category={spot.category}
              selected={selectedSpot?.id === spot.id}
            />
          </Marker>
        ))}
      </MapView>

      <SafeAreaView pointerEvents="box-none" style={styles.topOverlay}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>GOLDIEHOUR</Text>
            <Text style={styles.title}>Sunrise & sunset planner</Text>
          </View>
          <View style={styles.datePill}>
            <Text style={styles.dateText}>Today</Text>
          </View>
        </View>
      </SafeAreaView>

      {!selectedSpot && (
        <SafeAreaView pointerEvents="box-none" style={styles.bottomOverlay}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterContent}
            style={styles.filters}
          >
            {PLACE_FILTERS.map((filter) => {
              const selected = selectedCategories.includes(filter.category);
              return (
                <FilterChip
                  key={filter.category}
                  label={filter.label}
                  selected={selected}
                  onPress={() => toggleCategory(filter.category)}
                />
              );
            })}
          </ScrollView>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterContent}
            style={styles.filters}
          >
            <Text style={styles.filterGroupLabel}>QUALITY</Text>
            {QUALITY_FILTERS.map((filter) => (
              <FilterChip
                key={filter.value}
                label={filter.label}
                selected={qualityFilter === filter.value}
                onPress={() => {
                  setQualityFilter(filter.value);
                  setSelectedSpot(undefined);
                }}
              />
            ))}
            <View style={styles.filterDivider} />
            <Text style={styles.filterGroupLabel}>SORT</Text>
            {SORT_OPTIONS.map((option) => (
              <FilterChip
                key={option.value}
                label={option.label}
                selected={spotSort === option.value}
                onPress={() => {
                  setSpotSort(option.value);
                  setSelectedSpot(undefined);
                }}
              />
            ))}
          </ScrollView>
          {(message ?? resultMessage) && (
            <Text style={styles.message}>{message ?? resultMessage}</Text>
          )}
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
  filters: {
    marginHorizontal: -16,
    marginBottom: 10,
  },
  filterContent: {
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 16,
    paddingTop: 5,
  },
  filterGroupLabel: {
    color: '#8B8378',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginRight: 2,
  },
  filterDivider: {
    width: 1,
    height: 22,
    backgroundColor: '#D8D0C5',
    marginHorizontal: 3,
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
