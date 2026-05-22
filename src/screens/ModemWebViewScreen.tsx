import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Alert,
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
  function tryLogin() {
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
    <View style={styles.container}>

      {/* Progress Card Otomasi */}
      {showProgress && (
        <Animated.View style={[styles.progressCard, { opacity: cardOpacity }]}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>🤖 Otomasi Modem</Text>
            <Text style={styles.progressSub}>Memproses, harap tunggu...</Text>
          </View>
          <View style={styles.progressDivider} />
          <StepRow status={stepLogin}   label="Login otomatis" />
          <StepRow status={stepNetwork} label="Membuka menu Network" />
          <StepRow status={stepWlan}    label="Membuka pengaturan WLAN" />
        </Animated.View>
      )}

      <View style={styles.browserHeader}>
        <TouchableOpacity style={styles.closeButton} onPress={onBack} activeOpacity={0.7}>
          <Text style={styles.closeIcon}>✕</Text>
        </TouchableOpacity>
        <View style={styles.addressBar}>
          <Text style={styles.lockIcon}>🔒</Text>
          <Text style={styles.addressText} numberOfLines={1}>
            {currentUrl.replace(/^https?:\/\//i, '')}
          </Text>
        </View>
        <TouchableOpacity style={styles.reloadButton} onPress={handleReload} activeOpacity={0.7}>
          <Text style={styles.reloadIcon}>↻</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.webArea}>
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

      <View style={styles.navigationBar}>
        <TouchableOpacity style={[styles.navButton, !canGoBack && styles.disabledButton]} onPress={handleGoBack} disabled={!canGoBack} activeOpacity={0.7}>
          <Text style={[styles.navText, !canGoBack && styles.disabledText]}>◀  Kembali</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.homeButton} onPress={onBack} activeOpacity={0.7}>
          <Text style={styles.homeText}>🏠 Menu Utama</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.navButton, !canGoForward && styles.disabledButton]} onPress={handleGoForward} disabled={!canGoForward} activeOpacity={0.7}>
          <Text style={[styles.navText, !canGoForward && styles.disabledText]}>Maju  ▶</Text>
        </TouchableOpacity>
      </View>
    </View>
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
});
