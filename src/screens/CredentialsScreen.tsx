import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList, 
  TextInput,
  Clipboard,
  ToastAndroid,
  Platform,
  Alert
} from 'react-native';

interface CredentialItem {
  id: string;
  brand: string;
  ip: string;
  username: string;
  password:  string;
  privilege: 'Admin' | 'User' | 'Superadmin';
  notes: string;
}

const DEFAULT_CREDENTIALS: CredentialItem[] = [
  {
    id: '1',
    brand: 'ZTE (F609 / F660)',
    ip: '192.168.1.1',
    username: 'admin',
    password: 'admin',
    privilege: 'Admin',
    notes: 'Kredensial admin bawaan standar.'
  },
  {
    id: '2',
    brand: 'ZTE (F609 / F660)',
    ip: '192.168.1.1',
    username: 'user',
    password: 'user',
    privilege: 'User',
    notes: 'Akses terbatas untuk pelanggan biasa.'
  },
  {
    id: '3',
    brand: 'Huawei (HG8245H / HG8245A)',
    ip: '192.168.100.1',
    username: 'telecomadmin',
    password: 'admintelecom',
    privilege: 'Superadmin',
    notes: 'Akses penuh administrator sistem.'
  },
  {
    id: '4',
    brand: 'Huawei (HG8245H / HG8245A)',
    ip: '192.168.100.1',
    username: 'root',
    password: 'admin',
    privilege: 'Admin',
    notes: 'Kredensial admin standar Huawei.'
  },
  {
    id: '5',
    brand: 'FiberHome (AN5506)',
    ip: '192.168.1.1',
    username: 'admin',
    password: 'admin',
    privilege: 'Admin',
    notes: 'Kredensial administrator FiberHome.'
  },
  {
    id: '6',
    brand: 'FiberHome (AN5506)',
    ip: '192.168.1.1',
    username: 'user',
    password: 'user',
    privilege: 'User',
    notes: 'Kredensial akses user biasa.'
  },
  {
    id: '7',
    brand: 'TP-Link (WR840N / Archer)',
    ip: '192.168.0.1',
    username: 'admin',
    password: 'admin',
    privilege: 'Admin',
    notes: 'Kredensial admin default router pemancar.'
  },
  {
    id: '8',
    brand: 'Tenda (F3 / AC10)',
    ip: '192.168.0.1',
    username: 'admin',
    password: 'admin',
    privilege: 'Admin',
    notes: 'Biasanya Tenda tidak meminta password saat pertama kali instalasi.'
  },
  {
    id: '9',
    brand: 'D-Link (DIR Series)',
    ip: '192.168.0.1',
    username: 'admin',
    password: 'admin',
    privilege: 'Admin',
    notes: 'Kadang password dikosongkan (cukup klik login).'
  }
];

interface CredentialsScreenProps {
  onBack: () => void;
  theme?: 'light' | 'dark';
}

