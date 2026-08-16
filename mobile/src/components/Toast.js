import React, { useEffect, useRef } from 'react';
import { Animated, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { C } from '../theme';

// toast: { message, actionLabel?, onAction? } | null
export default function Toast({ toast, onDismiss, duration = 4000 }) {
  const anim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef(null);

  useEffect(() => {
    if (toast) {
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, bounciness: 6 }).start();
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(hide, duration);
    }
    return () => clearTimeout(timerRef.current);
  }, [toast]);

  function hide() {
    clearTimeout(timerRef.current);
    Animated.timing(anim, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => onDismiss?.());
  }

  if (!toast) return null;

  return (
    <Animated.View
      style={[
        s.wrap,
        {
          opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }],
        },
      ]}
      pointerEvents="box-none"
    >
      <View style={s.bar}>
        <Text style={s.msg} numberOfLines={2}>{toast.message}</Text>
        {toast.actionLabel && (
          <TouchableOpacity
            onPress={() => { toast.onAction?.(); hide(); }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={s.action}>{toast.actionLabel}</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, bottom: 96 },
  bar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.bg2, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 16,
    borderWidth: 1, borderColor: C.border,
    elevation: 6, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
  },
  msg: { color: C.text, fontSize: 13, fontWeight: '600', flex: 1, marginRight: 12 },
  action: { color: C.primary, fontSize: 13, fontWeight: '800' },
});
