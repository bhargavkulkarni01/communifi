import {useEffect, useRef, useState} from 'react';
import {DEF, getLocation, loadMaps} from '../api';

export default function PickMap({pin, address, onPick}) {
  const el = useRef(), m = useRef(), k = useRef(), geo = useRef();
  const [msg, setMsg] = useState(''), [q, setQ] = useState('');
  const find = e => {
    e.preventDefault();
    if (!q.trim() || !geo.current) return;
    geo.current.geocode({address: q, region: 'us'}, (r, st) => {
      if (st !== 'OK' || !r[0]) return setMsg('Could not find that place. Try a ZIP code or street address.');
      const g = r[0];
      m.current.fitBounds(g.geometry.viewport);
      const exact = g.geometry.location_type === 'ROOFTOP' || g.types.some(t => ['street_address', 'premise', 'subpremise'].includes(t));
      if (exact) { setMsg(''); put(g.geometry.location.lat(), g.geometry.location.lng()); } else setMsg('Area found. Tap the map to place the pin.');
    });
  };
  const put = (lat, lng) => {
    const p = {lat, lng};
    if (k.current) k.current.setPosition(p);
    else {
      k.current = new google.maps.Marker({map: m.current, position: p, draggable: true});
      k.current.addListener('dragend', e => put(e.latLng.lat(), e.latLng.lng()));
    }
    geo.current.geocode({location: p}, (r, s) => {
      const g = s === 'OK' && r[0], c = t => g?.address_components.find(x => x.types.includes(t))?.long_name || '';
      onPick(p, g ? g.formatted_address : '', c('route'), c('neighborhood') || c('sublocality') || c('locality'), c('postal_code'));
    });
  };
  // auto: initial default pin, skipped if the user already placed one while location was loading
  const locate = (auto = false) => m.current && getLocation().then(
    p => { if (auto && k.current) return; put(p.lat, p.lng); m.current.setCenter(p); },
    e => setMsg(e.code === 1 ? 'Location permission is off. Turn it on in settings, or tap the map.' : 'Could not get your location. Search an address or tap the map instead.'));
  useEffect(() => {
    loadMaps().then(() => {
      m.current = new google.maps.Map(el.current, {center: pin || DEF, zoom: 16, streetViewControl: false, mapTypeControl: true});
      geo.current = new google.maps.Geocoder();
      m.current.addListener('click', e => put(e.latLng.lat(), e.latLng.lng()));
      pin ? put(pin.lat, pin.lng) : locate(true);
    }).catch(e => setMsg(e.message));
  }, []);
  return (
    <>
      <form onSubmit={find} style={{display: 'flex', gap: 8, marginBottom: 10}}>
        <input placeholder="Search ZIP code or address" value={q} onChange={e => setQ(e.target.value)} />
        <button className="btn" type="submit">Find</button>
      </form>
      <div ref={el} className="map" />
      <p><button type="button" className="btn" onClick={() => locate()}>Use my location</button> <small>{msg || address || 'Search a ZIP, then tap the map or drag the pin to the exact spot.'}</small></p>
    </>
  );
}
