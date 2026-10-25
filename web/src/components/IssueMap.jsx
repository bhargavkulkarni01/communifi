import {useEffect, useRef, useState} from 'react';
import {DEF, getLocation, loadMaps} from '../api';
import {Err} from '../ui';

const PC = {high: '#ff5d6c', medium: '#f5a524', low: '#3b9cff'};
const pinColor = i => (i.status === 'resolved' ? '#22b573' : PC[i.severity] || PC.medium);

export default function IssueMap({issues, status = '', onPick, height, legend}) {
  const el = useRef(), map = useRef(), marks = useRef([]);
  const [ready, setReady] = useState(false), [err, setErr] = useState();
  useEffect(() => {
    let live = true;
    loadMaps().then(() => {
      if (!live) return;
      map.current = new google.maps.Map(el.current, {center: DEF, zoom: 13, streetViewControl: false, mapTypeControl: false, maxZoom: 18});
      setReady(true);
    }).catch(setErr);
    return () => { live = false; };
  }, []);
  useEffect(() => {
    if (!ready) return;
    marks.current.forEach(k => k.setMap(null));
    marks.current = issues.map(i => {
      const k = new google.maps.Marker({map: map.current, position: {lat: i.lat, lng: i.lng},
        icon: {path: google.maps.SymbolPath.CIRCLE, scale: 9, fillColor: pinColor(i), fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2}});
      onPick && k.addListener('click', () => onPick(i));
      return k;
    });
    if (issues.length) {
      const b = new google.maps.LatLngBounds();
      issues.forEach(i => b.extend({lat: i.lat, lng: i.lng}));
      map.current.fitBounds(b, 40);
      google.maps.event.addListenerOnce(map.current, 'idle', () => map.current.getZoom() > 16 && map.current.setZoom(16));
    }
  }, [ready, issues]);
  useEffect(() => marks.current.forEach((k, n) => k.setVisible(!status || issues[n]?.status === status)), [status, ready, issues]);
  const here = () => getLocation().then(p => { map.current.setCenter(p); map.current.setZoom(15); }, () => setErr('Location unavailable. Check location permission in settings.'));
  return (
    <>
      <div className="mapwrap">
        <div ref={el} className="map" style={height && {height}} />
        {legend && <div className="legend">{[['#ff5d6c', 'High Priority'], ['#f5a524', 'Medium Priority'], ['#3b9cff', 'Low Priority'], ['#22b573', 'Resolved']].map(([c, t]) => <div key={t}><i style={{background: c}} />{t}</div>)}</div>}
        {legend && ready && <button className="locate" type="button" onClick={here}>Center on my location</button>}
      </div>
      <Err e={err} />
    </>
  );
}
