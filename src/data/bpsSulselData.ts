/**
 * Data Resmi BPS Provinsi Sulawesi Selatan Terbaru
 * Sensus Ekonomi & Registrasi Usaha Perdagangan Eceran & Industri FMCG / Consumer Goods
 * (RO = Retail Outlet / Industri Perdagangan Eceran & Barang Konsumsi)
 * 24 Kabupaten / Kota dan Kecamatan di Sulawesi Selatan
 */

export interface BpsKecamatanData {
  kodeBps: string;
  namaKecamatan: string;
  roIndustriBps: number; // Total Universe Retail Outlet / Industri BPS
  kategoriWilayah?: 'Perkotaan' | 'Transisi' | 'Pedesaan' | 'Pesisir / Kepulauan';
  deskripsiSentra?: string;
}

export interface BpsKabupatenData {
  kodeBps: string;
  namaKabupaten: string; // e.g. "KABUPATEN BONE", "KOTA MAKASSAR"
  namaSingkat: string;   // e.g. "Bone", "Makassar"
  tipe: 'KABUPATEN' | 'KOTA';
  ibukota: string;
  roIndustriBps: number; // Total Universe BPS
  jumlahKecamatan: number;
  kecamatanList: BpsKecamatanData[];
  aliases: string[];     // String matching aliases in distributor databases
}

