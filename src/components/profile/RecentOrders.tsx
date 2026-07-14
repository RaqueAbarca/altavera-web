export default function RecentOrders() {

  return (

    <section className="profile-card">

      <h2>
        Mis pedidos
      </h2>

      <div className="profile-order">

        <div>

          <h3>
            Pedido #A12345
          </h3>

          <p>
            3 productos
          </p>

        </div>

        <span className="status preparing">

          Preparando

        </span>

      </div>

      <div className="profile-order">

        <div>

          <h3>
            Pedido #B98765
          </h3>

          <p>
            5 productos
          </p>

        </div>

        <span className="status delivered">

          Entregado

        </span>

      </div>

      <button className="profile-btn">

        Ver historial completo

      </button>

    </section>

  );

}