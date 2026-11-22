import { StyleSheet, View } from 'react-native';

/** Rule-of-thirds guide lines over the preview. */
export function GridOverlay() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[styles.v, { left: '33.33%' }]} />
      <View style={[styles.v, { left: '66.66%' }]} />
      <View style={[styles.h, { top: '33.33%' }]} />
      <View style={[styles.h, { top: '66.66%' }]} />
    </View>
  );
}

const line = 'rgba(255,255,255,0.45)';
const styles = StyleSheet.create({
  v: { position: 'absolute', top: 0, bottom: 0, width: StyleSheet.hairlineWidth * 2, backgroundColor: line },
  h: { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth * 2, backgroundColor: line },
});
