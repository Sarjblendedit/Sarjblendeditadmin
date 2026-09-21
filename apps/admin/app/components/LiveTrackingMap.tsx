'use client';

import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet';

import 'leaflet/dist/leaflet.css';

import L from 'leaflet';
import { useEffect } from 'react';

type Props = {
  latitude: number;
  longitude: number;
  customerName: string;
  accuracy?: number | null;
};

const customerIcon =
  L.divIcon({
    className:
      'sarjCustomerMarker',
    html: `
      <div class="sarjMapMarker">
        <span></span>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });


function Recenter({
  latitude,
  longitude,
}: {
  latitude: number;
  longitude: number;
}) {
  const map = useMap();

  useEffect(() => {
    map.setView(
      [latitude, longitude],
      Math.max(map.getZoom(), 15),
      {
        animate: true,
      }
    );
  }, [
    latitude,
    longitude,
    map,
  ]);

  return null;
}


export default function LiveTrackingMap({
  latitude,
  longitude,
  customerName,
  accuracy,
}: Props) {
  return (
    <div className="liveTrackingMap">
      <MapContainer
        center={[
          latitude,
          longitude,
        ]}
        zoom={15}
        scrollWheelZoom
        style={{
          width: '100%',
          height: '100%',
        }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Recenter
          latitude={latitude}
          longitude={longitude}
        />

        <Marker
          position={[
            latitude,
            longitude,
          ]}
          icon={customerIcon}
        >
          <Popup>
            <strong>
              {customerName}
            </strong>
            <br />
            Customer location
            {accuracy
              ? ` · ±${Math.round(
                  accuracy
                )}m`
              : ''}
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}