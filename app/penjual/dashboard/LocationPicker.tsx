'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { MapPin, Link2, LocateFixed, ExternalLink, AlertCircle } from 'lucide-react';
import { extractGoogleMapsCoordinates, googleMapsDirectionsUrl, normalizeGoogleMapsUrl } from '@/lib/maps';

const MapCanvas = dynamic(() => import('./LocationMapCanvas'), {
  ssr: false,
  loading: () => <div className="location-map-loading">Memuat peta OpenStreetMap…</div>,
});

export type Coordinates = { latitude: number | null; longitude: number | null };

export const extractCoordinatesFromMapUrl = extractGoogleMapsCoordinates;

export default function LocationPicker({ latitude, longitude, mapsUrl, onCoordinatesChange, onMapsUrlChange }: {
  latitude: number | null; longitude: number | null; mapsUrl: string;
  onCoordinatesChange: (coordinates: Coordinates) => void; onMapsUrlChange: (value: string) => void;
}) {
  const selected = typeof latitude === 'number' && typeof longitude === 'number';
  const [linkMessage, setLinkMessage] = useState('');
  const [mapMessage, setMapMessage] = useState(() => selected ? `Pin terpilih: ${latitude!.toFixed(6)}, ${longitude!.toFixed(6)}` : 'Belum ada titik lokasi yang dipilih. Klik peta untuk menentukan lokasi usaha.');
  const mapUrl = useMemo(() => selected ? googleMapsDirectionsUrl(latitude!, longitude!) : normalizeGoogleMapsUrl(mapsUrl) || '', [selected, latitude, longitude, mapsUrl]);

  function handleMapLink(value: string) {
    onMapsUrlChange(value);
    setLinkMessage('');
    if (!value.trim()) return;
    const parsed = extractCoordinatesFromMapUrl(value);
    if (parsed) {
      onCoordinatesChange(parsed);
      setMapMessage(`Pin terpilih: ${parsed.latitude!.toFixed(6)}, ${parsed.longitude!.toFixed(6)}`);
      setLinkMessage('Koordinat berhasil dibaca dari tautan. Periksa pin di peta sebelum menyimpan.');
    } else {
      const safeUrl=normalizeGoogleMapsUrl(value);
      if(safeUrl){onCoordinatesChange({latitude:null,longitude:null});setLinkMessage('Tautan Maps disimpan. Koordinat tidak dapat dibaca dari tautan ini; pin dihapus agar tidak bertentangan dengan tautan. Anda tetap dapat menaruh pin di peta.');}
      else setLinkMessage('Gunakan tautan HTTPS Google Maps yang valid.');
    }
  }

  return <section className="location-picker" aria-label="Lokasi usaha">
    <div className="location-picker-heading"><MapPin size={17}/><div><strong>Tentukan lokasi usaha</strong><p>Pilih pin di peta atau tempel tautan Google Maps.</p></div></div>
    <MapCanvas latitude={latitude} longitude={longitude} onSelect={(point) => { onCoordinatesChange(point); if (typeof point.latitude !== 'number' || typeof point.longitude !== 'number') { setMapMessage('Belum ada titik lokasi yang dipilih.'); return; } onMapsUrlChange(googleMapsDirectionsUrl(point.latitude, point.longitude)); setMapMessage(`Pin terpilih: ${point.latitude.toFixed(6)}, ${point.longitude.toFixed(6)}`); }} />
    <p className="location-map-status" role="status"><LocateFixed size={14}/>{mapMessage}</p>
    <label htmlFor="business-maps-url">Tautan Google Maps (opsional)</label>
    <div className="location-link-row"><input id="business-maps-url" type="url" inputMode="url" value={mapsUrl} onChange={(e) => handleMapLink(e.target.value)} placeholder="https://maps.app.goo.gl/…"/><button type="button" className="button button-light" onClick={() => { const parsed = extractGoogleMapsCoordinates(mapsUrl); if (parsed) { onCoordinatesChange(parsed); setLinkMessage('Pin diperbarui dari tautan.'); } else setLinkMessage('Tautan ini tidak memuat koordinat yang dapat dibaca. Pilih pin di peta untuk menyimpan koordinat.'); }}><Link2 size={14}/> Baca tautan</button></div>
    {linkMessage && <p className="location-link-message" role="status"><AlertCircle size={14}/>{linkMessage}</p>}
    {mapUrl && <a className="location-preview-link" href={mapUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={14}/> Pratinjau tautan lokasi</a>}
    <small>Peta menggunakan OpenStreetMap. Klik lokasi yang tepat; koordinat disimpan hanya setelah Anda memilih pin atau berhasil membacanya dari tautan. Jika tautan Maps pendek tidak memuat koordinat, tautannya tetap dapat dipakai untuk navigasi publik.</small>
  </section>;
}
