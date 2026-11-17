import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  LayoutAnimation,
  Linking,
  Pressable,
  SafeAreaView,
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
  const [filtersExpanded, setFiltersExpanded] = useState(false);
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
        {!selectedSpot && (
          <View style={styles.controlsWrapper}>
            <Pressable
              accessibilityLabel={
                filtersExpanded ? 'Hide filters' : 'Show filters'
              }
              accessibilityRole="button"
              accessibilityState={{ expanded: filtersExpanded }}
              onPress={() => {
                LayoutAnimation.configureNext(
                  LayoutAnimation.Presets.easeInEaseOut,
                );
                setFiltersExpanded((expanded) => !expanded);
              }}
              style={({ pressed }) => [
                styles.controlsToggle,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.controlsToggleText}>Filters</Text>
              <Text style={styles.controlsToggleChevron}>
                {filtersExpanded ? '▲' : '▼'}
              </Text>
            </Pressable>

            {filtersExpanded && (
              <View style={styles.controlsContainer}>
                <Text style={styles.panelSectionLabel}>PLACE TYPE</Text>
                <View style={styles.panelChips}>
                  {PLACE_FILTERS.map((filter) => {
                    const selected = selectedCategories.includes(
                      filter.category,
                    );
                    return (
                      <FilterChip
                        key={filter.category}
                        label={filter.label}
                        selected={selected}
                        onPress={() => toggleCategory(filter.category)}
                      />
                    );
                  })}
                </View>

                <View style={styles.panelSeparator} />
                <Text style={styles.panelSectionLabel}>QUALITY</Text>
                <View style={styles.panelChips}>
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
                </View>

                <View style={styles.panelSeparator} />
                <Text style={styles.panelSectionLabel}>SORT</Text>
                <View style={styles.panelChips}>
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
                </View>
                <Text style={styles.qualityNote}>
                  Quality uses place type and OpenStreetMap detail, not weather.
                </Text>
              </View>
            )}
          </View>
        )}
      </SafeAreaView>

      {!selectedSpot && (
        <SafeAreaView pointerEvents="box-none" style={styles.bottomOverlay}>
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
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,252,247,0.94)',
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  controlsWrapper: {
    marginTop: 7,
    marginRight: 80,
    marginLeft: 10,
  },
  controlsToggle: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: '#B95B2D',
    borderRadius: 12,
    backgroundColor: 'rgba(255,252,247,0.97)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#211E19',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  controlsToggleText: {
    color: '#8B4524',
    fontSize: 16,
    fontWeight: '600',
  },
  controlsToggleChevron: {
    width: 18,
    color: '#8B4524',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  controlsContainer: {
    borderWidth: 1.5,
    borderColor: '#D8D0C5',
    borderRadius: 12,
    backgroundColor: 'rgba(255,252,247,0.98)',
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 12,
    shadowColor: '#211E19',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  panelSectionLabel: {
    color: '#8B8378',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.9,
    marginBottom: 8,
  },
  panelChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  panelSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#DDD6CC',
    marginVertical: 12,
  },
  qualityNote: {
    color: '#777066',
    fontSize: 10,
    lineHeight: 14,
    marginTop: 10,
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
