"use client";


import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  useMap,
} from "react-leaflet";


import { useEffect, useState } from "react";

import L from "leaflet";

import "leaflet/dist/leaflet.css";



const markerIcon = new L.Icon({

  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",

  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",

  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",

  iconSize:[
    25,
    41
  ],

  iconAnchor:[
    12,
    41
  ],

});



type Props = {

  onChange:(
    lat:number,
    lng:number
  )=>void;

};



function LocationMarker({

  position,
  setPosition,
  onChange

}:any){


  const map = useMap();



  useMapEvents({

    click(e){


      const coords:[number,number] = [

        e.latlng.lat,
        e.latlng.lng

      ];


      setPosition(coords);


      onChange(
        coords[0],
        coords[1]
      );


    }

  });



  useEffect(()=>{

    if(position){

      map.panTo(position);

    }

  },[
    position,
    map
  ]);



  if(!position){

    return null;

  }



  return (

    <Marker

      position={position}

      icon={markerIcon}

    />

  );

}




function LocateButton({

  setPosition,
  onChange

}:any){


  const map = useMap();



  function locate(){


    navigator.geolocation.getCurrentPosition(

      (pos)=>{


        const coords:[number,number] = [

          pos.coords.latitude,

          pos.coords.longitude

        ];



        setPosition(coords);


        onChange(
          coords[0],
          coords[1]
        );



        map.flyTo(
          coords,
          16
        );


      },


      ()=>{

        alert(
          "No se pudo obtener ubicación"
        );

      }

    );


  }



  return (

    <button

      type="button"

      className="locate-btn"

      onClick={locate}

    >

      📍 Usar mi ubicación

    </button>

  );

}




export default function LocationPickerClient({

  onChange

}:Props){



  const [position,setPosition] =

  useState<[number,number]>(

    [
      9.9281,
      -84.0907
    ]

  );



  useEffect(()=>{


    navigator.geolocation.getCurrentPosition(

      (pos)=>{


        const coords:[number,number] = [

          pos.coords.latitude,

          pos.coords.longitude

        ];



        setPosition(coords);


        onChange(
          coords[0],
          coords[1]
        );


      },

      ()=>{


        onChange(
          position[0],
          position[1]
        );


      }

    );


  },[]);





  return (

    <div className="map-wrapper">


      <div className="map-title">

        📍 Selecciona tu ubicación de entrega

      </div>



      <MapContainer

        center={position}

        zoom={16}

        scrollWheelZoom={true}

        className="checkout-map"

      >


        <TileLayer

          attribution="© OpenStreetMap © CARTO"

          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"

        />



        <LocationMarker

          position={position}

          setPosition={setPosition}

          onChange={onChange}

        />



        <LocateButton

          setPosition={setPosition}

          onChange={onChange}

        />


      </MapContainer>


    </div>

  );

}