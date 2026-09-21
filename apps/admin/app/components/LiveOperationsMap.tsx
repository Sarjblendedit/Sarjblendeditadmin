'use client';

import { useEffect } from 'react';
import {
  Circle,
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet';

type Props = {
  latitude: number;
  longitude: number;
  customerName: string;
  accuracy: number | null;
  updatedAt: string | null;
};

function MapRecenter({
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
      { animate: true }
    );
  }, [latitude, longitude, map]);

  return null;
}

export default function LiveOperationsMap({
  latitude,
  longitude,
  customerName,
  accuracy,
  updatedAt,
}: Props) {
  return (
    <MapContainer
      center={[latitude, longitude]}
      zoom={15}
      scrollWheelZoom
      className="liveLeafletMap"
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <MapRecenter
        latitude={latitude}
        longitude={longitude}
      />

      {accuracy !== null &&
        accuracy > 0 && (
          <Circle
            center={[latitude, longitude]}
            radius={accuracy}
            pathOptions={{
              className: 'liveLocationAccuracy',
            }}
          />
        )}

      <CircleMarker
        center={[latitude, longitude]}
        radius={10}
        pathOptions={{
          className: 'liveCustomerMarker',
        }}
      >
        <Popup>
          <strong>{customerName}</strong>
          <br />
          Live customer location
          <br />
          Accuracy:{' '}
          {accuracy !== null
            ? `${Math.round(accuracy)}m`
            : '—'}
          <br />
          Updated:{' '}
          {updatedAt
            ? new Date(updatedAt).toLocaleTimeString(
                'en-ZM',
                {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                }
              )
            : '—'}
        </Popup>
      </CircleMarker>
    </MapContainer>
  );
}