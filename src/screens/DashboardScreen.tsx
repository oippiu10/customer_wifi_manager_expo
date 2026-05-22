import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput,
  Dimensions,
  KeyboardAvoidingView,
  Platform
} from 'react-native';

const { width } = Dimensions.get('window');

interface DashboardScreenProps {
  onNavigate: (screen: string) => void;
  onOpenGateway: (ip: string) => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ onNavigate, onOpenGateway }) => {
  const [ipInput, setIpInput] = useState('192.168.1.1');
  const [isFocused, setIsFocused] = useState(false);

  const handleOpenGateway = () => {
    // Validasi sederhana alamat IP
    const cleanIp = ipInput.trim();
    if (cleanIp) {
      onOpenGateway(cleanIp);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
        {/* HEADER SECTION */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brandTitle}>NetGateway</Text>
            <Text style={styles.brandSubtitle}>Router Assistant & Utility</Text>
          </View>
          <View style={styles.statusBadge}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>AKTIF</Text>
          </View>
        </View>

        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* QUICK GATEWAY PORTAL CARD */}
          <View style={styles.gatewayCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardEmoji}>🖥️</Text>
              <View>
                <Text style={styles.cardTitle}>Portal Gateway Modem</Text>
                <Text style={styles.cardDesc}>Masukkan IP modem untuk membuka halaman admin</Text>
              </View>
            </View>

            <View style={[styles.inputContainer, isFocused && styles.inputFocused]}>
              <Text style={styles.inputPrefix}>http://</Text>
              <TextInput
                style={styles.textInput}
                value={ipInput}
                onChangeText={setIpInput}
                placeholder="192.168.1.1"
                placeholderTextColor="#475569"
                keyboardType="numeric"
                autoCapitalize="none"
                autoCorrect={false}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
              />
            </View>

            <TouchableOpacity 
              style={styles.connectButton}
              onPress={handleOpenGateway}
              activeOpacity={0.8}
            >
              <Text style={styles.connectButtonText}>Buka Portal Modem 🚀</Text>
            </TouchableOpacity>

            <View style={styles.ipSuggestions}>
              <TouchableOpacity onPress={() => setIpInput('192.168.1.1')} style={styles.suggestionBadge}>
                <Text style={styles.suggestionText}>192.168.1.1</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setIpInput('192.168.0.1')} style={styles.suggestionBadge}>
                <Text style={styles.suggestionText}>192.168.0.1</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setIpInput('10.0.0.1')} style={styles.suggestionBadge}>
                <Text style={styles.suggestionText}>10.0.0.1</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Pusat Alat Bantu & Panduan</Text>

          {/* MENU GRID */}
          <View style={styles.gridContainer}>
            {/* CARD 1: PASSWORD CREDENTIALS */}
            <TouchableOpacity 
              style={styles.gridItem} 
              onPress={() => onNavigate('credentials')}
              activeOpacity={0.85}
            >
              <View style={[styles.itemIconContainer, { backgroundColor: 'rgba(6, 182, 212, 0.1)' }]}>
                <Text style={styles.itemIcon}>🔑</Text>
              </View>
              <Text style={styles.itemTitle}>Sandi Bawaan</Text>
              <Text style={styles.itemDesc}>Database username & password admin bawaan pabrik modem.</Text>
            </TouchableOpacity>

            {/* CARD 2: PING TESTER */}
            <TouchableOpacity 
              style={styles.gridItem} 
              onPress={() => onNavigate('ping')}
              activeOpacity={0.85}
            >
              <View style={[styles.itemIconContainer, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                <Text style={styles.itemIcon}>⚡</Text>
              </View>
              <Text style={styles.itemTitle}>Tes Ping Jaringan</Text>
              <Text style={styles.itemDesc}>Uji kestabilan dan latensi respon koneksi modem secara real-time.</Text>
            </TouchableOpacity>
          </View>

          {/* FULL WIDTH CARD: NETWORK GUIDE */}
          <TouchableOpacity 
            style={styles.guideCard} 
            onPress={() => onNavigate('guide')}
            activeOpacity={0.85}
          >
            <View style={styles.guideLeft}>
              <View style={styles.guideIconBg}>
                <Text style={styles.guideIcon}>🛠️</Text>
              </View>
              <View style={styles.guideTextContainer}>
                <Text style={styles.guideTitle}>Panduan Diagnosa Jaringan</Text>
                <Text style={styles.guideDesc}>Solusi cepat jika modem los merah atau koneksi internet lambat.</Text>
              </View>
            </View>
            <Text style={styles.guideArrow}>➡️</Text>
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>NetGateway • Dikembangkan Secara Mandiri</Text>
          </View>
        </ScrollView>
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
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#10B981',
    letterSpacing: 0.5,
  },
  scrollContent: {
    paddingTop: 24,
    paddingBottom: 40,
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
  connectButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#090A12',
  },
  ipSuggestions: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginTop: 14,
  },
  suggestionBadge: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginRight: 8,
  },
  suggestionText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 16,
    letterSpacing: 0.2,
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
    marginTop: 10,
  },
  footerText: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '600',
  },
});
