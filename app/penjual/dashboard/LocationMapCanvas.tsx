'use client';

import { useEffect } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

type Point = { latitude: number | null; longitude: number | null };
const pinIcon = L.icon({ iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png', iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png', shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] });
function MapClick({ onSelect }: { onSelect: (point: Point) => void }) { useMapEvents({ click(event) { onSelect({ latitude: Number(event.latlng.lat.toFixed(7)), longitude: Number(event.latlng.lng.toFixed(7)) }); } }); return null; }
function Recenter({ latitude, longitude }: Point) { const map = useMap(); useEffect(() => { if (typeof latitude === 'number' && typeof longitude === 'number') map.setView([latitude, longitude], Math.max(map.getZoom(), 15)); }, [latitude, longitude, map]); return null; }
export default function LocationMapCanvas({ latitude, longitude, onSelect }: { latitude: number | null; longitude: number | null; onSelect: (point: Point) => void }) {
  // This is only the initial viewport for Sukabumi Selatan, not a saved or claimed business location.
  const center: [number, number] = typeof latitude === 'number' && typeof longitude === 'number' ? [latitude, longitude] : [-7.35, 106.45];
  return <div className="location-map-canvas"><MapContainer center={center} zoom={typeof latitude === 'number' ? 15 : 10} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
    <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
    <MapClick onSelect={onSelect}/><Recenter latitude={latitude} longitude={longitude}/>
    {typeof latitude === 'number' && typeof longitude === 'number' && <Marker position={[latitude, longitude]} icon={pinIcon}/>}
  </MapContainer></div>;
}
