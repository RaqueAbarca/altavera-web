import type { Metadata } from "next";
import Link from "next/link";
import InfoPage from "@/components/info/InfoPage";
import { legalInfo } from "@/data/legalInfo";

export const metadata: Metadata = {
  title: "Cambios y Devoluciones | Altavera",
  description: "Consulta cómo reportar productos faltantes, incorrectos o en malas condiciones.",
};

export default function ReturnsPage() {
  return (
    <InfoPage
      title="Cambios y Devoluciones"
      eyebrow="Compras"
      intro="Trabajamos principalmente con productos frescos y perecederos. Nuestro objetivo es entregar productos en condiciones adecuadas y resolver de manera justa cualquier problema con tu pedido."
      updatedAt={legalInfo.updatedAt}
    >
      <h2>¿Cuándo puedo presentar un reclamo?</h2>
      <p>Puedes contactarnos cuando:</p>
      <ul>
        <li>Recibas un producto distinto al solicitado.</li>
        <li>Falte un producto que haya sido cobrado.</li>
        <li>Un producto llegue dañado o deteriorado.</li>
        <li>Un producto se encuentre en condiciones que razonablemente impidan su consumo.</li>
        <li>Exista un error en la cantidad entregada.</li>
        <li>Exista otro error atribuible a Altavera.</li>
      </ul>

      <h2>Frutas y vegetales son productos naturales</h2>
      <p>Es normal que existan diferencias de tamaño, forma, color, apariencia, textura o grado de maduración respecto a las fotografías mostradas.</p>
      <p>Una diferencia estética o natural no significa necesariamente que el producto esté defectuoso.</p>

      <h2>¿Cuándo debería reportar un problema?</h2>
      <p>Para productos frescos recomendamos comunicar cualquier inconveniente lo antes posible después de recibir el pedido, especialmente cuando se trate del estado físico o frescura del producto.</p>
      <div className="info-callout"><p>Idealmente, los problemas evidentes al momento de la entrega deberían reportarse dentro de las primeras <strong>24 horas</strong>. Este plazo es una recomendación para facilitar la comprobación del estado del producto y no pretende limitar derechos que legalmente correspondan al consumidor.</p></div>

      <h2>¿Cómo presento un reclamo?</h2>
      <p>Utiliza cualquiera de los canales vigentes publicados en nuestra <Link href="/contacto">página de contacto</Link>.</p>
      <p>Cuando sea posible, incluye:</p>
      <ol>
        <li>Número de pedido.</li>
        <li>Producto relacionado.</li>
        <li>Descripción del problema.</li>
        <li>Fotografía cuando el inconveniente pueda comprobarse visualmente.</li>
      </ol>
      <p>No será necesario desplazarte físicamente hasta nuestro domicilio para iniciar un reclamo.</p>

      <h2>¿Qué solución puede ofrecer Altavera?</h2>
      <p>Dependiendo de las circunstancias podremos ofrecer reposición, ajuste del monto, reintegro u otra solución acordada con el cliente y compatible con sus derechos.</p>

      <h2>Producto faltante</h2>
      <p>Si confirmamos que un producto cobrado no fue entregado, realizaremos la reposición o ajuste correspondiente.</p>

      <h2>Producto incorrecto</h2>
      <p>Si recibes un producto diferente al adquirido por un error atribuible a Altavera, comunícate con nosotros para coordinar una solución.</p>

      <h2>Producto en malas condiciones</h2>
      <p>Si un producto llega deteriorado o en condiciones inadecuadas para su consumo, envíanos la información necesaria para revisar el caso. Cuando resulte procedente realizaremos la reposición, reintegro o ajuste correspondiente.</p>

      <h2>¿Tengo que devolver físicamente un producto fresco dañado?</h2>
      <p>No necesariamente. Por motivos de seguridad alimentaria y por la naturaleza perecedera de los productos, Altavera podrá determinar que una fotografía u otra evidencia sea suficiente para documentar el problema.</p>

      <h2>Cambio de opinión</h2>
      <p>La legislación costarricense contempla excepciones al derecho de retracto relacionadas con bienes consumibles y perecederos. Por esta razón, determinados productos frescos no podrán devolverse únicamente porque el cliente cambió de opinión cuando resulte aplicable la excepción establecida legalmente.</p>
      <p>Esto es diferente a recibir un producto dañado, deteriorado, incorrecto, faltante o no conforme con lo adquirido. Estos casos sí serán atendidos.</p>

      <h2>Reembolsos</h2>
      <p>Cuando corresponda realizar un reintegro, utilizaremos el procedimiento aplicable según el método mediante el que se efectuó el pago y las disposiciones legales correspondientes.</p>

      <h2>Derechos del consumidor</h2>
      <p>Nada establecido en esta política pretende limitar derechos irrenunciables reconocidos por la legislación costarricense de protección al consumidor.</p>
    </InfoPage>
  );
}
