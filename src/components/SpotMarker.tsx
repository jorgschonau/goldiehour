import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';

import type { Spot } from '../types';

type Props = {
  category: Spot['category'];
  custom?: boolean;
  selected: boolean;
};

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

const iconByCategory: Record<Spot['category'], IconName> = {
  viewpoint: 'binoculars',
  beach: 'waves',
  park: 'tree',
  nature: 'pine-tree',
  camp: 'tent',
};

export function SpotMarker({ category, custom = false, selected }: Props) {
  return (
    <View pointerEvents="none" style={styles.container}>
      <View
        style={[
          styles.marker,
          custom && styles.customMarker,
          selected && styles.markerSelected,
        ]}
      >
        <MaterialCommunityIcons
          color="#FFF9EF"
          name={custom ? 'map-marker-radius' : iconByCategory[category]}
          size={selected ? 22 : 19}
        />
      </View>
      <View
        style={[
          styles.pointer,
          custom && styles.customPointer,
          selected && styles.pointerSelected,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 3,
  },
  marker: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF9EF',
    backgroundColor: '#B95B2D',
    shadowColor: '#211E19',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.24,
    shadowRadius: 4,
  },
  markerSelected: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#72391F',
  },
  customMarker: {
    backgroundColor: '#3F5F66',
  },
  pointer: {
    width: 0,
    height: 0,
    borderTopWidth: 8,
    borderRightWidth: 6,
    borderLeftWidth: 6,
    borderTopColor: '#B95B2D',
    borderRightColor: 'transparent',
    borderLeftColor: 'transparent',
    marginTop: -2,
  },
  pointerSelected: {
    borderTopColor: '#72391F',
  },
  customPointer: {
    borderTopColor: '#3F5F66',
  },
});
