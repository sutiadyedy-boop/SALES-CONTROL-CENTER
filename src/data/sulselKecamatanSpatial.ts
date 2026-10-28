/**
 * Modul Spasial & Koordinat Geografis Kecamatan se-Sulawesi Selatan
 * Digunakan untuk visualisasi D3.js peta per kabupaten lengkap dengan batas kecamatan
 */

import * as d3 from 'd3';
import { BPS_SULAWESI_SELATAN_DATA } from './bpsSulselData';
import { SULSEL_GEOJSON, SulselGeoFeature, SULSEL_KABUPATEN_COORDINATES } from './sulselGeoJson';

export interface KecamatanSpatialNode {
  kodeBps: string;
  namaKecamatan: string;
  kodeKabupaten: string;
  centroid: [number, number]; // [longitude, latitude]
}

export interface KecamatanGeoFeature {
  type: 'Feature';
  properties: {
    kodeBps: string;
    namaKecamatan: string;
    kodeKabupaten: string;
    namaKabupaten: string;
    centroid: [number, number];
  };
  geometry: {
    type: 'Polygon';
    coordinates: number[][][];
  };
}

/**
 * Centroid dan sebaran spasial koordinat relatif seluruh kecamatan di Sulawesi Selatan
 */
export const KECAMATAN_SPATIAL_NODES: Record<string, [number, number]> = {
  // --- KOTA MAKASSAR (7371) ---
  '7371010': [119.49, -5.13], // Tamalanrea
  '7371020': [119.51, -5.10], // Biringkanaya
  '7371030': [119.45, -5.14], // Panakkukang
  '7371040': [119.44, -5.17], // Rappocini
  '7371050': [119.49, -5.17], // Manggala
  '7371060': [119.41, -5.13], // Ujung Pandang
  '7371070': [119.42, -5.14], // Makassar
  '7371080': [119.41, -5.16], // Mamajang
  '7371090': [119.40, -5.15], // Mariso
  '7371100': [119.42, -5.12], // Bontoala
  '7371110': [119.41, -5.11], // Wajo
  '7371120': [119.44, -5.11], // Tallo
  '7371130': [119.41, -5.10], // Ujung Tanah
  '7371140': [119.41, -5.18], // Tamalate
  '7371150': [119.34, -5.05], // Kepulauan Sangkarrang

  // --- KABUPATEN BONE (7308) ---
  '7308010': [120.32, -4.54], // Tanete Riattang (Watampone Pusat)
  '7308020': [120.28, -4.53], // Tanete Riattang Barat
  '7308030': [120.35, -4.55], // Tanete Riattang Timur (Pelabuhan Bajoe)
  '7308040': [120.24, -4.55], // Palakka
  '7308050': [120.33, -4.48], // Awangpone
  '7308060': [120.28, -4.42], // Tellu Siattinge
  '7308070': [120.15, -4.46], // Amali
  '7308080': [120.31, -4.72], // Mare
  '7308090': [120.33, -4.61], // Barebbo
  '7308100': [120.36, -4.68], // Sibulue
  '7308110': [120.22, -4.67], // Cina
  '7308120': [120.08, -4.68], // Ponre
  '7308130': [120.05, -4.56], // Lappariaja
  '7308140': [119.98, -4.52], // Lamuru
  '7308150': [119.95, -4.62], // Bengo
  '7308160': [120.04, -4.78], // Libureng (Camming)
  '7308170': [120.18, -4.85], // Kahu
  '7308180': [120.12, -4.92], // Patimpeng
  '7308190': [120.32, -4.92], // Kajuara
  '7308200': [120.35, -4.84], // Salomekko
  '7308210': [120.34, -4.78], // Tonra
  '7308220': [119.92, -4.88], // Bontocani
  '7308230': [120.26, -4.36], // Dua Boccoe
  '7308240': [120.21, -4.32], // Ajangale
  '7308250': [120.35, -4.38], // Cenrana
  '7308260': [120.16, -4.52], // Ulaweng
  '7308270': [120.28, -4.82], // Tellulimpoe

  // --- KABUPATEN GOWA (7306) ---
  '7306010': [119.46, -5.20], // Somba Opu (Sungguminasa)
  '7306020': [119.47, -5.25], // Pallangga
  '7306030': [119.45, -5.31], // Bajeng
  '7306040': [119.40, -5.32], // Bajeng Barat
  '7306050': [119.55, -5.22], // Bontomarannu
  '7306060': [119.56, -5.16], // Pattallassang
  '7306070': [119.40, -5.24], // Barombong
  '7306080': [119.46, -5.38], // Bontonompo
  '7306090': [119.44, -5.44], // Bontonompo Selatan
  '7306100': [119.64, -5.26], // Parangloe
  '7306110': [119.86, -5.25], // Tinggimoncong (Malino)
  '7306120': [119.92, -5.22], // Tombolo Pao
  '7306130': [119.88, -5.36], // Tompobulu
  '7306140': [119.78, -5.42], // Biringbulu
  '7306150': [119.72, -5.34], // Bungaya
  '7306160': [119.82, -5.28], // Parigi
  '7306170': [119.66, -5.32], // Manuju
  '7306180': [119.68, -5.42], // Bontolempangan

  // --- KABUPATEN MAROS (7309) ---
  '7309010': [119.58, -5.00], // Turikale
  '7309020': [119.54, -5.07], // Mandai
  '7309030': [119.50, -5.04], // Marusu
  '7309040': [119.56, -4.95], // Lau
  '7309050': [119.52, -4.92], // Bontoa
  '7309060': [119.66, -4.98], // Bantimurung
  '7309070': [119.62, -5.08], // Tanralili
  '7309080': [119.64, -5.02], // Simbang
  '7309090': [119.54, -5.11], // Moncongloe
  '7309100': [119.78, -4.90], // Camba
  '7309110': [119.82, -4.85], // Cenrana
  '7309120': [119.86, -4.95], // Mallawa
  '7309130': [119.74, -5.12], // Tompobulu
  '7309140': [119.54, -4.98], // Maros Baru

  // --- KABUPATEN BULUKUMBA (7302) ---
  '7302010': [120.19, -5.55], // Ujung Bulu
  '7302020': [120.14, -5.52], // Gantarang
  '7302030': [120.12, -5.35], // Bulukumpa
  '7302040': [120.16, -5.42], // Rilau Ale
  '7302050': [120.04, -5.45], // Kindang
  '7302060': [120.45, -5.56], // Bontobahari (Bira)
  '7302070': [120.40, -5.48], // Bontotiro
  '7302080': [120.30, -5.52], // Hero Lange-Lange
  '7302090': [120.35, -5.38], // Kajang
  '7302100': [120.24, -5.50], // Ujung Loe

  // --- KABUPATEN SINJAI (7307) ---
  '7307010': [120.25, -5.12], // Sinjai Utara
  '7307020': [120.26, -5.16], // Sinjai Timur
  '7307030': [120.22, -5.28], // Sinjai Selatan
  '7307040': [120.05, -5.18], // Sinjai Barat
  '7307050': [120.14, -5.20], // Sinjai Tengah
  '7307060': [120.10, -5.28], // Sinjai Borong
  '7307070': [120.18, -5.08], // Bulupoddo
  '7307080': [120.28, -5.22], // Tellu Limpoe
  '7307090': [120.42, -5.15], // Pulau Sembilan

  // --- KABUPATEN WAJO (7313) ---
  '7313010': [120.03, -4.13], // Tempe (Sengkang)
  '7313020': [120.12, -4.20], // Pammana
  '7313030': [120.02, -4.08], // Tanasitolo
  '7313040': [119.98, -3.98], // Maniangpajo
  '7313050': [119.92, -4.06], // Belawa
  '7313060': [120.38, -4.08], // Sajoanging
  '7313070': [120.35, -4.15], // Penrang
  '7313080': [120.15, -4.05], // Majauleng
  '7313090': [120.25, -3.95], // Gilireng
  '7313100': [120.42, -3.85], // Pitumpanua (Siwa)
  '7313110': [120.38, -3.72], // Keera
  '7313120': [120.22, -4.24], // Takkalalla
  '7313130': [120.28, -4.28], // Bola
  '7313140': [120.00, -4.22], // Sabbangparu

  // --- KABUPATEN SOPPENG (7312) ---
  '7312010': [119.88, -4.35], // Lalabata (Watansoppeng)
  '7312020': [119.88, -4.18], // Marioriawa
  '7312030': [119.82, -4.26], // Donri Donri
  '7312040': [119.92, -4.48], // Marioriwawo
  '7312050': [119.95, -4.38], // Liliriaja
  '7312060': [120.02, -4.34], // Lilirilau
  '7312070': [119.82, -4.46], // Citta
  '7312080': [119.86, -4.28], // Ganra

  // --- KOTA PAREPARE (7372) ---
  '7372010': [119.62, -4.01], // Ujung
  '7372020': [119.64, -3.98], // Soreang
  '7372030': [119.62, -4.05], // Bacukiki Barat
  '7372040': [119.66, -4.03], // Bacukiki

  // --- KABUPATEN PINRANG (7315) ---
  '7315010': [119.65, -3.78], // Watang Sawitto
  '7315020': [119.67, -3.75], // Paleteang
  '7315030': [119.72, -3.82], // Tiroang
  '7315040': [119.62, -3.85], // Mattiro Bulu
  '7315050': [119.56, -3.84], // Mattiro Sompe
  '7315060': [119.58, -3.92], // Suppa
  '7315070': [119.68, -3.65], // Patampanua
  '7315080': [119.55, -3.74], // Cempa
  '7315090': [119.65, -3.55], // Duampanua
  '7315100': [119.72, -3.52], // Batulappa
  '7315110': [119.52, -3.80], // Lanrisang
  '7315120': [119.58, -3.42], // Lembang

  // --- KABUPATEN SIDENRENG RAPPANG (7314) ---
  '7314010': [119.82, -3.92], // Maritengngae
  '7314020': [119.82, -3.85], // Panca Rijang
  '7314030': [119.76, -3.88], // Baranti
  '7314040': [119.84, -3.78], // Kulo
  '7314050': [119.88, -3.98], // Tellu Limpoe
  '7314060': [119.78, -3.98], // Watang Pulu
  '7314070': [120.02, -3.92], // Dua Pitue
  '7314080': [120.04, -3.82], // Pitu Riawa
  '7314090': [120.12, -3.75], // Pitu Riase
  '7314100': [119.92, -3.95], // Watang Sidenreng
  '7314110': [119.98, -4.04], // Panca Lautang
};

