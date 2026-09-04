import type { Metadata } from "next";
import Link from "next/link";
import InfoPage from "@/components/info/InfoPage";
import { legalInfo } from "@/data/legalInfo";

export const metadata: Metadata = {
  title: "Política de Privacidad | Altavera",
  description: "Conoce cómo Altavera recopila, utiliza y protege tus datos personales.",
};

export default function PrivacyPage() {
  return (
    <InfoPage
      title="Política de Privacidad"
      eyebrow="Legal"
      intro="Te explicamos de forma clara qué información utilizamos, para qué la necesitamos y qué derechos tienes sobre tus datos personales."
      updatedAt={legalInfo.updatedAt}
    >
      <p>
        En Altavera respetamos la privacidad de nuestros clientes y usuarios. Esta
        política describe el tratamiento de los datos personales recopilados a través
        de nuestra plataforma y durante la gestión de pedidos.
      </p>

      <div className="info-merchant">
        <p><strong>Nombre comercial:</strong> {legalInfo.tradeName}</p>
        <p><strong>Responsable:</strong> {legalInfo.responsible}</p>
        <p><strong>Cédula de identidad:</strong> {legalInfo.identification}</p>
        <p><strong>Domicilio comercial:</strong> {legalInfo.address}</p>
      </div>

      <h2>1. Información que recopilamos</h2>
      <p>Dependiendo de cómo utilices Altavera, podemos recopilar:</p>
      <ul>
        <li>Nombre.</li>
        <li>Número de teléfono.</li>
        <li>Correo electrónico.</li>
        <li>Dirección de entrega.</li>
        <li>Ubicación o coordenadas seleccionadas en el mapa.</li>
        <li>Indicaciones adicionales para realizar una entrega.</li>
        <li>Información relacionada con pedidos y compras.</li>
        <li>Método y estado del pago.</li>
        <li>Información asociada a tu cuenta, si decides crear una.</li>
        <li>Comunicaciones realizadas con nuestro servicio de atención.</li>
        <li>Información técnica necesaria para el funcionamiento y seguridad de la plataforma.</li>
      </ul>
      <p>Procuramos recopilar únicamente la información razonablemente necesaria para prestar nuestros servicios.</p>

      <h2>2. ¿Para qué utilizamos tu información?</h2>
      <ul>
        <li>Crear y gestionar pedidos.</li>
        <li>Procesar y confirmar compras.</li>
        <li>Coordinar entregas.</li>
        <li>Contactarte cuando sea necesario para completar un pedido.</li>
        <li>Gestionar tu cuenta.</li>
        <li>Atender consultas, reclamos y solicitudes.</li>
        <li>Investigar problemas relacionados con pedidos o pagos.</li>
        <li>Mantener la seguridad de la plataforma y prevenir fraude o usos no autorizados.</li>
        <li>Mejorar el funcionamiento de Altavera.</li>
        <li>Cumplir obligaciones legales, tributarias, contables o administrativas.</li>
      </ul>
      <p>No utilizaremos tus datos para finalidades incompatibles con aquellas para las que fueron recopilados.</p>

      <h2>3. Datos de ubicación</h2>
      <p>
        Altavera permite seleccionar una ubicación mediante un mapa para facilitar las
        entregas. Podemos almacenar las coordenadas, la dirección indicada y las
        referencias adicionales que proporciones para verificar cobertura, calcular
        condiciones de entrega y llevar el pedido al destino correcto.
      </p>
      <p>Si tienes una cuenta, determinadas direcciones podrán permanecer asociadas a ella para facilitar futuras compras.</p>

      <h2>4. Información de pagos</h2>
      <p>
        Podemos registrar información relacionada con el método utilizado y el estado
        de un pago. Cuando se utilicen proveedores externos para procesar pagos,
        determinada información podrá ser procesada directamente por dichos proveedores
        conforme a sus propias medidas y políticas de seguridad.
      </p>
      <p>Altavera no solicitará ni almacenará información financiera que no sea necesaria para gestionar la transacción.</p>

      <h2>5. Proveedores tecnológicos y terceros</h2>
      <p>Podemos utilizar proveedores externos para servicios como:</p>
      <ul>
        <li>Alojamiento e infraestructura tecnológica.</li>
        <li>Base de datos y autenticación.</li>
        <li>Procesamiento de pagos.</li>
        <li>Mapas y ubicación.</li>
        <li>Comunicaciones.</li>
        <li>Logística y entrega.</li>
        <li>Seguridad y mantenimiento de la plataforma.</li>
      </ul>
      <p>Cuando sea necesario compartir información, procuraremos limitarla a aquella necesaria para prestar el servicio correspondiente.</p>
      <div className="info-callout"><p><strong>Altavera no vende datos personales de sus usuarios.</strong></p></div>

      <h2>6. Almacenamiento fuera de Costa Rica</h2>
      <p>
        Algunos proveedores tecnológicos pueden utilizar infraestructura ubicada fuera
        de Costa Rica. Cuando esto ocurra, procuraremos trabajar con proveedores que
        mantengan medidas razonables para proteger la información.
      </p>

      <h2>7. Comunicaciones relacionadas con tu pedido</h2>
      <p>Podremos utilizar los medios proporcionados durante la compra para:</p>
      <ul>
        <li>Confirmar información.</li>
        <li>Resolver problemas de disponibilidad.</li>
        <li>Coordinar una entrega.</li>
        <li>Informar cambios relevantes.</li>
        <li>Atender o dar seguimiento a un reclamo.</li>
      </ul>
      <p>Estas comunicaciones forman parte de la prestación del servicio y no se consideran comunicaciones publicitarias.</p>

      <h2>8. Promociones y comunicaciones comerciales</h2>
      <p>
        Si en el futuro Altavera envía promociones por correo electrónico, WhatsApp u
        otros medios, solicitará la autorización correspondiente cuando sea necesaria.
        Aceptar publicidad no será un requisito para comprar y podrás retirar tu
        autorización cuando corresponda.
      </p>

      <h2>9. Cookies y tecnologías similares</h2>
      <p>Podemos utilizar cookies, almacenamiento local y tecnologías similares necesarias para:</p>
      <ul>
        <li>Mantener una sesión iniciada.</li>
        <li>Recordar productos agregados al carrito.</li>
        <li>Mantener determinadas preferencias.</li>
        <li>Proteger la seguridad de la plataforma.</li>
        <li>Permitir el funcionamiento correcto del sitio.</li>
      </ul>
      <p>Si incorporamos tecnologías de publicidad o seguimiento que requieran autorización adicional, actualizaremos esta política e implementaremos los mecanismos correspondientes.</p>

      <h2>10. Conservación de la información</h2>
      <p>
        Conservaremos los datos durante el tiempo razonablemente necesario para gestionar
        compras y cuentas, atender reclamos, cumplir obligaciones legales, contables o
        tributarias, prevenir fraude y resolver disputas. Cuando dejen de ser necesarios,
        podrán ser eliminados o anonimizados, salvo obligación legal de conservarlos.
      </p>

      <h2>11. Seguridad</h2>
      <p>
        Aplicamos medidas técnicas y organizativas razonables para proteger la información
        frente a acceso no autorizado, pérdida, alteración, destrucción, uso indebido o
        divulgación no autorizada. Ningún sistema electrónico puede garantizar seguridad absoluta.
      </p>

      <h2>12. Tus derechos sobre los datos personales</h2>
      <p>Conforme a la legislación costarricense, puedes solicitar:</p>
      <ul>
        <li>Conocer si Altavera mantiene datos personales tuyos.</li>
        <li>Acceder a esos datos y conocer su uso.</li>
        <li>Corregir o actualizar información incorrecta o incompleta.</li>
        <li>Solicitar su eliminación cuando legalmente corresponda.</li>
        <li>Revocar consentimientos cuando el tratamiento dependa de ellos.</li>
      </ul>
      <p>Las solicitudes serán atendidas gratuitamente y dentro de los plazos establecidos por la legislación aplicable.</p>

      <h2>13. Eliminación de una cuenta</h2>
      <p>
        Si Altavera ofrece cuentas de usuario, podrás solicitar la eliminación de tu
        cuenta y de los datos asociados que no sea necesario conservar por razones
        legales, contables, tributarias, de seguridad o relacionadas con transacciones anteriores.
      </p>

      <h2>14. Información de menores de edad</h2>
      <p>
        Los servicios de compra de Altavera están dirigidos principalmente a personas
        con capacidad legal para realizar transacciones comerciales. No buscamos recopilar
        intencionalmente información de menores de edad para fines comerciales sin la autorización legal correspondiente.
      </p>

      <h2>15. Cambios a esta política</h2>
      <p>
        Podremos actualizar esta Política de Privacidad cuando cambien nuestros servicios,
        tecnologías o requisitos legales. La versión vigente permanecerá disponible en la
        plataforma e indicará su fecha de última actualización.
      </p>

      <h2>16. Legislación aplicable</h2>
      <p>
        El tratamiento de datos personales realizado por Altavera se rige por la legislación
        de la República de Costa Rica, incluyendo la Ley N.º 8968, Ley de Protección de la
        Persona frente al Tratamiento de sus Datos Personales, y demás normativa aplicable.
      </p>

      <h2>17. Contacto</h2>
      <p>
        Para consultas o solicitudes relacionadas con privacidad y datos personales utiliza
        los canales que Altavera mantenga publicados en nuestra <Link href="/contacto">página de contacto</Link>.
      </p>
    </InfoPage>
  );
}
