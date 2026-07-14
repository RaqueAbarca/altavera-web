import { FaSignOutAlt } from "react-icons/fa";

export default function AccountActions() {

  return (

    <section className="profile-card">

      <h2>
        Cuenta
      </h2>

      <button className="logout-btn">

        <FaSignOutAlt />

        Cerrar sesión

      </button>

    </section>

  );

}