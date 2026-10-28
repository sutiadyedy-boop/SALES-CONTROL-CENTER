/**
 * GeoJSON FeatureCollection untuk 24 Kabupaten / Kota di Provinsi Sulawesi Selatan
 * Digunakan untuk visualisasi peta D3.js (d3.geoMercator / d3.geoPath)
 */

export interface SulselGeoFeature {
  type: 'Feature';
  properties: {
    kodeBps: string;
    namaKabupaten: string;
    namaSingkat: string;
    tipe: 'KABUPATEN' | 'KOTA';
    ibukota: string;
    centroid: [number, number]; // [longitude, latitude]
  };
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][] | number[][][][];
  };
}

export interface SulselGeoJSON {
  type: 'FeatureCollection';
  features: SulselGeoFeature[];
}

export const SULSEL_KABUPATEN_COORDINATES: Record<string, { centroid: [number, number]; labelOffset?: [number, number] }> = {
  '7371': { centroid: [119.4327, -5.1477], labelOffset: [-10, 0] }, // Makassar
  '7306': { centroid: [119.6804, -5.3216], labelOffset: [0, 5] },  // Gowa
  '7309': { centroid: [119.6800, -5.0065] }, // Maros
  '7310': { centroid: [119.5500, -4.7800], labelOffset: [-15, 0] }, // Pangkep
  '7311': { centroid: [119.6500, -4.4300], labelOffset: [-15, 0] }, // Barru
  '7372': { centroid: [119.6256, -4.0135], labelOffset: [-15, -5] }, // Parepare
  '7315': { centroid: [119.6500, -3.7800] }, // Pinrang
  '7314': { centroid: [119.8800, -3.9200] }, // Sidrap
  '7316': { centroid: [119.7800, -3.5500] }, // Enrekang
  '7318': { centroid: [119.8500, -3.1200] }, // Tana Toraja
  '7326': { centroid: [119.9200, -2.9500] }, // Toraja Utara
  '7373': { centroid: [120.1970, -2.9930], labelOffset: [15, 0] }, // Palopo
  '7317': { centroid: [120.2500, -3.2000] }, // Luwu
  '7322': { centroid: [120.2800, -2.5500] }, // Luwu Utara
  '7324': { centroid: [121.1500, -2.5500] }, // Luwu Timur
  '7313': { centroid: [120.1500, -4.1200] }, // Wajo
  '7312': { centroid: [119.8800, -4.3500] }, // Soppeng
  '7308': { centroid: [120.1200, -4.6800] }, // Bone
  '7307': { centroid: [120.2000, -5.1800] }, // Sinjai
  '7302': { centroid: [120.2500, -5.4800] }, // Bulukumba
  '7303': { centroid: [119.9500, -5.5200] }, // Bantaeng
  '7304': { centroid: [119.7200, -5.6500] }, // Jeneponto
  '7305': { centroid: [119.4500, -5.4200] }, // Takalar
  '7301': { centroid: [120.4800, -6.1200] }, // Kepulauan Selayar
};

