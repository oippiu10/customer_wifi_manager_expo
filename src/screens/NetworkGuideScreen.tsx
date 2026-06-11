import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Dimensions 
} from 'react-native';
import { Feather } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface GuideItem {
  id: string;
  icon: string;
  title: string;
  content: string;
  category: 'Hardware' | 'Koneksi' | 'Keamanan' | 'Portal';
}

const GUIDES: GuideItem[] = [
  {
    id: '1',
    icon: 'alert-circle',
    category: 'Hardware',
    title: 'Lampu LOS Merah Berkedip?',
    content: 'Indikasi lampu LOS berkedip merah menandakan modem ONT Anda kehilangan sinyal optik fiber. Hal ini biasanya disebabkan oleh:\n\n1. Kabel fiber optik kuning (patch cord) di modem tertekuk tajam atau longgar. Coba rapikan dan tancapkan ulang perlahan.\n2. Ada kabel optik putus di jalur luar rumah (tertimpa pohon, terkena layangan, dll.).\n\nSolusi: Jika setelah merapikan kabel kuning lampu masih merah, segera hubungi Call Center ISP Anda untuk kunjungan teknisi karena ini masalah kabel fisik luar.'
  },
  {
    id: '2',
    icon: 'power',
    category: 'Hardware',
    title: 'Cara Melakukan Restart Modem yang Benar',
    content: 'Melakukan siklus daya (power cycle) pada modem dapat menyelesaikan 80% masalah internet lambat atau hang. Langkah yang benar:\n\n1. Matikan modem dengan menekan tombol Power di belakang, atau cabut adaptor listriknya.\n2. Diamkan selama 10 hingga 15 detik agar seluruh sisa daya di kapasitor habis dan memori bersih.\n3. Nyalakan kembali modem dan tunggu 2-3 menit hingga lampu indikator PON/Internet menyala hijau stabil.'
  },
  {
    id: '3',
    icon: 'globe',
    category: 'Portal',
    title: 'Gagal Membuka Alamat 192.168.1.1?',
    content: 'Jika halaman portal modem terus-menerus memuat ulang tanpa hasil, periksa langkah berikut:\n\n1. Pastikan HP Anda terhubung ke sinyal WiFi modem tersebut, bukan menggunakan koneksi Paket Data Seluler.\n2. Cek apakah IP gateway Anda benar. Beberapa modem menggunakan 192.168.0.1, 192.168.100.1, atau 10.0.0.1 (cek label stiker di bawah fisik modem Anda).\n3. Nonaktifkan aplikasi VPN di HP jika sedang aktif.'
  },
  {
    id: '4',
    icon: 'trending-down',
    category: 'Koneksi',
    title: 'Mengatasi Internet Lambat / Lemot',
    content: 'Internet lambat tidak selalu karena gangguan ISP. Sering kali disebabkan oleh:\n\n1. Terlahu banyak perangkat yang terhubung secara bersamaan (melebihi kapasitas bandwidth).\n2. Jarak HP terlalu jauh dari modem atau terhalang tembok tebal. Sinyal 5GHz cepat tapi jangkauan pendek; sinyal 2.4GHz jangkauan luas tapi lebih lambat.\n3. Adanya aplikasi latar belakang di komputer/HP yang sedang melakukan update otomatis.'
  },
  {
    id: '5',
    icon: 'shield',
    category: 'Keamanan',
    title: 'Tips Mengamankan Password WiFi Anda',
    content: 'Agar WiFi rumah tidak mudah dibobol tetangga atau disalahgunakan:\n\n1. Selalu gunakan kombinasi WPA2-PSK (AES) di menu pengaturan keamanan modem.\n2. Buat password minimal 8 karakter yang mengandung huruf besar, huruf kecil, dan angka.\n3. Hindari penggunaan password mudah ditebak seperti tanggal lahir, nama rumah, atau nomor HP.\n4. Nonaktifkan fitur WPS (Wi-Fi Protected Setup) di pengaturan modem karena fitur ini memiliki celah keamanan tinggi.'
  },
  {
    id: '6',
    icon: 'zap',
    category: 'Hardware',
    title: 'Arti Lampu LED pada Modem ONT',
    content: 'Memahami arti lampu indikator modem ONT fiber optik:\n\n🟢 Power (Hijau) — Modem menyala dan beroperasi normal.\n🟢 PON (Hijau) — Sinyal fiber optik terhubung ke OLT ISP. Jika berkedip artinya sinkronisasi berlangsung.\n🔴 LOS (Merah) — Loss of Signal. Sinyal optik terputus, segera periksa kabel kuning.\n🟢 Internet/WAN (Hijau) — Koneksi internet aktif. Merah atau mati artinya internet bermasalah.\n🟢 WiFi 2.4G / 5G (Hijau) — Frekuensi WiFi aktif memancar.\n\nCatatan: Warna dan posisi LED bisa berbeda tergantung merek dan tipe modem.'
  },
  {
    id: '7',
    icon: 'radio',
    category: 'Koneksi',
    title: 'Memilih Kanal WiFi yang Tepat',
    content: 'Kanal WiFi yang padat dapat menyebabkan sinyal lambat dan tidak stabil, terutama di perumahan padat:\n\n1. Untuk frekuensi 2.4GHz, pilih kanal 1, 6, atau 11 karena kanal ini tidak saling tumpang tindih.\n2. Untuk frekuensi 5GHz, pilih kanal 36, 40, 44, atau 48 yang jarang digunakan tetangga.\n3. Gunakan aplikasi "WiFi Analyzer" di HP Anda untuk melihat kanal mana yang paling sepi.\n4. Sesuaikan kanal di menu Wireless > Channel di portal admin modem (192.168.1.1).'
  },
  {
    id: '8',
    icon: 'refresh-cw',
    category: 'Hardware',
    title: 'Kapan Harus Reset Factory Modem?',
    content: 'Reset pabrik (factory reset) menghapus SEMUA konfigurasi modem dan mengembalikan ke default awal. Lakukan hanya jika:\n\n1. Lupa password admin portal modem (bukan password WiFi).\n2. Modem terus-menerus bermasalah dan restart biasa tidak membantu.\n3. Setelah migrasi / ganti ISP.\n\nCara reset: Cari tombol kecil berlabel RESET di belakang modem. Tekan dan tahan menggunakan jarum selama 10-15 detik hingga semua lampu berkedip serentak.\n\nPERINGATAN: Setelah reset, Anda perlu mengatur ulang semua pengaturan WiFi, password, dan konfigurasi jaringan dari awal.'
  },
  {
    id: '9',
    icon: 'cpu',
    category: 'Koneksi',
    title: 'Perbedaan Modem ONT dan Router WiFi',
    content: 'Banyak pelanggan bingung membedakan fungsi dua perangkat ini:\n\nModem ONT (Optical Network Terminal):\n- Mengubah sinyal cahaya dari kabel fiber optik menjadi sinyal digital.\n- Biasanya disediakan oleh ISP dan tidak boleh diganti sembarangan.\n- Contoh: ZTE F663N, Huawei EG8143A5, Nokia G-140W.\n\nRouter WiFi:\n- Mendistribusikan koneksi internet dari modem ke banyak perangkat via WiFi.\n- Bisa diganti dengan router berkualitas lebih baik untuk jangkauan lebih luas.\n\nBeberapa modem modern sudah menggabungkan keduanya dalam satu perangkat (disebut modem router atau gateway).'
  },
  {
    id: '10',
    icon: 'lock',
    category: 'Keamanan',
    title: 'Cara Mengetahui Siapa yang Terhubung ke WiFi',
    content: 'Curiga ada orang lain yang menggunakan WiFi Anda tanpa izin? Berikut caranya:\n\n1. Buka portal admin modem di browser dengan alamat 192.168.1.1.\n2. Login dengan username dan password admin modem.\n3. Pergi ke menu LAN > DHCP > DHCP Lease Table atau menu Wireless > Connected Clients.\n4. Daftar perangkat yang terhubung akan ditampilkan beserta nama dan alamat MAC-nya.\n\nJika ada perangkat mencurigakan, segera ganti password WiFi Anda dan aktifkan fitur MAC Address Filtering untuk membatasi perangkat yang diizinkan terhubung.'
  }
];

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'Hardware':
      return '#EF4444'; // Red
    case 'Koneksi':
      return '#3B82F6'; // Blue
    case 'Keamanan':
      return '#10B981'; // Green
    case 'Portal':
      return '#06B6D4'; // Cyan
    default:
      return '#06B6D4'; // Fallback / Semua
  }
};

