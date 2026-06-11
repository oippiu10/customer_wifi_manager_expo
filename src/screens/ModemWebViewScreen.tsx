import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Alert,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  BackHandler,
  Modal,
  Easing,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Feather } from '@expo/vector-icons';

interface ModemWebViewScreenProps {
  ipAddress: string;
  onBack: () => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  isTechMode: boolean;
  customUsername?: string;
  customPassword?: string;
}

type NavPhase = 'idle' | 'network' | 'wlan' | 'devices' | 'diag_status' | 'diag_netitf' | 'diag_read' | 'reboot' | 'done';

const makeAutoFillScript = (user: string, pass: string) => `
(function() {
  var pathname = window.location.pathname.toLowerCase();
  var hasLoginUsername = document.querySelector('input[name="Username"], input[name="username"], input[name="user"], input[name="loginUsername"], input[name="Frm_Loginuser"], input[id="username"], input[id="Username"], input[id="txt_Username"]');
  var isLogin = (pathname === '/' || pathname.indexOf('index.gch') !== -1 || pathname.indexOf('login') !== -1 || hasLoginUsername);
  if (!isLogin) {
    sessionStorage.removeItem('ag_auto_clicked');
  } else {
    try {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'DETECTED_LOGIN_PAGE' }));
    } catch(e) {}
  }

  function setNativeValue(el, value) {
    var setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
    if (setter) setter.set.call(el, value); else el.value = value;
    el.dispatchEvent(new Event('input',  { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }
  function checkLoginError() {
    var errEl = document.getElementById('errmsg') || document.querySelector('.error') || document.querySelector('.errnote');
    if (errEl && errEl.textContent.trim().length > 2) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'LOGIN_FAILED',
        error: errEl.textContent.trim()
      }));
      return true;
    }
    var layer = document.getElementById('myLayer');
    if (layer && layer.style.visibility !== 'hidden') {
      var msg = document.getElementById('errmsg');
      if (msg && msg.textContent.trim().length > 2) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'LOGIN_FAILED',
          error: msg.textContent.trim()
        }));
        return true;
      }
    }
    return false;
  }
  function tryLogin() {
    if (!isLogin) return;
    if (checkLoginError()) return;
    var uSels = ['input[name="Username"]','input[name="username"]','input[name="user"]','input[name="loginUsername"]','input[name="Frm_Loginuser"]','input[id="username"]','input[id="Username"]','input[id="txt_Username"]','input[id="txt_username"]','input[id="loginUsername"]','input[id="txtUsr"]','input[id="user"]','input[type="text"]','input[autocomplete="username"]'];
    var pSels = ['input[name="Password"]','input[name="password"]','input[name="pass"]','input[name="loginPassword"]','input[name="Frm_Loginpass"]','input[id="password"]','input[id="Password"]','input[id="txt_Password"]','input[id="txt_password"]','input[id="loginPassword"]','input[id="txtPwd"]','input[type="password"]','input[autocomplete="current-password"]'];
    var u = null, p = null;
    for (var i=0;i<uSels.length;i++){var e=document.querySelector(uSels[i]);if(e&&e.type!=='hidden'&&e.type!=='password'){u=e;break;}}
    for (var j=0;j<pSels.length;j++){var ep=document.querySelector(pSels[j]);if(ep&&ep.type==='password'){p=ep;break;}}
    if(u){setNativeValue(u,${JSON.stringify(user)});u.style.backgroundColor='rgba(6,182,212,0.08)';}
    if(p){setNativeValue(p,${JSON.stringify(pass)});p.style.backgroundColor='rgba(6,182,212,0.08)';}
    if(u||p){
      window.ReactNativeWebView.postMessage(JSON.stringify({type:'AUTOFILL_SUCCESS'}));
      if(sessionStorage.getItem('ag_auto_clicked'))return;
      setTimeout(function(){
        var bSels=['input[type="submit"]','button[type="submit"]','input[id="loginBtn"]','input[id="btnLogin"]','input[id="btn_login"]','button[id="loginBtn"]','button[id="btnLogin"]','input[value="Login"]','input[value="login"]','input[value="Log In"]','button'];
        var btn=null;
        for(var k=0;k<bSels.length;k++){var bs=document.querySelectorAll(bSels[k]);for(var b=0;b<bs.length;b++){var tx=(bs[b].value||bs[b].textContent||bs[b].innerText||'').toLowerCase().trim();if(tx.indexOf('login')!==-1||tx.indexOf('masuk')!==-1||tx.indexOf('submit')!==-1){btn=bs[b];break;}if(!btn&&(bs[b].type==='submit'||bSels[k]==='button'))btn=bs[b];}if(btn&&(btn.value||btn.textContent||'').toLowerCase().indexOf('login')!==-1)break;}
        if(btn){sessionStorage.setItem('ag_auto_clicked','1');btn.click();window.ReactNativeWebView.postMessage(JSON.stringify({type:'LOGIN_CLICKED'}));}
      },600);
    }
  }
  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',tryLogin);}else{tryLogin();}
  setTimeout(tryLogin,800);setTimeout(tryLogin,1500);
  setInterval(checkLoginError, 1000);
})();
true;
`;

function makeClickScript(keywords: string[], hrefPatterns: string[], idPatterns: string[], eventType: string): string {
  const kw = JSON.stringify(keywords);
  const hp = JSON.stringify(hrefPatterns);
  const ip = JSON.stringify(idPatterns);
  return `
    (function() {
      var kws = ${kw};
      var hps = ${hp};
      var ips = ${ip};
      var tags = ['a','li','span','div','td','button','p'];

      // Klik elemen dengan semua jenis event agar modem manapun merespons
      function doClick(el) {
        try { el.scrollIntoView(); } catch(e) {}
        try { el.dispatchEvent(new MouseEvent('mouseover', {bubbles:true})); } catch(e) {}
        try { el.dispatchEvent(new MouseEvent('mousedown', {bubbles:true})); } catch(e) {}
        try { el.dispatchEvent(new MouseEvent('mouseup',   {bubbles:true})); } catch(e) {}
        try { el.click(); } catch(e) {}
        try { el.dispatchEvent(new MouseEvent('click',     {bubbles:true})); } catch(e) {}
      }

      function searchInDoc(doc) {
        try {
          // Strategi 1: Exact text match dulu (lebih presisi)
          for (var t = 0; t < tags.length; t++) {
            var els = doc.querySelectorAll(tags[t]);
            for (var i = 0; i < els.length; i++) {
              var txt = (els[i].textContent || els[i].innerText || '').trim().toLowerCase();
              for (var k = 0; k < kws.length; k++) {
                if (txt === kws[k]) return els[i]; // exact match
              }
            }
          }
          // Strategi 2: Partial text match
          for (var t2 = 0; t2 < tags.length; t2++) {
            var els2 = doc.querySelectorAll(tags[t2]);
            for (var i2 = 0; i2 < els2.length; i2++) {
              var txt2 = (els2[i2].textContent || els2[i2].innerText || '').trim().toLowerCase();
              for (var k2 = 0; k2 < kws.length; k2++) {
                if (txt2.indexOf(kws[k2]) !== -1) return els2[i2];
              }
            }
          }
          // Strategi 3: href pattern
          var anchors = doc.querySelectorAll('a[href]');
          for (var ai = 0; ai < anchors.length; ai++) {
            var href = (anchors[ai].getAttribute('href') || '').toLowerCase();
            for (var hi = 0; hi < hps.length; hi++) {
              if (href.indexOf(hps[hi]) !== -1) return anchors[ai];
            }
          }
          // Strategi 4: ID/class pattern (hanya ID yang sangat spesifik)
          for (var pi = 0; pi < ips.length; pi++) {
            var byId = doc.getElementById(ips[pi]);
            if (byId) return byId;
          }
        } catch(e) {}
        return null;
      }

      function getAllDocs() {
        var docs = [document];
        try {
          for (var f = 0; f < window.frames.length; f++) {
            try { docs.push(window.frames[f].document); } catch(e) {}
          }
        } catch(e) {}
        try {
          var iframes = document.querySelectorAll('iframe');
          for (var fi = 0; fi < iframes.length; fi++) {
            try { if (iframes[fi].contentDocument) docs.push(iframes[fi].contentDocument); } catch(e) {}
          }
        } catch(e) {}
        return docs;
      }

      var docs = getAllDocs();
      var found = null;
      for (var d = 0; d < docs.length && !found; d++) {
        found = searchInDoc(docs[d]);
      }

      if (found) {
        doClick(found);
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: '${eventType}',
          text: (found.textContent || found.innerText || '').trim()
        }));
      } else {
        var links = [];
        for (var dd = 0; dd < docs.length; dd++) {
          try {
            var allEls = docs[dd].querySelectorAll('a,li,button,span,td');
            for (var x = 0; x < allEls.length && links.length < 100; x++) {
              var t3 = (allEls[x].textContent || allEls[x].innerText || '').trim();
              var h2 = allEls[x].getAttribute ? (allEls[x].getAttribute('href') || '') : '';
              var id2 = allEls[x].id || '';
              if (t3.length > 1 && t3.length < 40 && t3.indexOf('\\n') === -1 && links.indexOf(t3) === -1) {
                links.push(t3 + (h2 ? '→'+h2 : '') + (id2 ? '#'+id2 : ''));
              }
            }
          } catch(e) {}
        }
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'DEBUG_LINKS',
          stage: '${eventType}',
          frameCount: docs.length,
          links: links
        }));
      }
    })();
    true;
  `;
}