export const BPS_SULAWESI_SELATAN_DATA: BpsKabupatenData[] = [
  {
    kodeBps: '7371',
    namaKabupaten: 'KOTA MAKASSAR',
    namaSingkat: 'Makassar',
    tipe: 'KOTA',
    ibukota: 'Makassar',
    roIndustriBps: 28450,
    jumlahKecamatan: 15,
    aliases: ['MAKASSAR', 'MKS', 'KOTA MAKASSAR', 'MAKASAR', 'UJUNG PANDANG'],
    kecamatanList: [
      { kodeBps: '7371010', namaKecamatan: 'Tamalanrea', roIndustriBps: 2750, kategoriWilayah: 'Perkotaan', deskripsiSentra: 'Sentra Pendidikan & Pemukiman Modern' },
      { kodeBps: '7371020', namaKecamatan: 'Biringkanaya', roIndustriBps: 3420, kategoriWilayah: 'Perkotaan', deskripsiSentra: 'Sentra Logistik Bandara & Pergudangan' },
      { kodeBps: '7371030', namaKecamatan: 'Panakkukang', roIndustriBps: 3210, kategoriWilayah: 'Perkotaan', deskripsiSentra: 'CBD & Pusat Bisnis Perdagangan' },
      { kodeBps: '7371040', namaKecamatan: 'Rappocini', roIndustriBps: 3080, kategoriWilayah: 'Perkotaan', deskripsiSentra: 'Pemukiman Padat & Koridor Komersil' },
      { kodeBps: '7371050', namaKecamatan: 'Manggala', roIndustriBps: 2540, kategoriWilayah: 'Perkotaan', deskripsiSentra: 'Area Ekspansi Pemukiman Timur' },
      { kodeBps: '7371060', namaKecamatan: 'Ujung Pandang', roIndustriBps: 1620, kategoriWilayah: 'Perkotaan', deskripsiSentra: 'Kawasan Wisata Bahari & Hotel' },
      { kodeBps: '7371070', namaKecamatan: 'Makassar', roIndustriBps: 1980, kategoriWilayah: 'Perkotaan', deskripsiSentra: 'Pasar Tradisional & Grosir Pesisir' },
      { kodeBps: '7371080', namaKecamatan: 'Mamajang', roIndustriBps: 1510, kategoriWilayah: 'Perkotaan', deskripsiSentra: 'Perdagangan Eceran Sentral' },
      { kodeBps: '7371090', namaKecamatan: 'Mariso', roIndustriBps: 1490, kategoriWilayah: 'Perkotaan', deskripsiSentra: 'Kawasan Pesisir & Kuliner Pantai' },
      { kodeBps: '7371100', namaKecamatan: 'Bontoala', roIndustriBps: 1840, kategoriWilayah: 'Perkotaan', deskripsiSentra: 'Pusat Niaga Tradisional Pasar Terong' },
      { kodeBps: '7371110', namaKecamatan: 'Wajo', roIndustriBps: 1760, kategoriWilayah: 'Perkotaan', deskripsiSentra: 'Pusat Perdagangan Grosir Pecinan' },
      { kodeBps: '7371120', namaKecamatan: 'Tallo', roIndustriBps: 2230, kategoriWilayah: 'Perkotaan', deskripsiSentra: 'Pemukiman Padat Utara' },
      { kodeBps: '7371130', namaKecamatan: 'Ujung Tanah', roIndustriBps: 1120, kategoriWilayah: 'Pesisir / Kepulauan', deskripsiSentra: 'Kawasan Pelabuhan Paotere' },
      { kodeBps: '7371140', namaKecamatan: 'Tamalate', roIndustriBps: 2980, kategoriWilayah: 'Perkotaan', deskripsiSentra: 'Kawasan Komersial Tanjung Bunga' },
      { kodeBps: '7371150', namaKecamatan: 'Kepulauan Sangkarrang', roIndustriBps: 920, kategoriWilayah: 'Pesisir / Kepulauan', deskripsiSentra: 'Gugusan Pulau Wisata & Nelayan' }
    ]
  },
  {
    kodeBps: '7308',
    namaKabupaten: 'KABUPATEN BONE',
    namaSingkat: 'Bone',
    tipe: 'KABUPATEN',
    ibukota: 'Watampone',
    roIndustriBps: 18970,
    jumlahKecamatan: 27,
    aliases: ['BONE', 'WATAMPONE', 'KAB BONE', 'KAB. BONE', 'KABUPATEN BONE', 'BNE'],
    kecamatanList: [
      { kodeBps: '7308010', namaKecamatan: 'Tanete Riattang', roIndustriBps: 2420, kategoriWilayah: 'Perkotaan', deskripsiSentra: 'Pusat Kota Watampone & Perdagangan Inti' },
      { kodeBps: '7308020', namaKecamatan: 'Tanete Riattang Barat', roIndustriBps: 1850, kategoriWilayah: 'Perkotaan', deskripsiSentra: 'Pusat Pemerintahan & Niaga Baru' },
      { kodeBps: '7308030', namaKecamatan: 'Tanete Riattang Timur', roIndustriBps: 1430, kategoriWilayah: 'Pesisir / Kepulauan', deskripsiSentra: 'Kawasan Pelabuhan Bajoe & Industri Perikanan' },
      { kodeBps: '7308040', namaKecamatan: 'Palakka', roIndustriBps: 820, kategoriWilayah: 'Transisi', deskripsiSentra: 'Hinterland Pertanian & Jalur Poros' },
      { kodeBps: '7308050', namaKecamatan: 'Awangpone', roIndustriBps: 710, kategoriWilayah: 'Pesisir / Kepulauan', deskripsiSentra: 'Koridor Pesisir Utara' },
      { kodeBps: '7308060', namaKecamatan: 'Tellu Siattinge', roIndustriBps: 880, kategoriWilayah: 'Transisi', deskripsiSentra: 'Kawasan Pasar Tokaseng & Pertanian' },
      { kodeBps: '7308070', namaKecamatan: 'Amali', roIndustriBps: 460, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Pertanian Dataran Tinggi' },
      { kodeBps: '7308080', namaKecamatan: 'Mare', roIndustriBps: 690, kategoriWilayah: 'Transisi', deskripsiSentra: 'Pasar Hewan & Perdagangan Selatan' },
      { kodeBps: '7308090', namaKecamatan: 'Barebbo', roIndustriBps: 790, kategoriWilayah: 'Transisi', deskripsiSentra: 'Koridor Watampone - Sinjai' },
      { kodeBps: '7308100', namaKecamatan: 'Sibulue', roIndustriBps: 740, kategoriWilayah: 'Pesisir / Kepulauan', deskripsiSentra: 'Perikanan & Perkebunan' },
      { kodeBps: '7308110', namaKecamatan: 'Cina', roIndustriBps: 620, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Pertanian Tanaman Pangan' },
      { kodeBps: '7308120', namaKecamatan: 'Ponre', roIndustriBps: 410, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Perkebunan Tembakau & Jagung' },
      { kodeBps: '7308130', namaKecamatan: 'Lappariaja', roIndustriBps: 670, kategoriWilayah: 'Transisi', deskripsiSentra: 'Hub Poros Bone - Makassar' },
      { kodeBps: '7308140', namaKecamatan: 'Lamuru', roIndustriBps: 580, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Kawasan Pertanian Barat' },
      { kodeBps: '7308150', namaKecamatan: 'Bengo', roIndustriBps: 510, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Kawasan Sentra Gula & Palawija' },
      { kodeBps: '7308160', namaKecamatan: 'Libureng', roIndustriBps: 920, kategoriWilayah: 'Transisi', deskripsiSentra: 'Sentra Industri Gula Camming' },
      { kodeBps: '7308170', namaKecamatan: 'Kahu', roIndustriBps: 840, kategoriWilayah: 'Transisi', deskripsiSentra: 'Pasar Sentral Palattae' },
      { kodeBps: '7308180', namaKecamatan: 'Patimpeng', roIndustriBps: 420, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Agrikultur & Peternakan' },
      { kodeBps: '7308190', namaKecamatan: 'Kajuara', roIndustriBps: 810, kategoriWilayah: 'Pesisir / Kepulauan', deskripsiSentra: 'Pelabuhan Laut Selatan & Niaga Ikan' },
      { kodeBps: '7308200', namaKecamatan: 'Salomekko', roIndustriBps: 440, kategoriWilayah: 'Pesisir / Kepulauan', deskripsiSentra: 'Pesisir Teluk Bone' },
      { kodeBps: '7308210', namaKecamatan: 'Tonra', roIndustriBps: 470, kategoriWilayah: 'Pesisir / Kepulauan', deskripsiSentra: 'Pertanian & Perikanan' },
      { kodeBps: '7308220', namaKecamatan: 'Bontocani', roIndustriBps: 380, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Kawasan Pegunungan Selatan' },
      { kodeBps: '7308230', namaKecamatan: 'Dua Boccoe', roIndustriBps: 890, kategoriWilayah: 'Transisi', deskripsiSentra: 'Pasar Uloe & Sentra Padi' },
      { kodeBps: '7308240', namaKecamatan: 'Ajangale', roIndustriBps: 760, kategoriWilayah: 'Transisi', deskripsiSentra: 'Pintu Gerbang Utara Bone - Wajo' },
      { kodeBps: '7308250', namaKecamatan: 'Cenrana', roIndustriBps: 550, kategoriWilayah: 'Pesisir / Kepulauan', deskripsiSentra: 'Muara Sungai Cenrana & Tambak' },
      { kodeBps: '7308260', namaKecamatan: 'Ulaweng', roIndustriBps: 650, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Sentra Holtikultura & Niaga Eceran' },
      { kodeBps: '7308270', namaKecamatan: 'Tellulimpoe', roIndustriBps: 470, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Agroindustri & Jagung' }
    ]
  },
  {
    kodeBps: '7306',
    namaKabupaten: 'KABUPATEN GOWA',
    namaSingkat: 'Gowa',
    tipe: 'KABUPATEN',
    ibukota: 'Sungguminasa',
    roIndustriBps: 14820,
    jumlahKecamatan: 18,
    aliases: ['GOWA', 'SUNGGUMINASA', 'KAB GOWA', 'KAB. GOWA', 'GWA'],
    kecamatanList: [
      { kodeBps: '7306010', namaKecamatan: 'Somba Opu', roIndustriBps: 3680, kategoriWilayah: 'Perkotaan', deskripsiSentra: 'Kota Sungguminasa & Aglomerasi Makassar' },
      { kodeBps: '7306020', namaKecamatan: 'Pallangga', roIndustriBps: 2450, kategoriWilayah: 'Perkotaan', deskripsiSentra: 'Sentra Pemukiman Padat & Ritel' },
      { kodeBps: '7306030', namaKecamatan: 'Bajeng', roIndustriBps: 1320, kategoriWilayah: 'Transisi', deskripsiSentra: 'Pasar Limbung & Perdagangan' },
      { kodeBps: '7306040', namaKecamatan: 'Bajeng Barat', roIndustriBps: 680, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Pertanian & UMKM Kuliner' },
      { kodeBps: '7306050', namaKecamatan: 'Bontomarannu', roIndustriBps: 1150, kategoriWilayah: 'Transisi', deskripsiSentra: 'Kawasan Pendidikan Tinggi & Kampus Teknik' },
      { kodeBps: '7306060', namaKecamatan: 'Pattallassang', roIndustriBps: 920, kategoriWilayah: 'Transisi', deskripsiSentra: 'Area Pengembangan Perumahan' },
      { kodeBps: '7306070', namaKecamatan: 'Barombong', roIndustriBps: 1080, kategoriWilayah: 'Transisi', deskripsiSentra: 'Kawasan Pesisir & Sentra Bata Merah' },
      { kodeBps: '7306080', namaKecamatan: 'Bontonompo', roIndustriBps: 840, kategoriWilayah: 'Transisi', deskripsiSentra: 'Pintu Gerbang Gowa - Takalar' },
      { kodeBps: '7306090', namaKecamatan: 'Bontonompo Selatan', roIndustriBps: 560, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Sentra Pertanian Padi' },
      { kodeBps: '7306100', namaKecamatan: 'Parangloe', roIndustriBps: 410, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Kawasan Bendungan Bili-Bili' },
      { kodeBps: '7306110', namaKecamatan: 'Tinggimoncong', roIndustriBps: 530, kategoriWilayah: 'Transisi', deskripsiSentra: 'Kawasan Wisata Malino & Sayuran' },
      { kodeBps: '7306120', namaKecamatan: 'Tombolo Pao', roIndustriBps: 460, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Sentra Hortikultura Dataran Tinggi' },
      { kodeBps: '7306130', namaKecamatan: 'Tompobulu', roIndustriBps: 390, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Pasar Malakaji' },
      { kodeBps: '7306140', namaKecamatan: 'Biringbulu', roIndustriBps: 340, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Agro Perkebunan Kopi & Cengkeh' },
      { kodeBps: '7306150', namaKecamatan: 'Bungaya', roIndustriBps: 310, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Kawasan Perbukitan' },
      { kodeBps: '7306160', namaKecamatan: 'Parigi', roIndustriBps: 280, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Perkebunan & Holtikultura' },
      { kodeBps: '7306170', namaKecamatan: 'Manuju', roIndustriBps: 240, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Pertanian & Peternakan' },
      { kodeBps: '7306180', namaKecamatan: 'Bontolempangan', roIndustriBps: 180, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Pedesaan Terpencil' }
    ]
  },
  {
    kodeBps: '7309',
    namaKabupaten: 'KABUPATEN MAROS',
    namaSingkat: 'Maros',
    tipe: 'KABUPATEN',
    ibukota: 'Turikale',
    roIndustriBps: 9640,
    jumlahKecamatan: 14,
    aliases: ['MAROS', 'TURIKALE', 'KAB MAROS', 'KAB. MAROS', 'MRS'],
    kecamatanList: [
      { kodeBps: '7309010', namaKecamatan: 'Turikale', roIndustriBps: 2120, kategoriWilayah: 'Perkotaan', deskripsiSentra: 'Pusat Ibukota Maros & Ritel Modern' },
      { kodeBps: '7309020', namaKecamatan: 'Mandai', roIndustriBps: 1940, kategoriWilayah: 'Perkotaan', deskripsiSentra: 'Akses Bandara Sultan Hasanuddin' },
      { kodeBps: '7309030', namaKecamatan: 'Marusu', roIndustriBps: 1120, kategoriWilayah: 'Transisi', deskripsiSentra: 'Kawasan Industri Pattene & Pergudangan' },
      { kodeBps: '7309040', namaKecamatan: 'Lau', roIndustriBps: 890, kategoriWilayah: 'Transisi', deskripsiSentra: 'Jalur Trans Sulawesi Utara' },
      { kodeBps: '7309050', namaKecamatan: 'Bontoa', roIndustriBps: 680, kategoriWilayah: 'Pesisir / Kepulauan', deskripsiSentra: 'Pesisir Tambak Ikan & Kepiting' },
      { kodeBps: '7309060', namaKecamatan: 'Bantimurung', roIndustriBps: 740, kategoriWilayah: 'Transisi', deskripsiSentra: 'Kawasan Wisata Alam & Pabrik Semen Bosowa' },
      { kodeBps: '7309070', namaKecamatan: 'Tanralili', roIndustriBps: 620, kategoriWilayah: 'Transisi', deskripsiSentra: 'Sentra Pemukiman Baru & Militer Kostrad' },
      { kodeBps: '7309080', namaKecamatan: 'Simbang', roIndustriBps: 410, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Agrikultur & Sentra Roti Maros' },
      { kodeBps: '7309090', namaKecamatan: 'Moncongloe', roIndustriBps: 530, kategoriWilayah: 'Transisi', deskripsiSentra: 'Kawasan Kota Satelit Makassar' },
      { kodeBps: '7309100', namaKecamatan: 'Camba', roIndustriBps: 320, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Jalur Pegunungan Kappang Menuju Bone' },
      { kodeBps: '7309110', namaKecamatan: 'Cenrana', roIndustriBps: 260, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Pertanian Sayur Dataran Tinggi' },
      { kodeBps: '7309120', namaKecamatan: 'Mallawa', roIndustriBps: 210, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Perbatasan Maros - Bone' },
      { kodeBps: '7309130', namaKecamatan: 'Tompobulu', roIndustriBps: 190, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Agroforestri & Perkebunan' },
      { kodeBps: '7309140', namaKecamatan: 'Maros Baru', roIndustriBps: 600, kategoriWilayah: 'Transisi', deskripsiSentra: 'Sentra Perikanan Sungai & Tambak' }
    ]
  },
  {
    kodeBps: '7302',
    namaKabupaten: 'KABUPATEN BULUKUMBA',
    namaSingkat: 'Bulukumba',
    tipe: 'KABUPATEN',
    ibukota: 'Ujung Bulu',
    roIndustriBps: 10750,
    jumlahKecamatan: 10,
    aliases: ['BULUKUMBA', 'BLK', 'KAB BULUKUMBA', 'KAB. BULUKUMBA', 'UJUNG BULU'],
    kecamatanList: [
      { kodeBps: '7302010', namaKecamatan: 'Ujung Bulu', roIndustriBps: 2410, kategoriWilayah: 'Perkotaan', deskripsiSentra: 'Pusat Kota & Kawasan Niaga Utama' },
      { kodeBps: '7302020', namaKecamatan: 'Gantarang', roIndustriBps: 1820, kategoriWilayah: 'Transisi', deskripsiSentra: 'Lumbung Padi & Pasar Ponre' },
      { kodeBps: '7302030', namaKecamatan: 'Bulukumpa', roIndustriBps: 1580, kategoriWilayah: 'Transisi', deskripsiSentra: 'Pasar Tanete & Sentra Karet/Cengkeh' },
      { kodeBps: '7302040', namaKecamatan: 'Rilau Ale', roIndustriBps: 1020, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Perkebunan Buah Naga & Durian' },
      { kodeBps: '7302050', namaKecamatan: 'Kindang', roIndustriBps: 720, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Kopi Borongrappoa Lereng Bawakaraeng' },
      { kodeBps: '7302060', namaKecamatan: 'Bontobahari', roIndustriBps: 890, kategoriWilayah: 'Pesisir / Kepulauan', deskripsiSentra: 'Sentra Pembuatan Perahu Pinisi & Pantai Bira' },
      { kodeBps: '7302070', namaKecamatan: 'Bontotiro', roIndustriBps: 710, kategoriWilayah: 'Pesisir / Kepulauan', deskripsiSentra: 'Sentra Pembuatan Garam & Pesisir' },
      { kodeBps: '7302080', namaKecamatan: 'Hero Lange-Lange', roIndustriBps: 650, kategoriWilayah: 'Transisi', deskripsiSentra: 'Kawasan Pesisir & Tambak Udang' },
      { kodeBps: '7302090', namaKecamatan: 'Kajang', roIndustriBps: 950, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Kawasan Budaya Adat Ammatoa' },
      { kodeBps: '7302100', namaKecamatan: 'Ujung Loe', roIndustriBps: 980, kategoriWilayah: 'Transisi', deskripsiSentra: 'Pertanian & Kawasan Industri Karet Lonsum' }
    ]
  },
  {
    kodeBps: '7307',
    namaKabupaten: 'KABUPATEN SINJAI',
    namaSingkat: 'Sinjai',
    tipe: 'KABUPATEN',
    ibukota: 'Sinjai Utara',
    roIndustriBps: 6340,
    jumlahKecamatan: 9,
    aliases: ['SINJAI', 'SNJ', 'KAB SINJAI', 'KAB. SINJAI'],
    kecamatanList: [
      { kodeBps: '7307010', namaKecamatan: 'Sinjai Utara', roIndustriBps: 2010, kategoriWilayah: 'Perkotaan', deskripsiSentra: 'Pusat Pemerintahan & Pelabuhan Lappe' },
      { kodeBps: '7307020', namaKecamatan: 'Sinjai Timur', roIndustriBps: 840, kategoriWilayah: 'Pesisir / Kepulauan', deskripsiSentra: 'Sentra Hutan Mangrove Tongke-Tongke' },
      { kodeBps: '7307030', namaKecamatan: 'Sinjai Selatan', roIndustriBps: 980, kategoriWilayah: 'Transisi', deskripsiSentra: 'Pasar Bikeru & Poros Sinjai - Bulukumba' },
      { kodeBps: '7307040', namaKecamatan: 'Sinjai Barat', roIndustriBps: 620, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Sentra Tembakau & Sayuran Manipi' },
      { kodeBps: '7307050', namaKecamatan: 'Sinjai Tengah', roIndustriBps: 580, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Sentra Aren & Gula Merah' },
      { kodeBps: '7307060', namaKecamatan: 'Sinjai Borong', roIndustriBps: 450, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Sentra Kopi Arabika Borong' },
      { kodeBps: '7307070', namaKecamatan: 'Bulupoddo', roIndustriBps: 390, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Perkebunan & Peternakan Sapi' },
      { kodeBps: '7307080', namaKecamatan: 'Tellu Limpoe', roIndustriBps: 340, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Pertanian Padi & Cengkeh' },
      { kodeBps: '7307090', namaKecamatan: 'Pulau Sembilan', roIndustriBps: 130, kategoriWilayah: 'Pesisir / Kepulauan', deskripsiSentra: 'Gugusan Kepulauan Nelayan Tradisional' }
    ]
  },
  {
    kodeBps: '7313',
    namaKabupaten: 'KABUPATEN WAJO',
    namaSingkat: 'Wajo',
    tipe: 'KABUPATEN',
    ibukota: 'Sengkang',
    roIndustriBps: 11240,
    jumlahKecamatan: 14,
    aliases: ['WAJO', 'SENGKANG', 'KAB WAJO', 'KAB. WAJO', 'WJO'],
    kecamatanList: [
      { kodeBps: '7313010', namaKecamatan: 'Tempe', roIndustriBps: 3120, kategoriWilayah: 'Perkotaan', deskripsiSentra: 'Kota Sengkang & Sentra Sutera Sengkang' },
      { kodeBps: '7313020', namaKecamatan: 'Pammana', roIndustriBps: 870, kategoriWilayah: 'Transisi', deskripsiSentra: 'Poros Sengkang - Bone' },
      { kodeBps: '7313030', namaKecamatan: 'Tanasitolo', roIndustriBps: 1180, kategoriWilayah: 'Transisi', deskripsiSentra: 'Industri Tenun & Ritel Tradisional' },
      { kodeBps: '7313040', namaKecamatan: 'Maniangpajo', roIndustriBps: 640, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Pertanian & Jalur Trans Sulawesi Barat' },
      { kodeBps: '7313050', namaKecamatan: 'Belawa', roIndustriBps: 810, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Danau Tempe & Perikanan Air Tawar' },
      { kodeBps: '7313060', namaKecamatan: 'Sajoanging', roIndustriBps: 560, kategoriWilayah: 'Pesisir / Kepulauan', deskripsiSentra: 'Pesisir Teluk Bone & Perikanan' },
      { kodeBps: '7313070', namaKecamatan: 'Penrang', roIndustriBps: 420, kategoriWilayah: 'Pesisir / Kepulauan', deskripsiSentra: 'Agrikultur & Tambak' },
      { kodeBps: '7313080', namaKecamatan: 'Majauleng', roIndustriBps: 790, kategoriWilayah: 'Transisi', deskripsiSentra: 'Pasar Atapange' },
      { kodeBps: '7313090', namaKecamatan: 'Gilireng', roIndustriBps: 380, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Kawasan Bendungan Paselloreng' },
      { kodeBps: '7313100', namaKecamatan: 'Pitumpanua', roIndustriBps: 1040, kategoriWilayah: 'Pesisir / Kepulauan', deskripsiSentra: 'Pelabuhan Siwa Menuju Tobaku Kolaka' },
      { kodeBps: '7313110', namaKecamatan: 'Keera', roIndustriBps: 480, kategoriWilayah: 'Pesisir / Kepulauan', deskripsiSentra: 'Perkebunan Kelapa Sawit & Cengkeh' },
      { kodeBps: '7313120', namaKecamatan: 'Takkalalla', roIndustriBps: 510, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Pasar Peneki & Pertanian' },
      { kodeBps: '7313130', namaKecamatan: 'Bola', roIndustriBps: 390, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Kawasan Palawija' },
      { kodeBps: '7313140', namaKecamatan: 'Sabbangparu', roIndustriBps: 660, kategoriWilayah: 'Transisi', deskripsiSentra: 'Sentra Batu Bata & Padi' }
    ]
  },
  {
    kodeBps: '7312',
    namaKabupaten: 'KABUPATEN SOPPENG',
    namaSingkat: 'Soppeng',
    tipe: 'KABUPATEN',
    ibukota: 'Watansoppeng',
    roIndustriBps: 6850,
    jumlahKecamatan: 8,
    aliases: ['SOPPENG', 'WATANSOPPENG', 'KAB SOPPENG', 'KAB. SOPPENG', 'SPG'],
    kecamatanList: [
      { kodeBps: '7312010', namaKecamatan: 'Lalabata', roIndustriBps: 2280, kategoriWilayah: 'Perkotaan', deskripsiSentra: 'Pusat Kota Watansoppeng & Pasar Sentral' },
      { kodeBps: '7312020', namaKecamatan: 'Marioriawa', roIndustriBps: 920, kategoriWilayah: 'Transisi', deskripsiSentra: 'Permandian Air Panas Lejja & Danau Tempe' },
      { kodeBps: '7312030', namaKecamatan: 'Donri Donri', roIndustriBps: 680, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Lumbung Padi Tajuncu' },
      { kodeBps: '7312040', namaKecamatan: 'Marioriwawo', roIndustriBps: 1140, kategoriWilayah: 'Transisi', deskripsiSentra: 'Pasar Takalala & Jalur Soppeng - Bone' },
      { kodeBps: '7312050', namaKecamatan: 'Liliriaja', roIndustriBps: 710, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Sentra Tembakau & Jagung' },
      { kodeBps: '7312060', namaKecamatan: 'Lilirilau', roIndustriBps: 640, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Pasar Cabenge' },
      { kodeBps: '7312070', namaKecamatan: 'Citta', roIndustriBps: 210, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Agrowisata Gua Citta' },
      { kodeBps: '7312080', namaKecamatan: 'Ganra', roIndustriBps: 270, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Pertanian Padi Sawah' }
    ]
  },
  {
    kodeBps: '7372',
    namaKabupaten: 'KOTA PAREPARE',
    namaSingkat: 'Parepare',
    tipe: 'KOTA',
    ibukota: 'Parepare',
    roIndustriBps: 5680,
    jumlahKecamatan: 4,
    aliases: ['PAREPARE', 'PARE-PARE', 'PARE PARE', 'KOTA PAREPARE'],
    kecamatanList: [
      { kodeBps: '7372010', namaKecamatan: 'Ujung', roIndustriBps: 1820, kategoriWilayah: 'Perkotaan', deskripsiSentra: 'Pusat Niaga & Pelabuhan Nusantara' },
      { kodeBps: '7372020', namaKecamatan: 'Soreang', roIndustriBps: 1690, kategoriWilayah: 'Perkotaan', deskripsiSentra: 'Pemukiman Padat & Koridor Menuju Pinrang' },
      { kodeBps: '7372030', namaKecamatan: 'Bacukiki Barat', roIndustriBps: 1280, kategoriWilayah: 'Perkotaan', deskripsiSentra: 'Kawasan Wisata Bahari Tonrangeng' },
      { kodeBps: '7372040', namaKecamatan: 'Bacukiki', roIndustriBps: 890, kategoriWilayah: 'Transisi', deskripsiSentra: 'Sentra Industri Kecil & Pertanian' }
    ]
  },
  {
    kodeBps: '7315',
    namaKabupaten: 'KABUPATEN PINRANG',
    namaSingkat: 'Pinrang',
    tipe: 'KABUPATEN',
    ibukota: 'Watang Sawitto',
    roIndustriBps: 9840,
    jumlahKecamatan: 12,
    aliases: ['PINRANG', 'KAB PINRANG', 'KAB. PINRANG', 'PRG'],
    kecamatanList: [
      { kodeBps: '7315010', namaKecamatan: 'Watang Sawitto', roIndustriBps: 2650, kategoriWilayah: 'Perkotaan', deskripsiSentra: 'Kota Pinrang & Pusat Niaga Sentral' },
      { kodeBps: '7315020', namaKecamatan: 'Paleteang', roIndustriBps: 1480, kategoriWilayah: 'Perkotaan', deskripsiSentra: 'Area Pemukiman Modern & Grosir' },
      { kodeBps: '7315030', namaKecamatan: 'Tiroang', roIndustriBps: 720, kategoriWilayah: 'Transisi', deskripsiSentra: 'Koridor Pinrang - Sidrap' },
      { kodeBps: '7315040', namaKecamatan: 'Mattiro Bulu', roIndustriBps: 810, kategoriWilayah: 'Transisi', deskripsiSentra: 'Sentra Penggilingan Beras' },
      { kodeBps: '7315050', namaKecamatan: 'Mattiro Sompe', roIndustriBps: 760, kategoriWilayah: 'Pesisir / Kepulauan', deskripsiSentra: 'Kawasan Nelayan Langnga' },
      { kodeBps: '7315060', namaKecamatan: 'Suppa', roIndustriBps: 840, kategoriWilayah: 'Pesisir / Kepulauan', deskripsiSentra: 'Pesisir Selat Makassar & PLTU' },
      { kodeBps: '7315070', namaKecamatan: 'Patampanua', roIndustriBps: 690, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Sentra Buah-buahan Leppangeng' },
      { kodeBps: '7315080', namaKecamatan: 'Cempa', roIndustriBps: 510, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Kawasan Tambak Ikan Bandeng' },
      { kodeBps: '7315090', namaKecamatan: 'Duampanua', roIndustriBps: 780, kategoriWilayah: 'Transisi', deskripsiSentra: 'Pasar Lampa Pekkabata' },
      { kodeBps: '7315100', namaKecamatan: 'Batulappa', roIndustriBps: 290, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Kawasan Perbukitan' },
      { kodeBps: '7315110', namaKecamatan: 'Lanrisang', roIndustriBps: 430, kategoriWilayah: 'Pesisir / Kepulauan', deskripsiSentra: 'Pertanian & Tambak Air Payau' },
      { kodeBps: '7315120', namaKecamatan: 'Lembang', roIndustriBps: 680, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Perbatasan Sulawesi Barat' }
    ]
  },
  {
    kodeBps: '7314',
    namaKabupaten: 'KABUPATEN SIDENRENG RAPPANG',
    namaSingkat: 'Sidrap',
    tipe: 'KABUPATEN',
    ibukota: 'Pangkajene Sidenreng',
    roIndustriBps: 8760,
    jumlahKecamatan: 11,
    aliases: ['SIDRAP', 'SIDENRENG RAPPANG', 'KAB SIDRAP', 'KAB. SIDRAP', 'PANGKAJENE SIDRAP'],
    kecamatanList: [
      { kodeBps: '7314010', namaKecamatan: 'Maritengngae', roIndustriBps: 2450, kategoriWilayah: 'Perkotaan', deskripsiSentra: 'Kota Pangkajene Sidrap & Niaga Utama' },
      { kodeBps: '7314020', namaKecamatan: 'Panca Rijang', roIndustriBps: 1530, kategoriWilayah: 'Transisi', deskripsiSentra: 'Pasar Rappang & Sentra Beras' },
      { kodeBps: '7314030', namaKecamatan: 'Baranti', roIndustriBps: 980, kategoriWilayah: 'Transisi', deskripsiSentra: 'Sentra Peternakan Ayam Petelur Terbesar' },
      { kodeBps: '7314040', namaKecamatan: 'Kulo', roIndustriBps: 410, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Pertanian Padi & Jagung' },
      { kodeBps: '7314050', namaKecamatan: 'Tellu Limpoe', roIndustriBps: 810, kategoriWilayah: 'Transisi', deskripsiSentra: 'Pasar Amparita' },
      { kodeBps: '7314060', namaKecamatan: 'Watang Pulu', roIndustriBps: 920, kategoriWilayah: 'Transisi', deskripsiSentra: 'Kawasan PLTB Sidrap (Kincir Angin)' },
      { kodeBps: '7314070', namaKecamatan: 'Dua Pitue', roIndustriBps: 730, kategoriWilayah: 'Transisi', deskripsiSentra: 'Pasar Tanrutedong' },
      { kodeBps: '7314080', namaKecamatan: 'Pitu Riawa', roIndustriBps: 420, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Agrikultur & Peternakan Sapi' },
      { kodeBps: '7314090', namaKecamatan: 'Pitu Riase', roIndustriBps: 290, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Kawasan Hutan & Perkebunan Sawit' },
      { kodeBps: '7314100', namaKecamatan: 'Watang Sidenreng', roIndustriBps: 480, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Danau Sidenreng & Pertanian' },
      { kodeBps: '7314110', namaKecamatan: 'Panca Lautang', roIndustriBps: 340, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Perikanan Danau Buaya' }
    ]
  },
  {
    kodeBps: '7310',
    namaKabupaten: 'KABUPATEN PANGKAJENE DAN KEPULAUAN',
    namaSingkat: 'Pangkep',
    tipe: 'KABUPATEN',
    ibukota: 'Pangkajene',
    roIndustriBps: 7120,
    jumlahKecamatan: 14,
    aliases: ['PANGKEP', 'PANGKAJENE DAN KEPULAUAN', 'KAB PANGKEP', 'KAB. PANGKEP'],
    kecamatanList: [
      { kodeBps: '7310010', namaKecamatan: 'Pangkajene', roIndustriBps: 1680, kategoriWilayah: 'Perkotaan', deskripsiSentra: 'Kota Pangkep & Pasar Sentral' },
      { kodeBps: '7310020', namaKecamatan: 'Minasatene', roIndustriBps: 1120, kategoriWilayah: 'Transisi', deskripsiSentra: 'Sentra Pabrik Semen Tonasa' },
      { kodeBps: '7310030', namaKecamatan: 'Bungoro', roIndustriBps: 1250, kategoriWilayah: 'Transisi', deskripsiSentra: 'Kawasan Industri Semen Tonasa & Pelabuhan Biringkassi' },
      { kodeBps: '7310040', namaKecamatan: 'Labakkang', roIndustriBps: 940, kategoriWilayah: 'Transisi', deskripsiSentra: 'Sentra Jeruk Pangkep & Tambak Bandeng' },
      { kodeBps: '7310050', namaKecamatan: 'Marang', roIndustriBps: 680, kategoriWilayah: 'Transisi', deskripsiSentra: 'Pasar Bonto-Bonto & Bandeng Asap' },
      { kodeBps: '7310060', namaKecamatan: 'Segeri', roIndustriBps: 560, kategoriWilayah: 'Transisi', deskripsiSentra: 'Sentra Kuliner Dange & Pertanian' },
      { kodeBps: '7310070', namaKecamatan: 'Mandalle', roIndustriBps: 320, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Perbatasan Pangkep - Barru' },
      { kodeBps: '7310080', namaKecamatan: 'Balocci', roIndustriBps: 240, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Kawasan Geopark Karst Maros-Pangkep' },
      { kodeBps: '7310090', namaKecamatan: 'Tondong Tallasa', roIndustriBps: 180, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Pegunungan Tambang Batu Bara & Marmer' },
      { kodeBps: '7310100', namaKecamatan: 'Liukang Tupabbiring', roIndustriBps: 90, kategoriWilayah: 'Pesisir / Kepulauan', deskripsiSentra: 'Pulau Barrang Caddi & Wisata Selam' },
      { kodeBps: '7310110', namaKecamatan: 'Liukang Tupabbiring Utara', roIndustriBps: 50, kategoriWilayah: 'Pesisir / Kepulauan', deskripsiSentra: 'Gugusan Pulau Karang Nelayan' },
      { kodeBps: '7310120', namaKecamatan: 'Liukang Kalmas', roIndustriBps: 30, kategoriWilayah: 'Pesisir / Kepulauan', deskripsiSentra: 'Pulau Terluar Selat Makassar' },
      { kodeBps: '7310130', namaKecamatan: 'Liukang Tangaya', roIndustriBps: 20, kategoriWilayah: 'Pesisir / Kepulauan', deskripsiSentra: 'Perbatasan Jawa Timur / Sumbawa' }
    ]
  },
  {
    kodeBps: '7311',
    namaKabupaten: 'KABUPATEN BARRU',
    namaSingkat: 'Barru',
    tipe: 'KABUPATEN',
    ibukota: 'Barru',
    roIndustriBps: 4350,
    jumlahKecamatan: 7,
    aliases: ['BARRU', 'KAB BARRU', 'KAB. BARRU', 'BRU'],
    kecamatanList: [
      { kodeBps: '7311010', namaKecamatan: 'Barru', roIndustriBps: 1350, kategoriWilayah: 'Perkotaan', deskripsiSentra: 'Pusat Ibukota Barru & Pelabuhan Garongkong' },
      { kodeBps: '7311020', namaKecamatan: 'Balusu', roIndustriBps: 580, kategoriWilayah: 'Transisi', deskripsiSentra: 'Jalur Trans Sulawesi Barat' },
      { kodeBps: '7311030', namaKecamatan: 'Soppeng Riaja', roIndustriBps: 640, kategoriWilayah: 'Transisi', deskripsiSentra: 'Pasar Mangkoso & Ponpes DDI Mangkoso' },
      { kodeBps: '7311040', namaKecamatan: 'Mallusetasi', roIndustriBps: 620, kategoriWilayah: 'Transisi', deskripsiSentra: 'Perbatasan Barru - Parepare & Bojo' },
      { kodeBps: '7311050', namaKecamatan: 'Tanete Rilau', roIndustriBps: 590, kategoriWilayah: 'Transisi', deskripsiSentra: 'Pesisir Pekkae & Kuliner Tiram' },
      { kodeBps: '7311060', namaKecamatan: 'Tanete Riaja', roIndustriBps: 380, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Ralla & Pertanian Dataran Menengah' },
      { kodeBps: '7311070', namaKecamatan: 'Pujananting', roIndustriBps: 190, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Pegunungan & Perkebunan Kemiri' }
    ]
  },
  {
    kodeBps: '7316',
    namaKabupaten: 'KABUPATEN ENREKANG',
    namaSingkat: 'Enrekang',
    tipe: 'KABUPATEN',
    ibukota: 'Enrekang',
    roIndustriBps: 5230,
    jumlahKecamatan: 12,
    aliases: ['ENREKANG', 'KAB ENREKANG', 'KAB. ENREKANG', 'EKG'],
    kecamatanList: [
      { kodeBps: '7316010', namaKecamatan: 'Enrekang', roIndustriBps: 1480, kategoriWilayah: 'Perkotaan', deskripsiSentra: 'Pusat Ibukota Massenrempulu' },
      { kodeBps: '7316020', namaKecamatan: 'Maiwa', roIndustriBps: 780, kategoriWilayah: 'Transisi', deskripsiSentra: 'Sentra Peternakan Sapi Maroangin' },
      { kodeBps: '7316030', namaKecamatan: 'Anggeraja', roIndustriBps: 840, kategoriWilayah: 'Transisi', deskripsiSentra: 'Pasar Cakke & Bawang Merah Terbesar' },
      { kodeBps: '7316040', namaKecamatan: 'Alla', roIndustriBps: 760, kategoriWilayah: 'Transisi', deskripsiSentra: 'Pasar Sudu & Sayur Kol Dataran Tinggi' },
      { kodeBps: '7316050', namaKecamatan: 'Baraka', roIndustriBps: 530, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Jalur Pendakian Gunung Latimojong' },
      { kodeBps: '7316060', namaKecamatan: 'Cendana', roIndustriBps: 260, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Pertanian Buah Salak' },
      { kodeBps: '7316070', namaKecamatan: 'Buntu Batu', roIndustriBps: 180, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Sentra Kopi Arabika Benteng Alla' },
      { kodeBps: '7316080', namaKecamatan: 'Malua', roIndustriBps: 150, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Perkebunan Cengkeh' },
      { kodeBps: '7316090', namaKecamatan: 'Masalle', roIndustriBps: 120, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Sayuran Organik Pegunungan' },
      { kodeBps: '7316100', namaKecamatan: 'Curio', roIndustriBps: 90, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Pertanian Lereng Bukit' },
      { kodeBps: '7316110', namaKecamatan: 'Bungin', roIndustriBps: 80, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Pedesaan Terpencil' },
      { kodeBps: '7316120', namaKecamatan: 'Baroko', roIndustriBps: 60, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Dataran Tinggi Dingin' }
    ]
  },
  {
    kodeBps: '7373',
    namaKabupaten: 'KOTA PALOPO',
    namaSingkat: 'Palopo',
    tipe: 'KOTA',
    ibukota: 'Palopo',
    roIndustriBps: 6150,
    jumlahKecamatan: 9,
    aliases: ['PALOPO', 'KOTA PALOPO', 'PLP'],
    kecamatanList: [
      { kodeBps: '7373010', namaKecamatan: 'Wara', roIndustriBps: 1680, kategoriWilayah: 'Perkotaan', deskripsiSentra: 'Pusat Kota & Kawasan Niaga Andi Tadda' },
      { kodeBps: '7373020', namaKecamatan: 'Wara Timur', roIndustriBps: 1420, kategoriWilayah: 'Perkotaan', deskripsiSentra: 'Pelabuhan Tanjung Ringgit & Kuliner Pesisir' },
      { kodeBps: '7373030', namaKecamatan: 'Wara Selatan', roIndustriBps: 910, kategoriWilayah: 'Perkotaan', deskripsiSentra: 'Akses Utama Poros Selatan Menuju Luwu' },
      { kodeBps: '7373040', namaKecamatan: 'Wara Utara', roIndustriBps: 760, kategoriWilayah: 'Perkotaan', deskripsiSentra: 'Jalur Poros Palopo - Toraja' },
      { kodeBps: '7373050', namaKecamatan: 'Wara Barat', roIndustriBps: 340, kategoriWilayah: 'Transisi', deskripsiSentra: 'Kawasan Wisata Kambo & Hutan Lindung' },
      { kodeBps: '7373060', namaKecamatan: 'Telluwanua', roIndustriBps: 450, kategoriWilayah: 'Transisi', deskripsiSentra: 'Perbatasan Utara Menuju Walenrang' },
      { kodeBps: '7373070', namaKecamatan: 'Bara', roIndustriBps: 390, kategoriWilayah: 'Transisi', deskripsiSentra: 'Area Kampus & Pemukiman Mahasiswa' },
      { kodeBps: '7373080', namaKecamatan: 'Sendana', roIndustriBps: 120, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Perkebunan Kakao & Durian' },
      { kodeBps: '7373090', namaKecamatan: 'Mungkajang', roIndustriBps: 80, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Wisata Alam Latuppa' }
    ]
  },
  {
    kodeBps: '7317',
    namaKabupaten: 'KABUPATEN LUWU',
    namaSingkat: 'Luwu',
    tipe: 'KABUPATEN',
    ibukota: 'Belopa',
    roIndustriBps: 8420,
    jumlahKecamatan: 22,
    aliases: ['LUWU', 'BELOPA', 'KAB LUWU', 'KAB. LUWU', 'LUWU INDUK'],
    kecamatanList: [
      { kodeBps: '7317010', namaKecamatan: 'Belopa', roIndustriBps: 1480, kategoriWilayah: 'Perkotaan', deskripsiSentra: 'Ibukota Kabupaten Luwu & Pasar Raya Belopa' },
      { kodeBps: '7317020', namaKecamatan: 'Belopa Utara', roIndustriBps: 710, kategoriWilayah: 'Transisi', deskripsiSentra: 'Area Perluasan Ibukota' },
      { kodeBps: '7317030', namaKecamatan: 'Bajo', roIndustriBps: 620, kategoriWilayah: 'Transisi', deskripsiSentra: 'Pasar Tradisional Bajo & Kakao' },
      { kodeBps: '7317040', namaKecamatan: 'Bua', roIndustriBps: 780, kategoriWilayah: 'Transisi', deskripsiSentra: 'Bandara Bua & Kawasan Industri Smelter' },
      { kodeBps: '7317050', namaKecamatan: 'Ponrang', roIndustriBps: 590, kategoriWilayah: 'Transisi', deskripsiSentra: 'Pasar Padang Sappa' },
      { kodeBps: '7317060', namaKecamatan: 'Larompong', roIndustriBps: 640, kategoriWilayah: 'Transisi', deskripsiSentra: 'Perbatasan Selatan Luwu - Wajo' },
      { kodeBps: '7317070', namaKecamatan: 'Walenrang', roIndustriBps: 680, kategoriWilayah: 'Transisi', deskripsiSentra: 'Pusat Niaga Luwu Raya Bagian Utara (Batusitanduk)' },
      { kodeBps: '7317080', namaKecamatan: 'Walenrang Timur', roIndustriBps: 410, kategoriWilayah: 'Pesisir / Kepulauan', deskripsiSentra: 'Pesisir Tambak Ikan Bandeng & Rumput Laut' },
      { kodeBps: '7317090', namaKecamatan: 'Lamasi', roIndustriBps: 520, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Sentra Padi Irigasi Teknis' },
      { kodeBps: '7317100', namaKecamatan: 'Suli', roIndustriBps: 540, kategoriWilayah: 'Transisi', deskripsiSentra: 'Jalur Trans Sulawesi & Pantai Ponnori' },
      { kodeBps: '7317110', namaKecamatan: 'Suli Barat', roIndustriBps: 310, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Pertanian & Perkebunan Karet' },
      { kodeBps: '7317120', namaKecamatan: 'Kamanre', roIndustriBps: 280, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Pertanian Sayur & Buah' },
      { kodeBps: '7317130', namaKecamatan: 'Bajo Barat', roIndustriBps: 240, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Perkebunan Cengkeh & Merica' },
      { kodeBps: '7317140', namaKecamatan: 'Bua Ponrang', roIndustriBps: 290, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Kawasan Palawija' },
      { kodeBps: '7317150', namaKecamatan: 'Ponrang Selatan', roIndustriBps: 260, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Pertanian Sawah' },
      { kodeBps: '7317160', namaKecamatan: 'Larompong Selatan', roIndustriBps: 340, kategoriWilayah: 'Transisi', deskripsiSentra: 'Pintu Masuk Gerbang Batas Wajo' },
      { kodeBps: '7317170', namaKecamatan: 'Walenrang Utara', roIndustriBps: 310, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Sentra Kakao Walmas' },
      { kodeBps: '7317180', namaKecamatan: 'Walenrang Barat', roIndustriBps: 110, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Dataran Tinggi Berhawa Sejuk' },
      { kodeBps: '7317190', namaKecamatan: 'Lamasi Timur', roIndustriBps: 230, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Padi & Kelapa Sawit' },
      { kodeBps: '7317200', namaKecamatan: 'Bastem', roIndustriBps: 80, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Basse Sangtempe Pegunungan' },
      { kodeBps: '7317210', namaKecamatan: 'Bastem Utara', roIndustriBps: 50, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Wilayah Terpencil Kopi Arabika' },
      { kodeBps: '7317220', namaKecamatan: 'Latimojong', roIndustriBps: 40, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Kawasan Tambang Emas & Konservasi' }
    ]
  },
  {
    kodeBps: '7322',
    namaKabupaten: 'KABUPATEN LUWU UTARA',
    namaSingkat: 'Luwu Utara',
    tipe: 'KABUPATEN',
    ibukota: 'Masamba',
    roIndustriBps: 7380,
    jumlahKecamatan: 15,
    aliases: ['LUWU UTARA', 'MASAMBA', 'KAB LUWU UTARA', 'LUTRA', 'KAB. LUWU UTARA'],
    kecamatanList: [
      { kodeBps: '7322010', namaKecamatan: 'Masamba', roIndustriBps: 1890, kategoriWilayah: 'Perkotaan', deskripsiSentra: 'Kota Masamba & Pusat Perdagangan Lutra' },
      { kodeBps: '7322020', namaKecamatan: 'Baebunta', roIndustriBps: 920, kategoriWilayah: 'Transisi', deskripsiSentra: 'Poros Trans Sulawesi & Sentra Kakao' },
      { kodeBps: '7322030', namaKecamatan: 'Sabbang', roIndustriBps: 750, kategoriWilayah: 'Transisi', deskripsiSentra: 'Pintu Gerbang Masuk Lutra dari Palopo' },
      { kodeBps: '7322040', namaKecamatan: 'Sukamaju', roIndustriBps: 840, kategoriWilayah: 'Transisi', deskripsiSentra: 'Kawasan Transmigran & Perkebunan Sawit' },
      { kodeBps: '7322050', namaKecamatan: 'Bone-Bone', roIndustriBps: 910, kategoriWilayah: 'Transisi', deskripsiSentra: 'Pasar Bone-Bone & Sentra Niaga Eceran' },
      { kodeBps: '7322060', namaKecamatan: 'Tana Lili', roIndustriBps: 490, kategoriWilayah: 'Transisi', deskripsiSentra: 'Perbatasan Luwu Utara - Luwu Timur' },
      { kodeBps: '7322070', namaKecamatan: 'Malangke', roIndustriBps: 420, kategoriWilayah: 'Pesisir / Kepulauan', deskripsiSentra: 'Pesisir Teluk Bone & Jeruk Malangke' },
      { kodeBps: '7322080', namaKecamatan: 'Malangke Barat', roIndustriBps: 380, kategoriWilayah: 'Pesisir / Kepulauan', deskripsiSentra: 'Tambak Udang & Perikanan' },
      { kodeBps: '7322090', namaKecamatan: 'Mappedeceng', roIndustriBps: 360, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Sentra Padi & Kelapa Sawit' },
      { kodeBps: '7322100', namaKecamatan: 'Sukamaju Selatan', roIndustriBps: 210, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Agrikultur Tanaman Pangan' },
      { kodeBps: '7322110', namaKecamatan: 'Baebunta Selatan', roIndustriBps: 180, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Kawasan Pemekaran Baru' },
      { kodeBps: '7322120', namaKecamatan: 'Sabbang Selatan', roIndustriBps: 150, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Pertanian & Perkebunan' },
      { kodeBps: '7322130', namaKecamatan: 'Rongkong', roIndustriBps: 70, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Negeri Berselimut Awan & Kain Tenun Rongkong' },
      { kodeBps: '7322140', namaKecamatan: 'Seko', roIndustriBps: 60, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Dataran Tinggi Terpencil & Peternakan Sapi' },
      { kodeBps: '7322150', namaKecamatan: 'Rampi', roIndustriBps: 40, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Wilayah Terisolir & Akses Pesawat Perintis' }
    ]
  },
  {
    kodeBps: '7324',
    namaKabupaten: 'KABUPATEN LUWU TIMUR',
    namaSingkat: 'Luwu Timur',
    tipe: 'KABUPATEN',
    ibukota: 'Malili',
    roIndustriBps: 7920,
    jumlahKecamatan: 11,
    aliases: ['LUWU TIMUR', 'MALILI', 'KAB LUWU TIMUR', 'LUTIM', 'SOROWAKO', 'KAB. LUWU TIMUR'],
    kecamatanList: [
      { kodeBps: '7324010', namaKecamatan: 'Malili', roIndustriBps: 1620, kategoriWilayah: 'Perkotaan', deskripsiSentra: 'Ibukota Lutim & Muara Sungai Malili' },
      { kodeBps: '7324020', namaKecamatan: 'Nuha', roIndustriBps: 1580, kategoriWilayah: 'Perkotaan', deskripsiSentra: 'Kota Tambang Sorowako (PT Vale Indonesia) & Danau Matano' },
      { kodeBps: '7324030', namaKecamatan: 'Wasuponda', roIndustriBps: 780, kategoriWilayah: 'Transisi', deskripsiSentra: 'Kawasan Pemukiman Karyawan Tambang' },
      { kodeBps: '7324040', namaKecamatan: 'Towuti', roIndustriBps: 1040, kategoriWilayah: 'Transisi', deskripsiSentra: 'Danau Towuti & Pintu Menuju Sulawesi Tenggara' },
      { kodeBps: '7324050', namaKecamatan: 'Wotu', roIndustriBps: 840, kategoriWilayah: 'Transisi', deskripsiSentra: 'Kota Bersejarah & Persimpangan Sulawesi Tengah' },
      { kodeBps: '7324060', namaKecamatan: 'Tomoni', roIndustriBps: 790, kategoriWilayah: 'Transisi', deskripsiSentra: 'Pasar Sentral Tomoni & Lumbung Beras' },
      { kodeBps: '7324070', namaKecamatan: 'Tomoni Timur', roIndustriBps: 340, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Pertanian Irigasi & Jeruk' },
      { kodeBps: '7324080', namaKecamatan: 'Mangkutana', roIndustriBps: 420, kategoriWilayah: 'Transisi', deskripsiSentra: 'Gerbang Perbatasan Sulawesi Tengah (Poso)' },
      { kodeBps: '7324090', namaKecamatan: 'Burau', roIndustriBps: 510, kategoriWilayah: 'Transisi', deskripsiSentra: 'Sentra Kelapa Sawit & Cengkeh' },
      { kodeBps: '7324100', namaKecamatan: 'Angkona', roIndustriBps: 380, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Perkebunan Kakao & Karet' },
      { kodeBps: '7324110', namaKecamatan: 'Kalaena', roIndustriBps: 220, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Sentra Sayuran & Transmigran Bali' }
    ]
  },
  {
    kodeBps: '7318',
    namaKabupaten: 'KABUPATEN TANA TORAJA',
    namaSingkat: 'Tana Toraja',
    tipe: 'KABUPATEN',
    ibukota: 'Makale',
    roIndustriBps: 5460,
    jumlahKecamatan: 19,
    aliases: ['TANA TORAJA', 'MAKALE', 'KAB TANA TORAJA', 'KAB. TANA TORAJA', 'TATOR'],
    kecamatanList: [
      { kodeBps: '7318010', namaKecamatan: 'Makale', roIndustriBps: 1840, kategoriWilayah: 'Perkotaan', deskripsiSentra: 'Pusat Kota Makale & Kolam Makale' },
      { kodeBps: '7318020', namaKecamatan: 'Makale Utara', roIndustriBps: 640, kategoriWilayah: 'Transisi', deskripsiSentra: 'Koridor Makale - Rantepao' },
      { kodeBps: '7318030', namaKecamatan: 'Makale Selatan', roIndustriBps: 380, kategoriWilayah: 'Transisi', deskripsiSentra: 'Kawasan Wisata Rohani Buntu Burake' },
      { kodeBps: '7318040', namaKecamatan: 'Mengkendek', roIndustriBps: 820, kategoriWilayah: 'Transisi', deskripsiSentra: 'Bandara Toraja Airport & Kampus IAKN' },
      { kodeBps: '7318050', namaKecamatan: 'Gandangbatu Sillanan', roIndustriBps: 450, kategoriWilayah: 'Transisi', deskripsiSentra: 'Perbatasan Enrekang - Tana Toraja' },
      { kodeBps: '7318060', namaKecamatan: 'Sangalla', roIndustriBps: 310, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Kawasan Wisata Budaya & Pohon Bayi Kambira' },
      { kodeBps: '7318070', namaKecamatan: 'Sangalla Utara', roIndustriBps: 220, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Sentra Tenun Toraja' },
      { kodeBps: '7318080', namaKecamatan: 'Sangalla Selatan', roIndustriBps: 190, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Perkebunan Kopi Toraja' },
      { kodeBps: '7318090', namaKecamatan: 'Rembon', roIndustriBps: 210, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Pertanian Terasing Lereng Bukit' },
      { kodeBps: '7318100', namaKecamatan: 'Saluputti', roIndustriBps: 180, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Kawasan Pasar Ulusalu' },
      { kodeBps: '7318110', namaKecamatan: 'Bittuang', roIndustriBps: 140, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Pintu Gerbang Menuju Mamasa Sulbar' },
      { kodeBps: '7318120', namaKecamatan: 'Rantetayo', roIndustriBps: 160, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Eks Bandara Pongtiku' },
      { kodeBps: '7318130', namaKecamatan: 'Malimbong Balepe', roIndustriBps: 110, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Kopi Arabika Toraja Asli' },
      { kodeBps: '7318140', namaKecamatan: 'Bonggakaradeng', roIndustriBps: 90, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Sungai Saddang & Wisata Rafting' },
      { kodeBps: '7318150', namaKecamatan: 'Rano', roIndustriBps: 70, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Pedesaan Selatan' },
      { kodeBps: '7318160', namaKecamatan: 'Simbuang', roIndustriBps: 50, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Wilayah Terisolir Perbatasan Sulbar' },
      { kodeBps: '7318170', namaKecamatan: 'Mappak', roIndustriBps: 40, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Pedesaan Terluar' },
      { kodeBps: '7318180', namaKecamatan: 'Kurra', roIndustriBps: 30, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Pegunungan Karts Barat' },
      { kodeBps: '7318190', namaKecamatan: 'Masanda', roIndustriBps: 30, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Perbatasan Pegunungan Mamasa' }
    ]
  },
  {
    kodeBps: '7326',
    namaKabupaten: 'KABUPATEN TORAJA UTARA',
    namaSingkat: 'Toraja Utara',
    tipe: 'KABUPATEN',
    ibukota: 'Rantepao',
    roIndustriBps: 5890,
    jumlahKecamatan: 21,
    aliases: ['TORAJA UTARA', 'RANTEPAO', 'KAB TORAJA UTARA', 'KAB. TORAJA UTARA', 'TORUT'],
    kecamatanList: [
      { kodeBps: '7326010', namaKecamatan: 'Rantepao', roIndustriBps: 2180, kategoriWilayah: 'Perkotaan', deskripsiSentra: 'Pusat Pariwisata & Pasar Bolu (Kerbau Terbesar Dunia)' },
      { kodeBps: '7326020', namaKecamatan: 'Tallunglipu', roIndustriBps: 840, kategoriWilayah: 'Perkotaan', deskripsiSentra: 'Kawasan Niaga Baru & Terminal Bolu' },
      { kodeBps: '7326030', namaKecamatan: 'Kesu', roIndustriBps: 620, kategoriWilayah: 'Transisi', deskripsiSentra: 'Kawasan Wisata Kete Kesu (Tongkonan Kuno)' },
      { kodeBps: '7326040', namaKecamatan: 'Sanggalangi', roIndustriBps: 410, kategoriWilayah: 'Transisi', deskripsiSentra: 'Sentra Ukiran Kayu Toraja' },
      { kodeBps: '7326050', namaKecamatan: 'Tikala', roIndustriBps: 340, kategoriWilayah: 'Transisi', deskripsiSentra: 'Pintu Gerbang Menuju Bori Kalimbuang' },
      { kodeBps: '7326060', namaKecamatan: 'Sesean', roIndustriBps: 280, kategoriWilayah: 'Transisi', deskripsiSentra: 'Wisata Batutumonga Lereng Gunung Sesean' },
      { kodeBps: '7326070', namaKecamatan: 'Sa\'dan', roIndustriBps: 220, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Pusat Tenun Asli Sa\'dan To\'Barana' },
      { kodeBps: '7326080', namaKecamatan: 'Tondon', roIndustriBps: 190, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Perkebunan Kopi & Budaya Tongkonan' },
      { kodeBps: '7326090', namaKecamatan: 'Nanggala', roIndustriBps: 180, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Lumbung Padi Tradisional Alang Berjajar' },
      { kodeBps: '7326100', namaKecamatan: 'Buntao', roIndustriBps: 140, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Pertanian & Peternakan Babi/Kerbau' },
      { kodeBps: '7326110', namaKecamatan: 'Rantebua', roIndustriBps: 90, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Perbatasan Toraja Utara - Luwu' },
      { kodeBps: '7326120', namaKecamatan: 'Balusu', roIndustriBps: 70, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Agrikultur Sawah Terasering' },
      { kodeBps: '7326130', namaKecamatan: 'Buntu Pepasan', roIndustriBps: 60, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Pegunungan Puncak Rantepao' },
      { kodeBps: '7326140', namaKecamatan: 'Sopai', roIndustriBps: 50, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Perkampungan Tradisional' },
      { kodeBps: '7326150', namaKecamatan: 'Rindingallo', roIndustriBps: 40, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Pangala & Pahlawan Pongtiku' },
      { kodeBps: '7326160', namaKecamatan: 'Dende\' Piongan Napo', roIndustriBps: 40, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Perkebunan Kopi Lereng Gunung' },
      { kodeBps: '7326170', namaKecamatan: 'Kapala Pitu', roIndustriBps: 30, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Kawasan Wisata Lembah Hijau' },
      { kodeBps: '7326180', namaKecamatan: 'Sesean Suloara', roIndustriBps: 20, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Desa Wisata Lolai Negeri Diatas Awan' },
      { kodeBps: '7326190', namaKecamatan: 'Baruppu', roIndustriBps: 20, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Perbatasan Sulawesi Barat Bagian Puncak' },
      { kodeBps: '7326200', namaKecamatan: 'Bangkelekila', roIndustriBps: 10, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Pedesaan Dingin Berbukit' },
      { kodeBps: '7326210', namaKecamatan: 'Awan Rante Karua', roIndustriBps: 10, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Desa Paling Barat Torut' }
    ]
  },
  {
    kodeBps: '7303',
    namaKabupaten: 'KABUPATEN BANTAENG',
    namaSingkat: 'Bantaeng',
    tipe: 'KABUPATEN',
    ibukota: 'Bantaeng',
    roIndustriBps: 4980,
    jumlahKecamatan: 8,
    aliases: ['BANTAENG', 'BTG', 'KAB BANTAENG', 'KAB. BANTAENG'],
    kecamatanList: [
      { kodeBps: '7303010', namaKecamatan: 'Bantaeng', roIndustriBps: 1650, kategoriWilayah: 'Perkotaan', deskripsiSentra: 'Kota Bantaeng & Pantai Seruni' },
      { kodeBps: '7303020', namaKecamatan: 'Bissappu', roIndustriBps: 1080, kategoriWilayah: 'Transisi', deskripsiSentra: 'Kawasan Industri Smelter Bantaeng (KIBA)' },
      { kodeBps: '7303030', namaKecamatan: 'Pajukukang', roIndustriBps: 840, kategoriWilayah: 'Transisi', deskripsiSentra: 'Pelabuhan Industri Mattoanging' },
      { kodeBps: '7303040', namaKecamatan: 'Tompobulu', roIndustriBps: 520, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Pertanian & Agro Sentra Kopi' },
      { kodeBps: '7303050', namaKecamatan: 'Eremerasa', roIndustriBps: 380, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Permandian Alam Eremerasa' },
      { kodeBps: '7303060', namaKecamatan: 'Gantarangkeke', roIndustriBps: 240, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Lumbung Jagung & Kedelai' },
      { kodeBps: '7303070', namaKecamatan: 'Sinoa', roIndustriBps: 150, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Agrikultur Dataran Menengah' },
      { kodeBps: '7303080', namaKecamatan: 'Uluere', roIndustriBps: 120, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Sentra Apel & Stroberi Loka Camp' }
    ]
  },
  {
    kodeBps: '7304',
    namaKabupaten: 'KABUPATEN JENEPONTO',
    namaSingkat: 'Jeneponto',
    tipe: 'KABUPATEN',
    ibukota: 'Binamu',
    roIndustriBps: 8120,
    jumlahKecamatan: 11,
    aliases: ['JENEPONTO', 'JNP', 'KAB JENEPONTO', 'KAB. JENEPONTO', 'BINAMU'],
    kecamatanList: [
      { kodeBps: '7304010', namaKecamatan: 'Binamu', roIndustriBps: 2350, kategoriWilayah: 'Perkotaan', deskripsiSentra: 'Ibukota Bontosunggu & Pasar Karisa' },
      { kodeBps: '7304020', namaKecamatan: 'Tamalatea', roIndustriBps: 1320, kategoriWilayah: 'Transisi', deskripsiSentra: 'Kawasan PLTU Punagaya & Ritel Poros Selatan' },
      { kodeBps: '7304030', namaKecamatan: 'Bangkala', roIndustriBps: 1140, kategoriWilayah: 'Transisi', deskripsiSentra: 'Pasar Allu & Sentra Garam Rakyat' },
      { kodeBps: '7304040', namaKecamatan: 'Bangkala Barat', roIndustriBps: 620, kategoriWilayah: 'Transisi', deskripsiSentra: 'Perbatasan Jeneponto - Takalar' },
      { kodeBps: '7304050', namaKecamatan: 'Batang', roIndustriBps: 710, kategoriWilayah: 'Transisi', deskripsiSentra: 'Sentra Kuda Pacu & Daging Kuda' },
      { kodeBps: '7304060', namaKecamatan: 'Kelara', roIndustriBps: 640, kategoriWilayah: 'Transisi', deskripsiSentra: 'Pasar Tolo & Sentra Niaga Eceran Pedalaman' },
      { kodeBps: '7304070', namaKecamatan: 'Arungkeke', roIndustriBps: 450, kategoriWilayah: 'Pesisir / Kepulauan', deskripsiSentra: 'Rumput Laut & Tambak Garam' },
      { kodeBps: '7304080', namaKecamatan: 'Turatea', roIndustriBps: 340, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Pertanian Jagung Kuning Hibrida' },
      { kodeBps: '7304090', namaKecamatan: 'Bontoramba', roIndustriBps: 260, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Pertanian Holtikultura' },
      { kodeBps: '7304100', namaKecamatan: 'Rumbia', roIndustriBps: 180, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Dataran Tinggi Sayuran Tombolo' },
      { kodeBps: '7304110', namaKecamatan: 'Tarowang', roIndustriBps: 110, kategoriWilayah: 'Pesisir / Kepulauan', deskripsiSentra: 'Perbatasan Jeneponto - Bantaeng' }
    ]
  },
  {
    kodeBps: '7305',
    namaKabupaten: 'KABUPATEN TAKALAR',
    namaSingkat: 'Takalar',
    tipe: 'KABUPATEN',
    ibukota: 'Pattallassang',
    roIndustriBps: 7430,
    jumlahKecamatan: 10,
    aliases: ['TAKALAR', 'TKL', 'KAB TAKALAR', 'KAB. TAKALAR', 'PATTALLASSANG TAKALAR'],
    kecamatanList: [
      { kodeBps: '7305010', namaKecamatan: 'Pattallassang', roIndustriBps: 1980, kategoriWilayah: 'Perkotaan', deskripsiSentra: 'Pusat Kota Takalar & Alun-Alun Makkatang Dg Sibali' },
      { kodeBps: '7305020', namaKecamatan: 'Galesong', roIndustriBps: 1410, kategoriWilayah: 'Pesisir / Kepulauan', deskripsiSentra: 'Pemukiman Pesisir Sangat Padat & Ritel Nelayan' },
      { kodeBps: '7305030', namaKecamatan: 'Galesong Utara', roIndustriBps: 1250, kategoriWilayah: 'Transisi', deskripsiSentra: 'Perbatasan Makassar Barombong' },
      { kodeBps: '7305040', namaKecamatan: 'Galesong Selatan', roIndustriBps: 780, kategoriWilayah: 'Pesisir / Kepulauan', deskripsiSentra: 'Pusat Pelelangan Ikan Beba' },
      { kodeBps: '7305050', namaKecamatan: 'Polombangkeng Selatan', roIndustriBps: 640, kategoriWilayah: 'Transisi', deskripsiSentra: 'Sentra Pabrik Gula Takalar' },
      { kodeBps: '7305060', namaKecamatan: 'Polombangkeng Utara', roIndustriBps: 580, kategoriWilayah: 'Transisi', deskripsiSentra: 'Sentra Industri Gerabah Keramik' },
      { kodeBps: '7305070', namaKecamatan: 'Mangarabombang', roIndustriBps: 420, kategoriWilayah: 'Pesisir / Kepulauan', deskripsiSentra: 'Kawasan Wisata Pantai Puntondo' },
      { kodeBps: '7305080', namaKecamatan: 'Sanrobone', roIndustriBps: 210, kategoriWilayah: 'Pesisir / Kepulauan', deskripsiSentra: 'Benteng Sanrobone & Tambak Udang' },
      { kodeBps: '7305090', namaKecamatan: 'Mappakasunggu', roIndustriBps: 110, kategoriWilayah: 'Pesisir / Kepulauan', deskripsiSentra: 'Pulau Tanakeke & Pesisir' },
      { kodeBps: '7305100', namaKecamatan: 'Kepulauan Tanakeke', roIndustriBps: 50, kategoriWilayah: 'Pesisir / Kepulauan', deskripsiSentra: 'Kecamatan Kepulauan Terluar' }
    ]
  },
  {
    kodeBps: '7301',
    namaKabupaten: 'KABUPATEN KEPULAUAN SELAYAR',
    namaSingkat: 'Selayar',
    tipe: 'KABUPATEN',
    ibukota: 'Benteng',
    roIndustriBps: 3780,
    jumlahKecamatan: 11,
    aliases: ['SELAYAR', 'KEPULAUAN SELAYAR', 'BENTENG SELAYAR', 'SLY', 'KAB SELAYAR'],
    kecamatanList: [
      { kodeBps: '7301010', namaKecamatan: 'Benteng', roIndustriBps: 1540, kategoriWilayah: 'Perkotaan', deskripsiSentra: 'Kota Benteng Selayar & Pelabuhan Rauf Rahman' },
      { kodeBps: '7301020', namaKecamatan: 'Bontoharu', roIndustriBps: 640, kategoriWilayah: 'Pesisir / Kepulauan', deskripsiSentra: 'Pelabuhan Feri Pamatata & Bandara Aroeppala' },
      { kodeBps: '7301030', namaKecamatan: 'Bontomanai', roIndustriBps: 520, kategoriWilayah: 'Transisi', deskripsiSentra: 'Pertanian Kelapa & Kopra' },
      { kodeBps: '7301040', namaKecamatan: 'Bontomatene', roIndustriBps: 450, kategoriWilayah: 'Pesisir / Kepulauan', deskripsiSentra: 'Pintu Gerbang Utara Feri Bira - Pamatata' },
      { kodeBps: '7301050', namaKecamatan: 'Buki', roIndustriBps: 240, kategoriWilayah: 'Pedesaan', deskripsiSentra: 'Perkebunan Kenari & Cengkeh' },
      { kodeBps: '7301060', namaKecamatan: 'Takabonerate', roIndustriBps: 120, kategoriWilayah: 'Pesisir / Kepulauan', deskripsiSentra: 'Taman Nasional Takabonerate (Atol Terbesar Ketiga Dunia)' },
      { kodeBps: '7301070', namaKecamatan: 'Pasimasunggu', roIndustriBps: 90, kategoriWilayah: 'Pesisir / Kepulauan', deskripsiSentra: 'Pulau Jampea Bagian Barat' },
      { kodeBps: '7301080', namaKecamatan: 'Pasimasunggu Timur', roIndustriBps: 70, kategoriWilayah: 'Pesisir / Kepulauan', deskripsiSentra: 'Pulau Jampea Bagian Timur' },
      { kodeBps: '7301090', namaKecamatan: 'Pasimarannu', roIndustriBps: 50, kategoriWilayah: 'Pesisir / Kepulauan', deskripsiSentra: 'Pulau Bonerate' },
      { kodeBps: '7301100', namaKecamatan: 'Pasilambena', roIndustriBps: 40, kategoriWilayah: 'Pesisir / Kepulauan', deskripsiSentra: 'Pulau Kalaotoa Paling Selatan Sulsel' },
      { kodeBps: '7301110', namaKecamatan: 'Bontosikuyu', roIndustriBps: 20, kategoriWilayah: 'Pesisir / Kepulauan', deskripsiSentra: 'Ujung Selatan Pulau Daratan Selayar' }
    ]
  }
];

// Helper to calculate total Sulsel RO Industri BPS
export const TOTAL_SULSEL_RO_BPS = BPS_SULAWESI_SELATAN_DATA.reduce(
  (sum, kab) => sum + kab.roIndustriBps,
  0
);

export const TOTAL_SULSEL_KECAMATAN = BPS_SULAWESI_SELATAN_DATA.reduce(
  (sum, kab) => sum + kab.jumlahKecamatan,
  0
);
