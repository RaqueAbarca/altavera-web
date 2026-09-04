export type LngLat = [number, number];

export type DeliveryCoverageZone = {
  id: string;
  label: string;
  province: string;
  polygon: LngLat[];
  maxLatitude?: number;
};

export type DeliveryAvailability = {
  available: boolean;
  status: "covered" | "outside" | "blocked";
  zone: string | null;
};

export const DELIVERY_UNAVAILABLE_MESSAGE =
  "Por el momento realizamos entregas únicamente dentro de nuestra zona habilitada en Alajuela. Prueba con otra dirección dentro del área de cobertura.";

/*
 * Cobertura de lanzamiento: cantón de Alajuela.
 * El cantón se limita operativamente al sur de Sarapiquí.
 */
export const DELIVERY_COVERAGE_ZONES: DeliveryCoverageZone[] = [
  {
    id: "alajuela-central",
    label: "Alajuela",
    province: "Alajuela",
    maxLatitude: 10.145,
    polygon: [
      [-84.17447662353516, 10.018739700317383],
      [-84.18020629882812, 10.006878852844352],
      [-84.19553375244129, 9.993571281433105],
      [-84.18830108642578, 9.970672607421932],
      [-84.2000732421875, 9.971256256103516],
      [-84.21497344970697, 9.964555740356445],
      [-84.22528839111317, 9.955575942993164],
      [-84.23261260986322, 9.947279930114746],
      [-84.24709320068354, 9.936091423034782],
      [-84.26410675048817, 9.929632186889705],
      [-84.29058074951166, 9.92741489410406],
      [-84.3038330078125, 9.926458358764592],
      [-84.32833862304688, 9.918595314025936],
      [-84.35273742675781, 9.917634963989258],
      [-84.36929321289051, 9.92768573760992],
      [-84.36054229736328, 9.939018249511776],
      [-84.35305023193354, 9.964113235473576],
      [-84.34484863281244, 9.98473262786871],
      [-84.34123229980463, 9.995927810669059],
      [-84.33686065673822, 10.002040863037166],
      [-84.33067321777332, 10.00730991363531],
      [-84.3219223022461, 10.00725078582758],
      [-84.31487274169922, 10.002941131591797],
      [-84.3063735961914, 10.01217079162609],
      [-84.29847717285156, 10.021681785583496],
      [-84.28623962402344, 10.02621078491211],
      [-84.2701187133789, 10.032341957092399],
      [-84.25672149658203, 10.050398826599235],
      [-84.24137878417963, 10.074810981750431],
      [-84.22855377197266, 10.09165191650402],
      [-84.2157363891601, 10.108799934387207],
      [-84.20260620117188, 10.125649452209416],
      [-84.19770050048822, 10.145271301269474],
      [-84.19817352294916, 10.174651145935059],
      [-84.20600128173822, 10.186140060424862],
      [-84.21465301513672, 10.194001197814941],
      [-84.22424316406239, 10.203042030334586],
      [-84.23370361328125, 10.230681419372672],
      [-84.23734283447266, 10.242581367492733],
      [-84.24458312988281, 10.254380226135368],
      [-84.22676849365234, 10.253659248352108],
      [-84.21687316894526, 10.25543022155773],
      [-84.20677947998041, 10.261699676513786],
      [-84.20189666748041, 10.271128654480037],
      [-84.19200897216786, 10.29629135131836],
      [-84.18708801269531, 10.327309608459473],
      [-84.18389892578114, 10.355291366577148],
      [-84.18044281005854, 10.372480392456112],
      [-84.17902374267572, 10.387519836425781],
      [-84.170913696289, 10.411728858947868],
      [-84.1622467041015, 10.415259361267147],
      [-84.16287994384766, 10.289279937744197],
      [-84.16494750976562, 10.172550201416072],
      [-84.16026306152344, 10.097101211547852],
      [-84.16047668457031, 10.071298599243278],
      [-84.16763305664062, 10.056411743164062],
      [-84.16757202148432, 10.042620658874569],
      [-84.17447662353516, 10.018739700317383],
    ],
  },
];

export function pointInPolygon(
  longitude: number,
  latitude: number,
  polygon: LngLat[]
) {
  let inside = false;

  for (
    let i = 0, j = polygon.length - 1;
    i < polygon.length;
    j = i++
  ) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];

    const intersects =
      yi > latitude !== yj > latitude &&
      longitude <
        ((xj - xi) * (latitude - yi)) /
          (yj - yi || Number.EPSILON) +
          xi;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

export function evaluatePublicCoverage(
  latitude: number,
  longitude: number
): DeliveryAvailability {
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return {
      available: false,
      status: "outside",
      zone: null,
    };
  }

  const matchingZone = DELIVERY_COVERAGE_ZONES.find((zone) => {
    if (
      zone.maxLatitude !== undefined &&
      latitude > zone.maxLatitude
    ) {
      return false;
    }

    return pointInPolygon(
      longitude,
      latitude,
      zone.polygon
    );
  });

  if (!matchingZone) {
    return {
      available: false,
      status: "outside",
      zone: null,
    };
  }

  return {
    available: true,
    status: "covered",
    zone: matchingZone.label,
  };
}

function intersectionAtLatitude(
  a: LngLat,
  b: LngLat,
  maxLatitude: number
): LngLat {
  const ratio =
    (maxLatitude - a[1]) / (b[1] - a[1]);

  return [
    a[0] + ratio * (b[0] - a[0]),
    maxLatitude,
  ];
}

function clipPolygonAtMaxLatitude(
  polygon: LngLat[],
  maxLatitude: number
) {
  const output: LngLat[] = [];

  for (let i = 0; i < polygon.length; i++) {
    const current = polygon[i];
    const previous = polygon[(i - 1 + polygon.length) % polygon.length];
    const currentInside = current[1] <= maxLatitude;
    const previousInside = previous[1] <= maxLatitude;

    if (currentInside) {
      if (!previousInside) {
        output.push(
          intersectionAtLatitude(
            previous,
            current,
            maxLatitude
          )
        );
      }

      output.push(current);
    } else if (previousInside) {
      output.push(
        intersectionAtLatitude(
          previous,
          current,
          maxLatitude
        )
      );
    }
  }

  if (
    output.length > 0 &&
    (output[0][0] !== output[output.length - 1][0] ||
      output[0][1] !== output[output.length - 1][1])
  ) {
    output.push(output[0]);
  }

  return output;
}

export function getCoverageDisplayPolygon(
  zone: DeliveryCoverageZone
) {
  return zone.maxLatitude === undefined
    ? zone.polygon
    : clipPolygonAtMaxLatitude(
        zone.polygon,
        zone.maxLatitude
      );
}

export function toLeafletLatLngs(polygon: LngLat[]) {
  return polygon.map(
    ([longitude, latitude]) =>
      [latitude, longitude] as [number, number]
  );
}
