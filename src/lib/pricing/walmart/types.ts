export type WalmartRawProduct={
  productId:string;
  productName:string;
  priceRange?:{
    sellingPrice?:{
      lowPrice?:number;
      highPrice?:number;
    };
  };
  items?:Array<{
    itemId?:string;
    measurementUnit?:string;
    unitMultiplier?:number;
    sellers?:Array<{
      commertialOffer?:{
        Price?:number;
        ListPrice?:number;
        spotPrice?:number;
        AvailableQuantity?:number;
      };
    }>;
  }>;
};

export type WalmartProduct={
  externalId:string;
  name:string;
  price:number|null;
  measurementUnit:string|null;
  quantityText:string|null;
  unitMultiplier:number|null;
  rawData:WalmartRawProduct;
};