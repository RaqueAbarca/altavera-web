"use client";

type ProductCount = {
  name: string;
  quantity: number;
};

type Props = {
  products: ProductCount[];
};

export default function ShoppingList({
  products,
}: Props) {

  return (
    <section className="shopping-list">

      <h2>
        🛒 Lista de compras
      </h2>

      {
        products.length === 0 ? (

          <p className="empty">
            No hay productos pendientes.
          </p>

        ) : (

          <ul className="shopping-items">

            {
              products.map((product,index)=>(

                <li key={index}>

                  <span className="product-name">
                    {product.name}
                  </span>

                  <span className="product-quantity">
                    x {product.quantity}
                  </span>

                </li>

              ))
            }

          </ul>

        )
      }

    </section>
  );
}