export const ModemWebViewScreen: React.FC<ModemWebViewScreenProps> = ({ 
  ipAddress, 
  onBack,
  theme,
  toggleTheme,
  isTechMode,
  customUsername,
  customPassword
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
    headerBg: isDark ? '#111322' : '#FFFFFF',
    headerBorder: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.06)',
    cardBg: isDark ? '#0F172A' : '#F1F5F9',
    cardBorder: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.05)',
    divider: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.08)',
    buttonBg: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(15, 23, 42, 0.04)',
    activeBlue: '#06B6D4',
    activeBlueText: isDark ? '#06B6D4' : '#0891B2',
    savingBg: isDark ? 'rgba(6,182,212,0.08)' : 'rgba(6,182,212,0.05)',
    savingBorder: isDark ? 'rgba(6,182,212,0.2)' : 'rgba(6,182,212,0.15)',
    noteBg: isDark ? 'rgba(239, 68, 68, 0.04)' : 'rgba(239, 68, 68, 0.03)',
    noteBorder: isDark ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.06)',
    noteText: isDark ? '#64748B' : '#475569',
  };

  const usernameToUse = customUsername && customUsername.trim().length > 0 ? customUsername : 'superadmin';
  const passwordToUse = customPassword && customPassword.trim().length > 0 ? customPassword : 'suportadmin';
  const autoFillScript = makeAutoFillScript(usernameToUse, passwordToUse);

  const webViewRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack]         = useState(false);
  const [canGoForward, setCanGoForward]   = useState(false);
  const [currentUrl, setCurrentUrl]       = useState(`http://${ipAddress}`);
  const navPhaseRef = useRef<NavPhase>('idle');

  // Progress card state: 0=idle, 1=loading, 2=done, 3=error
  type StepStatus = 'idle' | 'loading' | 'done';
  const [showProgress, setShowProgress]   = useState(false);
  const [stepLogin, setStepLogin]         = useState<StepStatus>('idle');
  const [stepNetwork, setStepNetwork]     = useState<StepStatus>('idle');
  const [stepWlan, setStepWlan]           = useState<StepStatus>('idle');
  const [diagStep, setDiagStep]           = useState<'idle' | 'status' | 'netitf' | 'read' | 'done'>('idle');
  const cardOpacity = useRef(new Animated.Value(0)).current;

  // States untuk membaca & menyimpan data WiFi (SSID/Password) secara native
  const [currentSsid, setCurrentSsid] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newSsid, setNewSsid] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isWlanLoaded, setIsWlanLoaded] = useState(false);
  const [showWlanForm, setShowWlanForm] = useState(false);
  const [activeMenu, setActiveMenu] = useState<'menu' | 'wlan' | 'devices' | 'status' | 'reboot'>('menu');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showRebootModal, setShowRebootModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isScanningDevices, setIsScanningDevices] = useState(false);
  const [rebootStep, setRebootStep] = useState<'idle' | 'warning' | 'rebooting' | 'completed'>('idle');
  const [rebootCountdown, setRebootCountdown] = useState(60);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [wlanCountdown, setWlanCountdown] = useState(60);
  const [showWlanSuccessModal, setShowWlanSuccessModal] = useState(false);
  const [showSessionTimeoutModal, setShowSessionTimeoutModal] = useState(false);
  const [showWebView, setShowWebView] = useState(false);
  const [selectedSsid, setSelectedSsid] = useState('IGD.LD1.WLAN1');
  const [isSwitchingSsid, setIsSwitchingSsid] = useState(false);
  const [automationError, setAutomationError] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [securePassword, setSecurePassword] = useState(true);
  const formHeightAnim = useRef(new Animated.Value(0)).current;
  const isWlanFormValid = newSsid.trim().length > 0 && newPassword.length >= 8;

  // State real device list (dari DHCP lease table modem)
  type RealDevice = { name: string; ip: string; mac: string; port: string };
  const [realDevices, setRealDevices] = useState<RealDevice[]>([]);
  const [scanDevicesTimeout, setScanDevicesTimeout] = useState(false);
  const devicesTimerRef = useRef<NodeJS.Timeout | null>(null);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const inactivityProgress = useRef(new Animated.Value(0)).current;

  // State real diagnostics (dari status page modem)
  type RealDiag = { rxPower: string; txPower: string; uptime: string; wanIp: string; firmware: string; temp: string; ponStatus: string };
  const [realDiag, setRealDiag] = useState<RealDiag | null>(null);
  const [diagLogs, setDiagLogs] = useState<string[]>([]);
  // Ref untuk mencegah injectDiagLogger dipanggil berulang setelah data ditemukan
  const diagDataFoundRef = useRef(false);

  const parseRxPower = (valStr?: string) => {
    if (!valStr) return null;
    const match = valStr.match(/-?\d+(\.\d+)?/);
    if (!match) return null;
    let num = parseFloat(match[0]);
    // Paksa nilai menjadi negatif karena redaman RX fiber selalu bernilai negatif
    if (num > 0) {
      num = -num;
    }
    return num;
  };

  const getRxPowerRating = (rxNum: number | null) => {
    if (rxNum === null) return { text: 'Membaca...', color: '#64748B', bg: 'rgba(100, 116, 139, 0.1)' };
    if (rxNum <= -29) return { text: 'Sangat Lemah / Rawan Putus', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)' };
    if (rxNum <= -26) return { text: 'Sinyal Lemah', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)' };
    if (rxNum <= -7) return { text: 'Sangat Baik (Optimal)', color: '#10B981', bg: 'rgba(16, 189, 129, 0.15)' };
    if (rxNum <= -5) return { text: 'Normal', color: '#06B6D4', bg: 'rgba(6, 182, 212, 0.15)' };
    return { text: 'Terlalu Kuat (Overload)', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)' };
  };

  // Band WiFi aktif yang dipilih (2.4GHz = WLAN1, 5GHz = WLAN5)
  const [activeBand, setActiveBand] = useState<'2.4GHz' | '5GHz'>('2.4GHz');

  const wifiScale = useRef(new Animated.Value(1)).current;
  const orbitRotation = useRef(new Animated.Value(0)).current;

  // Efek animasi rotasi orbit radar yang super mulus
  useEffect(() => {
    let animation: any;
    if (activeMenu === 'menu') {
      orbitRotation.setValue(0);
      animation = Animated.loop(
        Animated.timing(orbitRotation, {
          toValue: 1,
          duration: 8000,
          useNativeDriver: true,
        })
      );
      animation.start();
    }
    return () => {
      if (animation) {
        animation.stop();
      }
    };
  }, [orbitRotation, activeMenu]);

  // Efek animasi bernapas (breathing scale) untuk ikon WiFi di pusat
  useEffect(() => {
    let animation: any;
    if (activeMenu === 'menu') {
      wifiScale.setValue(1);
      animation = Animated.loop(
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
      );
      animation.start();
    }
    return () => {
      if (animation) {
        animation.stop();
      }
    };
  }, [wifiScale, activeMenu]);

  // Interpolasi derajat putaran orbit
  const spinClockwise = orbitRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  const spinCounterClockwise = orbitRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['360deg', '0deg']
  });

  const timeoutRotation = inactivityProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  // Efek timer hitung mundur untuk reboot modem
  useEffect(() => {
    let intervalId: any;
    if (rebootStep === 'rebooting') {
      intervalId = setInterval(() => {
        setRebootCountdown(prev => prev - 1);
      }, 1000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [rebootStep]);

  // Efek memantau hitungan mundur untuk menyelesaikan status reboot
  useEffect(() => {
    if (rebootStep === 'rebooting' && rebootCountdown <= 0) {
      setRebootStep('completed');
      setShowSuccessModal(true);
    }
  }, [rebootCountdown, rebootStep]);

  // Efek timer hitung mundur untuk simpan konfigurasi WLAN
  useEffect(() => {
    let intervalId: any;
    if (saveStatus === 'saving') {
      intervalId = setInterval(() => {
        setWlanCountdown(prev => prev - 1);
      }, 1000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [saveStatus]);

  // Efek memantau hitungan mundur untuk menyelesaikan status simpan WLAN
  useEffect(() => {
    if (saveStatus === 'saving' && wlanCountdown <= 0) {
      setSaveStatus('success');
      setShowWlanSuccessModal(true);
    }
  }, [wlanCountdown, saveStatus]);

  // Jika bukan mode teknisi, sembunyikan WebView secara paksa
  useEffect(() => {
    if (!isTechMode && showWebView) {
      setShowWebView(false);
    }
  }, [isTechMode]);

  // Timeout 10 detik untuk scan perangkat terhubung jika loading macet
  useEffect(() => {
    if (isScanningDevices) {
      setScanDevicesTimeout(false);
      if (devicesTimerRef.current) clearTimeout(devicesTimerRef.current);
      devicesTimerRef.current = setTimeout(() => {
        setScanDevicesTimeout(true);
      }, 10000);
    } else {
      if (devicesTimerRef.current) {
        clearTimeout(devicesTimerRef.current);
        devicesTimerRef.current = null;
      }
      setScanDevicesTimeout(false);
    }
    return () => {
      if (devicesTimerRef.current) clearTimeout(devicesTimerRef.current);
    };
  }, [isScanningDevices]);

  // Efek tombol kembali fisik perangkat (BackHandler)
  // Menjaga agar jika user di sub-menu (WLAN, Devices, Status, Reboot), dia tidak terlempar keluar dari sesi/login
  useEffect(() => {
    const backAction = () => {
      if (isWlanLoaded && activeMenu !== 'menu') {
        setActiveMenu('menu');
        return true; // blokir aksi bawaan (kembali ke dashboard)
      }
      return false; // biarkan aksi bawaan (kembali ke dashboard) berjalan
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [isWlanLoaded, activeMenu]);

  // Timer batas waktu otomasi (Timeout 30 detik untuk pencegahan stuck)
  useEffect(() => {
    if (isWlanLoaded || automationError) return;
    const timer = setTimeout(() => {
      if (!isWlanLoaded && !automationError) {
        setAutomationError(
          'Gagal memuat pengaturan modem secara otomatis. Batas waktu koneksi (timeout 30 detik) terlampaui. Pastikan HP terhubung ke WiFi modem.'
        );
      }
    }, 30000);
    return () => clearTimeout(timer);
  }, [isWlanLoaded, automationError]);

  // Trigger scan otomatis ketika masuk ke menu Perangkat Terhubung (devices) atau Status Diagnostik (status)
  useEffect(() => {
    if (isWlanLoaded) {
      if (activeMenu === 'devices') {
        injectReadDevices();
      } else if (activeMenu === 'status') {
        setRealDiag(null);
        setDiagLogs([]);
        setDiagStep('status');
        // Reset flag agar logger bisa berjalan kembali di sesi baru
        diagDataFoundRef.current = false;
        navPhaseRef.current = 'diag_status';
        injectClickDiagStatus();
        injectDiagLogger();
      }
    }
  }, [activeMenu, isWlanLoaded]);

  // Efek transisi spring untuk form edit WiFi ketika data WLAN terdeteksi
  useEffect(() => {
    if (showWlanForm) {
      Animated.spring(formHeightAnim, {
        toValue: 1,
        tension: 40,
        friction: 7,
        useNativeDriver: true
      }).start();
    } else {
      Animated.timing(formHeightAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true
      }).start();
    }
  }, [showWlanForm]);

  // Kembalikan nilai form input ke konfigurasi aktif asli jika form ditutup atau kembali ke menu dashboard
  useEffect(() => {
    if (activeMenu !== 'wlan' && !showWlanForm) {
      setNewSsid(currentSsid);
      setNewPassword(currentPassword);
    }
  }, [activeMenu, showWlanForm, currentSsid, currentPassword]);

  // Fungsi untuk mereset timer inaktivitas (3 menit tanpa gerakan)
  const resetInactivityTimer = () => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    
    inactivityProgress.stopAnimation();
    inactivityProgress.setValue(0);
    
    // Hanya pasang timer jika data WLAN sudah terload (artinya user sudah di dalam sesi dashboard/sub-menu)
    // dan tidak sedang dalam proses kritis (saving/rebooting)
    if (isWlanLoaded && saveStatus !== 'saving' && rebootStep !== 'rebooting') {
      Animated.timing(inactivityProgress, {
        toValue: 1,
        duration: 3 * 60 * 1000, // 3 menit
        useNativeDriver: true,
        easing: Easing.linear,
      }).start(({ finished }) => {
        if (finished) {
          console.log('[INACTIVITY] Tidak ada pergerakan selama 3 menit. Sesi berakhir.');
          setShowSessionTimeoutModal(true);
        }
      });
    }
  };

  // Jalankan / reset timer inaktivitas saat data terload, menu berubah, atau status simpan/reboot berubah
  useEffect(() => {
    resetInactivityTimer();
    return () => {
      inactivityProgress.stopAnimation();
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [isWlanLoaded, activeMenu, saveStatus, rebootStep]);

  // Langkah 1: Navigasi ke Halaman Reboot Modem ZTE
  const injectRebootPage = () => {
    navPhaseRef.current = 'reboot';
    webViewRef.current?.injectJavaScript(`
      (function() {
        function log(msg) {
          try { window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'DIAG_LOG', logs: ['[REBOOT NAV] ' + msg] })); } catch(e) {}
        }
        log("Mulai injeksi halaman reboot...");
        
        function getAllDocs() {
          var docs = [document];
          try { for (var f = 0; f < window.frames.length; f++) { try { docs.push(window.frames[f].document); } catch(e) {} } } catch(e) {}
          try { var ifs = document.querySelectorAll('iframe'); for (var fi = 0; fi < ifs.length; fi++) { try { if (ifs[fi].contentDocument) docs.push(ifs[fi].contentDocument); } catch(e) {} } } catch(e) {}
          return docs;
        }
        var docs = getAllDocs();
        var activePid = "1002";
        for (var ad = 0; ad < docs.length; ad++) {
          try {
            var anchors = docs[ad].querySelectorAll('a[href], [onclick]');
            for (var ai = 0; ai < anchors.length; ai++) {
              var str = (anchors[ai].getAttribute('href') || '') + (anchors[ai].getAttribute('onclick') || '');
              var match = str.match(/pid=(\d+)/i);
              if (match && match[1]) {
                activePid = match[1];
                break;
              }
            }
          } catch(e) {}
          if (activePid !== "1002") break;
        }
        log("Active PID yang ditemukan: " + activePid);

        // Coba cari menu Reboot dan klik
        var clicked = false;
        for (var d = 0; d < docs.length; d++) {
          try {
            var doc = docs[d];
            var els = doc.querySelectorAll('a, span, td, font, li');
            for (var i = 0; i < els.length; i++) {
              var txt = (els[i].textContent || '').toLowerCase().trim();
              var id = (els[i].id || '').toLowerCase();
              var href = (els[i].getAttribute('href') || '').toLowerCase();
              if (txt === 'reboot' || txt === 'mulai ulang' || txt === 'restart' || id === 'smdevreboot' || id.indexOf('reboot') !== -1 || href.indexOf('reboot') !== -1) {
                var clickTarget = els[i];
                while (clickTarget && clickTarget.tagName !== 'TR' && clickTarget.tagName !== 'A' && !clickTarget.onclick) {
                  clickTarget = clickTarget.parentElement;
                }
                if (clickTarget) {
                  log("Menemukan menu Reboot: " + txt + " (ID: " + id + ")");
                  clickTarget.click();
                  clickTarget.dispatchEvent(new MouseEvent('click', {bubbles:true}));
                  clicked = true;
                  break;
                }
              }
            }
            if (clicked) break;
          } catch(e) {}
        }

        // Jika tidak ada menu, arahkan via openLink atau URL langsung
        if (!clicked) {
          log("Menu Reboot tidak ditemukan, mencoba navigasi URL dengan PID: " + activePid);
          try {
            var navWin = window;
            if (typeof openLink !== 'function') {
              if (parent && typeof parent.openLink === 'function') navWin = parent;
              else if (top && typeof top.openLink === 'function') navWin = top;
              else {
                for (var ad = 0; ad < docs.length; ad++) {
                  try {
                    if (docs[ad].defaultView && typeof docs[ad].defaultView.openLink === 'function') {
                      navWin = docs[ad].defaultView;
                      break;
                    }
                  } catch(e) {}
                }
              }
            }
            if (typeof navWin.openLink === 'function') {
              log("Navigasi via openLink...");
              navWin.openLink('getpage.gch?pid=' + activePid + '&nextpage=manager_dev_restart_t.gch');
            } else {
              log("Navigasi via window.location...");
              if (window.top) {
                window.top.location.href = 'getpage.gch?pid=' + activePid + '&nextpage=manager_dev_restart_t.gch';
              } else {
                window.location.href = 'getpage.gch?pid=' + activePid + '&nextpage=manager_dev_restart_t.gch';
              }
            }
          } catch(e) {
            log("Navigasi error: " + e.message);
            window.location.href = 'getpage.gch?pid=' + activePid + '&nextpage=manager_dev_restart_t.gch';
          }
        }
      })();
      true;
    `);
  };

  // Langkah 2: Klik Tombol Reboot & Bypass Dialog Konfirmasi Modem
  const injectClickRebootButton = () => {
    webViewRef.current?.injectJavaScript(`
      (function() {
        if (window.agRebootBtnTimer) {
          clearTimeout(window.agRebootBtnTimer);
        }
        
        var retries = 0;
        var maxRetries = 15;

        function log(msg) {
          try { window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'DIAG_LOG', logs: ['[REBOOT BTN] ' + msg] })); } catch(e) {}
        }

        function tryClickReboot() {
          log("Mencari tombol reboot utama (percobaan " + (retries + 1) + ")...");
          var docs = [];
          function collect(win) {
            try {
              if (win.document && docs.indexOf(win.document) === -1) {
                docs.push(win.document);
              }
            } catch(e) {}
            try {
              for (var i = 0; i < win.frames.length; i++) {
                collect(win.frames[i]);
              }
            } catch(e) {}
          }
          collect(window);

          var clicked = false;

          for (var i = 0; i < docs.length; i++) {
            try {
              var doc = docs[i];
              if (doc.defaultView) {
                doc.defaultView.confirm = function() { return true; };
              }

              // Cek jika popup konfirmasi (msgconfirmb) sudah ada duluan
              var confirmBtn = doc.getElementById('msgconfirmb');
              if (confirmBtn) {
                log("Popup konfirmasi ditemukan duluan! Mengklik...");
                confirmBtn.click();
                clicked = true;
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'REBOOT_CLICKED_SUCCESS', detail: 'popup' }));
                return;
              }

              // Coba fungsi bypass ZTE F663V3A langsung untuk kecepatan maksimal
              if (doc.defaultView && typeof doc.defaultView.msgCallback === 'function') {
                 log("Mengeksekusi bypass ZTE msgCallback()...");
                 doc.defaultView.msgCallback();
                 clicked = true;
                 window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'REBOOT_CLICKED_SUCCESS', detail: 'bypass' }));
                 return;
              }

              // Cari tombol Reboot utama
              var buttons = doc.querySelectorAll('input[type="button"], input[type="submit"], button');
              for (var b = 0; b < buttons.length; b++) {
                var val = (buttons[b].value || buttons[b].textContent || buttons[b].innerText || '').toLowerCase().trim();
                var id = (buttons[b].id || '').toLowerCase();
                var name = (buttons[b].name || '').toLowerCase();

                if (
                  id === 'btn_reboot' || id === 'reboot' || id === 'submit1' || 
                  val === 'reboot' || val === 'mulai ulang' || val.indexOf('reboot') !== -1 ||
                  name === 'reboot' || name === 'btn_reboot'
                ) {
                  if (val.indexOf('default') === -1 && id.indexOf('default') === -1) {
                    log("Tombol reboot utama ditemukan (ID: " + id + ", Value: " + val + ")");
                    
                    // Coba panggil fungsi bypass jika tersedia
                    if (doc.defaultView && typeof doc.defaultView.uiDoReboot === 'function') {
                      log("Memanggil fungsi uiDoReboot()...");
                      doc.defaultView.uiDoReboot();
                    } else if (doc.defaultView && typeof doc.defaultView.btnReboot === 'function') {
                      log("Memanggil fungsi btnReboot()...");
                      doc.defaultView.btnReboot();
                    } else if (doc.defaultView && typeof doc.defaultView.Submit === 'function' && id === 'btn_reboot') {
                      log("Memanggil fungsi Submit()...");
                      doc.defaultView.Submit();
                    } else {
                      log("Melakukan klik tombol secara simulasi...");
                      buttons[b].click();
                      buttons[b].dispatchEvent(new MouseEvent('click', {bubbles:true}));
                    }

                    clicked = true;
                    
                    // Tunggu sesaat barangkali popup muncul setelah klik
                    setTimeout(function() {
                      for (var x = 0; x < docs.length; x++) {
                        try {
                          var cBtn = docs[x].getElementById('msgconfirmb');
                          if (cBtn) {
                            log("Popup konfirmasi muncul pasca-klik! Mengklik...");
                            cBtn.click();
                            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'REBOOT_CLICKED_SUCCESS', detail: 'delayed_popup' }));
                          }
                        } catch(err) {}
                      }
                    }, 500);

                    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'REBOOT_CLICKED_SUCCESS', detail: 'button' }));
                    return;
                  }
                }
              }
            } catch(e) {}
          }

          if (!clicked) {
            retries++;
            if (retries < maxRetries) {
              window.agRebootBtnTimer = setTimeout(tryClickReboot, 800);
            } else {
              log("Gagal menemukan tombol reboot setelah 15 percobaan!");
              // DEBUG DUMP: Crawl halaman dan kumpulkan info untuk dikirim ke terminal
              var debugInfo = [];
              for (var d = 0; d < docs.length; d++) {
                try {
                  var docUrl = docs[d].defaultView ? docs[d].defaultView.location.href : 'unknown';
                  debugInfo.push("FRAME " + d + " URL: " + docUrl);
                  
                  var btns = docs[d].querySelectorAll('input[type="button"], input[type="submit"], button, a, span, td');
                  var btnList = [];
                  for (var x = 0; x < btns.length && btnList.length < 40; x++) {
                    var text = (btns[x].textContent || btns[x].innerText || btns[x].value || '').replace(/\\s+/g, ' ').trim();
                    var id = btns[x].id || '';
                    if (text && text.length > 2 && text.length < 30) {
                      btnList.push((id ? '#' + id + ':' : '') + text);
                    }
                  }
                  debugInfo.push("ELEMEN DI FRAME " + d + ": " + btnList.join(' | '));
                } catch(e) {}
              }
              log("DEBUG DUMP: " + debugInfo.join(' \\n '));
            }
          }
        }

        tryClickReboot();
      })();
      true;
    `);
  };

  const handleInjectReboot = () => {
    setShowRebootModal(false);
    setRebootStep('rebooting');
    setRebootCountdown(60);
    injectRebootPage();
    
    // Fallback: Pastikan injectClickRebootButton tetap dipanggil meskipun navigasi openLink di dalam iframe tidak memicu onNavigationStateChange
    setTimeout(injectClickRebootButton, 2000);
  };

  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: 'Kosong', color: '#64748B' };
    let score = 0;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[a-z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;
    
    if (pass.length < 8) {
      return { score: 1, label: 'Sangat Lemah (Min. 8 Karakter)', color: '#EF4444' };
    }
    
    switch (score) {
      case 1:
      case 2:
        return { score: 1, label: 'Lemah', color: '#EF4444' };
      case 3:
        return { score: 2, label: 'Sedang', color: '#F59E0B' };
      case 4:
        return { score: 3, label: 'Kuat', color: '#10B981' };
      case 5:
        return { score: 4, label: 'Sangat Kuat', color: '#06B6D4' };
      default:
        return { score: 0, label: 'Sangat Lemah', color: '#EF4444' };
    }
  };

  const handleSsidChange = (ssidValue: string) => {
    if (isSwitchingSsid) return;
    setIsSwitchingSsid(true);
    setSelectedSsid(ssidValue);
    // Sinkronkan label band WiFi berdasarkan SSID yang dipilih
    if (ssidValue.toUpperCase().includes('WLAN5') || ssidValue.includes('5G')) {
      setActiveBand('5GHz');
    } else {
      setActiveBand('2.4GHz');
    }
    setIsWlanLoaded(false);
    setStepWlan('loading');
    navPhaseRef.current = 'wlan'; // reset phase to load details

    // Injeksi skrip ganti SSID di webview
    webViewRef.current?.injectJavaScript(`
      (function() {
        function getAllDocs() {
          var docs = [document];
          try { for (var f = 0; f < window.frames.length; f++) { try { docs.push(window.frames[f].document); } catch(e) {} } } catch(e) {}
          try { var ifs = document.querySelectorAll('iframe'); for (var fi = 0; fi < ifs.length; fi++) { try { if (ifs[fi].contentDocument) docs.push(ifs[fi].contentDocument); } catch(e) {} } } catch(e) {}
          return docs;
        }
        var docs = getAllDocs();
        for (var i = 0; i < docs.length; i++) {
          var doc = docs[i];
          var select = doc.getElementById('Frm_SSID_SET');
          if (select) {
            select.value = ${JSON.stringify(ssidValue)};
            // Panggil fungsi ESSID_Choose bawaan ZTE jika ada
            if (typeof doc.defaultView.ESSID_Choose === 'function') {
              doc.defaultView.ESSID_Choose();
              return 'CALL_ESSID_CHOOSE';
            }
            if (typeof select.onchange === 'function') {
              select.onchange();
              return 'TRIGGER_ONCHANGE';
            }
            var evt = doc.createEvent('HTMLEvents');
            evt.initEvent('change', true, true);
            select.dispatchEvent(evt);
            return 'DISPATCH_CHANGE';
          }
        }
        return 'NOT_FOUND';
      })();
      true;
    `);

    // Tunggu modem selesai memuat halaman SSID baru, lalu baca datanya kembali
    setTimeout(() => {
      navPhaseRef.current = 'done';
      setStepWlan('done');
      setIsSwitchingSsid(false);
      injectReadWlanDetails();
    }, 2800);
  };

  // Keluar dari sesi secara aman (menghapus cookie/session aktif di modem)
  const handleBackWithLogout = () => {
    setIsLoggingOut(true);
    webViewRef.current?.injectJavaScript(`
      (function() {
        function getAllDocs() {
          var docs = [document];
          try { for (var f = 0; f < window.frames.length; f++) { try { docs.push(window.frames[f].document); } catch(e) {} } } catch(e) {}
          return docs;
        }
        var docs = getAllDocs();
        for (var i = 0; i < docs.length; i++) {
          var doc = docs[i];
          if (typeof doc.defaultView.onClickLogout === 'function') {
            try { doc.defaultView.onClickLogout(); return 'CALL_ONCLICKLOGOUT'; } catch(e){}
          }
          var links = doc.getElementsByTagName('a');
          for (var j = 0; j < links.length; j++) {
            if (links[j].textContent.toLowerCase().indexOf('logout') !== -1) {
              links[j].click(); return 'CLICK_LOGOUT_LINK';
            }
          }
          var flogout = doc.getElementById('flogout') || doc.forms['flogout'];
          if (flogout) {
            try { flogout.submit(); return 'SUBMIT_FLOGOUT'; } catch(e){}
          }
        }
        return 'NO_LOGOUT_METHOD';
      })();
      true;
    `);

    // Beri waktu request logout sampai ke modem, lalu panggil callback onBack
    setTimeout(() => {
      setIsLoggingOut(false);
      onBack();
    }, 1200);
  };

  const showCard = () => {
    setShowProgress(true);
    Animated.timing(cardOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  };

  const hideCard = () => {
    Animated.timing(cardOpacity, { toValue: 0, duration: 500, useNativeDriver: true }).start(() => {
      setShowProgress(false);
      // Reset semua step untuk sesi berikutnya
      setStepLogin('idle'); setStepNetwork('idle'); setStepWlan('idle');
    });
  };

  const injectClickNetwork = () => {
    if (navPhaseRef.current !== 'network') return; // Sudah selesai atau belum waktunya
    webViewRef.current?.injectJavaScript(
      makeClickScript(
        // Keyword teks (lowercase)
        ['network','jaringan','net','advanced','wide area network','internet','wan'],
        // Keyword href
        ['network','net','wan','internet','advanced'],
        // Keyword id/class
        ['mmNet','mnuNet','net','network','menuNet','navNet','liNet'],
        'NAV_NETWORK_CLICKED'
      )
    );
  };

  const injectClickWlan = () => {
    if (navPhaseRef.current !== 'wlan') return; // Sudah selesai, stop retry
    webViewRef.current?.injectJavaScript(`
      (function() {
        function getAllDocs() {
          var docs = [document];
          try { for (var f = 0; f < window.frames.length; f++) { try { docs.push(window.frames[f].document); } catch(e) {} } } catch(e) {}
          try { var ifs = document.querySelectorAll('iframe'); for (var fi = 0; fi < ifs.length; fi++) { try { if (ifs[fi].contentDocument) docs.push(ifs[fi].contentDocument); } catch(e) {} } } catch(e) {}
          return docs;
        }

        function tryAll(doc) {
          // Strategi 1: ZTE spesifik — cari font/td dengan id="smWLAN" lalu klik parent TR
          var smWlan = doc.getElementById('smWLAN');
          if (smWlan) {
            // Cari parent TR yang punya onclick
            var el = smWlan;
            while (el && el.tagName !== 'TR') el = el.parentElement;
            if (el && el.onclick) { el.click(); return 'TR_smWLAN'; }
            if (smWlan.parentElement && smWlan.parentElement.onclick) { smWlan.parentElement.click(); return 'TD_smWLAN'; }
          }

          // Strategi 2: Langsung panggil fungsi openLink modem untuk WLAN ZTE
          try {
            if (typeof OnMenuItemClick === 'function' && typeof openLink === 'function') {
              OnMenuItemClick('mmNet', 'smWLAN');
              openLink('getpage.gch?pid=1002&nextpage=pon_net_wlan_conf1_t.gch');
              return 'DIRECT_OPENLINK';
            }
          } catch(e) {}

          // Strategi 3: Cari TR yang onclick-nya mengandung smWLAN
          var rows = doc.querySelectorAll('tr[onclick*="smWLAN"]');
          if (rows.length > 0) { rows[0].click(); return 'TR_ONCLICK'; }

          // Strategi 4: Cari elemen teks "WLAN" exact match
          var tags = ['a','li','td','span','div','font','button'];
          for (var t = 0; t < tags.length; t++) {
            var els = doc.querySelectorAll(tags[t]);
            for (var i = 0; i < els.length; i++) {
              var txt = (els[i].textContent || els[i].innerText || '').trim();
              if (txt === 'WLAN') {
                // Klik parent TR jika ada onclick
                var p = els[i];
                while (p && p.tagName !== 'TR') p = p.parentElement;
                if (p && p.onclick) { p.click(); return 'TR_TEXT'; }
                // Atau klik elemen itu sendiri dengan mouse events
                els[i].dispatchEvent(new MouseEvent('click', {bubbles:true}));
                return 'EL_TEXT';
              }
            }
          }
          return null;
        }

        var docs = getAllDocs();
        var result = null;
        for (var d = 0; d < docs.length && !result; d++) {
          result = tryAll(docs[d]);
        }

        if (result) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'NAV_WLAN_CLICKED', text: result }));
        } else {
          // Debug: kumpulkan semua ID dan teks elemen
          var links = [];
          for (var dd = 0; dd < docs.length; dd++) {
            try {
              var allEls = docs[dd].querySelectorAll('tr,td,font,a,li,span');
              for (var x = 0; x < allEls.length && links.length < 60; x++) {
                var t2 = (allEls[x].textContent || '').trim();
                var id2 = allEls[x].id || '';
                var oc = allEls[x].onclick ? '✓' : '';
                if (t2.length > 0 && t2.length < 30 && links.indexOf(t2) === -1) {
                  links.push((id2 ? '#'+id2+' ' : '') + oc + t2);
                }
              }
            } catch(e) {}
          }
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'DEBUG_LINKS', stage: 'NAV_WLAN_CLICKED', frameCount: docs.length, links: links }));
        }
      })();
      true;
    `);
  };

  const injectReadWlanDetails = () => {
    if (navPhaseRef.current !== 'done') return; // Hanya baca setelah selesai navigasi
    webViewRef.current?.injectJavaScript(`
      (function() {
        function getAllDocs() {
          var docs = [document];
          try { for (var f = 0; f < window.frames.length; f++) { try { docs.push(window.frames[f].document); } catch(e) {} } } catch(e) {}
          try { var ifs = document.querySelectorAll('iframe'); for (var fi = 0; fi < ifs.length; fi++) { try { if (ifs[fi].contentDocument) docs.push(ifs[fi].contentDocument); } catch(e) {} } } catch(e) {}
          return docs;
        }
        
        var docs = getAllDocs();
        for (var i = 0; i < docs.length; i++) {
          var doc = docs[i];
          var ssidEl = doc.getElementById('Frm_ESSID') || doc.getElementById('ESSID');
          var passEl = doc.getElementById('Frm_KeyPassphrase') || doc.getElementById('KeyPassphrase');
          var selectEl = doc.getElementById('Frm_SSID_SET');
          if (ssidEl || passEl) {
            var ssidVal = ssidEl ? (ssidEl.value || '') : '';
            var passVal = passEl ? (passEl.value || '') : '';
            var activeSsidIndex = selectEl ? selectEl.value : '';
            
            // Fallback jika text input masih kosong tapi ada hidden input bawaan
            if (!ssidVal) {
              var hiddenSsid = doc.getElementById('ESSID');
              if (hiddenSsid) ssidVal = hiddenSsid.value;
            }
            if (!passVal) {
              var hiddenPass = doc.getElementById('KeyPassphrase');
              if (hiddenPass) passVal = hiddenPass.value;
            }
            
            if (ssidVal || passVal) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'WLAN_DATA_READ',
                ssid: ssidVal,
                password: passVal,
                selectedSsidIndex: activeSsidIndex
              }));
              return true;
            }
          }
        }
        return false;
      })();
      true;
    `);
  };

  const injectSaveWlanDetails = (ssid: string, password: string) => {
    setWlanCountdown(60);
    setSaveStatus('saving');
    webViewRef.current?.injectJavaScript(`
      (function() {
        function getAllDocs() {
          var docs = [document];
          try { for (var f = 0; f < window.frames.length; f++) { try { docs.push(window.frames[f].document); } catch(e) {} } } catch(e) {}
          try { var ifs = document.querySelectorAll('iframe'); for (var fi = 0; fi < ifs.length; fi++) { try { if (ifs[fi].contentDocument) docs.push(ifs[fi].contentDocument); } catch(e) {} } } catch(e) {}
          return docs;
        }

        function setVal(el, val) {
          if (!el) return false;
          el.value = val;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        }

        var docs = getAllDocs();
        for (var i = 0; i < docs.length; i++) {
          var doc = docs[i];
          var ssidEl = doc.getElementById('Frm_ESSID');
          var passEl = doc.getElementById('Frm_KeyPassphrase');
          
          if (ssidEl && passEl) {
            setVal(ssidEl, ${JSON.stringify(ssid)});
            setVal(passEl, ${JSON.stringify(password)});
            
            // Cari tombol submit bawaan modem
            var submitBtn = doc.getElementById('Btn_Submit');
            if (submitBtn) {
              submitBtn.click();
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'WLAN_SAVE_SUBMITTED' }));
              return true;
            }
            
            // Fallback panggil fungsi pageSubmit
            if (typeof doc.defaultView.pageSubmit === 'function') {
              doc.defaultView.pageSubmit();
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'WLAN_SAVE_SUBMITTED' }));
              return true;
            }
          }
        }
        return false;
      })();
      true;
    `);
  };

  // Membaca langsung daftar perangkat terhubung dari DHCP lease table (tanpa navigasi ulang)
  const injectOnlyReadDevices = () => {
    setIsScanningDevices(true);
    navPhaseRef.current = 'devices';
    webViewRef.current?.injectJavaScript(`
      (function() {
        function getAllDocs() {
          var docs = [document];
          try { for (var f = 0; f < window.frames.length; f++) { try { docs.push(window.frames[f].document); } catch(e) {} } } catch(e) {}
          try { var ifs = document.querySelectorAll('iframe'); for (var fi = 0; fi < ifs.length; fi++) { try { if (ifs[fi].contentDocument) docs.push(ifs[fi].contentDocument); } catch(e) {} } } catch(e) {}
          return docs;
        }
        var docs = getAllDocs();
        var devices = [];
        for (var d = 0; d < docs.length; d++) {
          try {
            var doc = docs[d];
            var instNum = doc.getElementById('IF_INSTNUM');
            if (!doc.getElementById('IF_INSTNUM')) continue;
            var num = parseInt(instNum.value || '0', 10);
            for (var i = 0; i < num; i++) {
              var ipEl  = doc.getElementById('IPAddr'  + i);
              var macEl = doc.getElementById('MACAddr' + i);
              var nameEl= doc.getElementById('HostName'+ i);
              var portEl= doc.getElementById('PhyPortName'+i);
              if (ipEl && ipEl.value) {
                devices.push({
                  ip  : ipEl.value,
                  mac : macEl  ? macEl.value   : '-',
                  name: nameEl ? nameEl.value  : '',
                  port: portEl ? portEl.value  : '-'
                });
              }
            }
            if (devices.length > 0) break;
          } catch(e) {}
        }
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'DEVICE_DATA_READ', devices: devices }));
      })();
      true;
    `);
  };

  // Membaca daftar perangkat terhubung dari DHCP lease table ZTE F663V3A (Navigasi jika belum di halaman)
  const injectReadDevices = () => {
    setIsScanningDevices(true);
    navPhaseRef.current = 'devices';
    webViewRef.current?.injectJavaScript(`
      (function() {
        function getAllDocs() {
          var docs = [document];
          try { for (var f = 0; f < window.frames.length; f++) { try { docs.push(window.frames[f].document); } catch(e) {} } } catch(e) {}
          try { var ifs = document.querySelectorAll('iframe'); for (var fi = 0; fi < ifs.length; fi++) { try { if (ifs[fi].contentDocument) docs.push(ifs[fi].contentDocument); } catch(e) {} } } catch(e) {}
          return docs;
        }

        var docs = getAllDocs();
        var isOnPage = false;
        for (var d = 0; d < docs.length; d++) {
          if (docs[d].getElementById('IF_INSTNUM')) {
            isOnPage = true;
            break;
          }
        }

        if (isOnPage) {
          var devices = [];
          for (var d = 0; d < docs.length; d++) {
            try {
              var doc = docs[d];
              var instNum = doc.getElementById('IF_INSTNUM');
              if (!instNum) continue;
              var num = parseInt(instNum.value || '0', 10);
              for (var i = 0; i < num; i++) {
                var ipEl  = doc.getElementById('IPAddr'  + i);
                var macEl = doc.getElementById('MACAddr' + i);
                var nameEl= doc.getElementById('HostName'+ i);
                var portEl= doc.getElementById('PhyPortName'+i);
                if (ipEl && ipEl.value) {
                  devices.push({
                    ip  : ipEl.value,
                    mac : macEl  ? macEl.value   : '-',
                    name: nameEl ? nameEl.value  : '',
                    port: portEl ? portEl.value  : '-'
                  });
                }
              }
              if (devices.length > 0) break;
            } catch(e) {}
          }
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'DEVICE_DATA_READ', devices: devices }));
        } else {
          var clicked = false;
          
          for (var d = 0; d < docs.length; d++) {
            try {
              var doc = docs[d];
              var el = doc.getElementById('ssmDHCPSer') || doc.querySelector('[id*="DHCPSer"]') || doc.querySelector('[id*="dhcp_server"]');
              if (el) {
                var clickTarget = el;
                while (clickTarget && clickTarget.tagName !== 'TR' && clickTarget.tagName !== 'A' && !clickTarget.onclick) {
                  clickTarget = clickTarget.parentElement;
                }
                if (clickTarget) {
                  clickTarget.click();
                  clickTarget.dispatchEvent(new MouseEvent('click', {bubbles:true}));
                  clicked = true;
                  break;
                }
              }
            } catch(e) {}
          }

          if (!clicked) {
            for (var d = 0; d < docs.length; d++) {
              try {
                var doc = docs[d];
                var el = doc.getElementById('smAddMgr') || doc.querySelector('[id*="AddMgr"]') || doc.querySelector('[id*="menu_lan"]');
                if (el) {
                  var clickTarget = el;
                  while (clickTarget && clickTarget.tagName !== 'TR' && clickTarget.tagName !== 'A' && !clickTarget.onclick) {
                    clickTarget = clickTarget.parentElement;
                  }
                  if (clickTarget) {
                    clickTarget.click();
                    clickTarget.dispatchEvent(new MouseEvent('click', {bubbles:true}));
                    clicked = true;
                    break;
                  }
                }
              } catch(e) {}
            }
          }

          if (!clicked) {
            var navWin = window;
            if (typeof openLink !== 'function') {
              if (parent && typeof parent.openLink === 'function') navWin = parent;
              else if (top && typeof top.openLink === 'function') navWin = top;
              else {
                for (var d = 0; d < docs.length; d++) {
                  try {
                    if (docs[d].defaultView && typeof docs[d].defaultView.openLink === 'function') {
                      navWin = docs[d].defaultView;
                      break;
                    }
                  } catch(e) {}
                }
              }
            }
            try {
              if (typeof navWin.OnMenuItemClick === 'function') {
                navWin.OnMenuItemClick('mmNet', 'smAddMgr');
              }
              if (typeof navWin.openLink === 'function') {
                navWin.openLink('getpage.gch?pid=1002&nextpage=net_dhcp_dynamic_t.gch');
              } else {
                window.location.href = 'getpage.gch?pid=1002&nextpage=net_dhcp_dynamic_t.gch';
              }
            } catch(e) {
              try {
                window.location.href = 'getpage.gch?pid=1002&nextpage=net_dhcp_dynamic_t.gch';
              } catch(err) {}
            }
          }
        }
      })();
      true;
    `);
  };

  const injectDiagLogger = () => {
    webViewRef.current?.injectJavaScript(`
      (function() {
        if (window.diagLoggerInterval) clearInterval(window.diagLoggerInterval);
        window.diagLoggerInterval = setInterval(function() {
          var rxFound = null;
          var diag = { rxPower:'', txPower:'', uptime:'', wanIp:'', firmware:'', temp:'', ponStatus:'' };
          
          function getAllDocsInfo() {
            var info = [];
            var docs = [];
            var docUrls = [];
            
            function collect(win) {
              try {
                if (win.document && docs.indexOf(win.document) === -1) {
                  docs.push(win.document);
                  docUrls.push(win.location.href);
                }
              } catch(e) { return; }
              try {
                for (var i = 0; i < win.frames.length; i++) {
                  try {
                    collect(win.frames[i]);
                  } catch(ex) {}
                }
              } catch(e) {}
            }
            collect(window);

            for (var i = 0; i < docs.length; i++) {
              try {
                var d = docs[i];
                var url = docUrls[i];
                var ids = [];
                if (d.getElementById('mmStatus')) ids.push('mmStatus');
                if (d.getElementById('smNetItf')) ids.push('smNetItf');
                if (d.getElementById('smWanStatu')) ids.push('smWanStatu');
                if (d.getElementById('smPONInf')) ids.push('smPONInf');
                if (d.getElementById('ssmLinkState')) ids.push('ssmLinkState');
                info.push("Frame " + i + " URL: " + url + " | IDs: [" + ids.join(',') + "]");
                
                // Deteksi Elemen Form/Input Langsung Berdasarkan ID yang Umum
                var rxEl = d.getElementById('Frm_RxPower') || d.getElementById('RxPower') || d.getElementById('Frm_RxOpticalPower') || d.getElementById('RxOpticalPower') || d.getElementById('rx_power') || d.getElementById('rxpower');
                var txEl = d.getElementById('Frm_TxPower') || d.getElementById('TxPower') || d.getElementById('Frm_TxOpticalPower') || d.getElementById('TxOpticalPower') || d.getElementById('tx_power') || d.getElementById('txpower');
                var tempEl = d.getElementById('Frm_Temp') || d.getElementById('Temp') || d.getElementById('Frm_Temperature') || d.getElementById('Temperature') || d.getElementById('temp') || d.getElementById('temperature');
                var statusEl = d.getElementById('Frm_GponState') || d.getElementById('GponState') || d.getElementById('Frm_PonStatus') || d.getElementById('PonStatus') || d.getElementById('gpon_state') || d.getElementById('pon_status');

                if (rxEl) {
                  diag.rxPower = rxEl.value || rxEl.textContent || rxEl.innerText || '';
                  if (diag.rxPower) rxFound = diag.rxPower;
                }
                if (txEl) {
                  diag.txPower = txEl.value || txEl.textContent || txEl.innerText || '';
                }
                if (tempEl) {
                  diag.temp = tempEl.value || tempEl.textContent || tempEl.innerText || '';
                }
                if (statusEl) {
                  diag.ponStatus = statusEl.value || statusEl.textContent || statusEl.innerText || '';
                }

                // Pindai data redaman secara dinamis di frame ini jika ada
                if (!rxFound) {
                  var rows = d.querySelectorAll('tr');
                  for (var r = 0; r < rows.length; r++) {
                    var tds = rows[r].querySelectorAll('td');
                    if (tds.length >= 2) {
                      var label = (tds[0].textContent || tds[0].innerText || '').toLowerCase().trim();
                      
                      var cell = tds[1];
                      var inputEl = cell.querySelector('input, select, textarea');
                      var value = '';
                      if (inputEl) {
                        value = inputEl.value;
                      } else {
                        value = cell.textContent || cell.innerText || '';
                      }
                      value = value.trim();

                      if (
                        (label.indexOf('input') !== -1 && label.indexOf('power') !== -1) || 
                        label.indexOf('rx') !== -1 || 
                        label.indexOf('rxoptical') !== -1 || 
                        label.indexOf('receiver') !== -1 || 
                        label.indexOf('penerima') !== -1 ||
                        label.indexOf('redaman') !== -1
                      ) {
                        diag.rxPower = value;
                        if (value) rxFound = value;
                      } else if (
                        (label.indexOf('output') !== -1 && label.indexOf('power') !== -1) || 
                        label.indexOf('tx') !== -1 || 
                        label.indexOf('txoptical') !== -1 || 
                        label.indexOf('transmitter') !== -1 || 
                        label.indexOf('pemancar') !== -1
                      ) {
                        diag.txPower = value;
                      } else if (label.indexOf('temperature') !== -1 || label.indexOf('suhu') !== -1 || label.indexOf('temp') !== -1) {
                        diag.temp = value;
                      } else if (label.indexOf('gpon state') !== -1 || label.indexOf('pon status') !== -1 || label.indexOf('state') !== -1) {
                        diag.ponStatus = value;
                      }
                    }
                  }
                }
              } catch(err) {}
            }
            
            if (rxFound && diag.rxPower && diag.rxPower !== '') {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'DIAG_DATA_READ', diag: diag }));
              if (window.diagLoggerInterval) {
                clearInterval(window.diagLoggerInterval);
                window.diagLoggerInterval = null;
              }
            }
            
            return info;
          }
          var logs = getAllDocsInfo();
          if (!rxFound) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'DIAG_LOG', logs: logs }));
          }
        }, 1500);
      })();
      true;
    `);
  };


  // Langkah 1: Klik Menu "Status"
  const injectClickDiagStatus = () => {
    if (navPhaseRef.current !== 'diag_status') return;
    webViewRef.current?.injectJavaScript(`
      (function() {
        function log(msg) {
          try {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'DIAG_LOG', logs: [msg] }));
          } catch(e) {}
        }
        
        function getAllDocs() {
          var docs = [];
          function collect(win) {
            try {
              if (win.document && docs.indexOf(win.document) === -1) {
                docs.push(win.document);
              }
            } catch(e) {}
            try {
              for (var i = 0; i < win.frames.length; i++) {
                try {
                  collect(win.frames[i]);
                } catch(ex) {}
              }
            } catch(e) {}
          }
          collect(window);
          return docs;
        }

        function clickElement(el) {
          if (!el) return false;
          var target = el;
          while (target && target.tagName !== 'TR' && target.tagName !== 'TD' && target.tagName !== 'A' && target.tagName !== 'LI' && !target.getAttribute('onclick') && !target.onclick) {
            target = target.parentElement;
          }
          if (target && !target.onclick && !target.getAttribute('onclick') && target.parentElement && (target.parentElement.onclick || target.parentElement.getAttribute('onclick'))) {
            target = target.parentElement;
          }
          if (!target) target = el;
          
          try {
            var attr = target.getAttribute('onclick');
            if (attr) {
              var code = attr.replace(/^javascript:/i, '').replace(/&amp;/g, '&');
              var win = target.ownerDocument.defaultView || window;
              win.eval(code);
              return true;
            }
            if (typeof target.onclick === 'function') {
              target.onclick();
              return true;
            }
            target.click();
            target.dispatchEvent(new MouseEvent('click', {bubbles:true}));
            return true;
          } catch(e) {
            try {
              target.click();
              return true;
            } catch(err) {
              return false;
            }
          }
        }

        var statusRetries = 0;
        var maxStatusRetries = 15; // Coba cari selama 7.5 detik (15 * 500ms)

        function tryClickStatus() {
          log("Mencari tombol menu Status (percobaan " + (statusRetries + 1) + ")...");
          var docs = getAllDocs();
          var mmStatus = null;
          for (var d = 0; d < docs.length; d++) {
            try {
              var doc = docs[d];
              mmStatus = doc.getElementById('mmStatus') || doc.getElementById('Fnt_mmStatus');
              if (mmStatus) {
                log("Menu Status ditemukan lewat ID");
              } else {
                var tags = doc.querySelectorAll('a, span, td, font');
                for (var i = 0; i < tags.length; i++) {
                  var txt = (tags[i].textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
                  var id = (tags[i].id || '').toLowerCase();
                  var href = (tags[i].href || '').toLowerCase();
                  
                  if (txt.indexOf('logout') !== -1 || id.indexOf('logout') !== -1) continue;

                  if (
                    txt === 'status' || 
                    txt === '-status' || 
                    txt === '+status' || 
                    id === 'mmstatus' ||
                    id.indexOf('mmstatus') !== -1 ||
                    href.indexOf('menu_status_t.gch') !== -1
                  ) {
                    mmStatus = tags[i];
                    log("Menu Status cocok teks: '" + txt + "'");
                    break;
                  }
                }
              }
              if (mmStatus) {
                log("Mengklik Menu Status...");
                var clicked = clickElement(mmStatus);
                if (clicked) {
                  window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'DIAG_STATUS_CLICKED' }));
                  return; // Sukses keluar
                }
              }
            } catch(e) {
              log("Error mencari menu Status: " + e.message);
            }
          }

          statusRetries++;
          if (statusRetries < maxStatusRetries) {
            setTimeout(tryClickStatus, 500);
          } else {
            log("Menu Status tidak ditemukan di DOM secara normal. Mencoba openLink langsung...");
            try {
              var navWin = window;
              if (typeof openLink !== 'function') {
                if (parent && typeof parent.openLink === 'function') navWin = parent;
                else if (top && typeof top.openLink === 'function') navWin = top;
                else {
                  for (var ad = 0; ad < docs.length; ad++) {
                    try {
                      if (docs[ad].defaultView && typeof docs[ad].defaultView.openLink === 'function') {
                        navWin = docs[ad].defaultView;
                        break;
                      }
                    } catch(e) {}
                  }
                }
              }
              if (typeof navWin.openLink === 'function') {
                var activePid = "1002";
                for (var ad = 0; ad < docs.length; ad++) {
                  try {
                    var anchors = docs[ad].querySelectorAll('a[href], [onclick]');
                    for (var ai = 0; ai < anchors.length; ai++) {
                      var str = (anchors[ai].getAttribute('href') || '') + (anchors[ai].getAttribute('onclick') || '');
                      var match = str.match(/pid=(\d+)/i);
                      if (match && match[1]) {
                        activePid = match[1];
                        break;
                      }
                    }
                  } catch(e) {}
                  if (activePid !== "1002") break;
                }
                log("Menggunakan activePid: " + activePid);
                navWin.openLink('getpage.gch?pid=' + activePid + '&nextpage=status_dev_info_t.gch');
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'DIAG_STATUS_CLICKED' }));
              } else {
                log("Fungsi openLink tidak ditemukan. Gagal menavigasi.");
              }
            } catch(e) {
              log("Gagal melakukan navigasi langsung: " + e.message);
            }
          }
        }

        tryClickStatus();
      })();
      true;
    `);
  };

  // Langkah 2: Klik "Network Interface" & "PON Inform"
  const injectClickDiagNetItf = () => {
    if (navPhaseRef.current !== 'diag_netitf') return;
    webViewRef.current?.injectJavaScript(`
      (function() {
        function log(msg) {
          try {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'DIAG_LOG', logs: [msg] }));
          } catch(e) {}
        }
        
        function getAllDocs() {
          var docs = [];
          function collect(win) {
            try {
              if (win.document && docs.indexOf(win.document) === -1) {
                docs.push(win.document);
              }
            } catch(e) {}
            try {
              for (var i = 0; i < win.frames.length; i++) {
                try {
                  collect(win.frames[i]);
                } catch(ex) {}
              }
            } catch(e) {}
          }
          collect(window);
          return docs;
        }

        function clickElement(el) {
          if (!el) return false;
          var target = el;
          while (target && target.tagName !== 'TR' && target.tagName !== 'TD' && target.tagName !== 'A' && target.tagName !== 'LI' && !target.getAttribute('onclick') && !target.onclick) {
            target = target.parentElement;
          }
          if (target && !target.onclick && !target.getAttribute('onclick') && target.parentElement && (target.parentElement.onclick || target.parentElement.getAttribute('onclick'))) {
            target = target.parentElement;
          }
          if (!target) target = el;
          
          try {
            var attr = target.getAttribute('onclick');
            if (attr) {
              var code = attr.replace(/^javascript:/i, '').replace(/&amp;/g, '&');
              var win = target.ownerDocument.defaultView || window;
              win.eval(code);
              return true;
            }
            if (typeof target.onclick === 'function') {
              target.onclick();
              return true;
            }
            target.click();
            target.dispatchEvent(new MouseEvent('click', {bubbles:true}));
            return true;
          } catch(e) {
            try {
              target.click();
              return true;
            } catch(err) {
              return false;
            }
          }
        }

        log("Mencari sub-menu Network Interface...");
        var docs = getAllDocs();
        var netItf = null;
        for (var d = 0; d < docs.length; d++) {
          try {
            var doc = docs[d];
            netItf = doc.getElementById('smNetItf') || doc.getElementById('smWanStatu') || doc.getElementById('smWanStatus') || doc.getElementById('Fnt_smNetItf') || doc.getElementById('smNet');
            if (netItf) {
              log("Network Interface ditemukan lewat ID");
            } else {
              var tags = doc.querySelectorAll('a, span, td, font');
              for (var i = 0; i < tags.length; i++) {
                var txt = (tags[i].textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
                var id = (tags[i].id || '').toLowerCase();
                var href = (tags[i].getAttribute('href') || '').toLowerCase();
                var onclick = (tags[i].getAttribute('onclick') || '').toLowerCase();

                if (
                  id === 'smnetitf' ||
                  id.indexOf('netitf') !== -1 ||
                  id.indexOf('networkinterface') !== -1 ||
                  txt === 'network interface' ||
                  txt.indexOf('network interface') !== -1 ||
                  txt.indexOf('network-interface') !== -1 ||
                  txt.indexOf('network_interface') !== -1 ||
                  txt.indexOf('networkinterface') !== -1 ||
                  href.indexOf('netitf') !== -1 ||
                  href.indexOf('net_itf') !== -1 ||
                  onclick.indexOf('netitf') !== -1 ||
                  onclick.indexOf('net_itf') !== -1 ||
                  onclick.indexOf('status_net') !== -1
                ) {
                  netItf = tags[i];
                  log("Network Interface cocok teks: '" + txt + "'");
                  break;
                }
              }
            }
            if (netItf) {
              log("Mengklik Network Interface...");
              clickElement(netItf);
              break;
            }
          } catch(e) {
            log("Error mencari Network Interface: " + e.message);
          }
        }

        var ponRetries = 0;
        var maxPonRetries = 15; // Coba cari selama 7.5 detik (15 * 500ms)

        function tryClickPon() {
          log("Mencari sub-menu PON Inform (percobaan " + (ponRetries + 1) + ")...");
          var docs3 = getAllDocs();
          var pon = null;
          for (var d3 = 0; d3 < docs3.length; d3++) {
            try {
              var doc3 = docs3[d3];
              pon = doc3.getElementById('smPONInf') || doc3.getElementById('ssmLinkState') || doc3.getElementById('smPONStatus') || doc3.querySelector('[onclick*="status_dev_pon_t.gch"]');
              if (pon) {
                log("PON Inform ditemukan lewat ID/onclick");
              } else {
                var tags3 = doc3.querySelectorAll('a, span, td, font');
                for (var i3 = 0; i3 < tags3.length; i3++) {
                  var txt3 = (tags3[i3].textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
                  var id3 = (tags3[i3].id || '').toLowerCase();
                  var href3 = (tags3[i3].getAttribute('href') || '').toLowerCase();
                  var onclick3 = (tags3[i3].getAttribute('onclick') || '').toLowerCase();

                  if (
                    id3 === 'smponinf' ||
                    id3.indexOf('poninf') !== -1 ||
                    id3.indexOf('poninfo') !== -1 ||
                    txt3 === 'pon inform' ||
                    txt3 === 'pon info' ||
                    txt3 === 'gpon inform' ||
                    txt3.indexOf('pon inform') !== -1 ||
                    txt3.indexOf('pon info') !== -1 ||
                    txt3.indexOf('pon status') !== -1 ||
                    href3.indexOf('pon_info') !== -1 ||
                    href3.indexOf('pon_inform') !== -1 ||
                    href3.indexOf('pon_status') !== -1 ||
                    onclick3.indexOf('pon') !== -1
                  ) {
                    pon = tags3[i3];
                    log("PON Inform cocok teks: '" + txt3 + "'");
                    break;
                  }
                }
              }
              if (pon) {
                log("Mengklik PON Inform...");
                var clickedPon = clickElement(pon);
                if (clickedPon) {
                  window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'DIAG_PON_CLICKED' }));
                  return; // Sukses keluar
                }
              }
            } catch(e) {
              log("Error mencari PON Inform: " + e.message);
            }
          }

          ponRetries++;
          if (ponRetries < maxPonRetries) {
            setTimeout(tryClickPon, 500);
          } else {
            log("PON Inform tidak ditemukan di DOM secara normal. Mencoba openLink langsung...");
            try {
              var navWin = window;
              if (typeof openLink !== 'function') {
                if (parent && typeof parent.openLink === 'function') navWin = parent;
                else if (top && typeof top.openLink === 'function') navWin = top;
                else {
                  for (var ad3 = 0; ad3 < docs3.length; ad3++) {
                    try {
                      if (docs3[ad3].defaultView && typeof docs3[ad3].defaultView.openLink === 'function') {
                        navWin = docs3[ad3].defaultView;
                        break;
                      }
                    } catch(e) {}
                  }
                }
              }
              if (typeof navWin.openLink === 'function') {
                var activePid = "1002";
                for (var ad = 0; ad < docs3.length; ad++) {
                  try {
                    var anchors = docs3[ad].querySelectorAll('a[href], [onclick]');
                    for (var ai = 0; ai < anchors.length; ai++) {
                      var str = (anchors[ai].getAttribute('href') || '') + (anchors[ai].getAttribute('onclick') || '');
                      var match = str.match(/pid=(\d+)/i);
                      if (match && match[1]) {
                        activePid = match[1];
                        break;
                      }
                    }
                  } catch(e) {}
                  if (activePid !== "1002") break;
                }
                log("Menggunakan activePid: " + activePid);
                navWin.openLink('getpage.gch?pid=' + activePid + '&nextpage=status_dev_pon_t.gch');
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'DIAG_PON_CLICKED' }));
              } else {
                log("Fungsi openLink tidak ditemukan. Gagal menavigasi.");
              }
            } catch(e) {
              log("Gagal melakukan navigasi langsung: " + e.message);
            }
          }
        }

        setTimeout(tryClickPon, 500);
      })();
      true;
    `);
  };

  // Langkah 3: Baca Data Redaman
  const injectReadDiagData = () => {
    if (navPhaseRef.current !== 'diag_read') return;
    webViewRef.current?.injectJavaScript(`
      (function() {
        function log(msg) {
          try {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'DIAG_LOG', logs: [msg] }));
          } catch(e) {}
        }
        
        function getAllDocs() {
          var docs = [];
          function collect(win) {
            try {
              if (win.document && docs.indexOf(win.document) === -1) {
                docs.push(win.document);
              }
            } catch(e) {}
            try {
              for (var i = 0; i < win.frames.length; i++) {
                try {
                  collect(win.frames[i]);
                } catch(ex) {}
              }
            } catch(e) {}
          }
          collect(window);
          return docs;
        }

        var retries = 0;
        var maxRetries = 15; // 15 detik batas waktu internal

        function tryRead() {
          log("Mencari data parameter optik (percobaan " + (retries + 1) + ")...");
          var docsFinal = getAllDocs();
          var diag = { rxPower:'', txPower:'', uptime:'', wanIp:'', firmware:'', temp:'', ponStatus:'' };
          var rxFound = false;

          for (var d = 0; d < docsFinal.length; d++) {
            try {
              var doc = docsFinal[d];

              // Cara 1: Deteksi Elemen Form/Input Langsung Berdasarkan ID yang Umum pada ZTE
              var rxEl = doc.getElementById('Frm_RxPower') || doc.getElementById('RxPower') || doc.getElementById('Frm_RxOpticalPower') || doc.getElementById('RxOpticalPower') || doc.getElementById('rx_power') || doc.getElementById('rxpower');
              var txEl = doc.getElementById('Frm_TxPower') || doc.getElementById('TxPower') || doc.getElementById('Frm_TxOpticalPower') || doc.getElementById('TxOpticalPower') || doc.getElementById('tx_power') || doc.getElementById('txpower');
              var tempEl = doc.getElementById('Frm_Temp') || doc.getElementById('Temp') || doc.getElementById('Frm_Temperature') || doc.getElementById('Temperature') || doc.getElementById('temp') || doc.getElementById('temperature');
              var statusEl = doc.getElementById('Frm_GponState') || doc.getElementById('GponState') || doc.getElementById('Frm_PonStatus') || doc.getElementById('PonStatus') || doc.getElementById('gpon_state') || doc.getElementById('pon_status');

              if (rxEl) {
                diag.rxPower = rxEl.value || rxEl.textContent || rxEl.innerText || '';
                if (diag.rxPower) rxFound = true;
              }
              if (txEl) {
                diag.txPower = txEl.value || txEl.textContent || txEl.innerText || '';
              }
              if (tempEl) {
                diag.temp = tempEl.value || tempEl.textContent || tempEl.innerText || '';
              }
              if (statusEl) {
                diag.ponStatus = statusEl.value || statusEl.textContent || statusEl.innerText || '';
              }

              // Cara 2: Jika belum ketemu, cari di tabel (tr & td)
              if (!rxFound) {
                var rows = doc.querySelectorAll('tr');
                for (var r = 0; r < rows.length; r++) {
                  var tds = rows[r].querySelectorAll('td');
                  if (tds.length >= 2) {
                    var label = (tds[0].textContent || tds[0].innerText || '').toLowerCase().trim();
                    
                    // Baca nilai dari cell (bisa berupa teks langsung atau di dalam input)
                    var cell = tds[1];
                    var inputEl = cell.querySelector('input, select, textarea');
                    var value = '';
                    if (inputEl) {
                      value = inputEl.value;
                    } else {
                      value = cell.textContent || cell.innerText || '';
                    }
                    value = value.trim();

                    // Cek label
                    if (
                      (label.indexOf('input') !== -1 && label.indexOf('power') !== -1) || 
                      label.indexOf('rx') !== -1 || 
                      label.indexOf('rxoptical') !== -1 || 
                      label.indexOf('receiver') !== -1 || 
                      label.indexOf('penerima') !== -1 ||
                      label.indexOf('redaman') !== -1
                    ) {
                      diag.rxPower = value;
                      if (value) rxFound = true;
                    } else if (
                      (label.indexOf('output') !== -1 && label.indexOf('power') !== -1) || 
                      label.indexOf('tx') !== -1 || 
                      label.indexOf('txoptical') !== -1 || 
                      label.indexOf('transmitter') !== -1 || 
                      label.indexOf('pemancar') !== -1
                    ) {
                      diag.txPower = value;
                    } else if (label.indexOf('temperature') !== -1 || label.indexOf('suhu') !== -1 || label.indexOf('temp') !== -1) {
                      diag.temp = value;
                    } else if (label.indexOf('gpon state') !== -1 || label.indexOf('pon status') !== -1 || label.indexOf('state') !== -1) {
                      diag.ponStatus = value;
                    }
                  }
                }
              }
            } catch(e) {
              log("Error membaca tabel status: " + e.message);
            }
          }

          if (rxFound && diag.rxPower && diag.rxPower !== '') {
            log("Pembacaan sukses! Hasil RxPower: " + diag.rxPower);
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'DIAG_DATA_READ', diag: diag }));
          } else {
            retries++;
            if (retries < maxRetries) {
              setTimeout(tryRead, 1000);
            } else {
              log("Batas waktu habis. Mengirimkan data kosong/parsial.");
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'DIAG_DATA_READ', diag: diag }));
            }
          }
        }

        tryRead();
      })();
      true;
    `);
  };

  const handleRefreshDiagnostics = () => {
    webViewRef.current?.injectJavaScript(`
      if (window.diagLoggerInterval) {
        clearInterval(window.diagLoggerInterval);
        window.diagLoggerInterval = null;
      }
      true;
    `);
    setRealDiag(null);
    setDiagLogs([]);
    setDiagStep('status');
    // Reset flag agar logger bisa berjalan kembali setelah refresh
    diagDataFoundRef.current = false;
    navPhaseRef.current = 'diag_status';
    injectClickDiagStatus();
    injectDiagLogger();
  };

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'AUTOFILL_SUCCESS') {
        showCard();
        setStepLogin('loading');
      } else if (data.type === 'LOGIN_CLICKED') {
        setStepLogin('done');
        if (activeMenu === 'status') {
          navPhaseRef.current = 'diag_status';
          setDiagStep('status');
          setTimeout(injectClickDiagStatus, 2500);
          setTimeout(injectClickDiagStatus, 4000);
        } else if (activeMenu === 'devices') {
          navPhaseRef.current = 'devices';
          setTimeout(injectReadDevices, 2500);
          setTimeout(injectReadDevices, 4500);
        } else if (activeMenu === 'reboot') {
          navPhaseRef.current = 'reboot';
          setTimeout(injectRebootPage, 2500);
          setTimeout(injectRebootPage, 4500);
        } else {
          navPhaseRef.current = 'network';
          setStepNetwork('loading');
          setTimeout(injectClickNetwork, 2500);
          setTimeout(injectClickNetwork, 4000);
          setTimeout(injectClickNetwork, 6000);
        }
      } else if (data.type === 'NAV_NETWORK_CLICKED') {
        navPhaseRef.current = 'wlan';
        setStepNetwork('done');
        setStepWlan('loading');
        setTimeout(injectClickWlan, 1000);
        setTimeout(injectClickWlan, 2000);
        setTimeout(injectClickWlan, 3500);
        setTimeout(injectClickWlan, 5000);
        setTimeout(injectClickWlan, 7000);
        setTimeout(injectClickWlan, 9000);
      } else if (data.type === 'NAV_WLAN_CLICKED') {
        navPhaseRef.current = 'done';
        setStepWlan('done');
        // Auto-hide card setelah 2.5 detik
        setTimeout(hideCard, 2500);
        
        // Mulai pembacaan data WLAN secara periodik agar terjamin
        setTimeout(injectReadWlanDetails, 3000);
        setTimeout(injectReadWlanDetails, 4500);
        setTimeout(injectReadWlanDetails, 6000);
      } else if (data.type === 'WLAN_DATA_READ') {
        setCurrentSsid(data.ssid);
        setCurrentPassword(data.password);
        if (!isWlanLoaded) {
          setNewSsid(data.ssid);
          setNewPassword(data.password);
          setActiveMenu('menu');
        }
        setIsWlanLoaded(true);
        setSaveStatus('idle');
        if (data.selectedSsidIndex) {
          setSelectedSsid(data.selectedSsidIndex);
        }
      } else if (data.type === 'WLAN_SAVE_SUBMITTED') {
        console.log('[WLAN] Form WiFi berhasil di-submit ke modem. Memulai hitung mundur nirkabel.');
      } else if (data.type === 'LOGIN_FAILED') {
        setAutomationError(`Gagal Login: ${data.error || 'Username atau password yang Anda masukkan salah.'}`);
        setStepLogin('idle');
      } else if (data.type === 'DEVICE_DATA_READ') {
        // Data real perangkat terhubung dari DHCP lease table F663V3A
        setRealDevices(data.devices || []);
        setIsScanningDevices(false);
      } else if (data.type === 'DIAG_STATUS_CLICKED') {
        navPhaseRef.current = 'diag_netitf';
        setDiagStep('netitf');
        setTimeout(injectClickDiagNetItf, 1500);
      } else if (data.type === 'DIAG_PON_CLICKED') {
        navPhaseRef.current = 'diag_read';
        setDiagStep('read');
        setTimeout(injectReadDiagData, 1500);
      } else if (data.type === 'DIAG_DATA_READ') {
        // Data real diagnostik dari status page modem
        diagDataFoundRef.current = true; // Tandai data sudah ditemukan, hentikan logger
        setRealDiag(data.diag);
        setDiagStep('done');
        navPhaseRef.current = 'done';
        webViewRef.current?.injectJavaScript(`
          if (window.diagLoggerInterval) {
            clearInterval(window.diagLoggerInterval);
            window.diagLoggerInterval = null;
          }
          true;
        `);
      } else if (data.type === 'DIAG_LOG') {
        setDiagLogs(data.logs || []);
        (data.logs || []).forEach((l: string) => console.log('[DIAG_LOG]', l));
      } else if (data.type === 'DEBUG_LINKS') {
        const frames = data.frameCount ?? 1;
        const links = (data.links as string[]);
        console.log('[MODEM NAV DEBUG]', data.stage, 'frames:', frames, links.length > 5 ? links.slice(0, 5).join(' | ') + '...' : links.join(' | '));
      } else if (data.type === 'REBOOT_CLICKED_SUCCESS') {
        console.log('[REBOOT]', `Perintah reboot sukses diklik di WebView! (${data.detail || ''})`);
      } else if (data.type === 'DETECTED_LOGIN_PAGE') {
        if (isWlanLoaded && saveStatus !== 'saving' && rebootStep !== 'rebooting') {
          console.log('[SESSION] Halaman login terdeteksi kembali setelah sukses masuk. Mengembalikan ke dashboard (Session Timeout).');
          setShowSessionTimeoutModal(true);
        }
      }
    } catch (_) {}
  };

  const handleHeaderBack = () => {
    if (activeMenu === 'status') {
      webViewRef.current?.injectJavaScript(`
        if (window.diagLoggerInterval) {
          clearInterval(window.diagLoggerInterval);
          window.diagLoggerInterval = null;
        }
        true;
      `);
    }
    if (showWebView) {
      if (canGoBack) {
        webViewRef.current?.goBack();
      } else {
        handleBackWithLogout();
      }
    } else {
      if (activeMenu === 'menu') {
        handleBackWithLogout();
      } else {
        setActiveMenu('menu');
      }
    }
  };

  const handleGoBack    = () => { if (webViewRef.current && canGoBack)    webViewRef.current.goBack(); };
  const handleGoForward = () => { if (webViewRef.current && canGoForward) webViewRef.current.goForward(); };
  const handleReload    = () => { webViewRef.current?.reload(); };

  const targetUrl = (() => {
    const formatted = ipAddress.trim();
    return /^https?:\/\//i.test(formatted) ? formatted : `http://${formatted}`;
  })();

  const webViewSource = React.useMemo(() => ({ uri: targetUrl }), [targetUrl]);

  // Komponen satu baris step
  const StepRow = ({ status, label }: { status: StepStatus; label: string }) => (
    <View style={styles.stepRow}>
      <View style={styles.stepIcon}>
        {status === 'loading' ? <ActivityIndicator size="small" color="#06B6D4" /> : null}
        {status === 'done' ? <Text style={styles.stepCheck}>✓</Text> : null}
        {status === 'idle' ? <View style={styles.stepDot} /> : null}
      </View>
      <Text style={[
        styles.stepLabel,
        status === 'done' ? styles.stepDone : null,
        status === 'loading' ? styles.stepActive : null,
        status === 'idle' ? styles.stepIdle : null,
      ]}>{label}</Text>
    </View>
  );

  const getHeaderIcon = () => {
    if (showWebView) {
      return canGoBack ? 'arrow-left' : 'log-out';
    }
    return activeMenu === 'menu' ? 'log-out' : 'arrow-left';
  };

  const renderScreenHeader = (title: string, isMainMenu = false) => (
    <View style={[styles.formMainHeader, { alignItems: 'center', marginBottom: isMainMenu ? 20 : 12 }]}>
      {isMainMenu ? (
        <View style={{ width: 80, height: 80, justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
          {/* Ring 1: Outer Orbit */}
          <Animated.View style={{
            position: 'absolute',
            width: 74,
            height: 74,
            borderRadius: 37,
            borderWidth: 1.5,
            borderColor: 'rgba(6, 182, 212, 0.4)',
            borderStyle: 'dashed',
            transform: [{ rotate: spinClockwise }]
          }} />

          {/* Ring 2: Inner Orbit */}
          <Animated.View style={{
            position: 'absolute',
            width: 56,
            height: 56,
            borderRadius: 28,
            borderWidth: 1,
            borderColor: 'rgba(6, 182, 212, 0.25)',
            borderStyle: 'dashed',
            transform: [{ rotate: spinCounterClockwise }]
          }} />

          {/* Ring 3: Inactivity Timeout Radar Dot */}
          <Animated.View style={{
            position: 'absolute',
            width: 74,
            height: 74,
            transform: [{ rotate: timeoutRotation }]
          }}>
            <View style={{
              position: 'absolute',
              top: -4,
              left: 33,
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: '#06B6D4',
              shadowColor: '#06B6D4',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.9,
              shadowRadius: 4,
              elevation: 4,
            }} />
          </Animated.View>

          {/* Center WiFi Icon */}
          <Animated.View style={{
            transform: [{ scale: wifiScale }],
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <Feather name="wifi" size={28} color="#06B6D4" />
          </Animated.View>
        </View>
      ) : null}

      {/* Judul Terpusat */}
      <Text style={[styles.formMainTitle, { color: colors.text, fontSize: isMainMenu ? 20 : 18, fontWeight: '900', textAlign: 'center', letterSpacing: -0.2 }]}>
        {title}
      </Text>

      {isMainMenu ? (
        <>
          {/* Keterangan Deskripsi Terpusat */}
          <Text style={{ fontSize: 12, color: colors.subtext, marginTop: 6, fontWeight: '600', textAlign: 'center', paddingHorizontal: 16, lineHeight: 18 }}>
            {isTechMode ? `IP Gateway: ${ipAddress}` : "Kelola koneksi WiFi dan kontrol modem Anda dengan mudah."}
          </Text>

          {/* Badge Status Terpusat */}
          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            backgroundColor: isDark ? 'rgba(16, 189, 129, 0.1)' : 'rgba(16, 189, 129, 0.12)', 
            paddingHorizontal: 10, 
            paddingVertical: 5, 
            borderRadius: 12, 
            borderWidth: 1, 
            borderColor: isDark ? 'rgba(16, 189, 129, 0.2)' : 'rgba(16, 189, 129, 0.25)',
            marginTop: 10
          }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981', marginRight: 6 }} />
            <Text style={{ fontSize: 9, fontWeight: '900', color: '#10B981', letterSpacing: 0.5 }}>TERHUBUNG</Text>
          </View>
        </>
      ) : null}
    </View>
  );

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      onTouchStart={resetInactivityTimer}
    >
      {/* Header Browser (hanya tampil jika showWebView aktif atau normal) */}
      <View style={[styles.browserHeader, { backgroundColor: colors.headerBg, borderColor: colors.headerBorder }]}>
        <TouchableOpacity 
          style={[styles.closeButton, { backgroundColor: colors.buttonBg }]} 
          onPress={handleHeaderBack} 
          activeOpacity={0.7}
        >
          <Feather name={getHeaderIcon()} size={16} color={colors.text} />
        </TouchableOpacity>
        
        {showWebView ? (
          <View style={[styles.addressBar, { backgroundColor: colors.bg, borderColor: colors.inputBorder }]}>
            <Feather name="lock" size={11} color="#10B981" style={{ marginRight: 6 }} />
            <Text style={[styles.addressText, { color: colors.subtext }]} numberOfLines={1}>
              {currentUrl.replace(/^https?:\/\//i, '')}
            </Text>
          </View>
        ) : (
          <View style={styles.headerTitleContainer}>
            <Text style={[styles.headerTitle, { color: colors.text, fontWeight: '800', fontSize: 16 }]}>
              {activeMenu === 'menu' ? 'Dashboard' :
               activeMenu === 'wlan' ? 'Pengaturan WiFi' :
               activeMenu === 'devices' ? 'Perangkat Terhubung' :
               activeMenu === 'status' ? 'Diagnostik Modem' :
               activeMenu === 'reboot' ? 'Reboot Sistem' : ''}
            </Text>
          </View>
        )}

        <View style={{ flexDirection: 'row', gap: 8 }}>
          {/* Tombol theme (gelap/terang) — tampil untuk semua pengguna */}
          <TouchableOpacity 
            style={[styles.reloadButton, { backgroundColor: colors.buttonBg }]} 
            onPress={toggleTheme} 
            activeOpacity={0.7}
          >
            <Feather name={theme === 'dark' ? 'sun' : 'moon'} size={15} color={colors.text} />
          </TouchableOpacity>
          
          {/* Tombol toggle WebView — HANYA untuk mode Teknisi */}
          {isTechMode ? (
            <TouchableOpacity 
              style={[
                styles.reloadButton, 
                { backgroundColor: colors.buttonBg },
                showWebView ? styles.reloadButtonActive : null
              ]} 
              onPress={() => setShowWebView(!showWebView)} 
              activeOpacity={0.7}
            >
              <Feather name={showWebView ? 'eye' : 'eye-off'} size={15} color={colors.activeBlue} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Area WebView (Disembunyikan secara visual jika showWebView = false) */}
      <View style={showWebView ? styles.webArea : styles.webAreaHidden}>
        <WebView
          ref={webViewRef}
          source={webViewSource}
          style={styles.webView}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          scalesPageToFit={true}
          mixedContentMode="always"
          injectedJavaScript={autoFillScript}
          onMessage={handleWebViewMessage}
          onError={(syntheticEvent) => {
            if (rebootStep === 'rebooting') return;
            const { nativeEvent } = syntheticEvent;
            setAutomationError(`Gagal memuat portal modem. Error: ${nativeEvent.description || 'Tidak ada koneksi jaringan'}`);
          }}
          onHttpError={(syntheticEvent) => {
            if (rebootStep === 'rebooting') return;
            const { nativeEvent } = syntheticEvent;
            if (nativeEvent.statusCode >= 400) {
              setAutomationError(`Server modem merespons dengan kode error HTTP ${nativeEvent.statusCode}`);
            }
          }}
          onNavigationStateChange={(navState) => {
            setCanGoBack(navState.canGoBack);
            setCanGoForward(navState.canGoForward);
            setCurrentUrl(navState.url);
            if (!navState.loading) {
              if (navPhaseRef.current === 'network') {
                setTimeout(injectClickNetwork, 1200);
              } else if (navPhaseRef.current === 'wlan') {
                setTimeout(injectClickWlan, 800);
              } else if (navPhaseRef.current === 'diag_status') {
                setTimeout(injectClickDiagStatus, 1200);
              } else if (navPhaseRef.current === 'diag_netitf') {
                setTimeout(injectClickDiagNetItf, 1200);
              } else if (navPhaseRef.current === 'diag_read') {
                setTimeout(injectReadDiagData, 1200);
              } else if (navPhaseRef.current === 'devices') {
                setTimeout(injectOnlyReadDevices, 1200);
              } else if (navPhaseRef.current === 'reboot') {
                setTimeout(injectClickRebootButton, 1200);
              }
              // Hanya re-inject logger jika di menu status & data belum ditemukan
              // Mencegah multiple interval berjalan bersamaan saat navigasi berulang
              if (activeMenu === 'status' && !diagDataFoundRef.current) {
                injectDiagLogger();
              }
            }
          }}
          renderLoading={() => (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color="#06B6D4" />
              <Text style={styles.loaderText}>Menghubungkan ke modem...</Text>
              <Text style={styles.loaderSubtext}>Pastikan HP Anda terhubung ke WiFi modem!</Text>
            </View>
          )}
        />
      </View>

      {/* UI UTAMA PENGGUNA (Hanya tampil jika showWebView = false) */}
      {!showWebView ? (
        <View style={[styles.mainContentArea, { backgroundColor: colors.bg }]}>
          {automationError ? (
            /* 3. TAMPILAN FULLSCREEN NATIVE ERROR NOTIFICATION */
            <View style={styles.fullscreenProgressContainer}>
              <View style={styles.progressAnimationBox}>
                <Feather name="alert-triangle" size={48} color="#EF4444" style={{ marginBottom: 16 }} />
                <Text style={[styles.progressMainTitle, { color: colors.text }]}>Koneksi Gagal</Text>
                <Text style={styles.errorMsgText}>{automationError}</Text>
              </View>

              <View style={{ width: '100%', paddingHorizontal: 12 }}>
                <TouchableOpacity 
                  style={styles.nativeSaveButton} 
                  onPress={() => {
                    setAutomationError(null);
                    setIsWlanLoaded(false);
                    setStepLogin('idle');
                    setStepNetwork('idle');
                    setStepWlan('idle');
                    navPhaseRef.current = 'idle';
                    webViewRef.current?.reload();
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.nativeSaveButtonText}>Coba Hubungkan Kembali</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.nativeSaveButton, { backgroundColor: colors.buttonBg, marginTop: 14, shadowColor: 'transparent', borderWidth: 1, borderColor: colors.inputBorder }]} 
                  onPress={handleBackWithLogout}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.nativeSaveButtonText, { color: colors.subtext }]}>Edit Kredensial & IP</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : !isWlanLoaded ? (
            /* 1. TAMPILAN FULLSCREEN PROGRESS OTOMASI */
            <View style={styles.fullscreenProgressContainer}>
              <View style={styles.progressAnimationBox}>
                <ActivityIndicator size="large" color="#06B6D4" style={{ marginBottom: 12 }} />
                <Text style={[styles.progressMainTitle, { color: colors.text }]}>Mengakses Konfigurasi...</Text>
                <Text style={[styles.progressMainSub, { color: colors.subtext }]}>Menghubungkan ke router Anda secara aman</Text>
              </View>
              
              <View style={[styles.progressStepsBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <StepRow status={stepLogin} label="Masuk ke portal admin modem" />
                <StepRow status={stepNetwork} label="Navigasi ke menu Jaringan" />
                <StepRow status={stepWlan} label="Membuka pengaturan parameter WLAN" />
              </View>

              <Text style={[styles.footerNote, { color: colors.subtext }]}>Modem Anda sedang diatur secara otomatis. Harap tunggu...</Text>
            </View>
          ) : (
            /* 2. TAMPILAN FULLSCREEN LAYOUT MENU / FORM NATIVE */
            <View style={{ flex: 1 }}>
              {/* 2.1 PANEL MENU DASHBOARD MODEM */}
              {activeMenu === 'menu' ? (
                <ScrollView 
                  style={styles.fullscreenFormContainer}
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.formContentBox}>
                    {renderScreenHeader("Dashboard Kontrol Modem", true)}

                    {/* Menu Buttons List */}
                    <View style={{ marginTop: 4 }}>
                      {[
                        { id: 'wlan', icon: 'wifi', title: 'Konfigurasi Nama & Sandi WiFi', desc: 'Ubah nama (SSID) dan kata sandi WiFi Anda secara instan', color: '#06B6D4', show: true },
                        { id: 'devices', icon: 'users', title: 'Perangkat Terhubung', desc: 'Lihat daftar perangkat aktif yang tersambung pada router', color: '#10B981', show: true },
                        { id: 'status', icon: 'activity', title: 'Status Diagnostik Modem', desc: 'Daya optik GPON fiber, suhu, uptime, & info sistem', color: '#F59E0B', show: isTechMode },
                        { id: 'reboot', icon: 'power', title: 'Reboot Sistem Modem', desc: 'Mulai ulang (restart) modem Anda secara aman dari jauh', color: '#EF4444', show: true }
                      ].filter(item => item.show).map((menuItem) => (
                        <TouchableOpacity
                          key={menuItem.id}
                          style={[styles.cardInputGroup, { 
                            backgroundColor: colors.card, 
                            borderColor: colors.cardBorder, 
                            padding: 16, 
                            flexDirection: 'row', 
                            alignItems: 'center',
                            marginBottom: 14
                          }]}
                          onPress={() => {
                            if (menuItem.id === 'wlan') {
                              setActiveMenu('wlan');
                            } else if (menuItem.id === 'devices') {
                              setActiveMenu('devices');
                            } else if (menuItem.id === 'status') {
                              setActiveMenu('status');
                            } else if (menuItem.id === 'reboot') {
                              setActiveMenu('reboot');
                              setRebootStep('idle');
                            }
                          }}
                          activeOpacity={0.7}
                        >
                          <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: `${menuItem.color}15`, justifyContent: 'center', alignItems: 'center', marginRight: 16 }}>
                            <Feather name={menuItem.icon as any} size={22} color={menuItem.color} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text }}>{menuItem.title}</Text>
                            <Text style={{ fontSize: 11, color: colors.subtext, marginTop: 4, lineHeight: 15 }}>{menuItem.desc}</Text>
                          </View>
                          <Feather name="chevron-right" size={18} color={colors.subtext} />
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* Back to main screen */}
                    <TouchableOpacity 
                      style={[styles.nativeSaveButton, { backgroundColor: colors.buttonBg, marginTop: 10, shadowColor: 'transparent', borderWidth: 1, borderColor: colors.inputBorder }]} 
                      onPress={handleBackWithLogout}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.nativeSaveButtonText, { color: colors.subtext }]}>Keluar Sesi & Kembali</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              ) : null}

              {/* 2.2 PANEL FORM NATIVE PENGATURAN WIFI */}
              {activeMenu === 'wlan' ? (
                <ScrollView 
                  style={styles.fullscreenFormContainer}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.formContentBox}>
                    {saveStatus === 'saving' ? (
                      /* WLAN Saving Countdown Screen */
                      <View style={{ alignItems: 'center', paddingVertical: 15 }}>
                        <View style={[styles.cardInputGroup, { 
                          backgroundColor: colors.card, 
                          borderColor: colors.cardBorder, 
                          padding: 24, 
                          alignItems: 'center',
                          width: '100%'
                        }]}>
                          {/* Beautiful Countdown Circle */}
                          <View style={{ 
                            width: 120, 
                            height: 120, 
                            borderRadius: 60, 
                            backgroundColor: isDark ? 'rgba(6, 182, 212, 0.05)' : 'rgba(6, 182, 212, 0.08)',
                            justifyContent: 'center', 
                            alignItems: 'center', 
                            marginBottom: 20,
                            borderWidth: 2,
                            borderColor: 'rgba(6, 182, 212, 0.15)',
                            borderStyle: 'dashed'
                          }}>
                            <Text style={{ fontSize: 38, fontWeight: '900', color: '#06B6D4', includeFontPadding: false }}>
                              {wlanCountdown}
                            </Text>
                            <Text style={{ fontSize: 9, color: colors.subtext, marginTop: 2, fontWeight: '800', letterSpacing: 0.5 }}>DETIK</Text>
                          </View>

                          <Text style={[styles.formMainTitle, { color: colors.text, textAlign: 'center', fontSize: 18, fontWeight: '900' }]}>
                            Menerapkan Perubahan WiFi
                          </Text>
                          <Text style={{ fontSize: 11, color: colors.subtext, textAlign: 'center', marginTop: 4, fontWeight: '600' }}>
                            Jangan menutup aplikasi atau mematikan modem
                          </Text>
                        </View>

                        {/* Progress steps changing over time */}
                        <View style={[styles.cardInputGroup, { 
                          backgroundColor: colors.card, 
                          borderColor: colors.cardBorder, 
                          padding: 16, 
                          marginTop: 14, 
                          width: '100%' 
                        }]}>
                          {[
                            { text: 'Mengirimkan nama (SSID) & sandi baru ke modem', minSec: 50 },
                            { text: 'Modem merestart modul nirkabel (wireless driver)', minSec: 30 },
                            { text: 'Menunggu pemulihan sinyal WiFi nirkabel', minSec: 10 },
                            { text: 'Menyelesaikan konfigurasi dan menyimpan perubahan', minSec: 0 }
                          ].map((step, idx, arr) => {
                            const isDone = wlanCountdown < step.minSec;
                            const isActive = wlanCountdown >= step.minSec && (idx === 0 || wlanCountdown < arr[idx-1].minSec);
                            return (
                              <View 
                                key={idx} 
                                style={{ 
                                  flexDirection: 'row', 
                                  alignItems: 'center', 
                                  paddingVertical: 12, 
                                  borderBottomWidth: idx === 3 ? 0 : 1, 
                                  borderColor: colors.cardBorder 
                                }}
                              >
                                <View style={{ marginRight: 12 }}>
                                  {isDone ? (
                                    <Feather name="check-circle" size={16} color="#10B981" />
                                  ) : isActive ? (
                                    <ActivityIndicator size="small" color="#06B6D4" />
                                  ) : (
                                    <View style={{ 
                                      width: 16, 
                                      height: 16, 
                                      borderRadius: 8, 
                                      borderWidth: 1.5, 
                                      borderColor: colors.cardBorder,
                                      backgroundColor: colors.inputBg 
                                    }} />
                                  )}
                                </View>
                                <Text style={{ 
                                  fontSize: 12, 
                                  fontWeight: '600', 
                                  color: isDone ? '#10B981' : isActive ? colors.text : colors.subtext, 
                                  flex: 1 
                                }}>
                                  {step.text}
                                </Text>
                              </View>
                            );
                          })}
                        </View>
                      </View>
                    ) : (
                      <>
                        {/* WiFi Active Status Card */}
                        <View style={[styles.cardInputGroup, { backgroundColor: colors.card, borderColor: colors.cardBorder, padding: 16, alignItems: 'center', marginBottom: 14 }]}>
                          <Text style={{ fontSize: 12, color: colors.subtext, fontWeight: '700', letterSpacing: 0.5 }}>NAMA WIFI AKTIF SAAT INI</Text>
                          <Text style={{ fontSize: 24, fontWeight: '900', color: '#06B6D4', marginTop: 4, textAlign: 'center' }}>
                            {currentSsid ? `"${currentSsid}"` : 'Belum Dipindai'}
                          </Text>
                          <Text style={{ fontSize: 10, color: colors.subtext, marginTop: 6, textAlign: 'center', lineHeight: 14 }}>
                            Jaringan nirkabel aktif pada frekuensi {activeBand === '2.4GHz' ? '2.4 GHz (WLAN1)' : '5 GHz (WLAN5)'}
                          </Text>
                        </View>

                        <View style={[styles.cardInputGroup, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                          <View style={styles.inputLabelHeader}>
                            <Text style={[styles.inputLabel, { color: colors.text }]}>Nama WiFi Baru (SSID)</Text>
                          </View>
                          <TextInput
                            style={[styles.formTextInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.inputText }]}
                            value={newSsid}
                            onChangeText={setNewSsid}
                            placeholder="Masukkan nama WiFi baru"
                            placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                            autoCapitalize="none"
                            autoCorrect={false}
                          />
                        </View>

                        <View style={[styles.cardInputGroup, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                          <View style={styles.inputLabelHeader}>
                            <Text style={[styles.inputLabel, { color: colors.text }]}>Kata Sandi WiFi Baru</Text>
                            <Text style={styles.inputSubLabel}>Minimal 8 karakter unik</Text>
                          </View>
                          <View style={styles.passwordInputWrapper}>
                            <TextInput
                              style={[styles.formTextInputWithIcon, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.inputText }]}
                              value={newPassword}
                              onChangeText={setNewPassword}
                              placeholder="Masukkan kata sandi WiFi baru"
                              placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                              autoCapitalize="none"
                              autoCorrect={false}
                              secureTextEntry={securePassword}
                            />
                            <TouchableOpacity 
                              style={styles.eyeButton} 
                              onPress={() => setSecurePassword(!securePassword)}
                              activeOpacity={0.7}
                            >
                              <Feather name={securePassword ? 'eye-off' : 'eye'} size={16} color={colors.subtext} />
                            </TouchableOpacity>
                          </View>
                          
                          {/* Password Strength Meter */}
                          {newPassword.length > 0 ? (
                            <View style={styles.strengthWrapper}>
                              <View style={styles.strengthBarContainer}>
                                {[1, 2, 3, 4].map((step) => {
                                  const strength = getPasswordStrength(newPassword);
                                  const isActive = strength.score >= step;
                                  return (
                                    <View
                                      key={step}
                                      style={[
                                        styles.strengthSegment,
                                        { backgroundColor: isActive ? strength.color : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)') }
                                      ]}
                                    />
                                  );
                                })}
                              </View>
                              <Text style={[styles.strengthLabelText, { color: getPasswordStrength(newPassword).color }]}>
                                Kekuatan Sandi: {getPasswordStrength(newPassword).label}
                              </Text>
                            </View>
                          ) : null}
                        </View>

                        <TouchableOpacity 
                          style={[
                            styles.nativeSaveButton,
                            !isWlanFormValid && { backgroundColor: isDark ? '#334155' : '#CBD5E1', shadowColor: 'transparent', elevation: 0 }
                          ]}
                          disabled={!isWlanFormValid}
                          onPress={() => {
                            if (!newSsid.trim()) {
                              Alert.alert('Gagal', 'Nama WiFi tidak boleh kosong.');
                              return;
                            }
                            if (newPassword.length < 8) {
                              Alert.alert('Gagal', 'Kata Sandi WiFi harus minimal 8 karakter.');
                              return;
                            }
                            
                            // Tampilkan modal peringatan kustom
                            setShowConfirmModal(true);
                          }}
                          activeOpacity={0.8}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                            <Feather name="save" size={15} color="#FFF" style={{ marginRight: 8 }} />
                            <Text style={[styles.nativeSaveButtonText, { color: '#FFF' }]}>Simpan & Terapkan Perubahan</Text>
                          </View>
                        </TouchableOpacity>

                        <Text style={[styles.formNote, { color: colors.noteText, backgroundColor: colors.noteBg, borderColor: colors.noteBorder }]}>
                          PENTING: Setelah menekan tombol simpan, koneksi WiFi HP Anda akan terputus karena modem merestart jaringan nirkabel. Silakan hubungkan kembali HP Anda dengan nama/kata sandi WiFi yang baru.
                        </Text>
                      </>
                    )}
                  </View>
                </ScrollView>
              ) : null}

              {/* 2.3 PANEL DAFTAR PERANGKAT TERHUBUNG */}
              {activeMenu === 'devices' ? (
                <ScrollView 
                  style={styles.fullscreenFormContainer}
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.formContentBox}>
                    {/* Total Stats Card */}
                    <View style={[styles.cardInputGroup, { backgroundColor: colors.card, borderColor: colors.cardBorder, padding: 16, alignItems: 'center', marginBottom: 14 }]}>
                      <Text style={{ fontSize: 12, color: colors.subtext, fontWeight: '700' }}>TOTAL KONEKSI AKTIF</Text>
                      <Text style={{ fontSize: 32, fontWeight: '900', color: '#10B981', marginTop: 4 }}>
                        {realDevices.length > 0 ? `${realDevices.length} Perangkat` : 'Belum Dipindai'}
                      </Text>
                      <Text style={{ fontSize: 10, color: colors.subtext, marginTop: 4 }}>Client terdaftar dalam tabel DHCP lease modem</Text>
                    </View>

                    {/* Device List */}
                    {isScanningDevices ? (
                      <View style={{ paddingVertical: 32, alignItems: 'center' }}>
                        <ActivityIndicator size="large" color={scanDevicesTimeout ? "#EF4444" : "#10B981"} style={{ marginBottom: 12 }} />
                        <Text style={{ fontSize: 14, color: colors.text, fontWeight: '700', textAlign: 'center' }}>
                          {scanDevicesTimeout ? 'Koneksi Terlalu Lambat' : 'Memindai Jaringan Modem...'}
                        </Text>
                        <Text style={{ fontSize: 11, color: colors.subtext, marginTop: 6, textAlign: 'center', paddingHorizontal: 20, lineHeight: 16 }}>
                          {scanDevicesTimeout 
                            ? 'Pemindaian memakan waktu lebih lama dari biasanya. Pastikan HP Anda terhubung ke WiFi modem.'
                            : 'Membaca daftar client dari tabel DHCP lease modem...'}
                        </Text>

                        {scanDevicesTimeout ? (
                          <TouchableOpacity
                            style={[
                              styles.nativeSaveButton, 
                              { 
                                backgroundColor: '#EF4444', 
                                shadowColor: '#EF4444', 
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.3,
                                shadowRadius: 6,
                                elevation: 4,
                                borderWidth: 0,
                                marginTop: 20,
                                width: '80%'
                              }
                            ]}
                            onPress={() => {
                              setScanDevicesTimeout(false);
                              injectReadDevices();
                            }}
                            activeOpacity={0.85}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                              <Feather name="refresh-cw" size={15} color="#FFF" style={{ marginRight: 8 }} />
                              <Text style={[styles.nativeSaveButtonText, { color: '#FFF' }]}>Coba Lagi / Segarkan</Text>
                            </View>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    ) : (
                      <View>
                        {realDevices.length === 0 ? (
                          <View style={[styles.cardInputGroup, { backgroundColor: colors.card, borderColor: colors.cardBorder, padding: 24, alignItems: 'center' }]}>
                            <Feather name="wifi-off" size={32} color="#475569" style={{ marginBottom: 12 }} />
                            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.subtext }}>Belum Ada Data</Text>
                            <Text style={{ fontSize: 11, color: colors.subtext, marginTop: 4, textAlign: 'center' }}>
                              Ketuk tombol Pindai di bawah untuk membaca data perangkat dari modem
                            </Text>
                          </View>
                        ) : (
                          realDevices.map((device, idx) => {
                            const isWifi = device.port.toLowerCase().includes('ssid') || device.port.toLowerCase().includes('wlan');
                            const portLabel = isWifi ? `WiFi (${device.port})` : `LAN (${device.port})`;
                            const deviceName = device.name || `Perangkat ${idx + 1}`;
                            return (
                              <View
                                key={idx}
                                style={[styles.cardInputGroup, { backgroundColor: colors.card, borderColor: colors.cardBorder, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 10 }]}
                              >
                                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: isWifi ? 'rgba(6,182,212,0.1)' : 'rgba(16,189,129,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 14 }}>
                                  <Feather name={isWifi ? 'wifi' : 'monitor'} size={20} color={isWifi ? '#06B6D4' : '#10B981'} />
                                </View>
                                <View style={{ flex: 1 }}>
                                  <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text }}>{deviceName}</Text>
                                  <Text style={{ fontSize: 10, color: colors.subtext, marginTop: 3 }}>IP: {device.ip}</Text>
                                  <Text style={{ fontSize: 10, color: colors.subtext }}>MAC: {device.mac}</Text>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                                    <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: isWifi ? '#06B6D4' : '#10B981', marginRight: 5 }} />
                                    <Text style={{ fontSize: 10, fontWeight: '700', color: isWifi ? '#06B6D4' : '#10B981' }}>{portLabel}</Text>
                                  </View>
                                </View>
                              </View>
                            );
                          })
                        )}

                        {/* Scan / Refresh Button */}
                        <TouchableOpacity
                          style={[
                            styles.nativeSaveButton, 
                            { 
                              backgroundColor: '#10B981', 
                              shadowColor: '#10B981', 
                              shadowOffset: { width: 0, height: 4 },
                              shadowOpacity: 0.3,
                              shadowRadius: 6,
                              elevation: 4,
                              borderWidth: 0,
                              marginTop: 10
                            }
                          ]}
                          onPress={injectReadDevices}
                          activeOpacity={0.85}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                            <Feather 
                              name={realDevices.length === 0 ? 'search' : 'refresh-cw'} 
                              size={15} 
                              color="#FFF" 
                              style={{ marginRight: 8 }} 
                            />
                            <Text style={[styles.nativeSaveButtonText, { color: '#FFF' }]}>
                              {realDevices.length === 0 ? 'Pindai Perangkat Baru' : 'Segarkan Perangkat'}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </ScrollView>
              ) : null}

              {/* 2.4 PANEL STATUS DIAGNOSTIK MODEM */}
              {activeMenu === 'status' && (() => {
                const rxNum = parseRxPower(realDiag?.rxPower);
                const rating = getRxPowerRating(rxNum);


                return (
                  <ScrollView 
                    style={styles.fullscreenFormContainer}
                    showsVerticalScrollIndicator={false}
                  >
                    <View style={styles.formContentBox}>
                      
                      {/* CASE 1: Welcome / Idle State */}
                      {!realDiag && diagStep === 'idle' ? (
                        <View style={{
                          backgroundColor: colors.card,
                          borderColor: colors.cardBorder,
                          borderWidth: 1,
                          borderRadius: 20,
                          padding: 24,
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginBottom: 16,
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.05,
                          shadowRadius: 10,
                          elevation: 2
                        }}>
                          <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(6,182,212,0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
                            <Feather name="activity" size={28} color="#06B6D4" />
                          </View>
                          <Text style={{ fontSize: 16, fontWeight: '900', color: colors.text, marginBottom: 8, textAlign: 'center' }}>
                            Mulai Diagnosis Modem
                          </Text>
                          <Text style={{ fontSize: 11, color: colors.subtext, textAlign: 'center', lineHeight: 16, paddingHorizontal: 10, marginBottom: 4 }}>
                            Sistem akan memindai status redaman optik (RX) dan suhu modul modem Anda secara otomatis.
                          </Text>
                        </View>
                      ) : null}

                      {/* CASE 2: Scanning / Loading State */}
                      {!realDiag && diagStep !== 'idle' ? (
                        <View style={{
                          backgroundColor: colors.card,
                          borderColor: colors.cardBorder,
                          borderWidth: 1,
                          borderRadius: 20,
                          padding: 20,
                          marginBottom: 16,
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.05,
                          shadowRadius: 10,
                          elevation: 2
                        }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                            <ActivityIndicator size="small" color="#06B6D4" style={{ marginRight: 10 }} />
                            <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text, letterSpacing: 0.5 }}>MEMINDAI DIAGNOSTIK MODEM...</Text>
                          </View>
                          
                          <View style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', padding: 16, borderRadius: 14, borderWidth: 1, borderColor: colors.divider || 'rgba(255,255,255,0.06)' }}>
                            {/* Step 1 */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                              <View style={{ 
                                width: 22, 
                                height: 22, 
                                borderRadius: 11, 
                                backgroundColor: diagStep === 'status' ? 'rgba(6,182,212,0.2)' : (diagStep === 'netitf' || diagStep === 'read' || diagStep === 'done' ? '#10B981' : 'rgba(100,116,139,0.1)'), 
                                justifyContent: 'center', 
                                alignItems: 'center', 
                                marginRight: 12 
                              }}>
                                {diagStep === 'netitf' || diagStep === 'read' || diagStep === 'done' ? (
                                  <Feather name="check" size={12} color="#FFF" />
                                ) : (
                                  <ActivityIndicator size="small" color="#06B6D4" />
                                )}
                              </View>
                              <Text style={{ fontSize: 12, fontWeight: (diagStep === 'status' ? '700' : '400') as any, color: diagStep === 'status' ? colors.text : colors.subtext }}>
                                {'Menghubungkan ke Menu Status'}
                              </Text>
                            </View>

                            {/* Step 2 */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                              <View style={{ 
                                width: 22, 
                                height: 22, 
                                borderRadius: 11, 
                                backgroundColor: diagStep === 'netitf' ? 'rgba(6,182,212,0.2)' : (diagStep === 'read' || diagStep === 'done' ? '#10B981' : 'rgba(100,116,139,0.1)'), 
                                justifyContent: 'center', 
                                alignItems: 'center', 
                                marginRight: 12 
                              }}>
                                {diagStep === 'read' || diagStep === 'done' ? (
                                  <Feather name="check" size={12} color="#FFF" />
                                ) : (
                                  diagStep === 'netitf' ? (
                                    <ActivityIndicator size="small" color="#06B6D4" />
                                  ) : (
                                    <Text style={{ fontSize: 10, fontWeight: '700', color: colors.subtext }}>2</Text>
                                  )
                                )}
                              </View>
                              <Text style={{ fontSize: 12, fontWeight: (diagStep === 'netitf' ? '700' : '400') as any, color: diagStep === 'netitf' ? colors.text : colors.subtext }}>
                                {'Menavigasi ke Network Interface'}
                              </Text>
                            </View>

                            {/* Step 3 */}
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <View style={{ 
                                width: 22, 
                                height: 22, 
                                borderRadius: 11, 
                                backgroundColor: diagStep === 'read' ? 'rgba(6,182,212,0.2)' : (diagStep === 'done' ? '#10B981' : 'rgba(100,116,139,0.1)'), 
                                justifyContent: 'center', 
                                alignItems: 'center', 
                                marginRight: 12 
                              }}>
                                {diagStep === 'done' ? (
                                  <Feather name="check" size={12} color="#FFF" />
                                ) : (
                                  diagStep === 'read' ? (
                                    <ActivityIndicator size="small" color="#06B6D4" />
                                  ) : (
                                    <Text style={{ fontSize: 10, fontWeight: '700', color: colors.subtext }}>3</Text>
                                  )
                                )}
                              </View>
                              <Text style={{ fontSize: 12, fontWeight: (diagStep === 'read' ? '700' : '400') as any, color: diagStep === 'read' ? colors.text : colors.subtext }}>
                                {'Membaca Redaman Optik'}
                              </Text>
                            </View>
                          </View>
                        </View>
                      ) : null}

                      {/* CASE 3: Diagnosis Loaded State */}
                      {realDiag ? (
                        <View style={{
                          backgroundColor: colors.card,
                          borderColor: colors.cardBorder,
                          borderWidth: 1,
                          borderRadius: 20,
                          padding: 18,
                          marginBottom: 16,
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.1,
                          shadowRadius: 12,
                          elevation: 3
                        }}>
                          {/* Header Laporan */}
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: colors.divider || 'rgba(255,255,255,0.06)', paddingBottom: 12, marginBottom: 16 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <Feather name="shield" size={16} color={rating.color} style={{ marginRight: 8 }} />
                              <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text, letterSpacing: 0.5 }}>STATUS DIAGNOSIS</Text>
                            </View>
                            <View style={{ backgroundColor: rating.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
                              <Text style={{ fontSize: 9, fontWeight: '900', color: rating.color }}>
                                {rating.text.toUpperCase()}
                              </Text>
                            </View>
                          </View>

                          {/* Grid Dashboard */}
                          <View style={{ flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                            {/* Panel 1: Redaman RX */}
                            <View style={{ width: '100%', backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 16, padding: 14, alignItems: 'center' }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
                                <Feather name="activity" size={12} color="#06B6D4" style={{ marginRight: 6 }} />
                                <Text style={{ fontSize: 9, fontWeight: '800', color: colors.subtext, letterSpacing: 0.5 }}>REDAMAN OPTIK</Text>
                              </View>
                              <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', marginTop: 4 }}>
                                <Text style={{ fontSize: 24, fontWeight: '900', color: rating.color }}>
                                  {rxNum || '--'}
                                </Text>
                                {rxNum !== null ? (
                                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.subtext, marginLeft: 2 }}>dBm</Text>
                                ) : null}
                              </View>
                              <Text style={{ fontSize: 9, color: colors.subtext, marginTop: 6, textAlign: 'center' }}>Batas ideal: -7 dBm sampai -26 dBm</Text>
                            </View>

                            {/* Panel 2: Suhu Modul */}
                            {(() => {
                              const tempNum = parseFloat(realDiag.temp) || 0;
                              return (
                                <View style={{ width: '100%', backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 16, padding: 14, alignItems: 'center' }}>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
                                    <Feather name="thermometer" size={12} color="#EF4444" style={{ marginRight: 6 }} />
                                    <Text style={{ fontSize: 9, fontWeight: '800', color: colors.subtext, letterSpacing: 0.5 }}>SUHU MODUL</Text>
                                  </View>
                                  <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', marginTop: 4 }}>
                                    <Text style={{ fontSize: 24, fontWeight: '900', color: colors.text }}>
                                      {realDiag.temp ? (realDiag.temp.includes('°C') ? realDiag.temp : `${realDiag.temp}°C`) : '--'}
                                    </Text>
                                  </View>
                                  <Text style={{ fontSize: 9, color: colors.subtext, marginTop: 6, textAlign: 'center' }}>Batas aman: &lt; 70°C</Text>
                                </View>
                              );
                            })()}
                          </View>

                          {/* Kesimpulan Ringkas Banner */}
                          {(() => {
                            let bannerText = "Koneksi serat optik Anda saat ini dalam kondisi prima dan sangat stabil.";
                            let bannerColor = '#10B981';
                            let bannerBg = 'rgba(16, 189, 129, 0.08)';
                            let bannerIcon = 'check-circle';

                            if (rxNum !== null) {
                              if (rxNum <= -29) {
                                bannerText = "Sinyal sangat lemah & kritis! Harap periksa kabel serat optik atau hubungi operator.";
                                bannerColor = '#EF4444';
                                bannerBg = 'rgba(239, 68, 68, 0.08)';
                                bannerIcon = 'alert-octagon';
                              } else if (rxNum <= -26) {
                                bannerText = "Redaman kurang ideal. Kemungkinan kabel serat optik ditekuk terlalu tajam.";
                                bannerColor = '#F59E0B';
                                bannerBg = 'rgba(245, 158, 11, 0.08)';
                                bannerIcon = 'alert-triangle';
                              } else if (rxNum > -5) {
                                bannerText = "Sinyal terlalu kuat (Overload). Ini dapat merusak komponen receiver modem.";
                                bannerColor = '#EF4444';
                                bannerBg = 'rgba(239, 68, 68, 0.08)';
                                bannerIcon = 'alert-circle';
                              }
                            }

                            return (
                              <View style={{ 
                                flexDirection: 'row', 
                                alignItems: 'center', 
                                backgroundColor: bannerBg, 
                                borderWidth: 1, 
                                borderColor: `${bannerColor}20`, 
                                borderRadius: 12, 
                                padding: 12 
                              }}>
                                <Feather name={bannerIcon as any} size={15} color={bannerColor} style={{ marginRight: 8, marginTop: 1 }} />
                                <Text style={{ flex: 1, fontSize: 10, fontWeight: '600', color: bannerColor, lineHeight: 14 }}>
                                  {bannerText}
                                </Text>
                              </View>
                            );
                          })()}
                        </View>
                      ) : null}

                      {/* Scan / Refresh Button */}
                      <TouchableOpacity
                        style={[
                          styles.nativeSaveButton, 
                          { 
                            backgroundColor: '#10B981', 
                            shadowColor: '#10B981', 
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.3,
                            shadowRadius: 6,
                            elevation: 4,
                            borderWidth: 0,
                            marginTop: 10
                          }
                        ]}
                        onPress={handleRefreshDiagnostics}
                        activeOpacity={0.85}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                          <Feather name="refresh-cw" size={15} color="#FFF" style={{ marginRight: 8 }} />
                          <Text style={[styles.nativeSaveButtonText, { color: '#FFF' }]}>
                            Segarkan Diagnostik
                          </Text>
                        </View>
                      </TouchableOpacity>


                    </View>
                  </ScrollView>
                );
              })()}

              {/* 2.5 PANEL REBOOT SISTEM MODEM */}
              {activeMenu === 'reboot' ? (
                <ScrollView 
                  style={styles.fullscreenFormContainer}
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.formContentBox}>
                    {rebootStep === 'rebooting' ? (
                      /* Rebooting Countdown Screen */
                      <View style={{ alignItems: 'center', paddingVertical: 15 }}>
                        <View style={[styles.cardInputGroup, { 
                          backgroundColor: colors.card, 
                          borderColor: colors.cardBorder, 
                          padding: 24, 
                          alignItems: 'center',
                          width: '100%'
                        }]}>
                          {/* Beautiful Countdown Circle */}
                          <View style={{ 
                            width: 120, 
                            height: 120, 
                            borderRadius: 60, 
                            backgroundColor: isDark ? 'rgba(239, 68, 68, 0.05)' : 'rgba(239, 68, 68, 0.08)',
                            justifyContent: 'center', 
                            alignItems: 'center', 
                            marginBottom: 20,
                            borderWidth: 2,
                            borderColor: 'rgba(239, 68, 68, 0.15)',
                            borderStyle: 'dashed'
                          }}>
                            <Text style={{ fontSize: 38, fontWeight: '900', color: '#EF4444', includeFontPadding: false }}>
                              {rebootCountdown}
                            </Text>
                            <Text style={{ fontSize: 9, color: colors.subtext, marginTop: 2, fontWeight: '800', letterSpacing: 0.5 }}>DETIK</Text>
                          </View>

                          <Text style={[styles.formMainTitle, { color: colors.text, textAlign: 'center', fontSize: 18, fontWeight: '900' }]}>
                            Modem Sedang Reboot
                          </Text>
                          <Text style={{ fontSize: 11, color: colors.subtext, textAlign: 'center', marginTop: 4, fontWeight: '600' }}>
                            Jangan menutup aplikasi atau mematikan modem
                          </Text>
                        </View>

                        {/* Progress steps changing over time */}
                        <View style={[styles.cardInputGroup, { 
                          backgroundColor: colors.card, 
                          borderColor: colors.cardBorder, 
                          padding: 16, 
                          marginTop: 14, 
                          width: '100%' 
                        }]}>
                          {[
                            { text: 'Mengirim perintah reboot ke sistem modem', minSec: 55 },
                            { text: 'Memutus sesi admin & memicu muat ulang hardware', minSec: 40 },
                            { text: 'Modem sedang memuat ulang sistem, mohon tunggu...', minSec: 10 },
                            { text: 'Menyelesaikan konfigurasi dan memulihkan koneksi', minSec: 0 }
                          ].map((step, idx, arr) => {
                            const isDone = rebootCountdown < step.minSec;
                            const isActive = rebootCountdown >= step.minSec && (idx === 0 || rebootCountdown < arr[idx-1].minSec);
                            return (
                              <View 
                                key={idx} 
                                style={{ 
                                  flexDirection: 'row', 
                                  alignItems: 'center', 
                                  paddingVertical: 12, 
                                  borderBottomWidth: idx === 3 ? 0 : 1, 
                                  borderColor: colors.cardBorder 
                                }}
                              >
                                <View style={{ marginRight: 12 }}>
                                  {isDone ? (
                                    <Feather name="check-circle" size={16} color="#10B981" />
                                  ) : isActive ? (
                                    <ActivityIndicator size="small" color="#EF4444" />
                                  ) : (
                                    <View style={{ 
                                      width: 16, 
                                      height: 16, 
                                      borderRadius: 8, 
                                      borderWidth: 1.5, 
                                      borderColor: colors.cardBorder,
                                      backgroundColor: colors.inputBg 
                                    }} />
                                  )}
                                </View>
                                <Text style={{ 
                                  fontSize: 12, 
                                  fontWeight: '600', 
                                  color: isDone ? '#10B981' : isActive ? colors.text : colors.subtext, 
                                  flex: 1 
                                }}>
                                  {step.text}
                                </Text>
                              </View>
                            );
                          })}
                        </View>
                      </View>
                    ) : (
                      /* Main Idle Screen (Only Reboot button, NO cancel button) */
                      <View style={{ alignItems: 'center', paddingVertical: 10 }}>
                        <View style={[styles.cardInputGroup, { 
                          backgroundColor: colors.card, 
                          borderColor: colors.cardBorder, 
                          padding: 24, 
                          alignItems: 'center',
                          width: '100%',
                          marginBottom: 20
                        }]}>
                          {/* Glowing Power icon */}
                          <View style={{ 
                            width: 72, 
                            height: 72, 
                            borderRadius: 36, 
                            backgroundColor: 'rgba(239, 68, 68, 0.1)', 
                            justifyContent: 'center', 
                            alignItems: 'center', 
                            marginBottom: 16, 
                            borderWidth: 1.5, 
                            borderColor: 'rgba(239, 68, 68, 0.3)' 
                          }}>
                            <Feather name="power" size={32} color="#EF4444" />
                          </View>

                          <Text style={[styles.formMainTitle, { color: colors.text, textAlign: 'center', fontSize: 18, fontWeight: '900' }]}>
                            Mulai Ulang Sistem Modem
                          </Text>
                          <Text style={{ fontSize: 12, color: colors.subtext, textAlign: 'center', marginTop: 6, lineHeight: 18, paddingHorizontal: 12 }}>
                            Mulai ulang (reboot) modem ZTE secara aman langsung dari aplikasi jika jaringan WiFi melambat atau bermasalah.
                          </Text>
                        </View>

                        {/* Single Reboot Button (No Cancel button) */}
                        <TouchableOpacity
                          style={{
                            width: '100%',
                            height: 48,
                            borderRadius: 10,
                            backgroundColor: '#EF4444',
                            shadowColor: '#EF4444',
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.3,
                            shadowRadius: 6,
                            elevation: 4,
                            justifyContent: 'center',
                            alignItems: 'center',
                          }}
                          onPress={() => setShowRebootModal(true)}
                          activeOpacity={0.8}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                            <Feather name="power" size={16} color="#FFF" style={{ marginRight: 8 }} />
                            <Text style={{ fontSize: 14, fontWeight: '900', color: '#FFF' }}>
                              Reboot Modem
                            </Text>
                          </View>
                        </TouchableOpacity>

                        {/* Custom themed Modal Peringatan Reboot */}
                        <Modal
                          visible={showRebootModal}
                          transparent={true}
                          animationType="fade"
                          onRequestClose={() => setShowRebootModal(false)}
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
                              borderRadius: 16,
                              padding: 20,
                              alignItems: 'center',
                              shadowColor: '#000',
                              shadowOffset: { width: 0, height: 10 },
                              shadowOpacity: 0.3,
                              shadowRadius: 12,
                              elevation: 8,
                            }}>
                              {/* Warning Icon Container */}
                              <View style={{
                                width: 56,
                                height: 56,
                                borderRadius: 28,
                                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                justifyContent: 'center',
                                alignItems: 'center',
                                marginBottom: 16,
                                borderWidth: 1.5,
                                borderColor: 'rgba(239, 68, 68, 0.3)',
                              }}>
                                <Feather name="power" size={24} color="#EF4444" />
                              </View>

                              {/* Modal Title */}
                              <Text style={{
                                fontSize: 18,
                                fontWeight: '900',
                                color: colors.text,
                                textAlign: 'center',
                                marginBottom: 10,
                                letterSpacing: -0.2,
                              }}>
                                Konfirmasi Reboot Modem
                              </Text>

                              {/* Modal Message */}
                              <Text style={{
                                fontSize: 12,
                                color: colors.subtext,
                                textAlign: 'center',
                                lineHeight: 18,
                                marginBottom: 14,
                                fontWeight: '600',
                              }}>
                                Apakah Anda yakin ingin memulai ulang (reboot) modem?
                              </Text>

                              {/* Warning Notice box inside Modal */}
                              <View style={{ 
                                backgroundColor: isDark ? 'rgba(245, 158, 11, 0.06)' : 'rgba(245, 158, 11, 0.08)', 
                                borderColor: isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.2)', 
                                borderWidth: 1, 
                                borderRadius: 10,
                                padding: 12, 
                                marginBottom: 20,
                                flexDirection: 'row', 
                                alignItems: 'flex-start',
                                width: '100%'
                              }}>
                                <Feather name="alert-triangle" size={14} color="#F59E0B" style={{ marginRight: 8, marginTop: 1 }} />
                                <View style={{ flex: 1 }}>
                                  <Text style={{ fontSize: 11, fontWeight: '800', color: isDark ? '#F59E0B' : '#D97706' }}>Perhatian Penting</Text>
                                  <Text style={{ fontSize: 10, color: colors.subtext, marginTop: 3, lineHeight: 14 }}>
                                    Koneksi internet dan jaringan WiFi akan terputus total selama proses reboot (sekitar 60-90 detik). Harap tunggu sampai modem selesai memuat ulang.
                                  </Text>
                                </View>
                              </View>

                              {/* Modal Buttons Grid */}
                              <View style={{
                                flexDirection: 'row',
                                width: '100%',
                                gap: 12,
                              }}>
                                <TouchableOpacity
                                  style={{
                                    flex: 1,
                                    height: 44,
                                    borderRadius: 10,
                                    backgroundColor: colors.buttonBg,
                                    borderWidth: 1,
                                    borderColor: colors.inputBorder,
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                  }}
                                  onPress={() => setShowRebootModal(false)}
                                  activeOpacity={0.8}
                                >
                                  <Text style={{ fontSize: 13, fontWeight: '800', color: colors.subtext }}>
                                    Batalkan
                                  </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                  style={{
                                    flex: 1,
                                    height: 44,
                                    borderRadius: 10,
                                    backgroundColor: '#EF4444',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    shadowColor: '#EF4444',
                                    shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: 0.3,
                                    shadowRadius: 6,
                                    elevation: 4,
                                  }}
                                  onPress={handleInjectReboot}
                                  activeOpacity={0.8}
                                >
                                  <Text style={{ fontSize: 13, fontWeight: '900', color: '#FFF' }}>
                                    Ya, Reboot
                                  </Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          </View>
                        </Modal>


                      </View>
                    )}
                  </View>
                </ScrollView>
              ) : null}
            </View>
          )}
        </View>
      ) : null}

      {/* Render overlay form di atas webview hanya jika showWebView aktif & WLAN terdeteksi */}
      {showWebView && showWlanForm ? (
        <Animated.View style={[
          styles.wlanFormContainer,
          {
            transform: [
              {
                translateY: formHeightAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [400, 0]
                })
              }
            ],
            opacity: formHeightAnim
          }
        ]}>
          <View style={styles.formHeader}>
            <View style={styles.formTitleContainer}>
              <Text style={styles.formTitle}>Pengaturan WiFi Terdeteksi</Text>
              <Text style={styles.formSubtitle}>Konfigurasi WiFi modem ZTE Anda</Text>
            </View>
            <TouchableOpacity 
              style={styles.closeFormButton} 
              onPress={() => setShowWlanForm(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.closeFormIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.formScroll} 
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.formContent}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nama WiFi (SSID)</Text>
                <TextInput
                  style={styles.textInput}
                  value={newSsid}
                  onChangeText={setNewSsid}
                  placeholder="Masukkan nama WiFi baru"
                  placeholderTextColor="#475569"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Password WiFi (Minimal 8 Karakter)</Text>
                <View style={styles.passwordInputWrapper}>
                  <TextInput
                    style={styles.textInputWithIcon}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="Masukkan password WiFi baru"
                    placeholderTextColor="#475569"
                    autoCapitalize="none"
                    autoCorrect={false}
                    secureTextEntry={securePassword}
                  />
                  <TouchableOpacity 
                    style={styles.eyeButton} 
                    onPress={() => setSecurePassword(!securePassword)}
                    activeOpacity={0.7}
                  >
                    <Feather name={securePassword ? 'eye' : 'eye-off'} size={18} color="#64748B" />
                  </TouchableOpacity>
                </View>
              </View>

              {saveStatus === 'saving' ? (
                <View style={styles.savingContainer}>
                  <ActivityIndicator size="small" color="#06B6D4" style={{ marginRight: 10 }} />
                  <Text style={styles.savingText}>Mengirim perubahan ke modem...</Text>
                </View>
              ) : (
                <TouchableOpacity 
                  style={[
                    styles.saveButton,
                    !isWlanFormValid && { backgroundColor: isDark ? '#334155' : '#CBD5E1', shadowColor: 'transparent', elevation: 0 }
                  ]}
                  disabled={!isWlanFormValid}
                  onPress={() => {
                    if (!newSsid.trim()) {
                      Alert.alert('Gagal', 'Nama WiFi tidak boleh kosong.');
                      return;
                    }
                    if (newPassword.length < 8) {
                      Alert.alert('Gagal', 'Password WiFi harus minimal 8 karakter.');
                      return;
                    }
                    
                    // Tampilkan modal peringatan kustom
                    setShowConfirmModal(true);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.saveButtonText, !isWlanFormValid && { color: isDark ? '#64748B' : '#94A3B8' }]}>Simpan Perubahan WiFi</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </Animated.View>
      ) : null}

      {/* Navigation bar (Hanya tampil jika showWebView aktif agar navigasi browser normal tetap bisa digunakan) */}
      {showWebView ? (
        <View style={[
          styles.navigationBar, 
          { 
            backgroundColor: colors.headerBg, 
            borderColor: colors.headerBorder, 
            justifyContent: 'space-around',
            height: Platform.OS === 'ios' ? 76 : 60,
            paddingBottom: Platform.OS === 'ios' ? 16 : 0
          }
        ]}>
          <TouchableOpacity 
            style={[styles.navButton, !canGoBack && styles.disabledButton, { backgroundColor: 'transparent' }]} 
            onPress={handleGoBack} 
            disabled={!canGoBack} 
            activeOpacity={0.7}
          >
            <Feather name="chevron-left" size={24} color={canGoBack ? colors.activeBlue : colors.subtext} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.navButton, { backgroundColor: 'transparent' }]} 
            onPress={handleReload} 
            activeOpacity={0.7}
          >
            <Feather name="refresh-cw" size={18} color={colors.activeBlue} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.navButton, !canGoForward && styles.disabledButton, { backgroundColor: 'transparent' }]} 
            onPress={handleGoForward} 
            disabled={!canGoForward} 
            activeOpacity={0.7}
          >
            <Feather name="chevron-right" size={24} color={canGoForward ? colors.activeBlue : colors.subtext} />
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Overlay Logout Sesi Bersih */}
      <Modal
        visible={isLoggingOut}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.logoutOverlayContainer}>
          <ActivityIndicator size="large" color="#EF4444" style={{ marginBottom: 16 }} />
          <Text style={styles.logoutOverlayTitle}>Mengakhiri Sesi...</Text>
          <Text style={styles.logoutOverlaySub}>Menutup sesi aktif Anda pada portal modem secara aman</Text>
        </View>
      </Modal>

      {/* Custom themed Modal Peringatan Reboot Jaringan */}
      <Modal
        visible={showConfirmModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
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
            borderRadius: 16,
            padding: 20,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.3,
            shadowRadius: 12,
            elevation: 8,
          }}>
            {/* Warning Icon Container */}
            <View style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: isDark ? 'rgba(245, 158, 11, 0.1)' : 'rgba(245, 158, 11, 0.15)',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 16,
              borderWidth: 1.5,
              borderColor: isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.25)',
            }}>
              <Feather name="alert-triangle" size={28} color="#F59E0B" />
            </View>

            {/* Modal Title */}
            <Text style={{
              fontSize: 18,
              fontWeight: '900',
              color: colors.text,
              textAlign: 'center',
              marginBottom: 10,
              letterSpacing: -0.2,
            }}>
              Konfirmasi Perubahan WiFi
            </Text>

            {/* Modal Message */}
            <Text style={{
              fontSize: 12,
              color: colors.subtext,
              textAlign: 'center',
              lineHeight: 18,
              marginBottom: 20,
              fontWeight: '600',
            }}>
              Apakah Anda yakin ingin menyimpan nama (SSID) atau kata sandi WiFi baru? Modem akan merestart modul nirkabel (WiFi) untuk menerapkan konfigurasi baru, sehingga koneksi HP Anda akan terputus sementara.
            </Text>

            {/* Modal Buttons Grid */}
            <View style={{
              flexDirection: 'row',
              width: '100%',
              gap: 12,
            }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  height: 44,
                  borderRadius: 10,
                  backgroundColor: colors.buttonBg,
                  borderWidth: 1,
                  borderColor: colors.inputBorder,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
                onPress={() => setShowConfirmModal(false)}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 13, fontWeight: '800', color: colors.subtext }}>
                  Batal
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flex: 1,
                  height: 44,
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
                onPress={() => {
                  setShowConfirmModal(false);
                  injectSaveWlanDetails(newSsid, newPassword);
                }}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 13, fontWeight: '900', color: '#FFF' }}>
                  Ya, Simpan
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Custom themed Modal Sukses Reboot */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowSuccessModal(false);
          onBack();
        }}
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
            borderRadius: 16,
            padding: 20,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.3,
            shadowRadius: 12,
            elevation: 8,
          }}>
            {/* Success Icon Container */}
            <View style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 16,
              borderWidth: 1.5,
              borderColor: 'rgba(16, 185, 129, 0.3)',
            }}>
              <Feather name="check" size={28} color="#10B981" />
            </View>

            {/* Modal Title */}
            <Text style={{
              fontSize: 18,
              fontWeight: '900',
              color: colors.text,
              textAlign: 'center',
              marginBottom: 10,
              letterSpacing: -0.2,
            }}>
              Reboot Berhasil
            </Text>

            {/* Modal Message */}
            <Text style={{
              fontSize: 12,
              color: colors.subtext,
              textAlign: 'center',
              lineHeight: 18,
              marginBottom: 20,
              fontWeight: '600',
            }}>
              Perintah reboot berhasil dijalankan. Modem sedang memuat ulang sistemnya, silakan hubungkan HP kembali setelah lampu indikator WiFi menyala normal.
            </Text>

            {/* Modal Button */}
            <TouchableOpacity
              style={{
                width: '100%',
                height: 44,
                borderRadius: 10,
                backgroundColor: '#10B981',
                justifyContent: 'center',
                alignItems: 'center',
                shadowColor: '#10B981',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 6,
                elevation: 4,
              }}
              onPress={() => {
                setShowSuccessModal(false);
                onBack();
              }}
              activeOpacity={0.8}
            >
              <Text style={{ fontSize: 13, fontWeight: '900', color: '#FFF' }}>
                Kembali ke Dashboard
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Custom themed Modal Sukses Simpan WLAN */}
      <Modal
        visible={showWlanSuccessModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowWlanSuccessModal(false);
          setShowWlanForm(false);
          onBack();
        }}
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
            borderRadius: 16,
            padding: 20,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.3,
            shadowRadius: 12,
            elevation: 8,
          }}>
            {/* Success Icon Container */}
            <View style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 16,
              borderWidth: 1.5,
              borderColor: 'rgba(16, 185, 129, 0.3)',
            }}>
              <Feather name="check" size={28} color="#10B981" />
            </View>

            {/* Modal Title */}
            <Text style={{
              fontSize: 18,
              fontWeight: '900',
              color: colors.text,
              textAlign: 'center',
              marginBottom: 10,
              letterSpacing: -0.2,
            }}>
              WiFi Berhasil Diperbarui
            </Text>

            {/* Modal Message */}
            <Text style={{
              fontSize: 12,
              color: colors.subtext,
              textAlign: 'center',
              lineHeight: 18,
              marginBottom: 20,
              fontWeight: '600',
            }}>
              Nama dan kata sandi WiFi baru telah diterapkan ke modem. Silakan hubungkan kembali HP Anda ke WiFi baru melalui pengaturan sistem jika koneksi terputus.
            </Text>

            {/* Modal Button */}
            <TouchableOpacity
              style={{
                width: '100%',
                height: 44,
                borderRadius: 10,
                backgroundColor: '#10B981',
                justifyContent: 'center',
                alignItems: 'center',
                shadowColor: '#10B981',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 6,
                elevation: 4,
              }}
              onPress={() => {
                setShowWlanSuccessModal(false);
                setShowWlanForm(false);
                onBack();
              }}
              activeOpacity={0.8}
            >
              <Text style={{ fontSize: 13, fontWeight: '900', color: '#FFF' }}>
                Kembali ke Dashboard
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Custom themed Modal Sesi Berakhir (Timeout) */}
      <Modal
        visible={showSessionTimeoutModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowSessionTimeoutModal(false);
          handleBackWithLogout();
        }}
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
            borderRadius: 16,
            padding: 20,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.3,
            shadowRadius: 12,
            elevation: 8,
          }}>
            {/* Warning Icon Container */}
            <View style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.15)',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 16,
              borderWidth: 1.5,
              borderColor: isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.25)',
            }}>
              <Feather name="clock" size={28} color="#EF4444" />
            </View>

            {/* Modal Title */}
            <Text style={{
              fontSize: 18,
              fontWeight: '900',
              color: colors.text,
              textAlign: 'center',
              marginBottom: 10,
              letterSpacing: -0.2,
            }}>
              Sesi Anda Berakhir
            </Text>

            {/* Modal Message */}
            <Text style={{
              fontSize: 12,
              color: colors.subtext,
              textAlign: 'center',
              lineHeight: 18,
              marginBottom: 20,
              fontWeight: '600',
            }}>
              Sesi masuk Anda telah berakhir (timeout) atau tidak terdeteksi adanya aktivitas. Silakan masuk kembali dari dashboard utama.
            </Text>

            {/* Modal Button */}
            <TouchableOpacity
              style={{
                width: '100%',
                height: 44,
                borderRadius: 10,
                backgroundColor: '#EF4444',
                justifyContent: 'center',
                alignItems: 'center',
                shadowColor: '#EF4444',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 6,
                elevation: 4,
              }}
              onPress={() => {
                setShowSessionTimeoutModal(false);
                handleBackWithLogout();
              }}
              activeOpacity={0.8}
            >
              <Text style={{ fontSize: 13, fontWeight: '900', color: '#FFF' }}>
                Kembali ke Dashboard
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#090A12' },
  // ── Progress Card ──────────────────────────────────────────
  progressCard:   { margin: 12, borderRadius: 14, backgroundColor: '#111827', borderWidth: 1, borderColor: 'rgba(6,182,212,0.25)', overflow: 'hidden', elevation: 6, shadowColor: '#06B6D4', shadowOpacity: 0.2, shadowRadius: 8 },
  progressHeader: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
  progressTitle:  { fontSize: 14, fontWeight: '800', color: '#F1F5F9', letterSpacing: 0.3 },
  progressSub:    { fontSize: 11, color: '#64748B', marginTop: 2, fontWeight: '500' },
  progressDivider:{ height: 1, backgroundColor: 'rgba(6,182,212,0.15)', marginHorizontal: 12 },
  stepRow:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
  stepIcon:       { width: 24, height: 24, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  stepDot:        { width: 8, height: 8, borderRadius: 4, backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155' },
  stepCheck:      { fontSize: 15, color: '#10B981', fontWeight: '900' },
  stepLabel:      { fontSize: 13, fontWeight: '600' },
  stepActive:     { color: '#06B6D4' },
  stepDone:       { color: '#10B981' },
  stepIdle:       { color: '#334155' },
  // ── Browser UI ─────────────────────────────────────────────
  browserHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#111322', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  closeButton:    { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.04)', justifyContent: 'center', alignItems: 'center' },
  closeIcon:      { fontSize: 14, color: '#94A3B8', fontWeight: '700' },
  addressBar:     { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#090A12', height: 36, borderRadius: 10, marginHorizontal: 12, paddingHorizontal: 10, borderWidth: 1, borderColor: '#1E293B' },
  lockIcon:       { fontSize: 12, marginRight: 6 },
  addressText:    { fontSize: 13, color: '#94A3B8', fontWeight: '600', flex: 1 },
  reloadButton:   { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.04)', justifyContent: 'center', alignItems: 'center' },
  reloadIcon:     { fontSize: 16, color: '#06B6D4', fontWeight: 'bold' },
  webArea:        { flex: 1, backgroundColor: '#FFF' },
  webView:        { flex: 1 },
  loaderContainer:{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: '#090A12', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 },
  loaderText:     { fontSize: 15, color: '#FFF', fontWeight: '800', marginTop: 18 },
  loaderSubtext:  { fontSize: 12, color: '#64748B', marginTop: 8, textAlign: 'center', fontWeight: '500' },
  navigationBar:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#111322', height: 60, paddingHorizontal: 16, borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  navButton:      { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.04)' },
  disabledButton: { backgroundColor: 'transparent' },
  navText:        { fontSize: 13, color: '#06B6D4', fontWeight: '700' },
  disabledText:   { color: '#334155' },
  homeButton:     { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: 'rgba(6,182,212,0.1)', borderWidth: 1, borderColor: 'rgba(6,182,212,0.2)' },
  homeText:       { fontSize: 13, color: '#06B6D4', fontWeight: '800' },
  // ── WLAN Form styles ───────────────────────────────────────
  wlanFormContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 2,
    borderColor: 'rgba(6,182,212,0.4)',
    maxHeight: '65%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 20,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  formTitleContainer: {
    flex: 1,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#06B6D4',
  },
  formSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  closeFormButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeFormIcon: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '700',
  },
  formScroll: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  formContent: {
    paddingVertical: 14,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    height: 48,
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#F8FAFC',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#06B6D4',
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#06B6D4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  savingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(6,182,212,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(6,182,212,0.15)',
    borderRadius: 10,
    height: 48,
    marginTop: 8,
  },
  savingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#06B6D4',
  },
  // ── Fullscreen Native Experience Styles ────────────────────
  webAreaHidden: {
    position: 'absolute',
    width: 0,
    height: 0,
    opacity: 0,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: 0.5,
  },
  reloadButtonActive: {
    backgroundColor: 'rgba(6, 182, 212, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.4)',
  },
  mainContentArea: {
    flex: 1,
    backgroundColor: '#090A12',
  },
  fullscreenProgressContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  progressAnimationBox: {
    alignItems: 'center',
    marginBottom: 40,
  },
  progressMainTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFF',
    marginTop: 16,
    textAlign: 'center',
  },
  progressMainSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 6,
    textAlign: 'center',
    fontWeight: '500',
  },
  progressStepsBox: {
    width: '100%',
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 30,
  },
  footerNote: {
    fontSize: 11,
    color: '#475569',
    textAlign: 'center',
    paddingHorizontal: 20,
    fontWeight: '500',
    lineHeight: 16,
  },
  fullscreenFormContainer: {
    flex: 1,
  },
  formContentBox: {
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  formMainHeader: {
    marginBottom: 20,
  },
  formMainTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFF',
  },
  formMainSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '500',
  },
  cardInputGroup: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    marginBottom: 14,
  },
  inputLabelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputSubLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  formTextInput: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    height: 48,
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#F8FAFC',
    fontWeight: '600',
  },
  nativeSaveButton: {
    backgroundColor: '#06B6D4',
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#06B6D4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  nativeSaveButtonText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  nativeSavingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(6,182,212,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(6,182,212,0.2)',
    borderRadius: 10,
    height: 48,
    marginTop: 8,
  },
  nativeSavingText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#06B6D4',
  },
  formNote: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 18,
    textAlign: 'justify',
    marginTop: 18,
    fontWeight: '500',
    backgroundColor: 'rgba(239, 68, 68, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.08)',
    padding: 12,
    borderRadius: 10,
  },
  // ── Error & Logout UI Styles ──────────────────────────────
  errorBigIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorMsgText: {
    fontSize: 13,
    color: '#EF4444',
    textAlign: 'center',
    paddingHorizontal: 28,
    marginTop: 10,
    fontWeight: '600',
    lineHeight: 20,
  },
  logoutOverlayContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(9, 10, 18, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    paddingHorizontal: 30,
  },
  logoutOverlayTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFF',
    marginTop: 12,
  },
  logoutOverlaySub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 6,
    textAlign: 'center',
    fontWeight: '500',
  },
  // ── Password Toggle Styles ─────────────────────────────────
  passwordInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    width: '100%',
  },
  formTextInputWithIcon: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    height: 48,
    paddingLeft: 16,
    paddingRight: 48,
    fontSize: 14,
    color: '#F8FAFC',
    fontWeight: '600',
    flex: 1,
  },
  textInputWithIcon: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    height: 48,
    paddingLeft: 16,
    paddingRight: 44,
    fontSize: 14,
    color: '#F8FAFC',
    fontWeight: '600',
    flex: 1,
  },
  eyeButton: {
    position: 'absolute',
    right: 0,
    height: '100%',
    width: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyeIconText: {
    fontSize: 16,
  },
  // ── Multi-SSID Pills Styles ──
  ssidPillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  ssidPillButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  ssidPillText: {
    fontSize: 12,
  },
  // ── Password Strength Styles ──
  strengthWrapper: {
    marginTop: 10,
  },
  strengthBarContainer: {
    flexDirection: 'row',
    gap: 6,
    height: 4,
    width: '100%',
    marginBottom: 6,
  },
  strengthSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthLabelText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
