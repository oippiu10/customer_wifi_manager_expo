import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, StatusBar, Platform, BackHandler } from 'react-native';
import { SplashScreen } from '../screens/SplashScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { ModemWebViewScreen } from '../screens/ModemWebViewScreen';
import { CredentialsScreen } from '../screens/CredentialsScreen';
import { PingTesterScreen } from '../screens/PingTesterScreen';
import { NetworkGuideScreen } from '../screens/NetworkGuideScreen';

export const AppNavigator: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<string>('splash');
  const [targetIp, setTargetIp] = useState<string>('192.168.1.1');

  useEffect(() => {
    const backAction = () => {
      // Jika sedang di splash screen, abaikan tombol kembali
      if (currentScreen === 'splash') {
        return true;
      }
      
      // Jika sedang tidak di dashboard (misalnya di webview, ping, guide, credentials)
      // Kembalikan ke dashboard bukannya keluar aplikasi
      if (currentScreen !== 'dashboard') {
        setCurrentScreen('dashboard');
        return true; // Menandakan back press telah ditangani
      }
      
      // Jika sedang di dashboard, izinkan aksi bawaan (keluar aplikasi)
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

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
            onFinishCheck={() => {
              navigateTo('dashboard');
            }} 
          />
        );
        
      case 'dashboard':
        return (
          <DashboardScreen 
            onNavigate={(screen: string) => navigateTo(screen)} 
            onOpenGateway={startWebView}
          />
        );
        
      case 'webview':
        return (
          <ModemWebViewScreen 
            ipAddress={targetIp}
            onBack={() => navigateTo('dashboard')} 
          />
        );
        
      case 'credentials':
        return (
          <CredentialsScreen 
            onBack={() => navigateTo('dashboard')} 
          />
        );
        
      case 'ping':
        return (
          <PingTesterScreen 
            onBack={() => navigateTo('dashboard')} 
          />
        );
        
      case 'guide':
        return (
          <NetworkGuideScreen 
            onBack={() => navigateTo('dashboard')} 
          />
        );
        
      default:
        return <SplashScreen onFinishCheck={() => navigateTo('dashboard')} />;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#090A12" />
      <View style={styles.container}>
        {renderScreen()}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#090A12',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
  },
});
