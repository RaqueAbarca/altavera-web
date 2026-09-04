import type { Metadata } from "next";
import Link from "next/link";
import InfoPage from "@/components/info/InfoPage";
import { legalInfo } from "@/data/legalInfo";

export const metadata: Metadata = {
  title: "Términos y Condiciones | Altavera",
  description: "Condiciones de uso y compra en Altavera.",
};

export default function TermsPage() {
  return (
    <InfoPage
      title="Términos y Condiciones"
      eyebrow="Legal"
      intro="Estas son las condiciones que regulan el uso de Altavera y las compras realizadas mediante nuestra plataforma."
      updatedAt={legalInfo.updatedAt}
    >
      <p>
        Al realizar una compra mediante Altavera, el cliente confirma que ha tenido
        acceso a las condiciones aplicables a la transacción.
      </p>

      <div className="info-merchant">
        <p><strong>Nombre comercial:</strong> {legalInfo.tradeName}</p>
        <p><strong>Responsable:</strong> {legalInfo.responsible}</p>
        <p><strong>Cédula de identidad:</strong> {legalInfo.identification}</p>
        <p><strong>Domicilio comercial:</strong> {legalInfo.address}</p>
      </div>

      <h2>1. Sobre Altavera</h2>
      <p>Altavera es una plataforma de comercio electrónico dedicada principalmente a la comercialización y entrega de frutas, vegetales y otros productos relacionados.</p>

      <h2>2. Productos</h2>
      <p>Procuramos proporcionar información clara y correcta sobre los productos, incluyendo según corresponda nombre, precio, unidad de venta, cantidad o peso, fotografías y características relevantes.</p>
      <h3>Productos frescos</h3>
      <p>Las frutas y vegetales son productos naturales, por lo que pueden existir variaciones normales en tamaño, forma, color, textura, apariencia o grado de maduración.</p>
      <p>Las fotografías son principalmente ilustrativas y una variación natural no significa por sí misma que el producto se encuentre defectuoso o en malas condiciones.</p>

      <h2>3. Precios</h2>
      <p>El precio aplicable será el mostrado en Altavera al momento de realizar el pedido, salvo errores evidentes informados al cliente antes de completar la transacción.</p>
      <p>Antes de confirmar una compra podrás revisar productos, cantidades, precios, costo de entrega, descuentos aplicables y total. No agregaremos cargos distintos a los informados sin autorización.</p>

      <h2>4. Disponibilidad y sustituciones</h2>
      <p>Los productos están sujetos a disponibilidad. Debido a que trabajamos principalmente con productos frescos, esta puede variar.</p>
      <div className="info-callout"><p><strong>Altavera no sustituirá un producto por otro diferente sin autorización del cliente.</strong></p></div>
      <p>Si un producto no está disponible podremos consultar si deseas una alternativa, ofrecer otra presentación o retirarlo del pedido y ajustar el monto correspondiente.</p>
      <p>Si no logramos contactarte dentro del tiempo necesario para preparar el pedido, podremos retirar el producto no disponible y realizar el ajuste correspondiente.</p>

      <h2>5. Realización del pedido</h2>
      <p>Antes de confirmar la compra podrás revisar la información ingresada. Es responsabilidad del cliente verificar productos, cantidades, nombre, contacto, dirección, ubicación seleccionada y método de pago.</p>
      <p>Después de completar el pedido, Altavera proporcionará una confirmación mediante la plataforma o alguno de los medios de contacto disponibles.</p>

      <h2>6. Pago</h2>
      <p>Los métodos de pago habilitados aparecerán durante la compra. El cliente deberá utilizar únicamente medios de pago que esté autorizado a usar.</p>
      <p>Si un pago no puede verificarse, el pedido podrá permanecer pendiente hasta resolver la situación. Altavera nunca solicitará contraseñas ni códigos privados de acceso bancario.</p>

      <h2>7. Entregas</h2>
      <p>Por ahora realizamos entregas únicamente dentro de nuestra zona de cobertura habilitada en el cantón de Alajuela. La ubicación indicada podrá utilizarse para verificar cobertura, calcular el costo y facilitar la entrega.</p>
      <p>Consulta la <Link href="/envios">Política de Envíos</Link> para conocer las condiciones completas.</p>

      <h2>8. Dirección e información de contacto</h2>
      <p>El cliente es responsable de proporcionar una ubicación, dirección, indicaciones adicionales y número de contacto suficientes y correctos. Si existe algún problema para localizar el destino, intentaremos contactar al cliente.</p>

      <h2>9. Horarios y fechas de entrega</h2>
      <p>La fecha, horario o franja disponible será informada durante el proceso de compra o mediante los canales correspondientes.</p>
      <p>Pueden ocurrir atrasos por tránsito, clima, accidentes, problemas de acceso, fuerza mayor u otras situaciones fuera de nuestro control razonable. Cuando exista un atraso significativo, procuraremos informarlo.</p>

      <h2>10. Recepción del pedido</h2>
      <p>El cliente o una persona autorizada deberá estar disponible para recibir el pedido. Si no es posible completar la entrega por ausencia, dirección incorrecta o imposibilidad de contacto, nos comunicaremos para determinar las opciones disponibles.</p>
      <p>Una nueva entrega podrá tener un costo adicional cuando corresponda, pero deberá informarse antes de realizarla.</p>

      <h2>11. Revisión del pedido</h2>
      <p>Recomendamos revisar los productos tan pronto como sean recibidos. Si encuentras productos faltantes, incorrectos, dañados o deteriorados, presenta el reclamo conforme a nuestra <Link href="/cambios-y-devoluciones">Política de Cambios y Devoluciones</Link>.</p>

      <h2>12. Derecho de retracto y productos perecederos</h2>
      <p>La legislación costarricense contempla el derecho de retracto para determinadas transacciones realizadas fuera del establecimiento comercial, incluido el comercio electrónico, así como excepciones relacionadas con bienes consumibles o perecederos.</p>
      <p>Gran parte de los productos comercializados por Altavera corresponde a alimentos frescos y perecederos, por lo que el derecho de retracto podrá encontrarse limitado cuando legalmente corresponda.</p>
      <p><strong>Esta limitación no elimina los derechos del consumidor cuando el producto recibido esté dañado, deteriorado, sea incorrecto o no sea conforme con lo adquirido.</strong></p>

      <h2>13. Cambios y devoluciones</h2>
      <p>Los alimentos frescos no podrán devolverse únicamente por un cambio de opinión cuando resulte aplicable la excepción legal correspondiente a productos perecederos.</p>
      <p>Sí atenderemos reclamos por productos incorrectos, faltantes, dañados, en condiciones inadecuadas o por errores atribuibles a Altavera.</p>

      <h2>14. Modificación de pedidos</h2>
      <p>Si necesitas modificar un pedido, contáctanos tan pronto como sea posible. Si todavía no ha comenzado su preparación, procuraremos realizar el cambio. Una vez iniciada la preparación, algunas modificaciones podrían no ser posibles.</p>

      <h2>15. Cancelaciones</h2>
      <p>La posibilidad de cancelar un pedido dependerá de su estado, la naturaleza de los productos y las disposiciones legales aplicables. Esto no afecta los derechos del consumidor frente a incumplimientos o productos no conformes.</p>

      <h2>16. Reclamos</h2>
      <p>Altavera ofrecerá mecanismos de contacto gratuitos y accesibles. Para facilitar la atención recomendamos indicar número de pedido, nombre utilizado para la compra, producto relacionado, explicación del problema y fotografía cuando resulte útil.</p>
      <p>Los canales vigentes estarán siempre disponibles en nuestra <Link href="/contacto">página de contacto</Link>.</p>

      <h2>17. Cuentas de usuario</h2>
      <p>Cuando crees una cuenta serás responsable de proporcionar información correcta, mantener tus datos actualizados, proteger tus credenciales e informarnos si detectas un uso no autorizado.</p>
      <p>Altavera podrá permitir compras como invitado cuando esta opción se encuentre habilitada.</p>

      <h2>18. Promociones y descuentos</h2>
      <p>Las promociones podrán estar sujetas a fechas, disponibilidad, cantidades máximas, productos, zonas, montos mínimos u otros requisitos previamente informados. Las condiciones aplicables se mostrarán junto con cada promoción.</p>

      <h2>19. Errores evidentes</h2>
      <p>Procuramos mantener correcta la información publicada. Si existe un error evidente en un precio, descripción, disponibilidad o condición de venta, informaremos al cliente tan pronto como sea razonablemente posible antes de ejecutar la transacción bajo información incorrecta.</p>

      <h2>20. Funcionamiento de la plataforma</h2>
      <p>Puede haber interrupciones temporales por mantenimiento, actualizaciones, proveedores tecnológicos, fallos de internet o situaciones fuera de nuestro control. Estas interrupciones no limitan los derechos correspondientes sobre pedidos ya realizados.</p>

      <h2>21. Propiedad intelectual</h2>
      <p>El nombre Altavera, sus elementos gráficos, textos, diseños, fotografías propias y demás contenido original están protegidos por la legislación aplicable y no podrán utilizarse con fines comerciales sin autorización.</p>

      <h2>22. Protección al consumidor</h2>
      <p>Ninguna disposición de estos términos pretende eliminar, restringir o limitar derechos irrenunciables reconocidos por la legislación costarricense. Cuando exista incompatibilidad con una norma obligatoria de protección al consumidor, prevalecerá la disposición legal aplicable.</p>

      <h2>23. Protección de datos</h2>
      <p>La recopilación y utilización de datos personales se regula adicionalmente por nuestra <Link href="/privacidad">Política de Privacidad</Link>.</p>

      <h2>24. Cambios a estos términos</h2>
      <p>Podremos actualizar estos términos cuando cambien nuestros servicios, procesos, funciones o requisitos legales. Las modificaciones no alterarán retroactivamente las condiciones de pedidos previamente confirmados salvo obligación legal.</p>

      <h2>25. Legislación aplicable</h2>
      <p>Estos Términos y Condiciones se rigen por las leyes de la República de Costa Rica, incluyendo la Ley N.º 7472, Ley de Promoción de la Competencia y Defensa Efectiva del Consumidor, su Reglamento y demás normativa aplicable.</p>

      <h2>26. Información del comerciante</h2>
      <div className="info-merchant">
        <p><strong>Nombre comercial:</strong> {legalInfo.tradeName}</p>
        <p><strong>Responsable:</strong> {legalInfo.responsible}</p>
        <p><strong>Cédula de identidad:</strong> {legalInfo.identification}</p>
        <p><strong>Domicilio comercial:</strong> {legalInfo.address}</p>
        <p><strong>Canales de atención:</strong> <Link href="/contacto">Consulta la página de contacto</Link>.</p>
      </div>
    </InfoPage>
  );
}
