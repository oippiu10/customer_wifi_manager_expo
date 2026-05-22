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
} from 'react-native';
import { WebView } from 'react-native-webview';

interface ModemWebViewScreenProps {
  ipAddress: string;
  onBack: () => void;
}

type NavPhase = 'idle' | 'network' | 'wlan' | 'done';

const AUTO_FILL_SCRIPT = `
(function() {
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
    if (checkLoginError()) return;
    var uSels = ['input[name="Username"]','input[name="username"]','input[name="user"]','input[name="loginUsername"]','input[name="Frm_Loginuser"]','input[id="username"]','input[id="Username"]','input[id="txt_Username"]','input[id="txt_username"]','input[id="loginUsername"]','input[id="txtUsr"]','input[id="user"]','input[type="text"]','input[autocomplete="username"]'];
    var pSels = ['input[name="Password"]','input[name="password"]','input[name="pass"]','input[name="loginPassword"]','input[name="Frm_Loginpass"]','input[id="password"]','input[id="Password"]','input[id="txt_Password"]','input[id="txt_password"]','input[id="loginPassword"]','input[id="txtPwd"]','input[type="password"]','input[autocomplete="current-password"]'];
    var u = null, p = null;
    for (var i=0;i<uSels.length;i++){var e=document.querySelector(uSels[i]);if(e&&e.type!=='hidden'&&e.type!=='password'){u=e;break;}}
    for (var j=0;j<pSels.length;j++){var ep=document.querySelector(pSels[j]);if(ep&&ep.type==='password'){p=ep;break;}}
    if(u){setNativeValue(u,'superadmin');u.style.backgroundColor='rgba(6,182,212,0.08)';}
    if(p){setNativeValue(p,'suportadmin');p.style.backgroundColor='rgba(6,182,212,0.08)';}
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


export const ModemWebViewScreen: React.FC<ModemWebViewScreenProps> = ({ ipAddress, onBack }) => {
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
  const cardOpacity = useRef(new Animated.Value(0)).current;

  // States untuk membaca & menyimpan data WiFi (SSID/Password) secara native
  const [currentSsid, setCurrentSsid] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newSsid, setNewSsid] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isWlanLoaded, setIsWlanLoaded] = useState(false);
  const [showWlanForm, setShowWlanForm] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [showWebView, setShowWebView] = useState(false); // Default: hidden (hanya tampil progress & native form)
  const [automationError, setAutomationError] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [securePassword, setSecurePassword] = useState(true); // Default: true (disembunyikan)
  const formHeightAnim = useRef(new Animated.Value(0)).current;

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
          if (ssidEl || passEl) {
            var ssidVal = ssidEl ? (ssidEl.value || '') : '';
            var passVal = passEl ? (passEl.value || '') : '';
            
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
                password: passVal
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
        setNewSsid(data.ssid);
        setNewPassword(data.password);
        setIsWlanLoaded(true);
        setShowWlanForm(true);
        setSaveStatus('idle');
      } else if (data.type === 'WLAN_SAVE_SUBMITTED') {
        setSaveStatus('success');
        Alert.alert(
          '🎉 Berhasil Disimpan!',
          'Perubahan Nama & Password WiFi telah dikirim ke modem. HP Anda mungkin akan terputus sebentar dari WiFi karena modem melakukan restart nirkabel. Silakan sambungkan kembali HP Anda ke WiFi baru.',
          [{ text: 'OK', onPress: () => setShowWlanForm(false) }]
        );
      } else if (data.type === 'LOGIN_FAILED') {
        setAutomationError(`Gagal Login: ${data.error || 'Username atau password yang Anda masukkan salah.'}`);
        setStepLogin('idle');
      } else if (data.type === 'DEBUG_LINKS') {
        const frames = data.frameCount ?? 1;
        const links = (data.links as string[]);
        Alert.alert(
          `🔍 Debug: ${data.stage}`,
          `Frame: ${frames}\n\nElemen yang ditemukan:\n${links.slice(0, 20).map((l, i) => `${i+1}. ${l}`).join('\n')}`,
          [{ text: 'OK' }]
        );
        console.warn('[MODEM NAV DEBUG]', data.stage, 'frames:', frames, links);
      }
    } catch (_) {}
  };

  const handleGoBack    = () => { if (webViewRef.current && canGoBack)    webViewRef.current.goBack(); };
  const handleGoForward = () => { if (webViewRef.current && canGoForward) webViewRef.current.goForward(); };
  const handleReload    = () => { webViewRef.current?.reload(); };

  const targetUrl = (() => {
    const formatted = ipAddress.trim();
    return /^https?:\/\//i.test(formatted) ? formatted : `http://${formatted}`;
  })();

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

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header Browser (hanya tampil jika showWebView aktif atau normal) */}
      <View style={styles.browserHeader}>
        <TouchableOpacity style={styles.closeButton} onPress={handleBackWithLogout} activeOpacity={0.7}>
          <Text style={styles.closeIcon}>✕</Text>
        </TouchableOpacity>
        
        {showWebView ? (
          <View style={styles.addressBar}>
            <Text style={styles.lockIcon}>🔒</Text>
            <Text style={styles.addressText} numberOfLines={1}>
              {currentUrl.replace(/^https?:\/\//i, '')}
            </Text>
          </View>
        ) : (
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Manajer WiFi Pelanggan</Text>
          </View>
        )}

        {/* Tombol Rahasia/Debug untuk memperlihatkan WebView jika diperlukan */}
        <TouchableOpacity 
          style={[styles.reloadButton, showWebView && styles.reloadButtonActive]} 
          onPress={() => setShowWebView(!showWebView)} 
          activeOpacity={0.7}
        >
          <Text style={styles.reloadIcon}>{showWebView ? '📺' : '🔍'}</Text>
        </TouchableOpacity>
      </View>

      {/* Area WebView (Disembunyikan secara visual jika showWebView = false) */}
      <View style={showWebView ? styles.webArea : styles.webAreaHidden}>
        <WebView
          ref={webViewRef}
          source={{ uri: targetUrl }}
          style={styles.webView}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          scalesPageToFit={true}
          mixedContentMode="always"
          injectedJavaScript={AUTO_FILL_SCRIPT}
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
        <View style={styles.mainContentArea}>
          {automationError ? (
            /* 3. TAMPILAN FULLSCREEN NATIVE ERROR NOTIFICATION */
            <View style={styles.fullscreenProgressContainer}>
              <View style={styles.progressAnimationBox}>
                <Text style={styles.errorBigIcon}>⚠️</Text>
                <Text style={styles.progressMainTitle}>Koneksi Gagal</Text>
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
                  <Text style={styles.nativeSaveButtonText}>🔄 Coba Hubungkan Kembali</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.nativeSaveButton, { backgroundColor: '#1E293B', marginTop: 14, shadowColor: 'transparent', borderWidth: 1, borderColor: '#334155' }]} 
                  onPress={handleBackWithLogout}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.nativeSaveButtonText, { color: '#94A3B8' }]}>⚙️ Edit Kredensial & IP</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : !isWlanLoaded ? (
            /* 1. TAMPILAN FULLSCREEN PROGRESS OTOMASI */
            <View style={styles.fullscreenProgressContainer}>
              <View style={styles.progressAnimationBox}>
                <ActivityIndicator size="large" color="#06B6D4" style={{ marginBottom: 12 }} />
                <Text style={styles.progressMainTitle}>Mengakses Konfigurasi...</Text>
                <Text style={styles.progressMainSub}>Menghubungkan ke router Anda secara aman</Text>
              </View>
              
              <View style={styles.progressStepsBox}>
                <StepRow status={stepLogin} label="Masuk ke portal admin modem" />
                <StepRow status={stepNetwork} label="Navigasi ke menu Network" />
                <StepRow status={stepWlan} label="Membuka pengaturan parameter WLAN" />
              </View>

              <Text style={styles.footerNote}>Modem Anda sedang diatur secara otomatis. Harap tunggu...</Text>
            </View>
          ) : (
            /* 2. TAMPILAN FULLSCREEN FORM NATIVE PENGATURAN WIFI */
            <ScrollView 
              style={styles.fullscreenFormContainer}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.formContentBox}>
                <View style={styles.formMainHeader}>
                  <Text style={styles.formMainTitle}>📶 Pengaturan WiFi Terdeteksi</Text>
                  <Text style={styles.formMainSubtitle}>Ubah Nama & Password WiFi Anda dengan instan</Text>
                </View>

                <View style={styles.cardInputGroup}>
                  <View style={styles.inputLabelHeader}>
                    <Text style={styles.inputLabel}>Nama WiFi Baru (SSID)</Text>
                    {currentSsid ? (
                      <Text style={styles.inputSubLabel}>Aktif: <Text style={{ color: '#06B6D4', fontWeight: '800' }}>{currentSsid}</Text></Text>
                    ) : null}
                  </View>
                  <TextInput
                    style={styles.formTextInput}
                    value={newSsid}
                    onChangeText={setNewSsid}
                    placeholder="Masukkan nama WiFi baru"
                    placeholderTextColor="#475569"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <View style={styles.cardInputGroup}>
                  <View style={styles.inputLabelHeader}>
                    <Text style={styles.inputLabel}>Password WiFi Baru</Text>
                    {currentPassword ? (
                      <Text style={styles.inputSubLabel}>Aktif: <Text style={{ color: '#06B6D4', fontWeight: '800' }}>{securePassword ? '••••••••' : currentPassword}</Text></Text>
                    ) : null}
                  </View>
                  <View style={styles.passwordInputWrapper}>
                    <TextInput
                      style={styles.formTextInputWithIcon}
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
                      <Text style={styles.eyeIconText}>{securePassword ? '👁️' : '🙈'}</Text>
                    </TouchableOpacity>
                  </View>
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
                        Alert.alert('Gagal', 'Password WiFi harus minimal 8 karakter.');
                        return;
                      }
                      injectSaveWlanDetails(newSsid, newPassword);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.nativeSaveButtonText}>💾 Simpan & Terapkan Perubahan</Text>
                  </TouchableOpacity>
                )}

                {/* Tombol Logout & Kembali yang aman */}
                <TouchableOpacity 
                  style={[styles.nativeSaveButton, { backgroundColor: '#1E293B', marginTop: 14, shadowColor: 'transparent', borderWidth: 1, borderColor: '#334155' }]} 
                  onPress={handleBackWithLogout}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.nativeSaveButtonText, { color: '#94A3B8' }]}>🚪 Keluar Sesi & Kembali</Text>
                </TouchableOpacity>

                <Text style={styles.formNote}>
                  ⚠️ PENTING: Setelah menekan tombol simpan, koneksi WiFi HP Anda akan terputus karena modem merestart jaringan nirkabel. Silakan hubungkan kembali HP Anda dengan nama/password WiFi yang baru.
                </Text>
              </View>
            </ScrollView>
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
              <Text style={styles.formTitle}>📶 Pengaturan WiFi Terdeteksi</Text>
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
                    <Text style={styles.eyeIconText}>{securePassword ? '👁️' : '🙈'}</Text>
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
                    injectSaveWlanDetails(newSsid, newPassword);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.saveButtonText}>💾 Simpan Perubahan WiFi</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </Animated.View>
      )}

      {/* Navigation bar (Hanya tampil jika showWebView aktif agar navigasi browser normal tetap bisa digunakan) */}
      {showWebView && (
        <View style={styles.navigationBar}>
          <TouchableOpacity style={[styles.navButton, !canGoBack && styles.disabledButton]} onPress={handleGoBack} disabled={!canGoBack} activeOpacity={0.7}>
            <Text style={[styles.navText, !canGoBack && styles.disabledText]}>◀  Kembali</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.homeButton} onPress={handleBackWithLogout} activeOpacity={0.7}>
            <Text style={styles.homeText}>🏠 Menu Utama</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.navButton, !canGoForward && styles.disabledButton]} onPress={handleGoForward} disabled={!canGoForward} activeOpacity={0.7}>
            <Text style={[styles.navText, !canGoForward && styles.disabledText]}>Maju  ▶</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Screen blocker ketika logout sedang diproses agar user aman dari klik beruntun */}
      {isLoggingOut && (
        <View style={styles.logoutOverlayContainer}>
          <ActivityIndicator size="large" color="#EF4444" style={{ marginBottom: 16 }} />
          <Text style={styles.logoutOverlayTitle}>Mengakhiri Sesi...</Text>
          <Text style={styles.logoutOverlaySub}>Menutup sesi aktif Anda pada portal modem secara aman</Text>
        </View>
      )}
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
    padding: 24,
  },
  formMainHeader: {
    marginBottom: 28,
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
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    marginBottom: 20,
  },
  inputLabelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
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
    borderRadius: 12,
    height: 52,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#F8FAFC',
    fontWeight: '600',
  },
  nativeSaveButton: {
    backgroundColor: '#06B6D4',
    height: 54,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#06B6D4',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  nativeSaveButtonText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  nativeSavingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(6,182,212,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(6,182,212,0.2)',
    borderRadius: 14,
    height: 54,
    marginTop: 8,
  },
  nativeSavingText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#06B6D4',
  },
  formNote: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 18,
    textAlign: 'justify',
    marginTop: 24,
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
    borderRadius: 12,
    height: 52,
    paddingLeft: 16,
    paddingRight: 48,
    fontSize: 15,
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
});
