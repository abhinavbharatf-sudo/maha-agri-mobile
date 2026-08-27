/**
 * MAHA-AGRI Geographic Master Data
 * Complete 36 Districts of Maharashtra and their respective Talukas.
 */

export const MAHARASHTRA_DISTRICTS: string[] = [
  'Ahilyanagar (Ahmednagar)',
  'Akola',
  'Amravati',
  'Beed',
  'Bhandara',
  'Buldhana',
  'Chandrapur',
  'Chhatrapati Sambhajinagar (Aurangabad)',
  'Dharashiv (Osmanabad)',
  'Dhule',
  'Gadchiroli',
  'Gondia',
  'Hingoli',
  'Jalgaon',
  'Jalna',
  'Kolhapur',
  'Latur',
  'Mumbai City',
  'Mumbai Suburban',
  'Nagpur',
  'Nanded',
  'Nandurbar',
  'Nashik',
  'Palghar',
  'Parbhani',
  'Pune',
  'Raigad',
  'Ratnagiri',
  'Sangli',
  'Satara',
  'Sindhudurg',
  'Solapur',
  'Thane',
  'Wardha',
  'Washim',
  'Yavatmal'
];

export const DISTRICT_TALUKA_MAP: Record<string, string[]> = {
  'Ahilyanagar (Ahmednagar)': [
    'Nagar (Ahmednagar)', 'Rahata', 'Rahuri', 'Shrirampur', 'Nevasa', 'Shevgaon',
    'Pathardi', 'Jamkhed', 'Karjat', 'Shrigonda', 'Parner', 'Sangamner', 'Akole', 'Kopargaon'
  ],
  'Ahmednagar': [
    'Nagar (Ahmednagar)', 'Rahata', 'Rahuri', 'Shrirampur', 'Nevasa', 'Shevgaon',
    'Pathardi', 'Jamkhed', 'Karjat', 'Shrigonda', 'Parner', 'Sangamner', 'Akole', 'Kopargaon'
  ],
  'Akola': [
    'Akola', 'Akot', 'Telhara', 'Balapur', 'Patur', 'Murtizapur', 'Barshitakli'
  ],
  'Amravati': [
    'Amravati', 'Bhatkuli', 'Nandgaon Khandeshwar', 'Dharni (Melghat)', 'Chikhaldara',
    'Achalpur (Paratwada)', 'Chandurbazar', 'Morshi', 'Warud', 'Daryapur', 'Anjangaon Surji',
    'Chandur Railway', 'Dhamangaon Railway', 'Tiosa'
  ],
  'Beed': [
    'Beed', 'Georai', 'Majalgaon', 'Ambejogai', 'Kaij', 'Parli (Vaijnath)',
    'Patoda', 'Ashti', 'Shirur (Kasar)', 'Wadwani', 'Dharur'
  ],
  'Bhandara': [
    'Bhandara', 'Tumsar', 'Pauni', 'Mohadi', 'Sakoli', 'Lakhani', 'Lakhandur'
  ],
  'Buldhana': [
    'Buldhana', 'Chikhli', 'Deulgaon Raja', 'Jalgaon Jamod', 'Khamgaon', 'Malkapur',
    'Motala', 'Nandura', 'Sangrampur', 'Mehkar', 'Sindkhed Raja', 'Lonar', 'Shegaon'
  ],
  'Chandrapur': [
    'Chandrapur', 'Bhadravati', 'Warora', 'Chimur', 'Nagbhid', 'Bramhapuri',
    'Sindewahi', 'Mul', 'Saoli', 'Gondpipri', 'Korpurna', 'Rajura', 'Ballarpur', 'Pombhurna', 'Jivati'
  ],
  'Chhatrapati Sambhajinagar (Aurangabad)': [
    'Chhatrapati Sambhajinagar', 'Kannad', 'Soegaon', 'Sillod', 'Phulambri',
    'Khuldabad', 'Vaijapur', 'Gangapur', 'Paithan'
  ],
  'Aurangabad': [
    'Chhatrapati Sambhajinagar', 'Kannad', 'Soegaon', 'Sillod', 'Phulambri',
    'Khuldabad', 'Vaijapur', 'Gangapur', 'Paithan'
  ],
  'Dharashiv (Osmanabad)': [
    'Dharashiv (Osmanabad)', 'Tuljapur', 'Omerga', 'Lohara', 'Kallam', 'Bhum', 'Paranda', 'Washi'
  ],
  'Osmanabad': [
    'Dharashiv (Osmanabad)', 'Tuljapur', 'Omerga', 'Lohara', 'Kallam', 'Bhum', 'Paranda', 'Washi'
  ],
  'Dhule': [
    'Dhule', 'Sakri', 'Sindkheda', 'Shirpur'
  ],
  'Gadchiroli': [
    'Gadchiroli', 'Dhanora', 'Chamorshi', 'Mulchera', 'Desaiganj (Wadsa)', 'Armori',
    'Kurkheda', 'Korchi', 'Aheri', 'Etapalli', 'Bhamragad', 'Sironcha'
  ],
  'Gondia': [
    'Gondia', 'Tirora', 'Goregaon', 'Arjuni Morgaon', 'Deori', 'Salekasa', 'Sadak Arjuni', 'Amgaon'
  ],
  'Hingoli': [
    'Hingoli', 'Kalamnuri', 'Basmath', 'Aundha Nagnath', 'Sengaon'
  ],
  'Jalgaon': [
    'Jalgaon', 'Bhusawal', 'Yawal', 'Raver', 'Muktainagar', 'Bodwad', 'Chopda',
    'Amalner', 'Parola', 'Erandol', 'Dharangaon', 'Pachora', 'Bhadgaon', 'Chalisgaon', 'Jamner'
  ],
  'Jalna': [
    'Jalna', 'Bhokardan', 'Jafrabad', 'Badnapur', 'Ambad', 'Ghansawangi', 'Partur', 'Mantha'
  ],
  'Kolhapur': [
    'Karvir (Kolhapur)', 'Panhala', 'Shahuwadi', 'Kagal', 'Hatkanangle', 'Shirol',
    'Radhanagari', 'Gaganbawda', 'Bhudargad', 'Gadhinglaj', 'Ajara', 'Chandgad'
  ],
  'Latur': [
    'Latur', 'Ausa', 'Renapur', 'Ahmedpur', 'Jalkot', 'Chakur', 'Shirur Anantpal',
    'Nilanga', 'Deoni', 'Udgir'
  ],
  'Mumbai City': [
    'Mumbai City', 'Colaba', 'Byculla', 'Dadar', 'Worli', 'Fort', 'Malabar Hill'
  ],
  'Mumbai Suburban': [
    'Andheri', 'Bandra', 'Borivali', 'Kurla', 'Ghatkopar', 'Mulund', 'Dahisar', 'Malad', 'Kandivali'
  ],
  'Nagpur': [
    'Nagpur Urban', 'Nagpur Rural', 'Kamptee', 'Hingna', 'Katol', 'Narkhed',
    'Savner', 'Kalmeshwar', 'Ramtek', 'Parseoni', 'Mouda', 'Umred', 'Kuhi', 'Bhivapur'
  ],
  'Nanded': [
    'Nanded', 'Ardhapur', 'Mudkhed', 'Bhokar', 'Umri', 'Loha', 'Kandhar',
    'Kinwat', 'Himayatnagar', 'Hadgaon', 'Mahoor', 'Deglur', 'Mukhed', 'Dharmabad', 'Biloli', 'Naigaon'
  ],
  'Nandurbar': [
    'Nandurbar', 'Navapur', 'Shahada', 'Taloda', 'Akkalkuwa', 'Akrani (Dhadgaon)'
  ],
  'Nashik': [
    'Nashik', 'Malegaon', 'Sinnar', 'Niphad', 'Dindori', 'Yeola', 'Chandwad',
    'Kalwan', 'Nandgaon', 'Satana (Baglan)', 'Surgana', 'Deola', 'Trimbakeshwar', 'Peth', 'Igatpuri'
  ],
  'Palghar': [
    'Palghar', 'Vada', 'Vikramgad', 'Jawhar', 'Mokhada', 'Dahanu', 'Talasari', 'Vasai'
  ],
  'Parbhani': [
    'Parbhani', 'Gangakhed', 'Sonpeth', 'Pathri', 'Manwath', 'Palam', 'Selu', 'Jintur', 'Purna'
  ],
  'Pune': [
    'Haveli', 'Pune City', 'Khed', 'Baramati', 'Junnar', 'Shirur', 'Daund',
    'Indapur', 'Purandar', 'Maval', 'Mulshi', 'Bhor', 'Ambegaon', 'Velhe'
  ],
  'Raigad': [
    'Alibag', 'Pen', 'Murud', 'Panvel', 'Uran', 'Karjat', 'Khalapur', 'Mangaon',
    'Tala', 'Roha', 'Sudhagad (Pali)', 'Mahad', 'Poladpur', 'Shrivardhan', 'Mhasla'
  ],
  'Ratnagiri': [
    'Ratnagiri', 'Chiplun', 'Dapoli', 'Guhagar', 'Khed', 'Lanja', 'Mandangad', 'Rajapur', 'Sangameshwar'
  ],
  'Sangli': [
    'Miraj (Sangli)', 'Kavathe Mahankal', 'Tasgaon', 'Jat', 'Walwa (Islampur)',
    'Shirala', 'Khanapur (Vita)', 'Atpadi', 'Palus', 'Kadegaon'
  ],
  'Satara': [
    'Satara', 'Karad', 'Wai', 'Mahabaleshwar', 'Phaltan', 'Man (Dahiwadi)',
    'Khatav (Vaduj)', 'Koregaon', 'Patan', 'Jaoli', 'Khandala'
  ],
  'Sindhudurg': [
    'Kudal', 'Sawantwadi', 'Kankavli', 'Devgad', 'Malvan', 'Vengurla', 'Vaibhavwadi', 'Dodamarg'
  ],
  'Solapur': [
    'Solapur North', 'Solapur South', 'Barshi', 'Akkalkot', 'Mohol', 'Pandharpur',
    'Malshiras', 'Karmala', 'Madha', 'Sangola', 'Mangalwedha'
  ],
  'Thane': [
    'Thane', 'Kalyan', 'Murbad', 'Bhiwandi', 'Shahapur', 'Ulhasnagar', 'Ambarnath'
  ],
  'Wardha': [
    'Wardha', 'Seloo', 'Deoli', 'Hinganghat', 'Arvi', 'Karanja', 'Ashti', 'Samudrapur'
  ],
  'Washim': [
    'Washim', 'Malegaon', 'Risod', 'Mangrulpir', 'Karanja (Lad)', 'Manora'
  ],
  'Yavatmal': [
    'Yavatmal', 'Darwha', 'Digras', 'Pusad', 'Umarkhed', 'Mahagaon', 'Ghatanji',
    'Wani', 'Maregaon', 'Zari Jamani', 'Ralegaon', 'Kelapur (Pandharkawada)', 'Arni', 'Babhulgaon', 'Kalamb', 'Ner'
  ]
};

export const getTalukasForDistrict = (districtName: string): string[] => {
  if (!districtName) return DISTRICT_TALUKA_MAP['Pune'] || [];
  
  // Direct match
  if (DISTRICT_TALUKA_MAP[districtName]) {
    return DISTRICT_TALUKA_MAP[districtName];
  }

  // Fuzzy / substring match
  const cleanName = districtName.toLowerCase().replace(/[^a-z]/g, '');
  for (const [dist, talukas] of Object.entries(DISTRICT_TALUKA_MAP)) {
    const cleanDist = dist.toLowerCase().replace(/[^a-z]/g, '');
    if (cleanDist.includes(cleanName) || cleanName.includes(cleanDist)) {
      return talukas;
    }
  }

  return ['Central', 'North', 'South', 'East', 'West'];
};