export const SULSEL_GEOJSON: SulselGeoJSON = {
  type: 'FeatureCollection',
  features: [
    // 1. Kota Makassar (7371)
    {
      type: 'Feature',
      properties: {
        kodeBps: '7371',
        namaKabupaten: 'KOTA MAKASSAR',
        namaSingkat: 'Makassar',
        tipe: 'KOTA',
        ibukota: 'Makassar',
        centroid: [119.4327, -5.1477]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [119.38, -5.08],
          [119.48, -5.09],
          [119.52, -5.15],
          [119.48, -5.22],
          [119.40, -5.23],
          [119.36, -5.17],
          [119.38, -5.08]
        ]]
      }
    },
    // 2. Kabupaten Gowa (7306)
    {
      type: 'Feature',
      properties: {
        kodeBps: '7306',
        namaKabupaten: 'KABUPATEN GOWA',
        namaSingkat: 'Gowa',
        tipe: 'KABUPATEN',
        ibukota: 'Sungguminasa',
        centroid: [119.6804, -5.3216]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [119.48, -5.22],
          [119.62, -5.18],
          [119.82, -5.20],
          [119.98, -5.28],
          [119.92, -5.42],
          [119.75, -5.48],
          [119.55, -5.40],
          [119.48, -5.28],
          [119.48, -5.22]
        ]]
      }
    },
    // 3. Kabupaten Maros (7309)
    {
      type: 'Feature',
      properties: {
        kodeBps: '7309',
        namaKabupaten: 'KABUPATEN MAROS',
        namaSingkat: 'Maros',
        tipe: 'KABUPATEN',
        ibukota: 'Turikale',
        centroid: [119.6800, -5.0065]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [119.48, -4.88],
          [119.65, -4.85],
          [119.88, -4.95],
          [119.85, -5.12],
          [119.62, -5.18],
          [119.48, -5.09],
          [119.42, -4.98],
          [119.48, -4.88]
        ]]
      }
    },
    // 4. Kabupaten Pangkajene dan Kepulauan (7310)
    {
      type: 'Feature',
      properties: {
        kodeBps: '7310',
        namaKabupaten: 'KABUPATEN PANGKAJENE DAN KEPULAUAN',
        namaSingkat: 'Pangkep',
        tipe: 'KABUPATEN',
        ibukota: 'Pangkajene',
        centroid: [119.5500, -4.7800]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [119.45, -4.68],
          [119.68, -4.65],
          [119.78, -4.80],
          [119.65, -4.85],
          [119.48, -4.88],
          [119.42, -4.75],
          [119.45, -4.68]
        ]]
      }
    },
    // 5. Kabupaten Barru (7311)
    {
      type: 'Feature',
      properties: {
        kodeBps: '7311',
        namaKabupaten: 'KABUPATEN BARRU',
        namaSingkat: 'Barru',
        tipe: 'KABUPATEN',
        ibukota: 'Barru',
        centroid: [119.6500, -4.4300]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [119.58, -4.25],
          [119.75, -4.22],
          [119.82, -4.55],
          [119.68, -4.65],
          [119.45, -4.68],
          [119.56, -4.42],
          [119.58, -4.25]
        ]]
      }
    },
    // 6. Kota Parepare (7372)
    {
      type: 'Feature',
      properties: {
        kodeBps: '7372',
        namaKabupaten: 'KOTA PAREPARE',
        namaSingkat: 'Parepare',
        tipe: 'KOTA',
        ibukota: 'Parepare',
        centroid: [119.6256, -4.0135]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [119.60, -3.95],
          [119.68, -3.96],
          [119.69, -4.06],
          [119.61, -4.07],
          [119.58, -4.01],
          [119.60, -3.95]
        ]]
      }
    },
    // 7. Kabupaten Pinrang (7315)
    {
      type: 'Feature',
      properties: {
        kodeBps: '7315',
        namaKabupaten: 'KABUPATEN PINRANG',
        namaSingkat: 'Pinrang',
        tipe: 'KABUPATEN',
        ibukota: 'Watang Sawitto',
        centroid: [119.6500, -3.7800]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [119.48, -3.45],
          [119.68, -3.42],
          [119.85, -3.72],
          [119.75, -3.95],
          [119.60, -3.95],
          [119.52, -3.75],
          [119.48, -3.45]
        ]]
      }
    },
    // 8. Kabupaten Sidenreng Rappang (7314)
    {
      type: 'Feature',
      properties: {
        kodeBps: '7314',
        namaKabupaten: 'KABUPATEN SIDENRENG RAPPANG',
        namaSingkat: 'Sidrap',
        tipe: 'KABUPATEN',
        ibukota: 'Pangkajene Sidenreng',
        centroid: [119.8800, -3.9200]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [119.75, -3.78],
          [119.98, -3.75],
          [120.12, -3.92],
          [120.05, -4.08],
          [119.82, -4.10],
          [119.75, -3.95],
          [119.75, -3.78]
        ]]
      }
    },
    // 9. Kabupaten Enrekang (7316)
    {
      type: 'Feature',
      properties: {
        kodeBps: '7316',
        namaKabupaten: 'KABUPATEN ENREKANG',
        namaSingkat: 'Enrekang',
        tipe: 'KABUPATEN',
        ibukota: 'Enrekang',
        centroid: [119.7800, -3.5500]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [119.65, -3.32],
          [119.92, -3.28],
          [120.02, -3.58],
          [119.92, -3.72],
          [119.68, -3.68],
          [119.65, -3.32]
        ]]
      }
    },
    // 10. Kabupaten Tana Toraja (7318)
    {
      type: 'Feature',
      properties: {
        kodeBps: '7318',
        namaKabupaten: 'KABUPATEN TANA TORAJA',
        namaSingkat: 'Tana Toraja',
        tipe: 'KABUPATEN',
        ibukota: 'Makale',
        centroid: [119.8500, -3.1200]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [119.62, -3.02],
          [119.88, -2.98],
          [120.02, -3.12],
          [119.95, -3.30],
          [119.68, -3.28],
          [119.62, -3.02]
        ]]
      }
    },
    // 11. Kabupaten Toraja Utara (7326)
    {
      type: 'Feature',
      properties: {
        kodeBps: '7326',
        namaKabupaten: 'KABUPATEN TORAJA UTARA',
        namaSingkat: 'Toraja Utara',
        tipe: 'KABUPATEN',
        ibukota: 'Rantepao',
        centroid: [119.9200, -2.9500]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [119.78, -2.78],
          [120.05, -2.75],
          [120.12, -2.98],
          [119.95, -3.05],
          [119.78, -2.98],
          [119.78, -2.78]
        ]]
      }
    },
    // 12. Kota Palopo (7373)
    {
      type: 'Feature',
      properties: {
        kodeBps: '7373',
        namaKabupaten: 'KOTA PALOPO',
        namaSingkat: 'Palopo',
        tipe: 'KOTA',
        ibukota: 'Palopo',
        centroid: [120.1970, -2.9930]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [120.12, -2.92],
          [120.25, -2.93],
          [120.26, -3.06],
          [120.15, -3.06],
          [120.12, -2.92]
        ]]
      }
    },
    // 13. Kabupaten Luwu (7317)
    {
      type: 'Feature',
      properties: {
        kodeBps: '7317',
        namaKabupaten: 'KABUPATEN LUWU',
        namaSingkat: 'Luwu',
        tipe: 'KABUPATEN',
        ibukota: 'Belopa',
        centroid: [120.2500, -3.2000]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [120.02, -3.12],
          [120.28, -3.08],
          [120.45, -3.35],
          [120.32, -3.65],
          [120.10, -3.60],
          [120.02, -3.32],
          [120.02, -3.12]
        ]]
      }
    },
    // 14. Kabupaten Luwu Utara (7322)
    {
      type: 'Feature',
      properties: {
        kodeBps: '7322',
        namaKabupaten: 'KABUPATEN LUWU UTARA',
        namaSingkat: 'Luwu Utara',
        tipe: 'KABUPATEN',
        ibukota: 'Masamba',
        centroid: [120.2800, -2.5500]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [119.88, -2.25],
          [120.45, -2.15],
          [120.65, -2.55],
          [120.42, -2.82],
          [120.12, -2.75],
          [119.88, -2.48],
          [119.88, -2.25]
        ]]
      }
    },
    // 15. Kabupaten Luwu Timur (7324)
    {
      type: 'Feature',
      properties: {
        kodeBps: '7324',
        namaKabupaten: 'KABUPATEN LUWU TIMUR',
        namaSingkat: 'Luwu Timur',
        tipe: 'KABUPATEN',
        ibukota: 'Malili',
        centroid: [121.1500, -2.5500]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [120.65, -2.28],
          [121.48, -2.20],
          [121.65, -2.68],
          [121.32, -2.92],
          [120.88, -2.85],
          [120.65, -2.55],
          [120.65, -2.28]
        ]]
      }
    },
    // 16. Kabupaten Wajo (7313)
    {
      type: 'Feature',
      properties: {
        kodeBps: '7313',
        namaKabupaten: 'KABUPATEN WAJO',
        namaSingkat: 'Wajo',
        tipe: 'KABUPATEN',
        ibukota: 'Sengkang',
        centroid: [120.1500, -4.1200]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [119.98, -3.95],
          [120.35, -3.85],
          [120.48, -4.25],
          [120.28, -4.38],
          [120.02, -4.28],
          [119.95, -4.08],
          [119.98, -3.95]
        ]]
      }
    },
    // 17. Kabupaten Soppeng (7312)
    {
      type: 'Feature',
      properties: {
        kodeBps: '7312',
        namaKabupaten: 'KABUPATEN SOPPENG',
        namaSingkat: 'Soppeng',
        tipe: 'KABUPATEN',
        ibukota: 'Watansoppeng',
        centroid: [119.8800, -4.3500]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [119.78, -4.18],
          [120.02, -4.15],
          [120.05, -4.48],
          [119.85, -4.55],
          [119.72, -4.45],
          [119.78, -4.18]
        ]]
      }
    },
    // 18. Kabupaten Bone (7308)
    {
      type: 'Feature',
      properties: {
        kodeBps: '7308',
        namaKabupaten: 'KABUPATEN BONE',
        namaSingkat: 'Bone',
        tipe: 'KABUPATEN',
        ibukota: 'Watampone',
        centroid: [120.1200, -4.6800]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [119.88, -4.45],
          [120.25, -4.35],
          [120.48, -4.58],
          [120.45, -4.95],
          [120.22, -5.08],
          [119.95, -4.95],
          [119.82, -4.68],
          [119.88, -4.45]
        ]]
      }
    },
    // 19. Kabupaten Sinjai (7307)
    {
      type: 'Feature',
      properties: {
        kodeBps: '7307',
        namaKabupaten: 'KABUPATEN SINJAI',
        namaSingkat: 'Sinjai',
        tipe: 'KABUPATEN',
        ibukota: 'Sinjai Utara',
        centroid: [120.2000, -5.1800]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [119.98, -5.08],
          [120.35, -5.05],
          [120.42, -5.32],
          [120.15, -5.35],
          [119.98, -5.22],
          [119.98, -5.08]
        ]]
      }
    },
    // 20. Kabupaten Bulukumba (7302)
    {
      type: 'Feature',
      properties: {
        kodeBps: '7302',
        namaKabupaten: 'KABUPATEN BULUKUMBA',
        namaSingkat: 'Bulukumba',
        tipe: 'KABUPATEN',
        ibukota: 'Ujung Bulu',
        centroid: [120.2500, -5.4800]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [120.02, -5.35],
          [120.45, -5.32],
          [120.55, -5.58],
          [120.35, -5.62],
          [120.12, -5.55],
          [120.02, -5.35]
        ]]
      }
    },
    // 21. Kabupaten Bantaeng (7303)
    {
      type: 'Feature',
      properties: {
        kodeBps: '7303',
        namaKabupaten: 'KABUPATEN BANTAENG',
        namaSingkat: 'Bantaeng',
        tipe: 'KABUPATEN',
        ibukota: 'Bantaeng',
        centroid: [119.9500, -5.5200]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [119.88, -5.42],
          [120.08, -5.40],
          [120.05, -5.58],
          [119.88, -5.60],
          [119.88, -5.42]
        ]]
      }
    },
    // 22. Kabupaten Jeneponto (7304)
    {
      type: 'Feature',
      properties: {
        kodeBps: '7304',
        namaKabupaten: 'KABUPATEN JENEPONTO',
        namaSingkat: 'Jeneponto',
        tipe: 'KABUPATEN',
        ibukota: 'Binamu',
        centroid: [119.7200, -5.6500]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [119.55, -5.52],
          [119.88, -5.50],
          [119.85, -5.72],
          [119.62, -5.75],
          [119.55, -5.62],
          [119.55, -5.52]
        ]]
      }
    },
    // 23. Kabupaten Takalar (7305)
    {
      type: 'Feature',
      properties: {
        kodeBps: '7305',
        namaKabupaten: 'KABUPATEN TAKALAR',
        namaSingkat: 'Takalar',
        tipe: 'KABUPATEN',
        ibukota: 'Pattallassang',
        centroid: [119.4500, -5.4200]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [119.38, -5.28],
          [119.55, -5.32],
          [119.55, -5.58],
          [119.35, -5.62],
          [119.32, -5.42],
          [119.38, -5.28]
        ]]
      }
    },
    // 24. Kabupaten Kepulauan Selayar (7301)
    {
      type: 'Feature',
      properties: {
        kodeBps: '7301',
        namaKabupaten: 'KABUPATEN KEPULAUAN SELAYAR',
        namaSingkat: 'Selayar',
        tipe: 'KABUPATEN',
        ibukota: 'Benteng',
        centroid: [120.4800, -6.1200]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [120.35, -5.85],
          [120.58, -5.82],
          [120.62, -6.45],
          [120.42, -6.48],
          [120.35, -6.15],
          [120.35, -5.85]
        ]]
      }
    }
  ]
};
