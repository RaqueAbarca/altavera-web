"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Product={
  id:number;
  name:string;
  category:string|null;
  unit:string|null;
};

type PendingProduct={
  id:number;
  productName:string;
  unit:string;
  minimumPrice:number;
  maximumPrice:number;
  modePrice:number;
  averagePrice:number;
  bulletinDate:string;
  bulletinNumber:string;
  page:number;
  row:number;
};

type DraftProduct={
  id:number;
  name:string;
  description:string;
  category:string;
  price:number;
  unit:string;
  imageUrl:string;
  cenada:{
    date:string;
    name:string|null;
    sourceUnit:string|null;
    cost:number|null;
  }|null;
};

type NewProductForm={
  name:string;
  category:string;
  unit:string;
  conversionFactor:string;
  description:string;
  imageUrl:string;
};

type DraftEdit={
  price:string;
  description:string;
  imageUrl:string;
};

function inferUnit(sourceUnit:string){
  const normalized=
    sourceUnit.trim().toLowerCase();

  if(
    normalized==="kg"||
    normalized.includes("kilogram")
  ){
    return "kg";
  }

  if(
    normalized.includes("unidad")||
    normalized.includes("unid")
  ){
    return "unidad";
  }

  return "";
}

export default function CenadaPendingList(){
  const [products,setProducts]=useState<Product[]>([]);
  const [pending,setPending]=useState<PendingProduct[]>([]);
  const [draftProducts,setDraftProducts]=useState<DraftProduct[]>([]);
  const [selectedProducts,setSelectedProducts]=useState<Record<number,number>>({});
  const [message,setMessage]=useState("");
  const [filter,setFilter]=useState("pending");
  const [creatingFor,setCreatingFor]=useState<number|null>(null);
  const [newProductForm,setNewProductForm]=useState<NewProductForm|null>(null);
  const [creating,setCreating]=useState(false);
  const [publishingId,setPublishingId]=useState<number|null>(null);
  const [draftEdits,setDraftEdits]=useState<Record<number,DraftEdit>>({});

  const categories=useMemo(
    ()=>
      Array.from(
        new Set(
          products
            .map(product=>product.category?.trim()??"")
            .filter(Boolean)
        )
      ).sort(),
    [products]
  );

  useEffect(()=>{
    loadProducts();
    loadDraftProducts();
  },[]);

  useEffect(()=>{
    loadPending();
  },[filter]);

  async function loadProducts(){
    const {data,error}=await supabase
      .from("products")
      .select("id,name,category,unit")
      .order("name");

    if(error){
      console.error(error);
      return;
    }

    setProducts(
      (data??[]).map(product=>({
        id:Number(product.id),
        name:product.name,
        category:product.category,
        unit:product.unit
      }))
    );
  }

  async function loadPending(){
    const {data,error}=await supabase
      .from("cenada_pending_matches")
      .select("*")
      .eq("status",filter)
      .order("created_at");

    if(error){
      console.error(error);
      return;
    }

    setPending(
      (data??[]).map(item=>({
        id:Number(item.id),
        productName:item.product_name,
        unit:item.unit,
        minimumPrice:Number(item.minimum_price),
        maximumPrice:Number(item.maximum_price),
        modePrice:Number(item.mode_price),
        averagePrice:Number(item.average_price),
        bulletinDate:item.bulletin_date,
        bulletinNumber:item.bulletin_number,
        page:Number(item.page),
        row:Number(item.row)
      }))
    );
  }

  async function loadDraftProducts(){
    try{
      const response=
        await fetch(
          "/api/cenada/draft-products",
          {
            cache:"no-store"
          }
        );

      const data=await response.json();

      if(!response.ok){
        throw new Error(
          data.error??
          "No se pudieron cargar los borradores"
        );
      }

      const drafts=(data.products??[]) as DraftProduct[];

      setDraftProducts(drafts);
      setDraftEdits(
        Object.fromEntries(
          drafts.map(product=>[
            product.id,
            {
              price:String(product.price),
              description:product.description??"",
              imageUrl:
                product.imageUrl==="/logo.svg"
                  ?""
                  :product.imageUrl??""
            }
          ])
        )
      );

    }catch(error){
      console.error(
        "Error cargando borradores CENADA:",
        error
      );
    }
  }

  async function guardarRelacion(
    item:PendingProduct
  ){
    setMessage("");

    const productId=
      selectedProducts[item.id];

    if(!productId){
      setMessage(
        "Seleccione un producto"
      );
      return;
    }

    try{
      const response=await fetch(
        "/api/cenada/assign",
        {
          method:"POST",
          headers:{
            "Content-Type":"application/json"
          },
          body:JSON.stringify({
            item,
            productId
          })
        }
      );

      const data=await response.json();

      if(!response.ok){
        throw new Error(
          data.error??
          "No se pudo asignar el producto"
        );
      }

      setMessage(
        `${item.productName} fue asignado correctamente`
      );

      setSelectedProducts(current=>{
        const next={...current};
        delete next[item.id];
        return next;
      });

      await loadPending();

    }catch(error){
      console.error(
        "Error asignando producto:",
        error
      );

      setMessage(
        error instanceof Error
          ?error.message
          :"Error asignando producto"
      );
    }
  }

  async function ignorarProducto(
    item:PendingProduct
  ){
    setMessage("");

    try{
      const response=await fetch(
        "/api/cenada/ignore",
        {
          method:"POST",
          headers:{
            "Content-Type":"application/json"
          },
          body:JSON.stringify({
            pendingId:item.id
          })
        }
      );

      const data=await response.json();

      if(!response.ok){
        throw new Error(
          data.error??
          "No se pudo ignorar el producto"
        );
      }

      setMessage(
        `${item.productName} fue ignorado correctamente`
      );

      setSelectedProducts(current=>{
        const next={...current};
        delete next[item.id];
        return next;
      });

      await loadPending();

    }catch(error){
      console.error(
        "Error ignorando producto:",
        error
      );

      setMessage(
        error instanceof Error
          ?error.message
          :"Error ignorando producto"
      );
    }
  }

  function abrirCreacion(
    item:PendingProduct
  ){
    setCreatingFor(item.id);
    setMessage("");
    setNewProductForm({
      name:item.productName,
      category:categories[0]??"",
      unit:inferUnit(item.unit),
      conversionFactor:"1",
      description:"",
      imageUrl:""
    });
  }

  function cerrarCreacion(){
    setCreatingFor(null);
    setNewProductForm(null);
  }

  async function crearProducto(
    item:PendingProduct
  ){
    if(!newProductForm){
      return;
    }

    setMessage("");
    setCreating(true);

    try{
      const response=await fetch(
        "/api/cenada/create-product",
        {
          method:"POST",
          headers:{
            "Content-Type":"application/json"
          },
          body:JSON.stringify({
            pendingId:item.id,
            ...newProductForm,
            conversionFactor:Number(
              newProductForm.conversionFactor
            )
          })
        }
      );

      const data=await response.json();

      if(!response.ok){
        throw new Error(
          data.error??
          "No se pudo crear el producto"
        );
      }

      const suggestedPrice=
        Number(
          data.pricing?.suggestedPrice??
          data.product?.price??
          0
        );

      setMessage(
        `${data.product.name} se creó como borrador. Precio inicial sugerido: ₡${suggestedPrice.toLocaleString("es-CR")}. Revíselo abajo antes de publicar.`
      );

      cerrarCreacion();

      await Promise.all([
        loadProducts(),
        loadPending(),
        loadDraftProducts()
      ]);

    }catch(error){
      console.error(
        "Error creando producto desde CENADA:",
        error
      );

      setMessage(
        error instanceof Error
          ?error.message
          :"Error creando producto"
      );

    }finally{
      setCreating(false);
    }
  }

  function updateDraftEdit(
    productId:number,
    field:keyof DraftEdit,
    value:string
  ){
    setDraftEdits(current=>({
      ...current,
      [productId]:{
        ...current[productId],
        [field]:value
      }
    }));
  }

  async function publicarBorrador(
    product:DraftProduct
  ){
    const edit=
      draftEdits[product.id];

    if(!edit){
      return;
    }

    const price=Number(edit.price);

    if(
      !Number.isFinite(price)||
      price<=0
    ){
      setMessage(
        "Ingrese un precio de publicación válido"
      );
      return;
    }

    setMessage("");
    setPublishingId(product.id);

    try{
      const response=await fetch(
        "/api/cenada/publish-product",
        {
          method:"POST",
          headers:{
            "Content-Type":"application/json"
          },
          body:JSON.stringify({
            productId:product.id,
            price,
            description:edit.description,
            imageUrl:edit.imageUrl
          })
        }
      );

      const data=await response.json();

      if(!response.ok){
        throw new Error(
          data.error??
          "No se pudo publicar el producto"
        );
      }

      setMessage(
        `${data.product.name} fue publicado a ₡${Number(data.product.price).toLocaleString("es-CR")}. Ya puede aparecer en la tienda.`
      );

      await Promise.all([
        loadProducts(),
        loadDraftProducts()
      ]);

    }catch(error){
      console.error(
        "Error publicando producto:",
        error
      );

      setMessage(
        error instanceof Error
          ?error.message
          :"Error publicando producto"
      );

    }finally{
      setPublishingId(null);
    }
  }

  return(
    <section className="pending-container">
      <h2 className="pending-title">
        Productos CENADA
      </h2>

      {draftProducts.length>0&&(
        <div className="cenada-drafts-section">
          <div className="cenada-section-heading">
            <div>
              <h3>Productos nuevos en borrador</h3>
              <p>
                Ya tienen costo CENADA y precio inicial, pero todavía no aparecen en la tienda.
              </p>
            </div>

            <span className="cenada-count-badge">
              {draftProducts.length}
            </span>
          </div>

          <div className="cenada-draft-list">
            {draftProducts.map(product=>{
              const edit=
                draftEdits[product.id]??{
                  price:String(product.price),
                  description:product.description,
                  imageUrl:product.imageUrl
                };

              return(
                <article
                  key={product.id}
                  className="cenada-draft-card"
                >
                  <div className="cenada-draft-header">
                    <div>
                      <h4>{product.name}</h4>
                      <p>
                        {product.category} · {product.unit}
                      </p>
                    </div>

                    <span className="draft-badge">
                      Borrador
                    </span>
                  </div>

                  <div className="cenada-draft-metrics">
                    <div>
                      <span>Costo CENADA</span>
                      <strong>
                        {product.cenada?.cost!==null&&
                        product.cenada?.cost!==undefined
                          ?`₡${product.cenada.cost.toLocaleString("es-CR")}`
                          :"Sin normalizar"}
                      </strong>
                    </div>

                    <div>
                      <span>Precio inicial</span>
                      <strong>
                        ₡{product.price.toLocaleString("es-CR")}
                      </strong>
                    </div>
                  </div>

                  <div className="cenada-draft-form">
                    <label>
                      Precio de publicación
                      <input
                        type="number"
                        min="1"
                        step="10"
                        value={edit.price}
                        onChange={(event)=>
                          updateDraftEdit(
                            product.id,
                            "price",
                            event.target.value
                          )
                        }
                      />
                    </label>

                    <label>
                      Imagen (URL o ruta)
                      <input
                        type="text"
                        placeholder="/imgProductos/zucchini.jpg"
                        value={edit.imageUrl}
                        onChange={(event)=>
                          updateDraftEdit(
                            product.id,
                            "imageUrl",
                            event.target.value
                          )
                        }
                      />
                    </label>

                    <label className="cenada-full-field">
                      Descripción
                      <textarea
                        rows={2}
                        value={edit.description}
                        onChange={(event)=>
                          updateDraftEdit(
                            product.id,
                            "description",
                            event.target.value
                          )
                        }
                      />
                    </label>
                  </div>

                  <p className="cenada-helper-text">
                    Si deja la imagen vacía, se utilizará temporalmente el logo de Altavera.
                  </p>

                  <button
                    className="publish-draft-button"
                    disabled={publishingId===product.id}
                    onClick={()=>
                      publicarBorrador(product)
                    }
                  >
                    {publishingId===product.id
                      ?"Publicando..."
                      :"Publicar producto"}
                  </button>
                </article>
              );
            })}
          </div>
        </div>
      )}

      <div className="cenada-section-heading assignments-heading">
        <div>
          <h3>Asignación de productos</h3>
          <p>
            Relacione productos existentes, cree uno nuevo o ignore los que Altavera no venderá.
          </p>
        </div>
      </div>

      <div className="filter-buttons">
        <button
          className={
            filter==="pending"
              ?"active-filter"
              :""
          }
          onClick={()=>{
            setFilter("pending");
            setMessage("");
            cerrarCreacion();
          }}
        >
          Pendientes
        </button>

        <button
          className={
            filter==="matched"
              ?"active-filter"
              :""
          }
          onClick={()=>{
            setFilter("matched");
            setMessage("");
            cerrarCreacion();
          }}
        >
          Asignados
        </button>

        <button
          className={
            filter==="ignored"
              ?"active-filter"
              :""
          }
          onClick={()=>{
            setFilter("ignored");
            setMessage("");
            cerrarCreacion();
          }}
        >
          Ignorados
        </button>
      </div>

      {pending.length===0&&(
        <p className="empty-message">
          {filter==="pending"&&
            "No hay productos pendientes"}

          {filter==="matched"&&
            "No hay productos asignados"}

          {filter==="ignored"&&
            "No hay productos ignorados"}
        </p>
      )}

      {pending.map(item=>(
        <article
          key={item.id}
          className="pending-card"
        >
          <h3>
            {item.productName}
          </h3>

          <div className="pending-info">
            <p>
              <strong>Unidad CENADA:</strong>{" "}
              {item.unit}
            </p>

            <p>
              <strong>Moda:</strong>{" "}
              ₡{item.modePrice.toLocaleString("es-CR")}
            </p>
          </div>

          {filter==="pending"&&(
            <>
              <select
                className="product-select"
                value={
                  selectedProducts[item.id]??""
                }
                onChange={(event)=>{
                  const value=event.target.value;

                  setSelectedProducts(current=>({
                    ...current,
                    [item.id]:
                      value
                        ?Number(value)
                        :0
                  }));
                }}
              >
                <option value="">
                  Seleccionar producto existente
                </option>

                {products.map(product=>(
                  <option
                    key={product.id}
                    value={product.id}
                  >
                    {product.name}
                  </option>
                ))}
              </select>

              <div className="button-group">
                <button
                  className="assign-button"
                  onClick={()=>
                    guardarRelacion(item)
                  }
                >
                  Asignar producto
                </button>

                <button
                  className="create-product-button"
                  onClick={()=>
                    creatingFor===item.id
                      ?cerrarCreacion()
                      :abrirCreacion(item)
                  }
                >
                  {creatingFor===item.id
                    ?"Cancelar creación"
                    :"Crear como producto nuevo"}
                </button>

                <button
                  className="ignore-button"
                  onClick={()=>
                    ignorarProducto(item)
                  }
                >
                  Ignorar
                </button>
              </div>

              {creatingFor===item.id&&
              newProductForm&&(
                <div className="new-product-panel">
                  <div className="new-product-panel-header">
                    <div>
                      <h4>Nuevo producto Altavera</h4>
                      <p>
                        Se creará como borrador y no aparecerá en la tienda hasta que usted lo publique.
                      </p>
                    </div>
                  </div>

                  <div className="new-product-grid">
                    <label>
                      Nombre
                      <input
                        type="text"
                        value={newProductForm.name}
                        onChange={(event)=>
                          setNewProductForm(current=>
                            current
                              ?{
                                  ...current,
                                  name:event.target.value
                                }
                              :current
                          )
                        }
                      />
                    </label>

                    <label>
                      Categoría
                      <select
                        value={newProductForm.category}
                        onChange={(event)=>
                          setNewProductForm(current=>
                            current
                              ?{
                                  ...current,
                                  category:event.target.value
                                }
                              :current
                          )
                        }
                      >
                        <option value="">
                          Seleccionar categoría
                        </option>

                        {categories.map(category=>(
                          <option
                            key={category}
                            value={category}
                          >
                            {category}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label>
                      Unidad de venta
                      <input
                        type="text"
                        placeholder="kg, unidad..."
                        value={newProductForm.unit}
                        onChange={(event)=>
                          setNewProductForm(current=>
                            current
                              ?{
                                  ...current,
                                  unit:event.target.value
                                }
                              :current
                          )
                        }
                      />
                    </label>

                    <label>
                      Factor de conversión
                      <input
                        type="number"
                        min="0.0001"
                        step="0.01"
                        value={newProductForm.conversionFactor}
                        onChange={(event)=>
                          setNewProductForm(current=>
                            current
                              ?{
                                  ...current,
                                  conversionFactor:event.target.value
                                }
                              :current
                          )
                        }
                      />
                    </label>

                    <label className="cenada-full-field">
                      Descripción opcional
                      <textarea
                        rows={2}
                        value={newProductForm.description}
                        onChange={(event)=>
                          setNewProductForm(current=>
                            current
                              ?{
                                  ...current,
                                  description:event.target.value
                                }
                              :current
                          )
                        }
                      />
                    </label>

                    <label className="cenada-full-field">
                      Imagen opcional (URL o ruta)
                      <input
                        type="text"
                        placeholder="/imgProductos/zucchini.jpg"
                        value={newProductForm.imageUrl}
                        onChange={(event)=>
                          setNewProductForm(current=>
                            current
                              ?{
                                  ...current,
                                  imageUrl:event.target.value
                                }
                              :current
                          )
                        }
                      />
                    </label>
                  </div>

                  <div className="conversion-explanation">
                    <strong>
                      ¿Qué significa el factor?
                    </strong>
                    <p>
                      Es cuántas unidades de venta contiene la presentación de CENADA. Si CENADA ya cotiza por kg y usted venderá por kg, deje 1. Si una caja cotizada en ₡10.000 contiene 10 kg, use 10 y el costo normalizado será ₡1.000/kg.
                    </p>

                    {Number(newProductForm.conversionFactor)>0&&(
                      <p>
                        Con los datos actuales, el costo estimado sería{" "}
                        <strong>
                          ₡{(
                            item.modePrice/
                            Number(newProductForm.conversionFactor)
                          ).toLocaleString("es-CR",{
                            maximumFractionDigits:2
                          })}
                          /{newProductForm.unit||"unidad"}
                        </strong>.
                      </p>
                    )}
                  </div>

                  <button
                    className="create-draft-button"
                    disabled={creating}
                    onClick={()=>
                      crearProducto(item)
                    }
                  >
                    {creating
                      ?"Creando y calculando..."
                      :"Crear borrador y calcular precio"}
                  </button>
                </div>
              )}
            </>
          )}

          {filter==="matched"&&(
            <p className="status-message">
              Producto asignado
            </p>
          )}

          {filter==="ignored"&&(
            <p className="status-message">
              Producto ignorado
            </p>
          )}
        </article>
      ))}

      {message&&(
        <p className="message">
          {message}
        </p>
      )}
    </section>
  );
}
