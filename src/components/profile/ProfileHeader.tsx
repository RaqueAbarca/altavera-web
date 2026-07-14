import { FaUserCircle } from "react-icons/fa";

export default function ProfileHeader() {

  return (

    <section className="profile-header">

      <FaUserCircle className="profile-avatar" />

      <div>

        <h1>
          Mi perfil
        </h1>

        <p>
          Administra tu información y consulta el estado de tus pedidos.
        </p>

      </div>

    </section>

  );

}