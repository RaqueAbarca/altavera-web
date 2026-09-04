import type { Metadata } from "next";
import Link from "next/link";
import InfoPage from "@/components/info/InfoPage";

export const metadata: Metadata = {
  title: "Preguntas Frecuentes | Altavera",
  description: "Respuestas rápidas sobre compras, entregas, cobertura y productos de Altavera.",
};

const faqs = [
  ["¿Necesito una cuenta para comprar?", "No necesariamente. Cuando la opción esté habilitada podrás comprar como invitado. Crear una cuenta puede facilitar futuras compras y la gestión de información asociada a tus pedidos."],
  ["¿Dónde entrega Altavera?", "Por ahora realizamos entregas únicamente dentro de nuestra zona habilitada del cantón de Alajuela. Durante la compra puedes seleccionar tu ubicación para confirmar si llegamos hasta tu dirección."],
  ["¿Van a ampliar las zonas de entrega?", "Sí. Queremos ampliar progresivamente la cobertura fuera de la zona actual de Alajuela. Si todavía no llegamos hasta tu comunidad, puedes proponer una ubicación desde la página de contacto."],
  ["¿Cuánto cuesta el envío?", "Depende de tu ubicación y las condiciones correspondientes al pedido. Siempre podrás conocer el costo antes de confirmar la compra."],
  ["¿Cuándo recibiré mi pedido?", "Los días, fechas o franjas disponibles aparecerán durante el proceso de compra o serán informados antes de la entrega."],
  ["¿Puedo elegir mi ubicación en el mapa?", "Sí. Utilizamos la ubicación seleccionada para verificar cobertura y facilitar la entrega. Asegúrate de colocar el punto correctamente y agregar cualquier referencia necesaria."],
  ["¿Qué pasa si un producto se agota?", "Como trabajamos con productos frescos, ocasionalmente alguno puede dejar de estar disponible. Intentaremos contactarte para ofrecer una alternativa. Nunca sustituiremos un producto por otro diferente sin tu autorización; si no logramos contactarte a tiempo, podremos retirar el producto y ajustar el monto correspondiente."],
  ["¿Las frutas y vegetales son idénticos a las fotografías?", "No. Son productos naturales y pueden variar en tamaño, forma, color, textura, apariencia o grado de maduración. Las imágenes funcionan como referencia del tipo de producto."],
  ["¿Cómo selecciona Altavera los productos?", "Procuramos seleccionar productos que se encuentren en condiciones adecuadas para su comercialización y consumo, tomando en cuenta las características naturales de cada producto."],
  ["¿Qué hago si algo llega dañado?", "Contáctanos lo antes posible e indícanos tu número de pedido, el producto y qué ocurrió. Si es posible, envíanos una fotografía."],
  ["¿Qué pasa si falta un producto?", "Escríbenos con tu número de pedido. Si confirmamos que un producto cobrado no fue entregado, coordinaremos la reposición o ajuste correspondiente."],
  ["¿Qué pasa si recibo algo que no pedí?", "Contáctanos. Altavera no realiza sustituciones por productos diferentes sin autorización, por lo que revisaremos el pedido y coordinaremos una solución."],
  ["¿Puedo devolver frutas o vegetales porque cambié de opinión?", "Los alimentos frescos son productos perecederos y existen excepciones legales al derecho de retracto aplicables a determinados bienes de esta naturaleza. Esto no afecta tu derecho a reclamar cuando recibas un producto deteriorado, incorrecto o no conforme con lo adquirido."],
  ["¿Puedo cambiar un pedido?", "Si todavía no hemos comenzado a prepararlo, procuraremos realizar el cambio. Contáctanos lo antes posible. Si la preparación ya comenzó, algunos cambios podrían no ser posibles."],
  ["¿Puedo cancelar mi pedido?", "Dependerá del estado del pedido, la naturaleza de los productos y las disposiciones legales aplicables. Contáctanos lo antes posible para revisar el caso."],
  ["¿Qué hago si puse mal mi dirección?", "Contáctanos inmediatamente. Si el pedido todavía no ha salido para entrega, podremos intentar corregirla. Un cambio que implique una zona o costo diferente podría requerir un ajuste previamente informado."],
  ["¿Qué pasa si no estoy cuando llega el pedido?", "Intentaremos contactarte. Si no es posible completar la entrega, podremos coordinar otra opción. Una segunda entrega podrá generar un costo adicional, informado antes de realizarla."],
] as const;

export default function FAQPage() {
  return (
    <InfoPage
      title="Preguntas Frecuentes"
      eyebrow="Ayuda"
      intro="Respuestas rápidas a las dudas más comunes antes, durante y después de comprar en Altavera."
    >
      <div className="faq-list">
        {faqs.map(([question, answer]) => (
          <details className="faq-item" key={question}>
            <summary>{question}</summary>
            <div className="faq-answer"><p>{answer}</p></div>
          </details>
        ))}
      </div>

      <h2>¿Todavía necesitas ayuda?</h2>
      <p>Visita nuestro <Link href="/ayuda">Centro de Ayuda</Link> o utiliza los canales disponibles en <Link href="/contacto">Contacto</Link>.</p>
    </InfoPage>
  );
}
