import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Modal,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface DashboardScreenProps {
  onNavigate: (screen: string) => void;
  onOpenGateway: (ip: string) => void;
  isTechMode: boolean;
  setIsTechMode: (val: boolean) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ 
  onNavigate, 
  onOpenGateway,
  isTechMode,
  setIsTechMode,
  theme,
  toggleTheme
}) => {
  const isDark = theme === 'dark';
  const colors = {
    bg: isDark ? '#090A12' : '#F8FAFC',
    card: isDark ? '#111322' : '#FFFFFF',
    text: isDark ? '#FFFFFF' : '#0F172A',
    subtext: isDark ? '#64748B' : '#475569',
    inputBg: isDark ? '#090A12' : '#F1F5F9',
    inputBorder: isDark ? '#1E293B' : '#E2E8F0',
    inputText: isDark ? '#F8FAFC' : '#0F172A',
    headerBorder: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.06)',
    cardBorder: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(15, 23, 42, 0.05)',
    buttonBg: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(15, 23, 42, 0.04)',
    activeBlue: '#06B6D4',
  };

  const [ipInput, setIpInput] = useState('192.168.1.1');
  const [isFocused, setIsFocused] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean | 'checking'>('checking');
  const [hasManuallyEdited, setHasManuallyEdited] = useState(false);
  const [discoveredAutomatically, setDiscoveredAutomatically] = useState(false);
  const [showModeModal, setShowModeModal] = useState(false);
  const [modeModalType, setModeModalType] = useState<'tech' | 'regular'>('regular');

  const wifiScale = useRef(new Animated.Value(1)).current;
  const orbitRotation = useRef(new Animated.Value(0)).current;

  // Efek animasi rotasi orbit radar yang super mulus
  useEffect(() => {
    Animated.loop(
      Animated.timing(orbitRotation, {
        toValue: 1,
        duration: 8000,
        useNativeDriver: true,
      })
    ).start();
  }, [orbitRotation]);

  // Efek animasi bernapas (breathing scale) untuk ikon WiFi di pusat
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(wifiScale, {
          toValue: 1.08,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(wifiScale, {
          toValue: 0.94,
          duration: 1500,
          useNativeDriver: true,
        })
      ])
    ).start();
  }, [wifiScale]);

  // Interpolasi derajat putaran orbit
  const spinClockwise = orbitRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  const spinCounterClockwise = orbitRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['360deg', '0deg']
  });

  // Memuat IP Gateway tersimpan dari AsyncStorage saat mount
  useEffect(() => {
    const loadSavedIp = async () => {
      try {
        const savedIp = await AsyncStorage.getItem('SAVED_GATEWAY_IP');
        if (savedIp) {
          setIpInput(savedIp);
          setHasManuallyEdited(true);
        }
      } catch (e) {
        console.warn('Gagal memuat IP tersimpan:', e);
      }
    };
    loadSavedIp();
  }, []);

  // States untuk Secret Technician Mode (Ketuk Logo 5x)
  const [lastTap, setLastTap] = useState(0);
  const [tapCount, setTapCount] = useState(0);

  const handleLogoPress = () => {
    const now = Date.now();
    // Jika jeda ketukan kurang dari 800 milidetik, tambahkan hitungan
    if (now - lastTap < 800) {
      const newCount = tapCount + 1;
      setTapCount(newCount);
      if (newCount >= 5) {
        const nextMode = !isTechMode;
        setIsTechMode(nextMode);
        setModeModalType(nextMode ? 'tech' : 'regular');
        setShowModeModal(true);
        setTapCount(0);
      }
    } else {
      setTapCount(1);
    }
    setLastTap(now);
  };

  // Deteksi status koneksi gateway secara dinamis dengan Auto-Discovery
  const checkConnection = async (ipToTest: string, shouldAutoDiscover = false) => {
    try {
      const cleanIp = ipToTest.trim();
      const targetUrl = /^https?:\/\//i.test(cleanIp) ? cleanIp : `http://${cleanIp}`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1800); // timeout cepat 1.8 detik
      
      // Lakukan request GET ringan ke IP modem
      await fetch(targetUrl, {
        method: 'GET',
        signal: controller.signal,
        headers: { 'Cache-Control': 'no-cache' }
      });
      
      clearTimeout(timeoutId);
      setIsOnline(true);
      try {
        await AsyncStorage.setItem('SAVED_GATEWAY_IP', cleanIp);
      } catch (e) {}
      return true; // online
    } catch (error) {
      // Jika fetch gagal dan kita ingin mencoba auto-discover (hanya jika user belum edit manual)
      if (shouldAutoDiscover && !hasManuallyEdited) {
        setIsOnline('checking');
        
        // Saring daftar IP alternatif selain yang baru saja dicoba
        const alternatives = ['192.168.1.1', '192.168.0.1'].filter(
          ip => ip !== ipToTest.trim()
        );
        
        for (const altIp of alternatives) {
          try {
            const altUrl = `http://${altIp}`;
            const altController = new AbortController();
            const altTimeoutId = setTimeout(() => altController.abort(), 1200); // timeout sangat cepat 1.2 detik
            
            await fetch(altUrl, {
              method: 'GET',
              signal: altController.signal,
              headers: { 'Cache-Control': 'no-cache' }
            });
            
            clearTimeout(altTimeoutId);
            
            // Jika berhasil menemukan IP alternatif yang merespons:
            setIpInput(altIp); // Ubah input secara otomatis!
            setIsOnline(true);  // Set online!
            setDiscoveredAutomatically(true);
            try {
              await AsyncStorage.setItem('SAVED_GATEWAY_IP', altIp);
            } catch (e) {}
            return true;
          } catch (e) {
            // Lanjut mencoba IP alternatif berikutnya
          }
        }
      }
      
      // Jika semua alternatif gagal
      setIsOnline(false);
      return false; // offline
    }
  };

  useEffect(() => {
    // Jalankan auto-discovery pertama kali saat aplikasi dibuka
    checkConnection(ipInput, !hasManuallyEdited);

    const interval = setInterval(() => {
      // Untuk periodik, cek koneksi IP aktif saja tanpa auto-discovery agar tidak mengganggu ketikan pengguna
      checkConnection(ipInput, false);
    }, 6000);

    return () => clearInterval(interval);
  }, [ipInput, hasManuallyEdited]);

  const handleOpenGateway = () => {
    const cleanIp = ipInput.trim();
    if (cleanIp) {
      onOpenGateway(cleanIp);
    }
  };

  const handleManualChange = (val: string) => {
    setIpInput(val);
    setHasManuallyEdited(true);
    setDiscoveredAutomatically(false);
  };

  const handleSuggestionPress = (val: string) => {
    setIpInput(val);
    setHasManuallyEdited(true);
    setDiscoveredAutomatically(false);
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        {/* HEADER SECTION */}
        <View style={[styles.header, { borderColor: colors.headerBorder }]}>
          <TouchableOpacity activeOpacity={0.8} onPress={handleLogoPress}>
            <Text style={[styles.brandTitle, { color: colors.text }]}>
              WiFiKu {isTechMode && <Feather name="tool" size={16} color="#06B6D4" />}
            </Text>
            <Text style={[styles.brandSubtitle, { color: colors.subtext }]}>Manajer Modem ZTE F663V3A</Text>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity 
              style={[styles.themeButton, { backgroundColor: colors.buttonBg, borderColor: colors.inputBorder }]} 
              onPress={toggleTheme}
              activeOpacity={0.7}
            >
              <Feather name={theme === 'dark' ? 'sun' : 'moon'} size={15} color={colors.text} />
            </TouchableOpacity>

            <View style={[
              styles.statusBadge,
              isOnline === true && styles.statusBadgeOnline,
              isOnline === false && styles.statusBadgeOffline,
              isOnline === 'checking' && styles.statusBadgeChecking,
            ]}>
              <View style={[
                styles.statusDot,
                isOnline === true && styles.statusDotOnline,
                isOnline === false && styles.statusDotOffline,
                isOnline === 'checking' && styles.statusDotChecking,
              ]} />
              <Text style={[
                styles.statusText,
                isOnline === true && styles.statusTextOnline,
                isOnline === false && styles.statusTextOffline,
                isOnline === 'checking' && styles.statusTextChecking,
              ]}>
                {isOnline === true ? 'ONLINE' : isOnline === false ? 'OFFLINE' : 'MENGECEK...'}
              </Text>
            </View>
          </View>
        </View>

        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ flex: 1 }}>
            {/* QUICK GATEWAY PORTAL CARD */}
          <View style={[styles.gatewayCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={{ alignItems: 'center', marginBottom: 22, marginTop: 10 }}>
              {/* Outer Orbit Container */}
              <View style={{ width: 120, height: 120, justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
                
                {/* Ring 1: Outer Orbit (Dashed, Rotating Clockwise) */}
                <Animated.View style={{
                  position: 'absolute',
                  width: 110,
                  height: 110,
                  borderRadius: 55,
                  borderWidth: 1.5,
                  borderColor: 'rgba(6, 182, 212, 0.4)',
                  borderStyle: 'dashed',
                  transform: [{ rotate: spinClockwise }]
                }} />

                {/* Ring 2: Inner Orbit (Dashed, Rotating Counter-Clockwise) */}
                <Animated.View style={{
                  position: 'absolute',
                  width: 85,
                  height: 85,
                  borderRadius: 42.5,
                  borderWidth: 1,
                  borderColor: 'rgba(6, 182, 212, 0.25)',
                  borderStyle: 'dashed',
                  transform: [{ rotate: spinCounterClockwise }]
                }} />

                {/* Center WiFi Icon (with gentle breathing scale animation!) */}
                <Animated.View style={{
                  transform: [{ scale: wifiScale }],
                  justifyContent: 'center',
                  alignItems: 'center'
                }}>
                  <Image 
                    source={require('../../assets/image.png')} 
                    style={{ width: 54, height: 54 }} 
                    resizeMode="contain" 
                  />
                </Animated.View>
                
              </View>
              <Text style={[styles.cardTitle, { color: colors.text, textAlign: 'center', fontSize: 19, fontWeight: '800', letterSpacing: 0.5 }]}>Portal Admin ZTE F663V3A</Text>
              
            </View>

            <View style={[styles.inputContainer, { backgroundColor: colors.inputBg, borderColor: isFocused ? colors.activeBlue : colors.inputBorder }]}>
              <Text style={styles.inputPrefix}>http://</Text>
              <TextInput
                style={[styles.textInput, { color: colors.inputText }]}
                value={ipInput}
                onChangeText={handleManualChange}
                placeholder="192.168.1.1"
                placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'numeric'}
                autoCapitalize="none"
                autoCorrect={false}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
              />
            </View>

            <TouchableOpacity 
              style={[
                styles.connectButton,
                isOnline === false && styles.connectButtonDisabled,
                isOnline === 'checking' && styles.connectButtonChecking,
                isOnline === true && { backgroundColor: colors.activeBlue }
              ]}
              onPress={handleOpenGateway}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.connectButtonText,
                isOnline === false && styles.connectButtonTextDisabled,
                isOnline === 'checking' && styles.connectButtonTextChecking,
                isOnline === true && { color: '#FFFFFF' }
              ]}>
                {isOnline === true ? 'Buka Portal Modem' : isOnline === false ? 'Buka Portal (Offline?)' : 'Buka Portal (Mengecek...)'}
              </Text>
            </TouchableOpacity>

            {discoveredAutomatically && isOnline === true && (
              <Text style={styles.discoveredText}>
                IP Modem terdeteksi otomatis pada {ipInput}!
              </Text>
            )}

            {isOnline === false && (
              <Text style={styles.offlineWarningText}>
                Ponsel Anda offline atau tidak terhubung ke WiFi modem. Silakan aktifkan WiFi dan sambungkan ke jaringan router {ipInput} untuk melanjutkan.
              </Text>
            )}

            <View style={styles.ipSuggestions}>
              <TouchableOpacity 
                onPress={() => handleSuggestionPress('192.168.1.1')} 
                style={[styles.suggestionBadge, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, borderWidth: 1 }]}
              >
                <Text style={[styles.suggestionText, { color: colors.subtext }]}>192.168.1.1</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => handleSuggestionPress('192.168.0.1')} 
                style={[styles.suggestionBadge, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, borderWidth: 1 }]}
              >
                <Text style={[styles.suggestionText, { color: colors.subtext }]}>192.168.0.1</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* MENU GRID - HANYA DITAMPILKAN UNTUK MODE TEKNISI (SECRET ACCESS) */}
          {isTechMode && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Peralatan Bantu Teknisi</Text>

              {/* ROW 1: SETTINGS (full-width) */}
              <TouchableOpacity
                style={[styles.settingsCard, { backgroundColor: colors.card, borderColor: colors.cardBorder, marginBottom: 14 }]}
                onPress={() => onNavigate('settings')}
                activeOpacity={0.85}
              >
                <View style={[styles.itemIconContainer, { backgroundColor: 'rgba(245, 158, 11, 0.1)', width: 40, height: 40, marginBottom: 0, marginRight: 14 }]}>
                  <Feather name="settings" size={20} color="#F59E0B" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemTitle, { color: colors.text, marginBottom: 2 }]}>Pengaturan Kredensial</Text>
                  <Text style={[styles.itemDesc, { color: colors.subtext }]}>Simpan username & password login admin modem ZTE F663V3A.</Text>
                </View>
                <Feather name="chevron-right" size={18} color={colors.subtext} />
              </TouchableOpacity>

              <View style={styles.gridContainer}>
                {/* CARD 1: PASSWORD CREDENTIALS */}
                <TouchableOpacity 
                  style={[styles.gridItem, { backgroundColor: colors.card, borderColor: colors.cardBorder }]} 
                  onPress={() => onNavigate('credentials')}
                  activeOpacity={0.85}
                >
                  <View style={[styles.itemIconContainer, { backgroundColor: 'rgba(6, 182, 212, 0.1)' }]}>
                    <Feather name="key" size={22} color="#06B6D4" />
                  </View>
                  <Text style={[styles.itemTitle, { color: colors.text }]}>Sandi Bawaan</Text>
                  <Text style={[styles.itemDesc, { color: colors.subtext }]}>Database username & password admin bawaan pabrik modem.</Text>
                </TouchableOpacity>

                {/* CARD 2: PING TESTER */}
                <TouchableOpacity 
                  style={[styles.gridItem, { backgroundColor: colors.card, borderColor: colors.cardBorder }]} 
                  onPress={() => onNavigate('ping')}
                  activeOpacity={0.85}
                >
                  <View style={[styles.itemIconContainer, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                    <Feather name="zap" size={22} color="#3B82F6" />
                  </View>
                  <Text style={[styles.itemTitle, { color: colors.text }]}>Tes Ping Jaringan</Text>
                  <Text style={[styles.itemDesc, { color: colors.subtext }]}>Uji kestabilan dan latensi respon koneksi modem secara real-time.</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* DIAGNOSA JARINGAN - SELALU DITAMPILKAN UNTUK PELANGGAN MAUPUN TEKNISI */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Pusat Bantuan & Panduan</Text>

          {/* FULL WIDTH CARD: NETWORK GUIDE */}
          <TouchableOpacity 
            style={[styles.guideCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]} 
            onPress={() => onNavigate('guide')}
            activeOpacity={0.85}
          >
            <View style={styles.guideLeft}>
              <View style={styles.guideIconBg}>
                <Feather name="book-open" size={20} color="#06B6D4" />
              </View>
              <View style={styles.guideTextContainer}>
                <Text style={[styles.guideTitle, { color: colors.text }]}>Panduan Diagnosa Jaringan</Text>
                <Text style={[styles.guideDesc, { color: colors.subtext }]}>Solusi cepat jika modem los merah atau koneksi internet lambat.</Text>
              </View>
            </View>
            <Feather name="chevron-right" size={18} color={colors.subtext} />
          </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerParentText, { color: colors.subtext }]}>
              Dikembangkan oleh <Text style={[styles.footerWhiteText, { color: colors.text }]}>MARZUQ NETWORK</Text>
            </Text>
            <Text style={styles.footerSubText}>
              Bagian dari <Text style={styles.footerNusantaraText}>Nusantara Group</Text> • Didukung Oleh <Text style={styles.footerDexaText}>DEXA</Text><Text style={styles.footerNetText}>NET</Text>
            </Text>
          </View>
        </ScrollView>
      {/* Custom themed Modal Beralih Mode Teknisi & Pelanggan */}
      <Modal
        visible={showModeModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowModeModal(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(9, 10, 18, 0.85)',
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 24,
        }}>
          <View style={{
            width: '100%',
            backgroundColor: colors.card,
            borderColor: colors.cardBorder,
            borderWidth: 1,
            borderRadius: 18,
            padding: 24,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.35,
            shadowRadius: 16,
            elevation: 10,
          }}>
            {/* Glowing Icon Container based on Mode */}
            <View style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: modeModalType === 'tech' ? 'rgba(6, 182, 212, 0.1)' : 'rgba(16, 185, 129, 0.1)',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 16,
              borderWidth: 1.5,
              borderColor: modeModalType === 'tech' ? 'rgba(6, 182, 212, 0.25)' : 'rgba(16, 185, 129, 0.25)',
            }}>
              <Feather 
                name={modeModalType === 'tech' ? 'tool' : 'user'} 
                size={30} 
                color={modeModalType === 'tech' ? '#06B6D4' : '#10B981'} 
              />
            </View>

            {/* Modal Title */}
            <Text style={{
              fontSize: 18,
              fontWeight: '900',
              color: colors.text,
              textAlign: 'center',
              letterSpacing: -0.2,
            }}>
              {modeModalType === 'tech' ? 'Mode Teknisi Aktif' : 'Mode Pelanggan Aktif'}
            </Text>

            {/* Modal Subtitle */}
            <Text style={{
              fontSize: 11,
              fontWeight: '700',
              color: modeModalType === 'tech' ? '#06B6D4' : '#10B981',
              textAlign: 'center',
              marginTop: 2,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}>
              {modeModalType === 'tech' ? 'Akses Penuh Fitur Jaringan' : 'Navigasi Sederhana & Aman'}
            </Text>

            {/* Modal Message */}
            <Text style={{
              fontSize: 12,
              color: colors.subtext,
              textAlign: 'center',
              lineHeight: 18,
              marginTop: 14,
              marginBottom: 24,
              fontWeight: '600',
              paddingHorizontal: 6,
            }}>
              {modeModalType === 'tech' 
                ? 'Fitur tingkat lanjut seperti status diagnostik daya optik, daftar perangkat terhubung penuh, dan monitoring IP Gateway sekarang dapat Anda kelola secara langsung.'
                : 'Aplikasi telah kembali ke mode tampilan standar untuk pelanggan. Seluruh fitur konfigurasi dasar tetap dapat diakses dengan mudah dan aman.'
              }
            </Text>

            {/* Continue Button */}
            <TouchableOpacity
              style={{
                width: '100%',
                height: 46,
                borderRadius: 10,
                backgroundColor: '#06B6D4',
                shadowColor: '#06B6D4',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 6,
                elevation: 4,
                justifyContent: 'center',
                alignItems: 'center',
              }}
              onPress={() => setShowModeModal(false)}
              activeOpacity={0.8}
            >
              <Text style={{ fontSize: 13, fontWeight: '900', color: '#FFF' }}>
                {modeModalType === 'tech' ? 'Mengerti & Lanjutkan' : 'Kembali ke Dashboard'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090A12',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '600',
  },
  themeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(71, 85, 105, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(71, 85, 105, 0.25)',
  },
  statusBadgeOnline: {
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
    borderColor: 'rgba(6, 182, 212, 0.25)',
  },
  statusBadgeOffline: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  statusBadgeChecking: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#64748B',
    marginRight: 6,
  },
  statusDotOnline: {
    backgroundColor: '#06B6D4',
  },
  statusDotOffline: {
    backgroundColor: '#EF4444',
  },
  statusDotChecking: {
    backgroundColor: '#F59E0B',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  statusTextOnline: {
    color: '#06B6D4',
  },
  statusTextOffline: {
    color: '#EF4444',
  },
  statusTextChecking: {
    color: '#F59E0B',
  },
  scrollContent: {
    paddingTop: 24,
    paddingBottom: 24,
    flexGrow: 1,
  },
  gatewayCard: {
    backgroundColor: '#111322',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    padding: 20,
    marginBottom: 28,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  cardEmoji: {
    fontSize: 30,
    marginRight: 14,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF',
  },
  cardDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#090A12',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#1E293B',
    paddingHorizontal: 14,
    height: 52,
    marginBottom: 16,
  },
  inputFocused: {
    borderColor: '#06B6D4',
  },
  inputPrefix: {
    fontSize: 15,
    color: '#64748B',
    fontWeight: '600',
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: '#FFF',
    fontWeight: '700',
    padding: 0,
  },
  connectButton: {
    backgroundColor: '#06B6D4',
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#06B6D4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  connectButtonDisabled: {
    backgroundColor: '#1E293B',
    borderColor: '#EF4444',
    borderWidth: 1.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  connectButtonChecking: {
    backgroundColor: '#1E293B',
    borderColor: '#F59E0B',
    borderWidth: 1.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  connectButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#090A12',
  },
  connectButtonTextDisabled: {
    color: '#EF4444',
  },
  connectButtonTextChecking: {
    color: '#F59E0B',
  },
  offlineWarningText: {
    fontSize: 11,
    color: '#EF4444',
    lineHeight: 16,
    fontWeight: '600',
    marginTop: 10,
    textAlign: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.15)',
  },
  discoveredText: {
    fontSize: 11,
    color: '#06B6D4',
    lineHeight: 16,
    fontWeight: '700',
    marginTop: 10,
    textAlign: 'center',
    backgroundColor: 'rgba(6, 182, 212, 0.06)',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.15)',
  },
  ipSuggestions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
  },
  suggestionBadge: {
    flex: 1,
    backgroundColor: '#1E293B',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 16,
    letterSpacing: 0.2,
  },
  settingsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111322',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    padding: 16,
    marginBottom: 20,
  },
  gridContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  gridItem: {
    width: (width - 52) / 2,
    backgroundColor: '#111322',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    padding: 16,
  },
  itemIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  itemIcon: {
    fontSize: 20,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 6,
  },
  itemDesc: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
  },
  guideCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#111322',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    padding: 16,
    marginBottom: 30,
  },
  guideLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  guideIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  guideIcon: {
    fontSize: 20,
  },
  guideTextContainer: {
    flex: 1,
  },
  guideTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFF',
  },
  guideDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
    lineHeight: 15,
  },
  guideArrow: {
    fontSize: 14,
    marginLeft: 8,
    color: '#64748B',
  },
  footer: {
    alignItems: 'center',
    marginTop: 26,
    marginBottom: 10,
  },
  footerParentText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  footerWhiteText: {
    color: '#FFF',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  footerSubText: {
    fontSize: 10,
    color: '#475569',
    fontWeight: '600',
    marginTop: 4,
  },
  footerNusantaraText: {
    color: '#94A3B8',
    fontWeight: '800',
    fontSize: 11.5,
  },
  footerDexaText: {
    color: '#3B82F6',
    fontWeight: '800',
    fontSize: 11.5,
  },
  footerNetText: {
    color: '#F97316',
    fontWeight: '800',
    fontSize: 11.5,
  },
});
