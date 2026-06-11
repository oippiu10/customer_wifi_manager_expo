import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated } from 'react-native';
import { Feather } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface SplashScreenProps {
  onFinishCheck: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinishCheck }) => {
  const [progress] = useState(new Animated.Value(0));
  const [statusText, setStatusText] = useState('Menginisialisasi modul...');

  useEffect(() => {
    // Animasi progress bar
    Animated.timing(progress, {
      toValue: 1,
      duration: 2000,
      useNativeDriver: false,
    }).start();

    // Mengubah status teks secara berkala agar terkesan melakukan analisis asli
    const statusIntervals = [
      { time: 500, text: 'Memindai gerbang jaringan...' },
      { time: 1100, text: 'Menyiapkan alat diagnostik...' },
      { time: 1700, text: 'Sistem siap!' },
    ];

    const timeouts = statusIntervals.map((item) =>
      setTimeout(() => {
        setStatusText(item.text);
      }, item.time)
    );

    // Beralih ke halaman utama setelah 2.2 detik
    const mainTimeout = setTimeout(() => {
      onFinishCheck();
    }, 2200);

    return () => {
      timeouts.forEach(clearTimeout);
      clearTimeout(mainTimeout);
    };
  }, [onFinishCheck]);

  const widthInterpolation = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <View style={styles.glowContainer}>
          <View style={styles.pulseRing} />
          <Feather name="wifi" size={54} color="#06B6D4" />
        </View>
        <Text style={styles.title}>WiFiKu</Text>
        <Text style={styles.subtitle}>Portal WiFi & Utilitas Jaringan</Text>
      </View>

      <View style={styles.loaderContainer}>
        <Text style={styles.loaderText}>{statusText}</Text>
        <View style={styles.progressBarBg}>
          <Animated.View style={[styles.progressBarFill, { width: widthInterpolation }]} />
        </View>
        <Text style={styles.version}>Versi 1.0.0 • Edisi Premium</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090A12',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 80,
  },
  logoContainer: {
    marginTop: 120,
    alignItems: 'center',
  },
  glowContainer: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(6, 182, 212, 0.25)',
    position: 'relative',
  },
  pulseRing: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.1)',
  },
  logoIcon: {
    fontSize: 54,
  },
  title: {
    fontSize: 38,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 12,
    color: '#06B6D4',
    marginTop: 8,
    textTransform: 'uppercase',
    letterSpacing: 2,
    fontWeight: '700',
  },
  loaderContainer: {
    alignItems: 'center',
    width: width * 0.8,
  },
  loaderText: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 12,
    fontWeight: '600',
  },
  progressBarBg: {
    width: '100%',
    height: 4,
    backgroundColor: '#1E293B',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#06B6D4',
    borderRadius: 2,
  },
  version: {
    fontSize: 10,
    color: '#475569',
    fontWeight: '500',
  },
});
