import { useEffect, useRef } from 'react';
import {
  Animated,
  Image,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';

type Props = {
  onReady: (event: LayoutChangeEvent) => void;
  onFinish: () => void;
};

export function BrandSplash({ onReady, onFinish }: Props) {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.sequence([
      Animated.delay(1_300),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
    ]);

    animation.start(({ finished }) => {
      if (finished) onFinish();
    });

    return () => animation.stop();
  }, [onFinish, opacity]);

  return (
    <Animated.View
      onLayout={onReady}
      style={[styles.container, { opacity }]}
    >
      <View style={styles.logoWrap}>
        <Image
          resizeMode="contain"
          source={require('../../assets/goldieapps.png')}
          style={styles.logo}
        />
      </View>
      <Text style={styles.presents}>Goldie presents</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F0EB',
  },
  logoWrap: {
    width: 200,
    height: 200,
  },
  logo: {
    width: 200,
    height: 200,
  },
  presents: {
    color: '#8B6914',
    fontFamily: 'Georgia',
    fontSize: 30,
    fontStyle: 'italic',
    letterSpacing: 1,
    marginTop: -5,
  },
});
