import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  ScrollView, 
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { Feather } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface PingLog {
  seq: number;
  ip: string;
  time: number | 'timeout' | 'error';
  timestamp: string;
}

export const PingTesterScreen: React.FC<{ onBack: () => void; theme: 'light' | 'dark' }> = ({ onBack, theme }) => {
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

  const [target, setTarget] = useState('192.168.1.1');
  const [pinging, setPinging] = useState(false);
  const [logs, setLogs] = useState<PingLog[]>([]);
  
  // Statistik
  const [sent, setSent] = useState(0);
  const [received, setReceived] = useState(0);
  const [lost, setLost] = useState(0);
  const [minTime, setMinTime] = useState<number | null>(null);
  const [maxTime, setMaxTime] = useState<number | null>(null);
  const [avgTime, setAvgTime] = useState<number | null>(null);

  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const seqRef = useRef(1);
  const scrollViewRef = useRef<ScrollView>(null);

  // Bersihkan interval saat unmount
  useEffect(() => {
    return () => {
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
    };
  }, []);

  // Auto scroll ke bawah log terminal
  useEffect(() => {
    if (scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [logs]);

  const handleStartPing = () => {
    if (pinging) {
      // Stop ping
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
      setPinging(false);
      return;
    }

    // Reset statistik
    setLogs([]);
    setSent(0);
    setReceived(0);
    setLost(0);
    setMinTime(null);
    setMaxTime(null);
    setAvgTime(null);
    
    seqRef.current = 1;
    setPinging(true);

    const cleanTarget = target.trim();
    // Memformat URL target agar bisa di-fetch
    let fetchUrl = cleanTarget;
    if (!/^https?:\/\//i.test(fetchUrl)) {
      fetchUrl = `http://${fetchUrl}`;
    }

    // Jalankan tes ping berkala setiap 1.2 detik
    pingIntervalRef.current = setInterval(async () => {
      const currentSeq = seqRef.current++;
      setSent(prev => prev + 1);
      
      const startTime = Date.now();
      const timeString = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      
      try {
        // Gunakan HEAD request cepat dengan timeout 2 detik
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        
        await fetch(fetchUrl, {
          method: 'HEAD',
          mode: 'no-cors',
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        const duration = Date.now() - startTime;
        
        // Simpan log sukses (maksimal 100 entri terakhir)
        setLogs(prev => {
          const newLog = { seq: currentSeq, ip: cleanTarget, time: duration, timestamp: timeString };
          const updated = [...prev, newLog];
          return updated.length > 100 ? updated.slice(-100) : updated;
        });

        setReceived(prev => prev + 1);
        
        // Update statistik waktu
        setMinTime(prev => prev === null ? duration : Math.min(prev, duration));
        setMaxTime(prev => prev === null ? duration : Math.max(prev, duration));
        
      } catch (error: any) {
        const isTimeout = error.name === 'AbortError';
        
        setLogs(prev => {
          const newLog = { seq: currentSeq, ip: cleanTarget, time: isTimeout ? 'timeout' as const : 'error' as const, timestamp: timeString };
          const updated = [...prev, newLog];
          return updated.length > 100 ? updated.slice(-100) : updated;
        });
        
        setLost(prev => prev + 1);
      }
    }, 1200);
  };

  // Kalkulasi rata-rata secara dinamis
  useEffect(() => {
    const successLogs = logs.filter(l => typeof l.time === 'number') as { time: number }[];
    if (successLogs.length > 0) {
      const sum = successLogs.reduce((acc, curr) => acc + curr.time, 0);
      setAvgTime(Math.round(sum / successLogs.length));
    }
  }, [logs]);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* HEADER */}
      <View style={[styles.header, { borderColor: colors.headerBorder }]}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
          <Feather name="arrow-left" size={18} color="#06B6D4" />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Tes Ping Jaringan</Text>
          <Text style={[styles.headerSubtitle, { color: colors.subtext }]}>Uji latensi respon & kestabilan router</Text>
        </View>
      </View>

      {/* TARGET INPUT */}
      <View style={[styles.inputCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <View style={[styles.inputContainer, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
          <Text style={styles.inputLabel}>Host Jaringan / IP</Text>
          <TextInput
            style={[styles.textInput, { color: colors.inputText }]}
            value={target}
            onChangeText={setTarget}
            placeholder="192.168.1.1"
            placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            editable={!pinging}
          />
        </View>
        
        <TouchableOpacity 
          style={[styles.pingButton, pinging ? styles.pingingStopButton : styles.pingingStartButton]}
          onPress={handleStartPing}
          activeOpacity={0.8}
        >
          {pinging ? (
            <View style={styles.pingingBtnContent}>
              <ActivityIndicator size="small" color="#FFF" style={{ marginRight: 8 }} />
              <Text style={[styles.pingButtonText, styles.pingButtonTextStop]}>Hentikan Pengujian</Text>
            </View>
          ) : (
            <Text style={styles.pingButtonText}>Mulai Pengujian Ping</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* STATISTICS PANEL */}
      <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Paket Dikirim</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{sent}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Diterima</Text>
            <Text style={[styles.statValue, { color: '#10B981' }]}>{received}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Terputus/RTO</Text>
            <Text style={[styles.statValue, { color: lost > 0 ? '#EF4444' : colors.subtext }]}>{lost}</Text>
          </View>
        </View>

        <View style={[styles.statsRow, { marginTop: 14, borderTopWidth: 1, borderColor: colors.headerBorder, paddingTop: 12 }]}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Min</Text>
            <Text style={[styles.statSubValue, { color: colors.text }]}>{minTime !== null ? `${minTime}ms` : '-'}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Max</Text>
            <Text style={[styles.statSubValue, { color: colors.text }]}>{maxTime !== null ? `${maxTime}ms` : '-'}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Rata-Rata</Text>
            <Text style={[styles.statSubValue, { color: '#06B6D4' }]}>{avgTime !== null ? `${avgTime}ms` : '-'}</Text>
          </View>
        </View>
      </View>

      {/* TERMINAL LOG VIEW */}
      <View style={[styles.terminalContainer, { backgroundColor: isDark ? '#05050A' : '#F1F5F9', borderColor: colors.cardBorder }]}>
        <View style={[styles.terminalHeader, { backgroundColor: isDark ? '#0F0F1A' : '#E2E8F0', borderColor: colors.cardBorder }]}>
          <View style={styles.terminalDots}>
            <View style={[styles.dot, { backgroundColor: '#EF4444' }]} />
            <View style={[styles.dot, { backgroundColor: '#F59E0B' }]} />
            <View style={[styles.dot, { backgroundColor: '#10B981' }]} />
          </View>
          <Text style={styles.terminalTitle}>diagnostics_console.sh</Text>
        </View>

        <ScrollView 
          ref={scrollViewRef}
          style={styles.terminalBody}
          contentContainerStyle={styles.terminalContent}
          showsVerticalScrollIndicator={true}
        >
          {logs.length === 0 ? (
            <Text style={[styles.terminalPlaceholder, { color: colors.subtext }]}>
              Terminal siap. Masukkan IP target lalu ketuk tombol di atas untuk memulai pemantauan ping real-time.
            </Text>
          ) : (
            logs.map((log, index) => (
              <View key={index} style={styles.logLine}>
                <Text style={styles.logTime}>[{log.timestamp}]</Text>
                <Text style={styles.logSeq}> seq={log.seq}</Text>
                <Text style={[styles.logText, { color: colors.text }]}> Respon dari {log.ip}: </Text>
                {log.time === 'timeout' ? (
                  <Text style={styles.logTimeout}>RTO (Request Timeout)</Text>
                ) : log.time === 'error' ? (
                  <Text style={styles.logError}>Unreachable / Error</Text>
                ) : (
                  <Text style={styles.logSuccess}>waktu={log.time}ms</Text>
                )}
              </View>
            ))
          )}
        </ScrollView>
      </View>
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
  inputCard: {
    backgroundColor: '#111322',
    borderRadius: 16,
    padding: 16,
    marginTop: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  inputContainer: {
    backgroundColor: '#090A12',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
    paddingHorizontal: 12,
    height: 48,
    justifyContent: 'center',
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  textInput: {
    fontSize: 14,
    color: '#FFF',
    fontWeight: '700',
    padding: 0,
  },
  pingButton: {
    height: 46,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pingingStartButton: {
    backgroundColor: '#06B6D4',
  },
  pingingStopButton: {
    backgroundColor: '#EF4444',
  },
  pingingBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pingButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFF',
  },
  pingButtonTextStop: {
    color: '#FFF',
  },
  statsCard: {
    backgroundColor: '#111322',
    borderRadius: 16,
    padding: 16,
    marginTop: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statBox: {
    width: (width - 76) / 3,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFF',
    marginTop: 4,
  },
  statSubValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFF',
    marginTop: 4,
  },
  terminalContainer: {
    flex: 1,
    backgroundColor: '#05050A',
    borderRadius: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    overflow: 'hidden',
    marginBottom: 20,
  },
  terminalHeader: {
    height: 36,
    backgroundColor: '#0F0F1A',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.03)',
  },
  terminalDots: {
    flexDirection: 'row',
    width: 48,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  terminalTitle: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
    marginRight: 48, // Balancer dot
  },
  terminalBody: {
    flex: 1,
  },
  terminalContent: {
    padding: 12,
  },
  terminalPlaceholder: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
    fontWeight: '600',
  },
  logLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginVertical: 3,
  },
  logTime: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  logSeq: {
    fontSize: 11,
    color: '#06B6D4',
    fontWeight: '700',
  },
  logText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  logSuccess: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '700',
  },
  logTimeout: {
    fontSize: 11,
    color: '#F59E0B',
    fontWeight: '700',
  },
  logError: {
    fontSize: 11,
    color: '#EF4444',
    fontWeight: '700',
  },
});
