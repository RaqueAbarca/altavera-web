import type { Metadata } from "next";
import Link from "next/link";
import InfoPage from "@/components/info/InfoPage";
import { legalInfo } from "@/data/legalInfo";

export const metadata: Metadata = {
  title: "Política de Envíos | Altavera",
  description: "Conoce las zonas, costos y condiciones de entrega de Altavera.",
};

export default function ShippingPage() {
  return (
    <InfoPage
      title="Política de Envíos"
      eyebrow="Entregas"
      intro="Queremos que sepas cómo funciona la entrega de tu pedido antes de confirmar la compra."
      updatedAt={legalInfo.updatedAt}
    >
      <h2>Zona de entrega</h2>
      <p>Por ahora Altavera realiza entregas únicamente dentro de nuestra zona habilitada del cantón de Alajuela. Puedes consultar el mapa de cobertura y confirmar tu dirección exacta durante el checkout.</p>
      <p>Durante el proceso de compra podrás indicar tu ubicación y verificar si actualmente realizamos entregas en tu zona.</p>
      <div className="info-actions"><Link className="info-action" href="/zona-de-cobertura">Consultar cobertura</Link></div>

      <h2>¿No llegamos todavía a tu ubicación?</h2>
      <p>Puedes utilizar la opción para proponer una nueva ubicación desde nuestra página de contacto. Estas solicitudes nos ayudan a identificar las zonas donde existe interés por el servicio.</p>
      <p>Proponer una ubicación no garantiza que la zona sea incorporada inmediatamente.</p>

      <h2>Costo de entrega</h2>
      <p>El costo dependerá de la ubicación y demás condiciones que puedan aplicar al pedido. El monto correspondiente se mostrará antes de confirmar la compra.</p>
      <p>No agregaremos posteriormente cargos de entrega distintos a los aceptados, salvo que el cliente solicite un cambio que genere un costo adicional y lo autorice expresamente.</p>

      <h2>Fecha y horario</h2>
      <p>Las fechas, días o franjas disponibles serán mostradas durante la compra o comunicadas antes de completar el pedido.</p>
      <p>Los horarios podrán ser aproximados. Tránsito, clima, accidentes, problemas de acceso u otras situaciones fuera de nuestro control razonable pueden generar atrasos. Cuando exista un atraso significativo, procuraremos informarlo.</p>

      <h2>Dirección de entrega</h2>
      <p>Es responsabilidad del cliente verificar que la ubicación seleccionada, la dirección, las referencias adicionales y el número de contacto sean correctos y suficientes.</p>

      <h2>Durante la entrega</h2>
      <p>Podremos comunicarnos contigo si necesitamos ayuda para ubicar la dirección, coordinar el ingreso, confirmar quién recibirá o resolver un inconveniente relacionado con la entrega.</p>

      <h2>Si no podemos realizar la entrega</h2>
      <p>Si no podemos completar la entrega por ausencia, dirección o ubicación incorrecta, imposibilidad de contacto o restricciones de acceso no informadas, intentaremos comunicarnos para determinar las opciones disponibles.</p>
      <p>Cuando sea necesario realizar una segunda entrega, esta podrá generar un costo adicional que deberá ser informado y aceptado antes de realizarla.</p>

      <h2>Revisión del pedido</h2>
      <p>Recomendamos revisar el pedido tan pronto como lo recibas. Si encuentras un producto faltante, incorrecto, dañado o en condiciones inadecuadas, consulta nuestra <Link href="/cambios-y-devoluciones">Política de Cambios y Devoluciones</Link>.</p>
    </InfoPage>
  );
}
