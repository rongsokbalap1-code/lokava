'use client';

import { useEffect, useMemo, useState } from 'react';
import { MapPin, Link2, LocateFixed, ExternalLink, AlertCircle, Crosshair, CheckCircle2 } from 'lucide-react';
import { extractGoogleMapsCoordinates, googleMapsDirectionsUrl, normalizeGoogleMapsUrl } from '@/lib/maps';

export type Coordinates = { latitude: number | null; longitude: number | null };
export const extractCoordinatesFromMapUrl = extractGoogleMapsCoordinates;

export default function LocationPicker({ latitude, longitude, mapsUrl, onCoordinatesChange, onMapsUrlChange }: {
  latitude: number | null; longitude: number | null; mapsUrl: string;
  onCoordinatesChange: (coordinates: Coordinates) => void; onMapsUrlChange: (value: string) => void;
}) {
  const selected = typeof latitude === 'number' && typeof longitude === 'number';
  const [linkMessage, setLinkMessage] = useState('');
  const [manualCoordinates, setManualCoordinates] = useState(() => selected ? `${latitude}, ${longitude}` : '');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [mapMessage, setMapMessage] = useState(() => selected ? `Lokasi tersimpan: ${latitude!.toFixed(6)}, ${longitude!.toFixed(6)}` : 'Belum ada lokasi yang dipilih. Gunakan GPS HP atau masukkan koordinat secara manual.');
  const mapUrl = useMemo(() => selected ? googleMapsDirectionsUrl(latitude!, longitude!) : normalizeGoogleMapsUrl(mapsUrl) || '', [selected, latitude, longitude, mapsUrl]);

  useEffect(() => { setManualCoordinates(selected ? `${latitude}, ${longitude}` : ''); }, [selected, latitude, longitude]);

  function applyCoordinates(lat: number, lng: number, source: string) {
    const point = { latitude: Number(lat.toFixed(7)), longitude: Number(lng.toFixed(7)) };
    onCoordinatesChange(point);
    onMapsUrlChange(googleMapsDirectionsUrl(point.latitude, point.longitude));
    setMapMessage(`${source}: ${point.latitude.toFixed(6)}, ${point.longitude.toFixed(6)}`);
  }

  function captureGps() {
    setLinkMessage('');
    if (!('geolocation' in navigator)) {
      setLinkMessage('Browser ini tidak mendukung GPS. Masukkan koordinat secara manual.');
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        applyCoordinates(position.coords.latitude, position.coords.longitude, 'Lokasi GPS berhasil diambil');
        setGpsAccuracy(Math.round(position.coords.accuracy));
        setLinkMessage(`Lokasi berhasil diambil dengan perkiraan akurasi ±${Math.round(position.coords.accuracy)} meter. Periksa titiknya sebelum menyimpan.`);
        setGpsLoading(false);
      },
      (error) => {
        const message = error.code === error.PERMISSION_DENIED
          ? 'Izin lokasi ditolak. Aktifkan izin lokasi untuk browser, lalu coba lagi.'
          : error.code === error.POSITION_UNAVAILABLE
            ? 'Lokasi belum tersedia. Pastikan GPS aktif dan coba lagi.'
            : 'GPS terlalu lama merespons. Coba lagi atau masukkan koordinat manual.';
        setLinkMessage(message);
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }

  function handleManualCoordinates(value: string) {
    setManualCoordinates(value);
    const match = value.trim().match(/^(-?\d{1,2}(?:\.\d+)?)\s*[,; ]\s*(-?\d{1,3}(?:\.\d+)?)$/);
    if (!match) {
      setLinkMessage(value.trim() ? 'Format koordinat: latitude, longitude. Contoh: -7.123456, 106.123456.' : '');
      return;
    }
    const lat = Number(match[1]);
    const lng = Number(match[2]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      setLinkMessage('Koordinat berada di luar rentang yang valid.');
      return;
    }
    applyCoordinates(lat, lng, 'Koordinat manual dipasang');
    setLinkMessage('Koordinat berhasil dipasang. Lokasi akan disimpan saat profil usaha disimpan.');
  }

  function handleMapLink(value: string) {
    onMapsUrlChange(value);
    setLinkMessage('');
    if (!value.trim()) return;
    const parsed = extractCoordinatesFromMapUrl(value);
    if (parsed && typeof parsed.latitude === 'number' && typeof parsed.longitude === 'number') {
      applyCoordinates(parsed.latitude, parsed.longitude, 'Koordinat dari tautan');
      setLinkMessage('Koordinat berhasil dibaca dari tautan. Periksa sebelum menyimpan.');
    } else {
      const safeUrl = normalizeGoogleMapsUrl(value);
      if (safeUrl) {
        onCoordinatesChange({ latitude: null, longitude: null });
        setMapMessage('Tautan Google Maps tersimpan. Tautan pendek tidak selalu memuat koordinat yang dapat dibaca.');
        setLinkMessage('Tautan tetap bisa dibuka pengunjung. Untuk menyimpan pin lokasi, gunakan GPS atau masukkan koordinat manual.');
      } else {
        setLinkMessage('Gunakan tautan HTTPS Google Maps yang valid.');
      }
    }
  }

  return <section className="location-picker location-picker-native" aria-label="Lokasi usaha">
    <div className="location-picker-heading"><MapPin size={18}/><div><strong>Lokasi usaha</strong><p>Ambil lokasi saat ini dari GPS HP, atau masukkan koordinat dan tautan Google Maps.</p></div></div>
    <div className="location-gps-card">
      <div className="location-gps-symbol"><LocateFixed size={22}/></div>
      <div className="location-gps-copy"><strong>{selected ? 'Lokasi sudah dipilih' : 'Gunakan lokasi HP'}</strong><span>{selected ? `${latitude!.toFixed(5)}, ${longitude!.toFixed(5)}` : 'GPS hanya diakses saat tombol ditekan dan izin diberikan.'}</span></div>
      <button type="button" className="button button-primary location-gps-button" onClick={captureGps} disabled={gpsLoading}>
        <Crosshair size={15}/>{gpsLoading ? 'Mencari…' : 'Ambil GPS'}
      </button>
    </div>
    {selected && <p className="location-map-status" role="status"><CheckCircle2 size={14}/>{mapMessage}{gpsAccuracy !== null ? ` · akurasi GPS ±${gpsAccuracy} m` : ''}.</p>}
    <label htmlFor="business-maps-url">Tautan Google Maps (opsional)</label>
    <div className="location-link-row">
      <input id="business-maps-url" type="url" inputMode="url" value={mapsUrl} onChange={(e) => handleMapLink(e.target.value)} placeholder="https://maps.app.goo.gl/…"/>
      <button type="button" className="button button-light" onClick={() => {
        const parsed = extractGoogleMapsCoordinates(mapsUrl);
        if (parsed && typeof parsed.latitude === 'number' && typeof parsed.longitude === 'number') {
          applyCoordinates(parsed.latitude, parsed.longitude, 'Koordinat dari tautan');
          setLinkMessage('Pin lokasi diperbarui dari tautan.');
        } else {
          setLinkMessage('Tautan tidak memuat koordinat yang dapat dibaca. Gunakan GPS atau koordinat manual.');
        }
      }}><Link2 size={14}/> Baca tautan</button>
    </div>
    <label htmlFor="business-manual-coordinates">Koordinat manual (latitude, longitude)</label>
    <input id="business-manual-coordinates" type="text" inputMode="decimal" value={manualCoordinates} onChange={(event) => handleManualCoordinates(event.target.value)} placeholder="-7.123456, 106.123456"/>
    {linkMessage && <p className="location-link-message" role="status"><AlertCircle size={14}/>{linkMessage}</p>}
    {mapUrl && <a className="location-preview-link" href={mapUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={14}/> Buka pratinjau Google Maps</a>}
    <small>LOKAVA tidak memakai Google Maps API. GPS tidak melacak secara terus-menerus. Lokasi hanya diambil sekali saat kamu menekan tombol, dan perubahan profil tetap perlu ditinjau admin.</small>
  </section>;
}