/**
 * Menghasilkan FeatureCollection GeoJSON untuk seluruh kecamatan pada kabupaten terpilih
 * menggunakan proyeksi spasial bounded Voronoi D3
 */
export function generateKecamatanFeatures(kabupatenCode: string): KecamatanGeoFeature[] {
  const kabData = BPS_SULAWESI_SELATAN_DATA.find(k => k.kodeBps === kabupatenCode);
  if (!kabData) return [];

  const kabGeoFeature = SULSEL_GEOJSON.features.find(f => f.properties.kodeBps === kabupatenCode);
  const kabCentroid = SULSEL_KABUPATEN_COORDINATES[kabupatenCode]?.centroid || [120.0, -4.0];

  const kecamatanList = kabData.kecamatanList;
  const count = kecamatanList.length;
  if (count === 0) return [];

  // Hitung bounding box dari koordinat poligon kabupaten
  let minLon = 180, maxLon = -180, minLat = 90, maxLat = -90;
  if (kabGeoFeature) {
    const coords = (kabGeoFeature.geometry.coordinates[0] as number[][]);
    for (const [lon, lat] of coords) {
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
  } else {
    minLon = kabCentroid[0] - 0.25;
    maxLon = kabCentroid[0] + 0.25;
    minLat = kabCentroid[1] - 0.25;
    maxLat = kabCentroid[1] + 0.25;
  }

  // Tentukan centroid tiap kecamatan
  const points: [number, number][] = [];
  const validKecamatans: { kec: typeof kecamatanList[0]; centroid: [number, number] }[] = [];

  kecamatanList.forEach((kec, idx) => {
    let centroid = KECAMATAN_SPATIAL_NODES[kec.kodeBps];
    if (!centroid) {
      // Distribusikan secara radial parametrik di dalam bounding box kabupaten jika belum ada koordinat manual
      const angle = (idx / count) * 2 * Math.PI;
      const radiusLon = (maxLon - minLon) * 0.35 * (0.4 + (idx % 3) * 0.28);
      const radiusLat = (maxLat - minLat) * 0.35 * (0.4 + (idx % 3) * 0.28);
      centroid = [
        kabCentroid[0] + Math.cos(angle) * radiusLon,
        kabCentroid[1] + Math.sin(angle) * radiusLat,
      ];
    }
    points.push(centroid);
    validKecamatans.push({ kec, centroid });
  });

  // Buat diagram Voronoi menggunakan D3 Delaunay
  const padding = 0.05;
  const delaunay = d3.Delaunay.from(points);
  const voronoi = delaunay.voronoi([
    minLon - padding,
    minLat - padding,
    maxLon + padding,
    maxLat + padding,
  ]);

  const features: KecamatanGeoFeature[] = [];

  for (let i = 0; i < points.length; i++) {
    const cell = voronoi.cellPolygon(i);
    const { kec, centroid } = validKecamatans[i];

    let coordinates: number[][][] = [];
    if (cell && cell.length >= 3) {
      // Pastikan poligon tertutup
      const closedCell = [...cell];
      if (
        closedCell[0][0] !== closedCell[closedCell.length - 1][0] ||
        closedCell[0][1] !== closedCell[closedCell.length - 1][1]
      ) {
        closedCell.push([closedCell[0][0], closedCell[0][1]]);
      }
      coordinates = [closedCell];
    } else {
      // Fallback octagonal cell
      const rLon = (maxLon - minLon) / (Math.sqrt(count) * 2.5);
      const rLat = (maxLat - minLat) / (Math.sqrt(count) * 2.5);
      const oct: number[][] = [];
      for (let a = 0; a < 8; a++) {
        const rad = (a / 8) * 2 * Math.PI;
        oct.push([centroid[0] + Math.cos(rad) * rLon, centroid[1] + Math.sin(rad) * rLat]);
      }
      oct.push([...oct[0]]);
      coordinates = [oct];
    }

    features.push({
      type: 'Feature',
      properties: {
        kodeBps: kec.kodeBps,
        namaKecamatan: kec.namaKecamatan,
        kodeKabupaten: kabupatenCode,
        namaKabupaten: kabData.namaKabupaten,
        centroid,
      },
      geometry: {
        type: 'Polygon',
        coordinates,
      },
    });
  }

  return features;
}
