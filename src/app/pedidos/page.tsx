import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import RecentOrders from "@/components/profile/RecentOrders";
import "../profile/profile.css";

export default function PedidosPage() {
  return (
    <main className="profile-container orders-history-page">
      <Link href="/profile" className="orders-history-back">
        <ArrowLeft size={17} />
        Volver a mi perfil
      </Link>

      <div className="orders-history-header">
        <span className="orders-history-eyebrow">MI CUENTA</span>
        <h1>Historial de pedidos</h1>
        <p>
          Consulta tus compras anteriores y vuelve a pedir lo que necesites.
        </p>
      </div>

      <RecentOrders
        limit={null}
        title="Todos mis pedidos"
        showHistoryLink={false}
      />
    </main>
  );
}
