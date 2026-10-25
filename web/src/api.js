import {useEffect, useState} from 'react';

let token;
export const setToken = t => {
  token = t;
  try { t ? localStorage.setItem('vtoken', t) : localStorage.removeItem('vtoken'); } catch {}
};
export const getSaved = () => { try { return localStorage.getItem('vtoken'); } catch { return null; } };

export async function api(path, o = {}) {
  const r = await fetch(path, {
    ...o,
    headers: {'Content-Type': 'application/json', 'X-Client': window.NATIVE_ID_TOKEN ? 'app' : 'web', ...(token && {Authorization: `Bearer ${token}`})},
    body: o.body && JSON.stringify(o.body),
  }).catch(() => { throw new Error('Cannot reach the Communifi server. Check that the backend is running.'); });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).detail || r.status);
  return r.json();
}

export const ST = {open: 'Open', assigned: 'Assigned', in_progress: 'In Progress', resolved: 'Resolved'};
export const MC = {open: '#e5484d', in_progress: '#e0a21f', resolved: '#2EAF5B'};
export const CAT = {roads: 'Roads & Sidewalks', streetlights: 'Streetlights', parks: 'Parks & Recreation', sanitation: 'Sanitation & Waste', other: 'Other'};
export const DEF = {lat: 40.5187, lng: -74.4121};
export const ago = t => {
  const s = Date.now() / 1e3 - t;
  return s < 3600 ? Math.max(1, (s / 60) | 0) + 'm ago' : s < 86400 ? ((s / 3600) | 0) + 'h ago' : ((s / 86400) | 0) + 'd ago';
};

let mapsP;
export const loadMaps = () =>
  (mapsP ||= new Promise(async (ok, no) => {
    try {
      const {maps_key} = await api('/config');
      if (!maps_key) throw Error('Add GOOGLE_MAPS_KEY to the backend .env');
      window.__m = ok;
      const s = document.createElement('script');
      s.src = `https://maps.googleapis.com/maps/api/js?key=${maps_key}&callback=__m`;
      s.onerror = () => no(Error('Google Maps failed to load'));
      document.head.append(s);
    } catch (e) { no(e); }
  }));

export function useLoad(fn, deps) {
  const [s, set] = useState({});
  useEffect(() => {
    let live = true;
    fn().then(data => live && set({data}), error => live && set({error}));
    return () => { live = false; };
  }, deps);
  return s;
}
export const authHeader = () => ({Authorization: `Bearer ${token}`});
export const loadScript = src => new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = no; document.head.append(s); });

// Location: inside the phone app the native side answers (works on iOS and Android, any origin); in a browser use navigator.geolocation.
let pendingLoc;
export const getLocation = () => new Promise((ok, no) => {
  const fail = (msg, code) => no(Object.assign(new Error(msg), {code}));
  if (window.ReactNativeWebView) {
    pendingLoc = {ok, no};
    window.ReactNativeWebView.postMessage(JSON.stringify({type: 'locate'}));
    setTimeout(() => { if (pendingLoc) { pendingLoc = null; fail('timeout', 3); } }, 20000);
  } else if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(p => ok({lat: p.coords.latitude, lng: p.coords.longitude}), e => no(e), {enableHighAccuracy: true, timeout: 10000});
  } else fail('unsupported', 2);
});
window.__onNativeLocation = r => {
  if (!pendingLoc) return;
  const p = pendingLoc; pendingLoc = null;
  r.error ? p.no(Object.assign(new Error(r.error), {code: r.error === 'denied' ? 1 : 2})) : p.ok(r);
};