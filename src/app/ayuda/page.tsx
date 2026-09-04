import type { Metadata } from "next";
import Link from "next/link";
import InfoPage from "@/components/info/InfoPage";

export const metadata: Metadata = {
  title: "Centro de Ayuda | Altavera",
  description: "Encuentra ayuda con pedidos, entregas, productos, pagos y tu cuenta de Altavera.",
};

export default function HelpPage() {
  return (
    <InfoPage
      title="Centro de Ayuda"
      eyebrow="Estamos para ayudarte"
      intro="Encuentra rápidamente dónde resolver dudas sobre pedidos, entregas, productos, pagos, cobertura y tu cuenta."
    >
      <h2>Ayuda con pedidos</h2>
      <p>Podemos ayudarte con:</p>
      <ul>
        <li>Estado de un pedido.</li>
        <li>Productos faltantes o incorrectos.</li>
        <li>Productos dañados o en malas condiciones.</li>
        <li>Problemas con una entrega.</li>
        <li>Cambios antes de preparar un pedido.</li>
        <li>Dudas relacionadas con pagos.</li>
        <li>Dirección de entrega y zona de cobertura.</li>
        <li>Uso de tu cuenta.</li>
      </ul>

      <h2>Para ayudarte más rápido</h2>
      <p>Si tu consulta está relacionada con una compra, procura tener a mano:</p>
      <ul>
        <li>Número de pedido.</li>
        <li>Nombre utilizado para realizarlo.</li>
        <li>Breve descripción de lo ocurrido.</li>
      </ul>
      <p>Si se trata de un problema visible con un producto, una fotografía puede ayudarnos a resolverlo más rápidamente.</p>

      <h2>Canales de atención</h2>
      <p>Los canales que Altavera tenga habilitados en cada momento estarán publicados en la página de contacto.</p>
      <div className="info-actions"><Link className="info-action" href="/contacto">Ir a Contacto</Link></div>

      <h2>Privacidad o datos personales</h2>
      <p>También puedes utilizar nuestros canales de atención para solicitar acceso, corrección, actualización o eliminación de tus datos cuando corresponda.</p>

      <h2>¿Buscas una respuesta rápida?</h2>
      <p>Consulta primero nuestras <Link href="/preguntas-frecuentes">Preguntas Frecuentes</Link>. También puedes revisar la <Link href="/envios">Política de Envíos</Link> o la <Link href="/cambios-y-devoluciones">Política de Cambios y Devoluciones</Link>.</p>
    </InfoPage>
  );
}
