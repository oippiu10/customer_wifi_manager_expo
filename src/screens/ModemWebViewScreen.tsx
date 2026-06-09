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

type NavPhase = 'idle' | 'network' | 'wlan' | 'diag_status' | 'diag_netitf' | 'diag_read' | 'done';

const makeAutoFillScript = (user: string, pass: string) => `
(function() {
  var pathname = window.location.pathname.toLowerCase();
  var hasLoginUsername = document.querySelector('input[name="Username"], input[name="username"], input[name="user"], input[name="loginUsername"], input[name="Frm_Loginuser"], input[id="username"], input[id="Username"], input[id="txt_Username"]');
  var isLogin = (pathname === '/' || pathname.indexOf('index.gch') !== -1 || pathname.indexOf('login') !== -1 || hasLoginUsername);
  if (!isLogin) {
    sessionStorage.removeItem('ag_auto_clicked');
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
  const [isScanningDevices, setIsScanningDevices] = useState(false);
  const [rebootStep, setRebootStep] = useState<'idle' | 'warning' | 'rebooting' | 'completed'>('idle');
  const [rebootCountdown, setRebootCountdown] = useState(60);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [showWebView, setShowWebView] = useState(false);
  const [selectedSsid, setSelectedSsid] = useState('IGD.LD1.WLAN1');
  const [isSwitchingSsid, setIsSwitchingSsid] = useState(false);
  const [automationError, setAutomationError] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [securePassword, setSecurePassword] = useState(true);
  const formHeightAnim = useRef(new Animated.Value(0)).current;

  // State real device list (dari DHCP lease table modem)
  type RealDevice = { name: string; ip: string; mac: string; port: string };
  const [realDevices, setRealDevices] = useState<RealDevice[]>([]);

  // State real diagnostics (dari status page modem)
  type RealDiag = { rxPower: string; txPower: string; uptime: string; wanIp: string; firmware: string; temp: string; ponStatus: string };
  const [realDiag, setRealDiag] = useState<RealDiag | null>(null);
  const [diagLogs, setDiagLogs] = useState<string[]>([]);

  // Band WiFi aktif yang dipilih (2.4GHz = WLAN1, 5GHz = WLAN5)
  const [activeBand, setActiveBand] = useState<'2.4GHz' | '5GHz'>('2.4GHz');

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

  // Efek timer hitung mundur untuk reboot modem
  useEffect(() => {
    let intervalId: any;
    if (rebootStep === 'rebooting') {
      intervalId = setInterval(() => {
        setRebootCountdown(prev => {
          if (prev <= 1) {
            clearInterval(intervalId);
            setRebootStep('completed');
            Alert.alert('Sukses', 'Perintah reboot berhasil dijalankan. Modem sedang memuat ulang sistemnya, silakan hubungkan HP kembali setelah lampu indikator WiFi menyala normal.');
            onBack(); // Kembali ke dashboard
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [rebootStep]);

  // Jika bukan mode teknisi, sembunyikan WebView secara paksa
  useEffect(() => {
    if (!isTechMode && showWebView) {
      setShowWebView(false);
    }
  }, [isTechMode]);

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

  const handleInjectReboot = () => {
    setRebootStep('rebooting');
    setRebootCountdown(60);

    // Injeksi JavaScript untuk reboot
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
          var btn = doc.getElementById('Btn_Reboot') || doc.getElementById('reboot') || doc.querySelector('input[type="button"][value*="Reboot"]') || doc.querySelector('input[type="button"][value*="Mulai Ulang"]');
          if (btn) {
            btn.click();
            return "REBOOT_CLICKED";
          }
        }
        // Redirect ke halaman reboot bawaan ZTE jika tidak ketemu tombol langsung
        window.location.href = '/manager_dev_reboot_t.gch';
        return "REBOOT_REDIRECTED";
      })()
    `);
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

  // Membaca daftar perangkat terhubung dari DHCP lease table ZTE F663V3A
  const injectReadDevices = () => {
    setIsScanningDevices(true);
    webViewRef.current?.injectJavaScript(`
      (function() {
        function getAllDocs() {
          var docs = [document];
          try { for (var f = 0; f < window.frames.length; f++) { try { docs.push(window.frames[f].document); } catch(e) {} } } catch(e) {}
          try { var ifs = document.querySelectorAll('iframe'); for (var fi = 0; fi < ifs.length; fi++) { try { if (ifs[fi].contentDocument) docs.push(ifs[fi].contentDocument); } catch(e) {} } } catch(e) {}
          return docs;
        }

        // Coba klik menu DOM untuk menjamin session & referer valid
        var clicked = false;
        var docs = getAllDocs();
        
        // 1. Cari ssmDHCPSer (DHCP Server)
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

        // 2. Jika gagal, cari smAddMgr (LAN Menu)
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

        // 3. Fallback jika DOM click gagal
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

        // Baca data perangkat setelah delay pemuatan halaman (2.5 detik)
        setTimeout(function() {
          var docs = getAllDocs();
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
        }, 2500);
      })();
      true;
    `);
  };

  const injectDiagLogger = () => {
    webViewRef.current?.injectJavaScript(`
      (function() {
        if (window.diagLoggerInterval) clearInterval(window.diagLoggerInterval);
        window.diagLoggerInterval = setInterval(function() {
          function getAllDocsInfo() {
            var info = [];
            var docs = [document];
            var docUrls = [window.location.href];
            try {
              for (var f = 0; f < window.frames.length; f++) {
                try {
                  docs.push(window.frames[f].document);
                  docUrls.push(window.frames[f].location.href);
                } catch(e) {}
              }
            } catch(e) {}
            try {
              var ifs = document.querySelectorAll('iframe');
              for (var fi = 0; fi < ifs.length; fi++) {
                try {
                  if (ifs[fi].contentDocument) {
                    docs.push(ifs[fi].contentDocument);
                    docUrls.push(ifs[fi].contentWindow.location.href);
                  }
                } catch(e) {}
              }
            } catch(e) {}
            
            var rxFound = null;
            var diag = { rxPower:'', txPower:'', uptime:'', wanIp:'', firmware:'', temp:'', ponStatus:'' };

            for (var i = 0; i < docs.length; i++) {
              try {
                var d = docs[i];
                var url = docUrls[i];
                var ids = [];
                if (d.getElementById('mmStatus')) ids.push('mmStatus');
                if (d.getElementById('smNetItf')) ids.push('smNetItf');
                if (d.getElementById('smPONInf')) ids.push('smPONInf');
                info.push("Frame " + i + " URL: " + url + " | IDs: [" + ids.join(',') + "]");
                
                // Pindai data redaman secara dinamis di frame ini jika ada
                var rows = d.querySelectorAll('tr');
                for (var r = 0; r < rows.length; r++) {
                  var tds = rows[r].querySelectorAll('td');
                  if (tds.length >= 2) {
                    var label = (tds[0].textContent || tds[0].innerText || '').toLowerCase().trim();
                    var value = (tds[1].textContent || tds[1].innerText || '').trim();
                    if (
                      (label.indexOf('input') !== -1 && label.indexOf('power') !== -1) || 
                      label.indexOf('rx') !== -1 || 
                      label.indexOf('rxoptical') !== -1 || 
                      label.indexOf('receiver') !== -1 || 
                      label.indexOf('penerima') !== -1
                    ) {
                      diag.rxPower = value;
                      rxFound = value;
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
              } catch(err) {}
            }
            
            if (rxFound) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'DIAG_DATA_READ', diag: diag }));
            }
            
            return info;
          }
          var logs = getAllDocsInfo();
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'DIAG_LOG', logs: logs }));
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
          var docs = [document];
          try { for (var f = 0; f < window.frames.length; f++) { try { docs.push(window.frames[f].document); } catch(e) {} } } catch(e) {}
          try { var ifs = document.querySelectorAll('iframe'); for (var fi = 0; fi < ifs.length; fi++) { try { if (ifs[fi].contentDocument) docs.push(ifs[fi].contentDocument); } catch(e) {} } } catch(e) {}
          return docs;
        }

        function clickElement(el) {
          if (!el) return false;
          var target = el;
          while (target && target.tagName !== 'TR' && target.tagName !== 'TD' && target.tagName !== 'A' && target.tagName !== 'LI' && !target.onclick) {
            target = target.parentElement;
          }
          if (target && !target.onclick && target.parentElement && target.parentElement.onclick) {
            target = target.parentElement;
          }
          if (!target) target = el;
          try {
            target.click();
            target.dispatchEvent(new MouseEvent('click', {bubbles:true}));
            return true;
          } catch(e) {
            return false;
          }
        }

        log("Mencari tombol menu Status...");
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
                var txt = (tags[i].textContent || '').trim().toLowerCase();
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
                return true;
              }
            }
          } catch(e) {
            log("Error mencari menu Status: " + e.message);
          }
        }
        
        log("Menu Status tidak ditemukan di DOM. Mencoba openLink langsung...");
        try {
          var win = window;
          if (typeof openLink !== 'function') {
            if (parent && typeof parent.openLink === 'function') win = parent;
            else if (top && typeof top.openLink === 'function') win = top;
          }
          if (typeof win.openLink === 'function') {
            win.openLink('getpage.gch?pid=1002&nextpage=status_dev_info_t.gch');
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'DIAG_STATUS_CLICKED' }));
            return true;
          }
        } catch(e) {}
        return false;
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
          var docs = [document];
          try { for (var f = 0; f < window.frames.length; f++) { try { docs.push(window.frames[f].document); } catch(e) {} } } catch(e) {}
          try { var ifs = document.querySelectorAll('iframe'); for (var fi = 0; fi < ifs.length; fi++) { try { if (ifs[fi].contentDocument) docs.push(ifs[fi].contentDocument); } catch(e) {} } } catch(e) {}
          return docs;
        }

        function clickElement(el) {
          if (!el) return false;
          var target = el;
          while (target && target.tagName !== 'TR' && target.tagName !== 'TD' && target.tagName !== 'A' && target.tagName !== 'LI' && !target.onclick) {
            target = target.parentElement;
          }
          if (target && !target.onclick && target.parentElement && target.parentElement.onclick) {
            target = target.parentElement;
          }
          if (!target) target = el;
          try {
            target.click();
            target.dispatchEvent(new MouseEvent('click', {bubbles:true}));
            return true;
          } catch(e) {
            return false;
          }
        }

        log("Mencari sub-menu Network Interface...");
        var docs = getAllDocs();
        var netItf = null;
        for (var d = 0; d < docs.length; d++) {
          try {
            var doc = docs[d];
            netItf = doc.getElementById('smNetItf') || doc.getElementById('Fnt_smNetItf') || doc.getElementById('smNet');
            if (netItf) {
              log("Network Interface ditemukan lewat ID");
            } else {
              var tags = doc.querySelectorAll('a, span, td, font');
              for (var i = 0; i < tags.length; i++) {
                var txt = (tags[i].textContent || '').trim().toLowerCase();
                if (txt === 'network interface' || txt.indexOf('network interface') !== -1) {
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

        setTimeout(function() {
          log("Mencari sub-menu PON Inform...");
          var docs3 = getAllDocs();
          var pon = null;
          for (var d3 = 0; d3 < docs3.length; d3++) {
            try {
              var doc3 = docs3[d3];
              pon = doc3.getElementById('smPONInf') || doc3.getElementById('smPONStatus') || doc3.querySelector('[onclick*="status_dev_pon_t.gch"]');
              if (pon) {
                log("PON Inform ditemukan lewat ID/onclick");
              } else {
                var tags3 = doc3.querySelectorAll('a, span, td, font');
                for (var i3 = 0; i3 < tags3.length; i3++) {
                  var txt3 = (tags3[i3].textContent || '').trim().toLowerCase();
                  if (txt3 === 'pon inform' || txt3 === 'pon info' || txt3 === 'gpon inform') {
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
                  return;
                }
              }
            } catch(e) {
              log("Error mencari PON Inform: " + e.message);
            }
          }

          log("PON Inform tidak ditemukan di DOM. Mencoba openLink langsung...");
          try {
            var win = window;
            if (typeof openLink !== 'function') {
              if (parent && typeof parent.openLink === 'function') win = parent;
              else if (top && typeof top.openLink === 'function') win = top;
            }
            if (typeof win.openLink === 'function') {
              win.openLink('getpage.gch?pid=1002&nextpage=status_dev_pon_t.gch');
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'DIAG_PON_CLICKED' }));
            }
          } catch(e) {}
        }, 800);

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
          var docs = [document];
          try { for (var f = 0; f < window.frames.length; f++) { try { docs.push(window.frames[f].document); } catch(e) {} } } catch(e) {}
          try { var ifs = document.querySelectorAll('iframe'); for (var fi = 0; fi < ifs.length; fi++) { try { if (ifs[fi].contentDocument) docs.push(ifs[fi].contentDocument); } catch(e) {} } } catch(e) {}
          return docs;
        }

        log("Mulai membaca data tabel status...");
        var docsFinal = getAllDocs();
        var diag = { rxPower:'', txPower:'', uptime:'', wanIp:'', firmware:'', temp:'', ponStatus:'' };
        
        for (var d = 0; d < docsFinal.length; d++) {
          try {
            var doc = docsFinal[d];
            var rows = doc.querySelectorAll('tr');
            for (var r = 0; r < rows.length; r++) {
              var tds = rows[r].querySelectorAll('td');
              if (tds.length >= 2) {
                var label = (tds[0].textContent || tds[0].innerText || '').toLowerCase().trim();
                var value = (tds[1].textContent || tds[1].innerText || '').trim();

                if (
                  ((label.indexOf('input') !== -1 && label.indexOf('power') !== -1) || 
                   label.indexOf('rx') !== -1 || 
                   label.indexOf('rxoptical') !== -1 || 
                   label.indexOf('receiver') !== -1 || 
                   label.indexOf('penerima') !== -1) && 
                  !diag.rxPower
                ) {
                  diag.rxPower = value;
                  log("Ditemukan daya RX: label='" + label + "' | nilai='" + value + "'");
                }
              }
            }
          } catch(e) {
            log("Error membaca tabel status: " + e.message);
          }
        }
        
        log("Pembacaan selesai. Hasil RxPower: " + (diag.rxPower || 'TIDAK DITEMUKAN'));
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'DIAG_DATA_READ', diag: diag }));
      })();
      true;
    `);
  };

  const handleRefreshDiagnostics = () => {
    setRealDiag(null);
    setDiagLogs([]);
    setDiagStep('status');
    navPhaseRef.current = 'diag_status';
    injectClickDiagStatus();
  };

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'AUTOFILL_SUCCESS') {
        showCard();
        setStepLogin('loading');
      } else if (data.type === 'LOGIN_CLICKED') {
        navPhaseRef.current = 'network';
        setStepLogin('done');
        setStepNetwork('loading');
        setTimeout(injectClickNetwork, 2500);
        setTimeout(injectClickNetwork, 4000);
        setTimeout(injectClickNetwork, 6000);
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
        setSaveStatus('success');
        Alert.alert(
          'Berhasil Disimpan!',
          'Perubahan Nama & Password WiFi telah dikirim ke modem. HP Anda mungkin akan terputus sebentar dari WiFi karena modem melakukan restart nirkabel. Silakan sambungkan kembali HP Anda ke WiFi baru.',
          [{ text: 'OK', onPress: () => {
            setShowWlanForm(false);
            setActiveMenu('menu');
          } }]
        );
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
        setRealDiag(data.diag);
        setDiagStep('done');
        navPhaseRef.current = 'done';
      } else if (data.type === 'DIAG_LOG') {
        setDiagLogs(data.logs || []);
        console.warn('--- DIAGNOSTICS LOGS ---');
        (data.logs || []).forEach((l: string) => console.warn('[DIAG_LOG]', l));
        console.warn('------------------------');
      } else if (data.type === 'DEBUG_LINKS') {
        const frames = data.frameCount ?? 1;
        const links = (data.links as string[]);
        console.warn('[MODEM NAV DEBUG]', data.stage, 'frames:', frames, links);
      }
    } catch (_) {}
  };

  const handleHeaderBack = () => {
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
        {status === 'loading' && <ActivityIndicator size="small" color="#06B6D4" />}
        {status === 'done'    && <Text style={styles.stepCheck}>✓</Text>}
        {status === 'idle'    && <View style={styles.stepDot} />}
      </View>
      <Text style={[
        styles.stepLabel,
        status === 'done'    && styles.stepDone,
        status === 'loading' && styles.stepActive,
        status === 'idle'    && styles.stepIdle,
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
      {isMainMenu && (
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

          {/* Center WiFi Icon */}
          <Animated.View style={{
            transform: [{ scale: wifiScale }],
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <Feather name="wifi" size={28} color="#06B6D4" />
          </Animated.View>
        </View>
      )}

      {/* Judul Terpusat */}
      <Text style={[styles.formMainTitle, { color: colors.text, fontSize: isMainMenu ? 20 : 18, fontWeight: '900', textAlign: 'center', letterSpacing: -0.2 }]}>
        {title}
      </Text>

      {isMainMenu && (
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
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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
              {activeMenu === 'menu' && 'Dashboard'}
              {activeMenu === 'wlan' && 'Pengaturan WiFi'}
              {activeMenu === 'devices' && 'Perangkat Terhubung'}
              {activeMenu === 'status' && 'Diagnostik Modem'}
              {activeMenu === 'reboot' && 'Reboot Sistem'}
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
          {isTechMode && (
            <TouchableOpacity 
              style={[
                styles.reloadButton, 
                { backgroundColor: colors.buttonBg },
                showWebView && styles.reloadButtonActive
              ]} 
              onPress={() => setShowWebView(!showWebView)} 
              activeOpacity={0.7}
            >
              <Feather name={showWebView ? 'eye' : 'eye-off'} size={15} color={colors.activeBlue} />
            </TouchableOpacity>
          )}
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
            const { nativeEvent } = syntheticEvent;
            setAutomationError(`Gagal memuat portal modem. Error: ${nativeEvent.description || 'Tidak ada koneksi jaringan'}`);
          }}
          onHttpError={(syntheticEvent) => {
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
              }
              if (activeMenu === 'status') {
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
      {!showWebView && (
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
              {activeMenu === 'menu' && (
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
                              setRebootStep('warning');
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
              )}

              {/* 2.2 PANEL FORM NATIVE PENGATURAN WIFI */}
              {activeMenu === 'wlan' && (
                <ScrollView 
                  style={styles.fullscreenFormContainer}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.formContentBox}>

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
                      {newPassword.length > 0 && (
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
                      )}
                    </View>

                    {saveStatus === 'saving' ? (
                      <View style={styles.nativeSavingContainer}>
                        <ActivityIndicator size="small" color="#06B6D4" style={{ marginRight: 10 }} />
                        <Text style={styles.nativeSavingText}>Menerapkan perubahan ke modem...</Text>
                      </View>
                    ) : (
                      <TouchableOpacity 
                        style={styles.nativeSaveButton}
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
                    )}

                    <Text style={[styles.formNote, { color: colors.noteText, backgroundColor: colors.noteBg, borderColor: colors.noteBorder }]}>
                      PENTING: Setelah menekan tombol simpan, koneksi WiFi HP Anda akan terputus karena modem merestart jaringan nirkabel. Silakan hubungkan kembali HP Anda dengan nama/kata sandi WiFi yang baru.
                    </Text>
                  </View>
                </ScrollView>
              )}

              {/* 2.3 PANEL DAFTAR PERANGKAT TERHUBUNG */}
              {activeMenu === 'devices' && (
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
                        <ActivityIndicator size="large" color="#10B981" style={{ marginBottom: 12 }} />
                        <Text style={{ fontSize: 14, color: colors.text, fontWeight: '700' }}>Memindai Jaringan Modem...</Text>
                        <Text style={{ fontSize: 11, color: colors.subtext, marginTop: 4 }}>Navigasi ke DHCP lease table F663V3A...</Text>
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
              )}

              {/* 2.4 PANEL STATUS DIAGNOSTIK MODEM */}
              {activeMenu === 'status' && (
                <ScrollView 
                  style={styles.fullscreenFormContainer}
                  showsVerticalScrollIndicator={false}
                  onLayout={() => {
                    if (!realDiag) {
                      setRealDiag(null);
                      setDiagLogs([]);
                      navPhaseRef.current = 'diag_status';
                      injectClickDiagStatus();
                    }
                  }}
                >
                  <View style={styles.formContentBox}>

                    {/* Optical Power Gauge Card */}
                    <View style={[styles.cardInputGroup, { backgroundColor: colors.card, borderColor: colors.cardBorder, padding: 16, marginBottom: 14 }]}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: 12, color: colors.subtext, fontWeight: '700' }}>DAYA OPTIK PENERIMA (RX)</Text>
                        <View style={{ backgroundColor: realDiag ? 'rgba(16, 189, 129, 0.15)' : 'rgba(6, 182, 212, 0.15)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 }}>
                          <Text style={{ fontSize: 10, fontWeight: '800', color: realDiag ? '#10B981' : '#06B6D4' }}>
                            {realDiag ? 'LIVE' : 'MENUNGGU'}
                          </Text>
                        </View>
                      </View>
                      <Text style={{ fontSize: 32, fontWeight: '900', color: '#10B981', marginTop: 6 }}>
                        {realDiag?.rxPower || '-- dBm'}
                      </Text>
                      <View style={{ height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.06)', marginTop: 12, overflow: 'hidden', flexDirection: 'row' }}>
                        <View style={{ flex: 3, backgroundColor: '#EF4444' }} />
                        <View style={{ flex: 4, backgroundColor: '#F59E0B' }} />
                        <View style={{ flex: 6, backgroundColor: '#10B981' }} />
                        <View style={{ flex: 2, backgroundColor: '#EF4444' }} />
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                        <Text style={{ fontSize: 9, color: colors.subtext }}>-30 dBm (Lemah)</Text>
                        <Text style={{ fontSize: 9, color: '#10B981', fontWeight: '800' }}>-15 s/d -25 dBm (Bagus)</Text>
                        <Text style={{ fontSize: 9, color: colors.subtext }}>-8 dBm (Terlalu Kuat)</Text>
                      </View>
                      
                      {!realDiag && diagStep !== 'idle' && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 14, backgroundColor: colors.savingBg, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: colors.savingBorder }}>
                          <ActivityIndicator size="small" color="#06B6D4" style={{ marginRight: 8 }} />
                          <Text style={{ fontSize: 11, color: colors.text, fontWeight: '600' }}>
                            {diagStep === 'status' && 'Langkah 1/3: Membuka menu Status...'}
                            {diagStep === 'netitf' && 'Langkah 2/3: Masuk ke Network Interface...'}
                            {diagStep === 'read' && 'Langkah 3/3: Membaca parameter optik...'}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Detail Informasi Parameter Optik */}
                    {realDiag && (
                      <View style={[styles.cardInputGroup, { backgroundColor: colors.card, borderColor: colors.cardBorder, padding: 16, marginBottom: 14 }]}>
                        <Text style={{ fontSize: 12, color: colors.subtext, fontWeight: '700', marginBottom: 12 }}>INFORMASI PARAMETER OPTIK</Text>
                        
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.divider }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Feather name="upload-cloud" size={16} color="#06B6D4" style={{ marginRight: 10 }} />
                            <Text style={{ fontSize: 13, color: colors.text, fontWeight: '500' }}>Daya Optik Pemancar (TX)</Text>
                          </View>
                          <Text style={{ fontSize: 13, color: colors.text, fontWeight: '700' }}>{realDiag.txPower || '--'}</Text>
                        </View>

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.divider }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Feather name="thermometer" size={16} color="#EF4444" style={{ marginRight: 10 }} />
                            <Text style={{ fontSize: 13, color: colors.text, fontWeight: '500' }}>Suhu Modul Optik</Text>
                          </View>
                          <Text style={{ fontSize: 13, color: colors.text, fontWeight: '700' }}>{realDiag.temp || '--'}</Text>
                        </View>

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Feather name="activity" size={16} color="#10B981" style={{ marginRight: 10 }} />
                            <Text style={{ fontSize: 13, color: colors.text, fontWeight: '500' }}>Status GPON</Text>
                          </View>
                          <Text style={{ fontSize: 13, color: '#10B981', fontWeight: '700' }}>{realDiag.ponStatus || '--'}</Text>
                        </View>
                      </View>
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

                    {/* Debug Logs Box for Tech Mode */}
                    {isTechMode && diagLogs.length > 0 && (
                      <View style={{ backgroundColor: 'rgba(0,0,0,0.85)', padding: 12, borderRadius: 8, marginTop: 14, borderWidth: 1, borderColor: 'rgba(16,189,129,0.3)' }}>
                        <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#10B981', marginBottom: 6, letterSpacing: 0.5 }}>LOG NAVIGASI DIAGNOSTIK:</Text>
                        <ScrollView style={{ maxHeight: 180 }} nestedScrollEnabled={true}>
                          {diagLogs.map((log, idx) => (
                            <Text key={idx} style={{ fontSize: 9, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', color: '#A7F3D0', marginBottom: 2 }}>
                              &gt; {log}
                            </Text>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                  </View>
                </ScrollView>
              )}

              {/* 2.5 PANEL REBOOT SISTEM MODEM */}
              {activeMenu === 'reboot' && (
                <ScrollView 
                  style={styles.fullscreenFormContainer}
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.formContentBox}>
                    {rebootStep === 'warning' ? (
                      <View style={{ alignItems: 'center', paddingVertical: 10 }}>
                        {/* Elegant Card Container for Warning Info */}
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
                            Mulai Ulang Modem?
                          </Text>
                          <Text style={{ fontSize: 12, color: colors.subtext, textAlign: 'center', marginTop: 6, lineHeight: 18, paddingHorizontal: 12 }}>
                            Tindakan ini akan me-reboot router secara langsung dari HP Anda.
                          </Text>

                          {/* Nested Warning Notice box */}
                          <View style={{ 
                            backgroundColor: isDark ? 'rgba(245, 158, 11, 0.06)' : 'rgba(245, 158, 11, 0.08)', 
                            borderColor: isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.2)', 
                            borderWidth: 1, 
                            borderRadius: 10,
                            padding: 14, 
                            marginTop: 18, 
                            flexDirection: 'row', 
                            alignItems: 'flex-start' 
                          }}>
                            <Feather name="alert-triangle" size={16} color="#F59E0B" style={{ marginRight: 10, marginTop: 1 }} />
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 12, fontWeight: '800', color: isDark ? '#F59E0B' : '#D97706' }}>Perhatian Penting</Text>
                              <Text style={{ fontSize: 11, color: colors.subtext, marginTop: 4, lineHeight: 16 }}>
                                Koneksi internet dan jaringan WiFi akan terputus total selama proses reboot (sekitar 60-90 detik). Harap tunggu sampai lampu modem menyala normal kembali.
                              </Text>
                            </View>
                          </View>
                        </View>

                        {/* Action buttons (Row Layout) */}
                        <View style={{ flexDirection: 'row', width: '100%', gap: 12 }}>
                          <TouchableOpacity
                            style={{
                              flex: 1,
                              height: 46,
                              borderRadius: 10,
                              backgroundColor: colors.buttonBg,
                              borderWidth: 1,
                              borderColor: colors.inputBorder,
                              justifyContent: 'center',
                              alignItems: 'center',
                            }}
                            onPress={() => setActiveMenu('menu')}
                            activeOpacity={0.8}
                          >
                            <Text style={{ fontSize: 13, fontWeight: '800', color: colors.subtext }}>
                              Batalkan
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={{
                              flex: 1,
                              height: 46,
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
                            onPress={handleInjectReboot}
                            activeOpacity={0.8}
                          >
                            <Text style={{ fontSize: 13, fontWeight: '900', color: '#FFF' }}>
                              Ya, Reboot
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
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
                            { text: 'Mengirim perintah reboot ke sistem router', minSec: 55 },
                            { text: 'Memutus sesi admin & memulai muat ulang hardware', minSec: 45 },
                            { text: 'Modem sedang melakukan reboot, harap tunggu', minSec: 15 },
                            { text: 'Mendeteksi sinyal WiFi & memicu aktif kontroler', minSec: 0 }
                          ].map((step, idx) => {
                            const isDone = rebootCountdown < step.minSec;
                            const isActive = rebootCountdown >= step.minSec && (idx === 0 || rebootCountdown < [55, 45, 15, 0][idx-1]);
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
                    )}
                  </View>
                </ScrollView>
              )}
            </View>
          )}
        </View>
      )}

      {/* Render overlay form di atas webview hanya jika showWebView aktif & WLAN terdeteksi */}
      {showWebView && showWlanForm && (
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
                  style={styles.saveButton}
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
                  <Text style={styles.saveButtonText}>Simpan Perubahan WiFi</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </Animated.View>
      )}

      {/* Navigation bar (Hanya tampil jika showWebView aktif agar navigasi browser normal tetap bisa digunakan) */}
      {showWebView && (
        <View style={[styles.navigationBar, { backgroundColor: colors.headerBg, borderColor: colors.headerBorder, justifyContent: 'space-around' }]}>
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
      )}

      {isLoggingOut && (
        <View style={styles.logoutOverlayContainer}>
          <ActivityIndicator size="large" color="#EF4444" style={{ marginBottom: 16 }} />
          <Text style={styles.logoutOverlayTitle}>Mengakhiri Sesi...</Text>
          <Text style={styles.logoutOverlaySub}>Menutup sesi aktif Anda pada portal modem secara aman</Text>
        </View>
      )}

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
              Peringatan Reboot Jaringan
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
              Setelah menekan tombol simpan, koneksi WiFi HP Anda akan terputus karena modem me-restart jaringan nirkabel. Harap tunggu hingga modem selesai merestart dan hubungkan kembali HP Anda dengan nama/kata sandi baru.
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
