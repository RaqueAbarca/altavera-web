"use client";

import dynamic from "next/dynamic";

export type DeliveryMapOrder = {
  id: string;
  guest_name: string;
  latitude: number;
  longitude: number;
  address_description: string | null;
  status: string;
};

const DeliveryMapClient = dynamic(
  () => import("./DeliveryMapClient"),
  {
    ssr: false,
    loading: () => (
      <div className="delivery-map-loading">
        Cargando mapa de entregas...
      </div>
    ),
  }
);

type Props = {
  orders: DeliveryMapOrder[];
  selectedOrderId?: string | null;
  onSelectOrder?: (orderId: string) => void;
};

export default function DeliveryMap({
  orders,
  selectedOrderId = null,
  onSelectOrder,
}: Props) {
  return (
    <DeliveryMapClient
      orders={orders}
      selectedOrderId={selectedOrderId}
      onSelectOrder={onSelectOrder}
    />
  );
}
