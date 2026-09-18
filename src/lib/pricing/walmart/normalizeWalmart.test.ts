import { describe,expect,it } from "vitest";
import { normalizeWalmartProduct } from "./normalizeWalmart";

describe("normalizeWalmartProduct",()=>{
  it("conserva precio actual y precio regular cuando hay promoción",()=>{
    const result=normalizeWalmartProduct({
      productId:"1",
      productName:"Limón Mandarino - 8 Uds",
      items:[{
        measurementUnit:"un",
        sellers:[{
          commertialOffer:{
            Price:462,
            ListPrice:550
          }
        }]
      }]
    });

    expect(result.price).toBe(462);
    expect(result.currentPrice).toBe(462);
    expect(result.regularPrice).toBe(550);
    expect(result.discountPercent).toBe(16);
  });

  it("usa el precio actual también como regular si no existe ListPrice",()=>{
    const result=normalizeWalmartProduct({
      productId:"2",
      productName:"Aguacate Hass Kilo",
      items:[{
        measurementUnit:"kg",
        sellers:[{
          commertialOffer:{
            Price:2100
          }
        }]
      }]
    });

    expect(result.price).toBe(2100);
    expect(result.currentPrice).toBe(2100);
    expect(result.regularPrice).toBe(2100);
    expect(result.discountPercent).toBe(0);
  });
});

describe("normalizeWalmartProduct con región",()=>{
  it("prefiere un seller devuelto para la región de referencia",()=>{
    const result=normalizeWalmartProduct({
      productId:"3",
      productName:"Tomate Kilo",
      items:[{
        measurementUnit:"kg",
        unitMultiplier:1,
        sellers:[
          {sellerId:"otro",sellerName:"Otro",commertialOffer:{Price:999,ListPrice:999,AvailableQuantity:10}},
          {sellerId:"alajuela",sellerName:"Alajuela",commertialOffer:{Price:1500,ListPrice:1700,AvailableQuantity:10}}
        ]
      }]
    },{
      label:"Walmart Alajuela",
      country:"CRI",
      latitude:10.00263,
      longitude:-84.20602,
      regionId:"region-1",
      sellers:[{id:"alajuela",name:"Alajuela"}]
    });

    expect(result.currentPrice).toBe(1500);
    expect(result.regularPrice).toBe(1700);
    expect(result.selectedSellerId).toBe("alajuela");
  });
});
