import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { C } from '../theme';

export default function Skeleton({ width = '100%', height = 14, style }) {
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.9, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.35, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return <Animated.View style={[s.base, { width, height, opacity }, style]} />;
}

const s = StyleSheet.create({
  base: { backgroundColor: C.surface, borderRadius: 6 },
});