export const CredentialsScreen: React.FC<CredentialsScreenProps> = ({ onBack, theme }) => {
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

  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string, label: string) => {
    Clipboard.setString(text);
    setCopiedId(`${id}-${label}`);
    
    if (Platform.OS === 'android') {
      ToastAndroid.show(`${label} berhasil disalin!`, ToastAndroid.SHORT);
    } else {
      Alert.alert('Disalin', `${label} berhasil disalin ke papan klip!`);
    }

    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  const filteredData = DEFAULT_CREDENTIALS.filter(item => 
    item.brand.toLowerCase().includes(search.toLowerCase()) ||
    item.ip.includes(search) ||
    item.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* HEADER */}
      <View style={[styles.header, { borderColor: colors.headerBorder }]}>
        <TouchableOpacity style={[styles.backButton, { backgroundColor: colors.buttonBg }]} onPress={onBack} activeOpacity={0.7}>
          <Text style={[styles.backIcon, { color: colors.activeBlue }]}>◀</Text>
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Sandi Default Modem</Text>
          <Text style={[styles.headerSubtitle, { color: colors.subtext }]}>Database kredensial pabrikan ONT</Text>
        </View>
      </View>

      {/* SEARCH BAR */}
      <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <TextInput
          style={[styles.searchInput, { color: colors.inputText }]}
          placeholder="Cari merk modem (misal: ZTE, Huawei)..."
          placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {search !== '' ? (
          <TouchableOpacity onPress={() => setSearch('')} style={styles.clearSearch}>
            <Text style={[styles.clearSearchText, { color: colors.subtext }]}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* LIST DATA */}
      <FlatList
        data={filteredData}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={[styles.emptyText, { color: colors.subtext }]}>Tidak menemukan modem yang dicari</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardBrand, { color: colors.text }]}>{item.brand}</Text>
              <View style={[
                styles.badge, 
                item.privilege === 'Superadmin' ? styles.badgeSuper : 
                item.privilege === 'Admin' ? styles.badgeAdmin : styles.badgeUser
              ]}>
                <Text style={styles.badgeText}>{item.privilege}</Text>
              </View>
            </View>

            <View style={styles.cardRow}>
              <Text style={[styles.rowLabel, { color: colors.subtext }]}>IP Default</Text>
              <TouchableOpacity 
                style={[styles.rowValueContainer, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
                onPress={() => handleCopy(item.ip, item.id, 'IP Address')}
              >
                <Text style={[styles.rowValue, { color: colors.subtext }]}>{item.ip}</Text>
                <Text style={[styles.copyIndicator, { color: colors.subtext }]}>
                  {copiedId === `${item.id}-IP Address` ? 'Tersalin ✓' : 'Salin 📋'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.cardRow}>
              <Text style={[styles.rowLabel, { color: colors.subtext }]}>Username</Text>
              <TouchableOpacity 
                style={[styles.rowValueContainer, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
                onPress={() => handleCopy(item.username, item.id, 'Username')}
              >
                <Text style={[styles.rowValueHighlight, { color: colors.activeBlue }]}>{item.username}</Text>
                <Text style={[styles.copyIndicator, { color: colors.subtext }]}>
                  {copiedId === `${item.id}-Username` ? 'Tersalin ✓' : 'Salin 📋'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.cardRow}>
              <Text style={[styles.rowLabel, { color: colors.subtext }]}>Password</Text>
              <TouchableOpacity 
                style={[styles.rowValueContainer, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
                onPress={() => handleCopy(item.password, item.id, 'Password')}
              >
                <Text style={[styles.rowValueHighlight, { color: colors.activeBlue }]}>{item.password}</Text>
                <Text style={[styles.copyIndicator, { color: colors.subtext }]}>
                  {copiedId === `${item.id}-Password` ? 'Tersalin ✓' : 'Salin 📋'}
                </Text>
              </TouchableOpacity>
            </View>

            {item.notes ? (
              <View style={[styles.notesContainer, { borderColor: colors.headerBorder }]}>
                <Text style={[styles.notesText, { color: colors.subtext }]}>ℹ️ {item.notes}</Text>
              </View>
            ) : null}
          </View>
        )}
      />
    </View>
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
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  backIcon: {
    fontSize: 12,
    color: '#06B6D4',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFF',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111322',
    height: 48,
    borderRadius: 12,
    marginTop: 18,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#FFF',
    fontWeight: '600',
    padding: 0,
  },
  clearSearch: {
    padding: 4,
  },
  clearSearchText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: 'bold',
  },
  listContent: {
    paddingTop: 18,
    paddingBottom: 30,
  },
  card: {
    backgroundColor: '#111322',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.03)',
  },
  cardBrand: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFF',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeSuper: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  badgeAdmin: {
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.25)',
  },
  badgeUser: {
    backgroundColor: 'rgba(100, 116, 139, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(100, 116, 139, 0.25)',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFF',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 6,
  },
  rowLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  rowValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#090A12',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.02)',
  },
  rowValue: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '700',
    marginRight: 8,
  },
  rowValueHighlight: {
    fontSize: 12,
    color: '#06B6D4',
    fontWeight: '800',
    marginRight: 8,
  },
  copyIndicator: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: '700',
  },
  notesContainer: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.03)',
  },
  notesText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '500',
    lineHeight: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '700',
  },
});
