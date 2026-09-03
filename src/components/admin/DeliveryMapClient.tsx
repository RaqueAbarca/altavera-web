"use client";

import { useEffect, useMemo } from "react";
import L from "leaflet";
import {
  MapContainer,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import AltaveraMapLayer from "@/components/map/AltaveraMapLayer";
import type { DeliveryMapOrder } from "./DeliveryMap";

const DEFAULT_CENTER: [number, number] = [10.016, -84.214];

function markerClass(status: string) {
  if (status === "delivered") return "is-delivered";
  if (status === "ready") return "is-route";
  if (status === "pending" || status === "pending_payment") return "is-payment-pending";
  return "is-pending";
}

function buildMarkerIcon(index: number, status: string, selected: boolean) {
  return L.divIcon({
    className: "delivery-map-marker-shell",
    html: `<span class="delivery-map-marker ${markerClass(status)}${selected ? " is-selected" : ""}"><span class="delivery-map-marker-label">${index + 1}</span></span>`,
    iconSize: [34, 40],
    iconAnchor: [17, 38],
    popupAnchor: [0, -38],
  });
}

function FitOrders({ orders }: { orders: DeliveryMapOrder[] }) {
  const map = useMap();

  useEffect(() => {
    if (orders.length === 0) {
      map.setView(DEFAULT_CENTER, 11);
      return;
    }

    if (orders.length === 1) {
      map.setView([orders[0].latitude, orders[0].longitude], 15);
      return;
    }

    const bounds = L.latLngBounds(
      orders.map((order) => [order.latitude, order.longitude] as [number, number])
    );

    map.fitBounds(bounds, {
      padding: [46, 46],
      maxZoom: 14,
    });
  }, [map, orders]);

  return null;
}

function FocusOrder({
  orders,
  selectedOrderId,
}: {
  orders: DeliveryMapOrder[];
  selectedOrderId: string | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (!selectedOrderId) return;

    const order = orders.find((item) => item.id === selectedOrderId);
    if (!order) return;

    map.flyTo([order.latitude, order.longitude], Math.max(map.getZoom(), 15), {
      duration: 0.6,
    });
  }, [map, orders, selectedOrderId]);

  return null;
}

function mapsUrl(order: DeliveryMapOrder) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${order.latitude},${order.longitude}`)}`;
}

function wazeUrl(order: DeliveryMapOrder) {
  return `https://www.waze.com/ul?ll=${encodeURIComponent(`${order.latitude},${order.longitude}`)}&navigate=yes`;
}

type Props = {
  orders: DeliveryMapOrder[];
  selectedOrderId: string | null;
  onSelectOrder?: (orderId: string) => void;
};

export default function DeliveryMapClient({
  orders,
  selectedOrderId,
  onSelectOrder,
}: Props) {
  const markerIcons = useMemo(
    () =>
      orders.map((order, index) =>
        buildMarkerIcon(index, order.status, order.id === selectedOrderId)
      ),
    [orders, selectedOrderId]
  );

  return (
    <div className="delivery-map-frame">
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={11}
        scrollWheelZoom
        className="delivery-admin-map"
      >
        <AltaveraMapLayer />
        <FitOrders orders={orders} />
        <FocusOrder orders={orders} selectedOrderId={selectedOrderId} />

        {orders.map((order, index) => (
          <Marker
            key={order.id}
            position={[order.latitude, order.longitude]}
            icon={markerIcons[index]}
            eventHandlers={{
              click: () => onSelectOrder?.(order.id),
            }}
          >
            <Popup>
              <div className="delivery-map-popup">
                <strong>#{order.id.slice(0, 8)} · {order.guest_name}</strong>
                {order.address_description && <p>{order.address_description}</p>}
                <div className="delivery-map-popup-actions">
                  <a href={wazeUrl(order)} target="_blank" rel="noreferrer">
                    Waze
                  </a>
                  <a href={mapsUrl(order)} target="_blank" rel="noreferrer">
                    Google Maps
                  </a>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
