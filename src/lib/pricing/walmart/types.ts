export type WalmartSellerReference={
  id:string;
  name:string;
};

export type WalmartReference={
  label:string;
  country:string;
  latitude:number;
  longitude:number;
  regionId:string;
  sellers:WalmartSellerReference[];
};

export type WalmartRawProduct={
  productId:string;
  productName:string;
  priceRange?:{
    sellingPrice?:{
      lowPrice?:number;
      highPrice?:number;
    };
    listPrice?:{
      lowPrice?:number;
      highPrice?:number;
    };
  };
  items?:Array<{
    itemId?:string;
    measurementUnit?:string;
    unitMultiplier?:number;
    sellers?:Array<{
      sellerId?:string;
      sellerName?:string;
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
  currentPrice:number|null;
  regularPrice:number|null;
  discountPercent:number|null;
  measurementUnit:string|null;
  quantityText:string|null;
  unitMultiplier:number|null;
  selectedSellerId:string|null;
  selectedSellerName:string|null;
  rawData:WalmartRawProduct;
};

export type WalmartFetchResult={
  products:WalmartRawProduct[];
  reference:WalmartReference;
};
