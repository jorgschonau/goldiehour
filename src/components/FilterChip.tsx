import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useCallback, useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
} from 'react-native';

type Props = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

export function FilterChip({ label, selected, onPress }: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = useCallback(() => {
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 0.97,
        duration: 70,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    onPress();
  }, [onPress, scale]);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected }}
        onPress={handlePress}
        style={({ pressed }) => [
          styles.chip,
          selected && styles.selectedChip,
          pressed && styles.pressed,
        ]}
      >
        {selected && (
          <Animated.View style={styles.badge}>
            <MaterialCommunityIcons
              color="#FFFFFF"
              name="check"
              size={9}
            />
          </Animated.View>
        )}
        <Text style={[styles.label, selected && styles.selectedLabel]}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 34,
    borderWidth: 1,
    borderColor: '#CFC5B8',
    borderRadius: 17,
    justifyContent: 'center',
    backgroundColor: '#FFFCF7',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  selectedChip: {
    borderWidth: 1.5,
    borderColor: '#B95B2D',
    backgroundColor: '#F7E7D2',
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -4,
    width: 15,
    height: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFFCF7',
    backgroundColor: '#B95B2D',
  },
  label: {
    color: '#777066',
    fontSize: 12,
    fontWeight: '700',
  },
  selectedLabel: {
    color: '#8B4524',
  },
  pressed: {
    opacity: 0.86,
  },
});
