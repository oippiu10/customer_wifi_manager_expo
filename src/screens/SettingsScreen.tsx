import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';

interface SettingsScreenProps {
  onBack: () => void;
  theme: 'light' | 'dark';
}

export const STORAGE_KEY_USER = 'MODEM_USERNAME';
export const STORAGE_KEY_PASS = 'MODEM_PASSWORD';

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onBack, theme }) => {
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

  const [username, setUsername] = useState('superadmin');
  const [password, setPassword] = useState('suportadmin');
  const [showPass, setShowPass] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [savedBadge, setSavedBadge] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const savedUser = await AsyncStorage.getItem(STORAGE_KEY_USER);
        const savedPass = await AsyncStorage.getItem(STORAGE_KEY_PASS);
        if (savedUser) setUsername(savedUser);
        if (savedPass) setPassword(savedPass);
      } catch (e) {
        console.warn('Gagal memuat kredensial:', e);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const handleSave = async () => {
    if (!username.trim()) { Alert.alert('Gagal', 'Username tidak boleh kosong.'); return; }
    if (!password.trim()) { Alert.alert('Gagal', 'Password tidak boleh kosong.'); return; }
    setIsSaving(true);
    try {
      await AsyncStorage.setItem(STORAGE_KEY_USER, username.trim());
      await AsyncStorage.setItem(STORAGE_KEY_PASS, password.trim());
      setSavedBadge(true);
      setTimeout(() => setSavedBadge(false), 3000);
    } catch (e) {
      Alert.alert('Error', 'Gagal menyimpan. Coba lagi.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    Alert.alert('Reset ke Default', 'Kembalikan ke kredensial bawaan pabrik (superadmin / suportadmin)?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Ya, Reset', style: 'destructive',
        onPress: async () => {
          setUsername('superadmin'); setPassword('suportadmin');
          await AsyncStorage.setItem(STORAGE_KEY_USER, 'superadmin');
          await AsyncStorage.setItem(STORAGE_KEY_PASS, 'suportadmin');
          setSavedBadge(true); setTimeout(() => setSavedBadge(false), 3000);
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#06B6D4" />
        <Text style={{ color: colors.subtext, marginTop: 12, fontWeight: '600' }}>Memuat pengaturan...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { borderColor: colors.headerBorder }]}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
          <Feather name="arrow-left" size={18} color="#06B6D4" />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Pengaturan Kredensial</Text>
          <Text style={[styles.headerSubtitle, { color: colors.subtext }]}>Login otomatis portal admin ZTE F663V3A</Text>
        </View>
        {savedBadge && (
          <View style={styles.savedBadge}>
            <Feather name="check" size={12} color="#10B981" />
            <Text style={styles.savedBadgeText}>Tersimpan</Text>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={[styles.infoCard, { backgroundColor: isDark ? 'rgba(6,182,212,0.06)' : 'rgba(6,182,212,0.04)', borderColor: isDark ? 'rgba(6,182,212,0.15)' : 'rgba(6,182,212,0.1)' }]}>
          <Feather name="info" size={16} color="#06B6D4" style={{ marginRight: 12, marginTop: 1 }} />
          <Text style={[styles.infoText, { color: colors.subtext }]}>
            Kredensial ini digunakan untuk login otomatis ke portal admin modem ZTE F663V3A. Perubahan berlaku pada sesi berikutnya.
          </Text>
        </View>

        <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.subtext }]}>USERNAME</Text>
            <View style={[styles.fieldInputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
              <Feather name="user" size={16} color="#475569" style={{ marginRight: 10 }} />
              <TextInput
                style={[styles.fieldInput, { color: colors.inputText }]}
                value={username}
                onChangeText={setUsername}
                placeholder="Masukkan username modem"
                placeholderTextColor={isDark ? '#334155' : '#94A3B8'}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.headerBorder }]} />
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.subtext }]}>PASSWORD</Text>
            <View style={[styles.fieldInputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
              <Feather name="lock" size={16} color="#475569" style={{ marginRight: 10 }} />
              <TextInput
                style={[styles.fieldInput, { flex: 1, color: colors.inputText }]}
                value={password}
                onChangeText={setPassword}
                placeholder="Masukkan password modem"
                placeholderTextColor={isDark ? '#334155' : '#94A3B8'}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry={!showPass}
              />
              <TouchableOpacity onPress={() => setShowPass(!showPass)} activeOpacity={0.7} style={{ padding: 4 }}>
                <Feather name={showPass ? 'eye-off' : 'eye'} size={16} color="#475569" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <Text style={[styles.presetLabel, { color: colors.subtext }]}>Isi Cepat — Preset Bawaan ZTE F663V3A</Text>
        <View style={styles.presetGrid}>
          {[
            { label: 'Superadmin', user: 'superadmin', pass: 'suportadmin' },
            { label: 'Admin', user: 'admin', pass: 'admin' },
            { label: 'User', user: 'user', pass: 'user' },
          ].map((preset) => (
            <TouchableOpacity
              key={preset.label}
              style={[styles.presetChip, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
              onPress={() => { setUsername(preset.user); setPassword(preset.pass); }}
              activeOpacity={0.7}
            >
              <Text style={styles.presetChipText}>{preset.label}</Text>
              <Text style={[styles.presetChipSub, { color: colors.subtext }]}>{preset.user}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {isSaving ? (
          <View style={styles.savingRow}>
            <ActivityIndicator size="small" color="#06B6D4" style={{ marginRight: 10 }} />
            <Text style={styles.savingText}>Menyimpan ke perangkat...</Text>
          </View>
        ) : (
          <TouchableOpacity style={[styles.saveButton, { backgroundColor: colors.activeBlue, shadowColor: colors.activeBlue }]} onPress={handleSave} activeOpacity={0.8}>
            <Feather name="save" size={16} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={[styles.saveButtonText, { color: '#FFF' }]}>Simpan Kredensial</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.resetButton} onPress={handleReset} activeOpacity={0.8}>
          <Text style={styles.resetButtonText}>Reset ke Bawaan Pabrik</Text>
        </TouchableOpacity>

        <View style={styles.noteCard}>
          <Feather name="alert-triangle" size={14} color="#F59E0B" style={{ marginRight: 10, marginTop: 1 }} />
          <Text style={styles.noteText}>
            Kredensial disimpan lokal di perangkat dan tidak dikirim ke server manapun. Hanya digunakan untuk otomasi login modem lokal.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#090A12', paddingHorizontal: 20, paddingTop: 20 },
  header: { flexDirection: 'row', alignItems: 'center', paddingBottom: 16, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  backButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.04)', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  headerTextContainer: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#FFF' },
  headerSubtitle: { fontSize: 11, color: '#64748B', marginTop: 2, fontWeight: '600' },
  savedBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(16,185,129,0.12)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(16,185,129,0.25)' },
  savedBadgeText: { fontSize: 10, fontWeight: '800', color: '#10B981', marginLeft: 5 },
  scrollContent: { paddingTop: 20, paddingBottom: 40 },
  infoCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: 'rgba(6,182,212,0.06)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(6,182,212,0.15)', padding: 14, marginBottom: 20 },
  infoText: { flex: 1, fontSize: 12, color: '#94A3B8', lineHeight: 17, fontWeight: '500' },
  formCard: { backgroundColor: '#111322', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 16, marginBottom: 24 },
  fieldGroup: { paddingVertical: 16 },
  fieldLabel: { fontSize: 9, fontWeight: '800', color: '#475569', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 },
  fieldInputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#090A12', borderRadius: 10, borderWidth: 1, borderColor: '#1E293B', paddingHorizontal: 14, height: 48 },
  fieldInput: { flex: 1, fontSize: 15, color: '#FFF', fontWeight: '700', padding: 0 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.04)' },
  presetLabel: { fontSize: 11, fontWeight: '700', color: '#475569', marginBottom: 12 },
  presetGrid: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  presetChip: { flex: 1, backgroundColor: '#111322', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', paddingVertical: 12, alignItems: 'center' },
  presetChipText: { fontSize: 13, fontWeight: '800', color: '#06B6D4' },
  presetChipSub: { fontSize: 9, fontWeight: '600', color: '#475569', marginTop: 3 },
  saveButton: { flexDirection: 'row', height: 52, backgroundColor: '#06B6D4', borderRadius: 14, justifyContent: 'center', alignItems: 'center', shadowColor: '#06B6D4', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4, marginBottom: 14 },
  saveButtonText: { fontSize: 15, fontWeight: '800', color: '#FFF' },
  savingRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', height: 52, marginBottom: 14 },
  savingText: { fontSize: 14, color: '#06B6D4', fontWeight: '700' },
  resetButton: { height: 48, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(239,68,68,0.05)', marginBottom: 24 },
  resetButtonText: { fontSize: 14, fontWeight: '700', color: '#EF4444' },
  noteCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: 'rgba(245,158,11,0.05)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(245,158,11,0.12)', padding: 14 },
  noteText: { flex: 1, fontSize: 11, color: '#64748B', lineHeight: 16, fontWeight: '500' },
});
