'use client';

export type MapPoint = { id: string; name: string; category: string; address: string; latitude: number; longitude: number; href: string; mapUrl: string };

function openStreetMapEmbed(point: MapPoint) {
  const pad = 0.025;
  const left = Math.max(-180, point.longitude - pad);
  const right = Math.min(180, point.longitude + pad);
  const bottom = Math.max(-90, point.latitude - pad);
  const top = Math.min(90, point.latitude + pad);
  const bbox = `${left},${bottom},${right},${top}`;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${point.latitude},${point.longitude}`;
}

export default function PublicMap({ points }: { points: MapPoint[] }) {
  const first = points[0];
  if (!first) return <div className="public-map-canvas public-map-empty"><span>Lokasi akan tampil setelah destinasi terverifikasi memiliki koordinat.</span></div>;
  return <section className="public-map-canvas public-map-native" aria-label="Peta lokasi destinasi">
    <div className="public-map-frame">
      <iframe title={`Peta lokasi ${first.name}`} src={openStreetMapEmbed(first)} loading="lazy" referrerPolicy="no-referrer" />
    </div>
    <div className="public-map-map-caption"><strong>{first.name}</strong><span>Peta area · OpenStreetMap</span><a href={first.mapUrl || `https://www.google.com/maps?q=${first.latitude},${first.longitude}`} target="_blank" rel="noopener noreferrer">Navigasi <span aria-hidden="true">↗</span></a></div>
    {points.length > 1 && <p className="public-map-multiple-note">{points.length} lokasi terverifikasi tersedia. Pilih lokasi pada daftar untuk membuka titik yang tepat di Google Maps.</p>}
  </section>;
}
