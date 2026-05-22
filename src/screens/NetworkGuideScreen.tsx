import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Dimensions 
} from 'react-native';

const { width } = Dimensions.get('window');

interface GuideItem {
  id: string;
  emoji: string;
  title: string;
  content: string;
  category: 'Hardware' | 'Koneksi' | 'Keamanan' | 'Portal';
}

const GUIDES: GuideItem[] = [
  {
    id: '1',
    emoji: '🔴',
    category: 'Hardware',
    title: 'Lampu LOS Merah Berkedip?',
    content: 'Indikasi lampu LOS berkedip merah menandakan modem ONT Anda kehilangan sinyal optik fiber. Hal ini biasanya disebabkan oleh:\n\n1. Kabel fiber optik kuning (patch cord) di modem tertekuk tajam atau longgar. Coba rapikan dan tancapkan ulang perlahan.\n2. Ada kabel optik putus di jalur luar rumah (tertimpa pohon, terkena layangan, dll.).\n\n💡 Solusi: Jika setelah merapikan kabel kuning lampu masih merah, segera hubungi Call Center ISP Anda untuk kunjungan teknisi karena ini masalah kabel fisik luar.'
  },
  {
    id: '2',
    emoji: '🔌',
    category: 'Hardware',
    title: 'Cara Melakukan Restart Modem yang Benar',
    content: 'Melakukan siklus daya (power cycle) pada modem dapat menyelesaikan 80% masalah internet lambat atau hang. Langkah yang benar:\n\n1. Matikan modem dengan menekan tombol Power di belakang, atau cabut adaptor listriknya.\n2. Diamkan selama 10 hingga 15 detik agar seluruh sisa daya di kapasitor habis dan memori bersih.\n3. Nyalakan kembali modem dan tunggu 2-3 menit hingga lampu indikator PON/Internet menyala hijau stabil.'
  },
  {
    id: '3',
    emoji: '🚫',
    category: 'Portal',
    title: 'Gagal Membuka Alamat 192.168.1.1?',
    content: 'Jika halaman portal modem terus-menerus memuat ulang tanpa hasil, periksa langkah berikut:\n\n1. Pastikan HP Anda terhubung ke sinyal WiFi modem tersebut, bukan menggunakan koneksi Paket Data Seluler.\n2. Cek apakah IP gateway Anda benar. Beberapa modem menggunakan 192.168.0.1, 192.168.100.1, atau 10.0.0.1 (cek label stiker di bawah fisik modem Anda).\n3. Nonaktifkan aplikasi VPN di HP jika sedang aktif.'
  },
  {
    id: '4',
    emoji: '🐌',
    category: 'Koneksi',
    title: 'Mengatasi Internet Lambat / Lemot',
    content: 'Internet lambat tidak selalu karena gangguan ISP. Sering kali disebabkan oleh:\n\n1. Terlalu banyak perangkat yang terhubung secara bersamaan (melebihi kapasitas bandwidth).\n2. Jarak HP terlalu jauh dari modem atau terhalang tembok tebal. Sinyal 5GHz cepat tapi jangkauan pendek; sinyal 2.4GHz jangkauan luas tapi lebih lambat.\n3. Adanya aplikasi latar belakang di komputer/HP yang sedang melakukan update otomatis.'
  },
  {
    id: '5',
    emoji: '🛡️',
    category: 'Keamanan',
    title: 'Tips Mengamankan Password WiFi Anda',
    content: 'Agar WiFi rumah tidak mudah dibobol tetangga atau disalahgunakan:\n\n1. Selalu gunakan kombinasi WPA2-PSK (AES) di menu pengaturan keamanan modem.\n2. Buat password minimal 8 karakter yang mengandung huruf besar, huruf kecil, dan angka.\n3. Hindari penggunaan password mudah ditebak seperti tanggal lahir, nama rumah, atau nomor HP.\n4. Nonaktifkan fitur WPS (Wi-Fi Protected Setup) di pengaturan modem karena fitur ini memiliki celah keamanan tinggi.'
  }
];

export const NetworkGuideScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [selectedCategory, setSelectedCategory] = useState<'Semua' | 'Hardware' | 'Koneksi' | 'Keamanan' | 'Portal'>('Semua');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const categories: ('Semua' | 'Hardware' | 'Koneksi' | 'Keamanan' | 'Portal')[] = [
    'Semua', 'Hardware', 'Koneksi', 'Keamanan', 'Portal'
  ];

  const filteredGuides = selectedCategory === 'Semua' 
    ? GUIDES 
    : GUIDES.filter(g => g.category === selectedCategory);

  const toggleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
    }
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
          <Text style={styles.backIcon}>◀</Text>
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Panduan Diagnosa Jaringan</Text>
          <Text style={styles.headerSubtitle}>Solusi mandiri mengatasi masalah internet</Text>
        </View>
      </View>

      {/* CATEGORY SELECTOR */}
      <View style={styles.categoryScrollContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
          {categories.map((cat) => (
            <TouchableOpacity 
              key={cat}
              style={[styles.categoryBadge, selectedCategory === cat && styles.categoryActive]}
              onPress={() => {
                setSelectedCategory(cat);
                setExpandedId(null);
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.categoryText, selectedCategory === cat && styles.categoryTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ARTICLE LIST */}
      <ScrollView 
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredGuides.map((item) => {
          const isExpanded = expandedId === item.id;
          return (
            <TouchableOpacity 
              key={item.id}
              style={[styles.card, isExpanded && styles.cardExpanded]}
              onPress={() => toggleExpand(item.id)}
              activeOpacity={0.9}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardLeft}>
                  <Text style={styles.cardEmoji}>{item.emoji}</Text>
                  <View style={styles.titleContainer}>
                    <Text style={styles.cardCategory}>{item.category.toUpperCase()}</Text>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                  </View>
                </View>
                <Text style={styles.expandIcon}>{isExpanded ? '▲' : '▼'}</Text>
              </View>

              {isExpanded && (
                <View style={styles.cardBody}>
                  <Text style={styles.cardContent}>{item.content}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        <View style={styles.footerSpacing} />
      </ScrollView>
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
  categoryScrollContainer: {
    height: 38,
    marginTop: 18,
    marginBottom: 8,
  },
  categoryScroll: {
    paddingRight: 20,
  },
  categoryBadge: {
    paddingHorizontal: 14,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#111322',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.03)',
  },
  categoryActive: {
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
    borderColor: 'rgba(6, 182, 212, 0.25)',
  },
  categoryText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '700',
  },
  categoryTextActive: {
    color: '#06B6D4',
  },
  listContent: {
    paddingTop: 10,
    paddingBottom: 30,
  },
  card: {
    backgroundColor: '#111322',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    padding: 16,
    marginBottom: 14,
  },
  cardExpanded: {
    borderColor: 'rgba(6, 182, 212, 0.2)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardEmoji: {
    fontSize: 24,
    marginRight: 14,
  },
  titleContainer: {
    flex: 1,
  },
  cardCategory: {
    fontSize: 9,
    fontWeight: '800',
    color: '#06B6D4',
    letterSpacing: 0.5,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFF',
    marginTop: 2,
  },
  expandIcon: {
    fontSize: 10,
    color: '#64748B',
    marginLeft: 12,
  },
  cardBody: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.03)',
  },
  cardContent: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 18,
    fontWeight: '500',
  },
  footerSpacing: {
    height: 40,
  },
});
