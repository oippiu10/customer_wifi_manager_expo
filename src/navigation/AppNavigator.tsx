import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, StatusBar, Platform, BackHandler } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SplashScreen } from '../screens/SplashScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { ModemWebViewScreen } from '../screens/ModemWebViewScreen';
import { CredentialsScreen } from '../screens/CredentialsScreen';
import { PingTesterScreen } from '../screens/PingTesterScreen';
import { NetworkGuideScreen } from '../screens/NetworkGuideScreen';
import { SettingsScreen } from '../screens/SettingsScreen';

const STORAGE_KEY_USER = 'MODEM_USERNAME';
const STORAGE_KEY_PASS = 'MODEM_PASSWORD';

export const AppNavigator: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<string>('splash');
  const [targetIp, setTargetIp] = useState<string>('192.168.1.1');
  const [isTechMode, setIsTechMode] = useState<boolean>(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  // Muat tema yang tersimpan saat pertama kali app dibuka
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('APP_THEME');
        if (savedTheme === 'light' || savedTheme === 'dark') {
          setTheme(savedTheme);
        }
      } catch (e) {}
    };
    loadTheme();
  }, []);

  // Kredensial login modem (dimuat dari AsyncStorage)
  const [modemUsername, setModemUsername] = useState<string>('superadmin');
  const [modemPassword, setModemPassword] = useState<string>('suportadmin');

  // Muat kredensial tersimpan saat pertama kali app dibuka
  useEffect(() => {
    const loadCredentials = async () => {
      try {
        const savedUser = await AsyncStorage.getItem(STORAGE_KEY_USER);
        const savedPass = await AsyncStorage.getItem(STORAGE_KEY_PASS);
        if (savedUser) setModemUsername(savedUser);
        if (savedPass) setModemPassword(savedPass);
      } catch (e) {
        console.warn('Gagal memuat kredensial modem:', e);
      }
    };
    loadCredentials();
  }, []);

  // Reload kredensial setiap kali kembali dari halaman settings
  const handleSettingsBack = async () => {
    try {
      const savedUser = await AsyncStorage.getItem(STORAGE_KEY_USER);
      const savedPass = await AsyncStorage.getItem(STORAGE_KEY_PASS);
      if (savedUser) setModemUsername(savedUser);
      if (savedPass) setModemPassword(savedPass);
    } catch (e) {}
    navigateTo('dashboard');
  };

  const toggleTheme = () => {
    setTheme(prev => {
      const newTheme = prev === 'dark' ? 'light' : 'dark';
      // Simpan pilihan tema ke storage agar persisten saat app dibuka kembali
      AsyncStorage.setItem('APP_THEME', newTheme).catch(() => {});
      return newTheme;
    });
  };

  useEffect(() => {
    const backAction = () => {
      if (currentScreen === 'splash') return true;
      if (currentScreen !== 'dashboard') {
        setCurrentScreen('dashboard');
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [currentScreen]);

  const navigateTo = (screen: string) => {
    setCurrentScreen(screen);
  };

  const startWebView = (ip: string) => {
    setTargetIp(ip);
    navigateTo('webview');
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'splash':
        return (
          <SplashScreen 
            onFinishCheck={() => navigateTo('dashboard')} 
          />
        );
        
      case 'dashboard':
        return (
          <DashboardScreen 
            onNavigate={(screen: string) => navigateTo(screen)} 
            onOpenGateway={startWebView}
            isTechMode={isTechMode}
            setIsTechMode={setIsTechMode}
            theme={theme}
            toggleTheme={toggleTheme}
          />
        );
        
      case 'webview':
        return (
          <ModemWebViewScreen 
            ipAddress={targetIp}
            onBack={() => navigateTo('dashboard')} 
            theme={theme}
            toggleTheme={toggleTheme}
            isTechMode={isTechMode}
            customUsername={modemUsername}
            customPassword={modemPassword}
          />
        );
        
      case 'credentials':
        return (
          <CredentialsScreen 
            onBack={() => navigateTo('dashboard')} 
            theme={theme}
          />
        );

      case 'settings':
        return (
          <SettingsScreen
            onBack={handleSettingsBack}
            theme={theme}
          />
        );
        
      case 'ping':
        return (
          <PingTesterScreen 
            onBack={() => navigateTo('dashboard')} 
            theme={theme}
          />
        );
        
      case 'guide':
        return (
          <NetworkGuideScreen 
            onBack={() => navigateTo('dashboard')} 
            theme={theme}
          />
        );
        
      default:
        return <SplashScreen onFinishCheck={() => navigateTo('dashboard')} />;
    }
  };

  const isDark = theme === 'dark';
  const barStyle = isDark ? 'light-content' : 'dark-content';
  const statusBarBg = isDark ? '#090A12' : '#F8FAFC';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: statusBarBg }]}>
      <StatusBar barStyle={barStyle} backgroundColor={statusBarBg} />
      <View style={styles.container}>
        {renderScreen()}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
  },
});