export const NetworkGuideScreen: React.FC<{ onBack: () => void; theme: 'light' | 'dark' }> = ({ onBack, theme }) => {
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
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* HEADER */}
      <View style={[styles.header, { borderColor: colors.headerBorder }]}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
          <Feather name="arrow-left" size={18} color="#06B6D4" />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Panduan Diagnosa Jaringan</Text>
          <Text style={[styles.headerSubtitle, { color: colors.subtext }]}>Solusi mandiri mengatasi masalah internet</Text>
        </View>
      </View>

      {/* CATEGORY SELECTOR */}
      <View style={styles.categoryScrollContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
          {categories.map((cat) => {
            const catColor = getCategoryColor(cat);
            const isActive = selectedCategory === cat;
            return (
              <TouchableOpacity 
                key={cat}
                style={[
                  styles.categoryBadge, 
                  { backgroundColor: colors.card, borderColor: colors.cardBorder },
                  isActive && {
                    backgroundColor: `${catColor}15`,
                    borderColor: `${catColor}30`,
                  }
                ]}
                onPress={() => {
                  setSelectedCategory(cat);
                  setExpandedId(null);
                }}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.categoryText, 
                  { color: colors.subtext },
                  isActive && { color: catColor }
                ]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ARTICLE LIST */}
      <ScrollView 
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredGuides.map((item) => {
          const isExpanded = expandedId === item.id;
          const catColor = getCategoryColor(item.category);
          return (
            <TouchableOpacity 
              key={item.id}
              style={[
                styles.card, 
                { backgroundColor: colors.card, borderColor: colors.cardBorder },
                isExpanded && { borderColor: `${catColor}35` }
              ]}
              onPress={() => toggleExpand(item.id)}
              activeOpacity={0.9}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardLeft}>
                  {/* Glowing dynamic category icon container */}
                  <View style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    backgroundColor: `${catColor}12`,
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 14,
                    borderWidth: 1,
                    borderColor: `${catColor}18`
                  }}>
                    <Feather name={item.icon as any} size={20} color={catColor} />
                  </View>
                  <View style={styles.titleContainer}>
                    <Text style={[styles.cardCategory, { color: catColor }]}>{item.category.toUpperCase()}</Text>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>{item.title}</Text>
                  </View>
                </View>
                <Feather name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.subtext} style={{ marginLeft: 12 }} />
              </View>

              {isExpanded && (
                <View style={[styles.cardBody, { borderColor: colors.cardBorder }]}>
                  <Text style={[styles.cardContent, { color: colors.subtext }]}>{item.content}</Text>
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
