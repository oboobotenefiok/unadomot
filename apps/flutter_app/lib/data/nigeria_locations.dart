import 'package:latlong2/latlong.dart';

class NigeriaLocations {
  static const capitals = <String, String>{
    'Abia': 'Umuahia',
    'Adamawa': 'Yola',
    'Akwa Ibom': 'Uyo',
    'Anambra': 'Awka',
    'Bauchi': 'Bauchi',
    'Bayelsa': 'Yenagoa',
    'Benue': 'Makurdi',
    'Borno': 'Maiduguri',
    'Cross River': 'Calabar',
    'Delta': 'Asaba',
    'Ebonyi': 'Abakaliki',
    'Edo': 'Benin City',
    'Ekiti': 'Ado Ekiti',
    'Enugu': 'Enugu',
    'FCT': 'Abuja',
    'Gombe': 'Gombe',
    'Imo': 'Owerri',
    'Jigawa': 'Dutse',
    'Kaduna': 'Kaduna',
    'Kano': 'Kano',
    'Katsina': 'Katsina',
    'Kebbi': 'Birnin Kebbi',
    'Kogi': 'Lokoja',
    'Kwara': 'Ilorin',
    'Lagos': 'Ikeja',
    'Nasarawa': 'Lafia',
    'Niger': 'Minna',
    'Ogun': 'Abeokuta',
    'Ondo': 'Akure',
    'Osun': 'Osogbo',
    'Oyo': 'Ibadan',
    'Plateau': 'Jos',
    'Rivers': 'Port Harcourt',
    'Sokoto': 'Sokoto',
    'Taraba': 'Jalingo',
    'Yobe': 'Damaturu',
    'Zamfara': 'Gusau',
  };

  static const centers = <String, LatLng>{
    'Abia': LatLng(5.4167, 7.5000),
    'Adamawa': LatLng(9.3265, 12.3984),
    'Akwa Ibom': LatLng(5.0378, 7.9128),
    'Anambra': LatLng(6.2209, 6.9370),
    'Bauchi': LatLng(10.3103, 9.8439),
    'Bayelsa': LatLng(4.7719, 6.0699),
    'Benue': LatLng(7.3369, 8.7404),
    'Borno': LatLng(11.8846, 13.1510),
    'Cross River': LatLng(5.8702, 8.5988),
    'Delta': LatLng(5.5325, 5.8987),
    'Ebonyi': LatLng(6.2649, 8.0137),
    'Edo': LatLng(6.6342, 5.9304),
    'Ekiti': LatLng(7.7190, 5.3110),
    'Enugu': LatLng(6.5364, 7.4356),
    'FCT': LatLng(9.0765, 7.3986),
    'Gombe': LatLng(10.3638, 11.1920),
    'Imo': LatLng(5.5720, 7.0588),
    'Jigawa': LatLng(12.2280, 9.5616),
    'Kaduna': LatLng(10.5222, 7.4383),
    'Kano': LatLng(12.0022, 8.5920),
    'Katsina': LatLng(12.9908, 7.6018),
    'Kebbi': LatLng(12.4539, 4.1975),
    'Kogi': LatLng(7.8023, 6.7333),
    'Kwara': LatLng(8.4966, 4.5421),
    'Lagos': LatLng(6.5244, 3.3792),
    'Nasarawa': LatLng(8.4900, 8.5200),
    'Niger': LatLng(9.6139, 5.5983),
    'Ogun': LatLng(6.9980, 3.4739),
    'Ondo': LatLng(7.2500, 5.2000),
    'Osun': LatLng(7.5629, 4.5200),
    'Oyo': LatLng(7.3775, 3.9470),
    'Plateau': LatLng(9.2182, 9.5179),
    'Rivers': LatLng(4.8396, 6.9112),
    'Sokoto': LatLng(13.0059, 5.2476),
    'Taraba': LatLng(8.0000, 10.5000),
    'Yobe': LatLng(11.7480, 11.9660),
    'Zamfara': LatLng(12.1700, 6.6600),
  };

  /// All 774 local government areas, grouped by state. Ported from the
  /// legacy `data/nigeria-states.js` so listing forms and filters offer the
  /// same choices the old app did.
  static const lgas = <String, List<String>>{
    'Abia': [
      'Aba North', 'Aba South', 'Arochukwu', 'Bende', 'Ikwuano',
      'Isiala Ngwa North', 'Isiala Ngwa South', 'Isuikwuato', 'Obi Ngwa',
      'Ohafia', 'Osisioma', 'Ugwunagbo', 'Ukwa East', 'Ukwa West',
      'Umuahia North', 'Umuahia South', 'Umu Nneochi',
    ],
    'Adamawa': [
      'Demsa', 'Fufore', 'Ganye', 'Gayuk', 'Gombi', 'Grie', 'Hong', 'Jada',
      'Lamurde', 'Madagali', 'Maiha', 'Mayo Belwa', 'Michika', 'Mubi North',
      'Mubi South', 'Numan', 'Shelleng', 'Song', 'Toungo', 'Yola North',
      'Yola South',
    ],
    'Akwa Ibom': [
      'Abak', 'Eastern Obolo', 'Eket', 'Esit Eket', 'Essien Udim',
      'Etim Ekpo', 'Etinan', 'Ibeno', 'Ibesikpo Asutan', 'Ibiono-Ibom',
      'Ika', 'Ikono', 'Ikot Abasi', 'Ikot Ekpene', 'Ini', 'Itu', 'Mbo',
      'Mkpat-Enin', 'Nsit-Atai', 'Nsit-Ibom', 'Nsit-Ubium', 'Obot Akara',
      'Okobo', 'Onna', 'Oron', 'Oruk Anam', 'Udung-Uko', 'Ukanafun', 'Uruan',
      'Urue-Offong/Oruko', 'Uyo',
    ],
    'Anambra': [
      'Aguata', 'Anambra East', 'Anambra West', 'Anaocha', 'Awka North',
      'Awka South', 'Ayamelum', 'Dunukofia', 'Ekwusigo', 'Idemili North',
      'Idemili South', 'Ihiala', 'Njikoka', 'Nnewi North', 'Nnewi South',
      'Ogbaru', 'Onitsha North', 'Onitsha South', 'Orumba North',
      'Orumba South', 'Oyi',
    ],
    'Bauchi': [
      'Alkaleri', 'Bauchi', 'Bogoro', 'Damban', 'Darazo', 'Dass', 'Gamawa',
      'Ganjuwa', 'Giade', 'Itas/Gadau', "Jama'are", 'Katagum', 'Kirfi',
      'Misau', 'Ningi', 'Shira', 'Tafawa Balewa', 'Toro', 'Warji', 'Zaki',
    ],
    'Bayelsa': [
      'Brass', 'Ekeremor', 'Kolokuma/Opokuma', 'Nembe', 'Ogbia', 'Sagbama',
      'Southern Ijaw', 'Yenagoa',
    ],
    'Benue': [
      'Ado', 'Agatu', 'Apa', 'Buruku', 'Gboko', 'Guma', 'Gwer East',
      'Gwer West', 'Katsina-Ala', 'Konshisha', 'Kwande', 'Logo', 'Makurdi',
      'Obi', 'Ogbadibo', 'Ohimini', 'Oju', 'Okpokwu', 'Otukpo', 'Tarka',
      'Ukum', 'Ushongo', 'Vandeikya',
    ],
    'Borno': [
      'Abadam', 'Askira/Uba', 'Bama', 'Bayo', 'Biu', 'Chibok', 'Damboa',
      'Dikwa', 'Gubio', 'Guzamala', 'Gwoza', 'Hawul', 'Jere', 'Kaga',
      'Kala/Balge', 'Konduga', 'Kukawa', 'Kwaya Kusar', 'Mafa', 'Magumeri',
      'Maiduguri', 'Marte', 'Mobbar', 'Monguno', 'Ngala', 'Nganzai', 'Shani',
    ],
    'Cross River': [
      'Abi', 'Akamkpa', 'Akpabuyo', 'Bakassi', 'Bekwarra', 'Biase', 'Boki',
      'Calabar Municipal', 'Calabar South', 'Etung', 'Ikom', 'Obanliku',
      'Obubra', 'Obudu', 'Odukpani', 'Ogoja', 'Yakuur', 'Yala',
    ],
    'Delta': [
      'Aniocha North', 'Aniocha South', 'Bomadi', 'Burutu', 'Ethiope East',
      'Ethiope West', 'Ika North East', 'Ika South', 'Isoko North',
      'Isoko South', 'Ndokwa East', 'Ndokwa West', 'Okpe', 'Oshimili North',
      'Oshimili South', 'Patani', 'Sapele', 'Udu', 'Ughelli North',
      'Ughelli South', 'Ukwuani', 'Uvwie', 'Warri North', 'Warri South',
      'Warri South West',
    ],
    'Ebonyi': [
      'Abakaliki', 'Afikpo North', 'Afikpo South', 'Ebonyi', 'Ezza North',
      'Ezza South', 'Ikwo', 'Ishielu', 'Ivo', 'Izzi', 'Ohaozara', 'Ohaukwu',
      'Onicha',
    ],
    'Edo': [
      'Akoko-Edo', 'Egor', 'Esan Central', 'Esan North-East', 'Esan South-East',
      'Esan West', 'Etsako Central', 'Etsako East', 'Etsako West', 'Igueben',
      'Ikpoba Okha', 'Orhionmwon', 'Oredo', 'Ovia North-East', 'Ovia South-West',
      'Owan East', 'Owan West', 'Uhunmwonde',
    ],
    'Ekiti': [
      'Ado Ekiti', 'Efon', 'Ekiti East', 'Ekiti South-West', 'Ekiti West',
      'Emure', 'Gbonyin', 'Ido Osi', 'Ijero', 'Ikere', 'Ikole', 'Ilejemeje',
      'Irepodun/Ifelodun', 'Ise/Orun', 'Moba', 'Oye',
    ],
    'Enugu': [
      'Aninri', 'Awgu', 'Enugu East', 'Enugu North', 'Enugu South', 'Ezeagu',
      'Igbo Etiti', 'Igbo Eze North', 'Igbo Eze South', 'Isi Uzo',
      'Nkanu East', 'Nkanu West', 'Nsukka', 'Oji River', 'Udenu', 'Udi',
      'Uzo Uwani',
    ],
    'FCT': [
      'Abaji', 'Abuja Municipal', 'Bwari', 'Gwagwalada', 'Kuje', 'Kwali',
    ],
    'Gombe': [
      'Akko', 'Balanga', 'Billiri', 'Dukku', 'Funakaye', 'Gombe', 'Kaltungo',
      'Kwami', 'Nafada', 'Shongom', 'Yamaltu/Deba',
    ],
    'Imo': [
      'Aboh Mbaise', 'Ahiazu Mbaise', 'Ehime Mbano', 'Ezinihitte',
      'Ideato North', 'Ideato South', 'Ihitte/Uboma', 'Ikeduru',
      'Isiala Mbano', 'Isu', 'Mbaitoli', 'Ngor Okpala', 'Njaba', 'Nkwerre',
      'Nwangele', 'Obowo', 'Oguta', 'Ohaji/Egbema', 'Okigwe', 'Orlu', 'Orsu',
      'Oru East', 'Oru West', 'Owerri Municipal', 'Owerri North',
      'Owerri West', 'Unuimo',
    ],
    'Jigawa': [
      'Auyo', 'Babura', 'Biriniwa', 'Birnin Kudu', 'Buji', 'Dutse',
      'Gagarawa', 'Garki', 'Gumel', 'Guri', 'Gwaram', 'Gwiwa', 'Hadejia',
      'Jahun', 'Kafin Hausa', 'Kazaure', 'Kiri Kasama', 'Kiyawa', 'Kaugama',
      'Maigatari', 'Malam Madori', 'Miga', 'Ringim', 'Roni', 'Sule Tankarkar',
      'Taura', 'Yankwashi',
    ],
    'Kaduna': [
      'Birnin Gwari', 'Chikun', 'Giwa', 'Igabi', 'Ikara', 'Jaba', "Jema'a",
      'Kachia', 'Kaduna North', 'Kaduna South', 'Kagarko', 'Kajuru', 'Kaura',
      'Kauru', 'Kubau', 'Kudan', 'Lere', 'Makarfi', 'Sabon Gari', 'Sanga',
      'Soba', 'Zangon Kataf', 'Zaria',
    ],
    'Kano': [
      'Ajingi', 'Albasu', 'Bagwai', 'Bebeji', 'Bichi', 'Bunkure', 'Dala',
      'Dambatta', 'Dawakin Kudu', 'Dawakin Tofa', 'Doguwa', 'Fagge',
      'Gabasawa', 'Garko', 'Garun Mallam', 'Gaya', 'Gezawa', 'Gwale',
      'Gwarzo', 'Kabo', 'Kano Municipal', 'Karaye', 'Kibiya', 'Kiru',
      'Kumbotso', 'Kunchi', 'Kura', 'Madobi', 'Makoda', 'Minjibir', 'Nasarawa',
      'Rano', 'Rimin Gado', 'Rogo', 'Shanono', 'Sumaila', 'Takai', 'Tarauni',
      'Tofa', 'Tsanyawa', 'Tudun Wada', 'Ungogo', 'Warawa', 'Wudil',
    ],
    'Katsina': [
      'Bakori', 'Batagarawa', 'Batsari', 'Baure', 'Bindawa', 'Charanchi',
      'Dandume', 'Danja', 'Dan Musa', 'Daura', 'Dutsi', 'Dutsin Ma', 'Faskari',
      'Funtua', 'Ingawa', 'Jibia', 'Kafur', 'Kaita', 'Kankara', 'Kankia',
      'Katsina', 'Kurfi', 'Kusada', "Mai'Adua", 'Malumfashi', 'Mani', 'Mashi',
      'Matazu', 'Musawa', 'Rimi', 'Sabuwa', 'Safana', 'Sandamu', 'Zango',
    ],
    'Kebbi': [
      'Aleiro', 'Arewa Dandi', 'Argungu', 'Augie', 'Bagudo', 'Birnin Kebbi',
      'Bunza', 'Dandi', 'Fakai', 'Gwandu', 'Jega', 'Kalgo', 'Koko/Besse',
      'Maiyama', 'Ngaski', 'Sakaba', 'Shanga', 'Suru', 'Wasagu/Danko', 'Yauri',
      'Zuru',
    ],
    'Kogi': [
      'Adavi', 'Ajaokuta', 'Ankpa', 'Bassa', 'Dekina', 'Ibaji', 'Idah',
      'Igalamela Odolu', 'Ijumu', 'Kabba/Bunu', 'Kogi', 'Lokoja', 'Mopa Muro',
      'Ofu', 'Ogori/Magongo', 'Okehi', 'Okene', 'Olamaboro', 'Omala',
      'Yagba East', 'Yagba West',
    ],
    'Kwara': [
      'Asa', 'Baruten', 'Edu', 'Ekiti', 'Ifelodun', 'Ilorin East',
      'Ilorin South', 'Ilorin West', 'Irepodun', 'Isin', 'Kaiama', 'Moro',
      'Offa', 'Oke Ero', 'Oyun', 'Pategi',
    ],
    'Lagos': [
      'Agege', 'Ajeromi-Ifelodun', 'Alimosho', 'Amuwo-Odofin', 'Apapa',
      'Badagry', 'Epe', 'Eti-Osa', 'Ibeju-Lekki', 'Ifako-Ijaiye', 'Ikeja',
      'Ikorodu', 'Kosofe', 'Lagos Island', 'Lagos Mainland', 'Mushin', 'Ojo',
      'Oshodi-Isolo', 'Shomolu', 'Surulere',
    ],
    'Nasarawa': [
      'Akwanga', 'Awe', 'Doma', 'Karu', 'Keana', 'Keffi', 'Kokona', 'Lafia',
      'Nasarawa', 'Nasarawa Egon', 'Obi', 'Toto', 'Wamba',
    ],
    'Niger': [
      'Agaie', 'Agwara', 'Bida', 'Borgu', 'Bosso', 'Chanchaga', 'Edati',
      'Gbako', 'Gurara', 'Katcha', 'Kontagora', 'Lapai', 'Lavun', 'Magama',
      'Mariga', 'Mashegu', 'Mokwa', 'Munya', 'Paikoro', 'Rafi', 'Rijau',
      'Shiroro', 'Suleja', 'Tafa', 'Wushishi',
    ],
    'Ogun': [
      'Abeokuta North', 'Abeokuta South', 'Ado-Odo/Ota', 'Ewekoro', 'Ifo',
      'Ijebu East', 'Ijebu North', 'Ijebu North East', 'Ijebu Ode', 'Ikenne',
      'Imeko Afon', 'Ipokia', 'Obafemi Owode', 'Odeda', 'Odogbolu',
      'Ogun Waterside', 'Remo North', 'Sagamu', 'Yewa North', 'Yewa South',
    ],
    'Ondo': [
      'Akoko North-East', 'Akoko North-West', 'Akoko South-East',
      'Akoko South-West', 'Akure North', 'Akure South', 'Ese Odo', 'Idanre',
      'Ifedore', 'Ilaje', 'Ile Oluji/Okeigbo', 'Irele', 'Odigbo', 'Okitipupa',
      'Ondo East', 'Ondo West', 'Ose', 'Owo',
    ],
    'Osun': [
      'Aiyedaade', 'Aiyedire', 'Atakunmosa East', 'Atakunmosa West',
      'Boluwaduro', 'Boripe', 'Ede North', 'Ede South', 'Egbedore', 'Ejigbo',
      'Ife Central', 'Ife East', 'Ife North', 'Ife South', 'Ifedayo',
      'Ifelodun', 'Ila', 'Ilesa East', 'Ilesa West', 'Irepodun', 'Irewole',
      'Isokan', 'Iwo', 'Obokun', 'Odo Otin', 'Ola Oluwa', 'Olorunda',
      'Oriade', 'Orolu', 'Osogbo',
    ],
    'Oyo': [
      'Afijio', 'Akinyele', 'Atiba', 'Atisbo', 'Egbeda', 'Ibadan North',
      'Ibadan North-East', 'Ibadan North-West', 'Ibadan South-East',
      'Ibadan South-West', 'Ibarapa Central', 'Ibarapa East', 'Ibarapa North',
      'Ido', 'Irepo', 'Iseyin', 'Itesiwaju', 'Iwajowa', 'Kajola', 'Lagelu',
      'Ogbomosho North', 'Ogbomosho South', 'Ogo Oluwa', 'Olorunsogo',
      'Oluyole', 'Ona Ara', 'Orelope', 'Ori Ire', 'Oyo East', 'Oyo West',
      'Saki East', 'Saki West', 'Surulere',
    ],
    'Plateau': [
      'Barkin Ladi', 'Bassa', 'Bokkos', 'Jos East', 'Jos North', 'Jos South',
      'Kanam', 'Kanke', 'Langtang North', 'Langtang South', 'Mangu', 'Mikang',
      'Pankshin', "Qua'an Pan", 'Riyom', 'Shendam', 'Wase',
    ],
    'Rivers': [
      'Abua/Odual', 'Ahoada East', 'Ahoada West', 'Akuku-Toru', 'Andoni',
      'Asari-Toru', 'Bonny', 'Degema', 'Eleme', 'Emohua', 'Etche', 'Gokana',
      'Ikwerre', 'Khana', 'Obio/Akpor', 'Ogba/Egbema/Ndoni', 'Ogu/Bolo',
      'Okrika', 'Omuma', 'Opobo/Nkoro', 'Oyigbo', 'Port Harcourt', 'Tai',
    ],
    'Sokoto': [
      'Binji', 'Bodinga', 'Dange Shuni', 'Gada', 'Goronyo', 'Gudu',
      'Gwadabawa', 'Illela', 'Isa', 'Kebbe', 'Kware', 'Rabah', 'Sabon Birni',
      'Shagari', 'Silame', 'Sokoto North', 'Sokoto South', 'Tambuwal',
      'Tangaza', 'Tureta', 'Wamako', 'Wurno', 'Yabo',
    ],
    'Taraba': [
      'Ardo Kola', 'Bali', 'Donga', 'Gashaka', 'Gassol', 'Ibi', 'Jalingo',
      'Karim Lamido', 'Kumi', 'Lau', 'Sardauna', 'Takum', 'Ussa', 'Wukari',
      'Yorro', 'Zing',
    ],
    'Yobe': [
      'Bade', 'Bursari', 'Damaturu', 'Fika', 'Fune', 'Geidam', 'Gujba',
      'Gulani', 'Jakusko', 'Karasuwa', 'Machina', 'Nangere', 'Nguru',
      'Potiskum', 'Tarmuwa', 'Yunusari', 'Yusufari',
    ],
    'Zamfara': [
      'Anka', 'Bakura', 'Birnin Magaji/Kiyaw', 'Bukkuyum', 'Bungudu', 'Gummi',
      'Gusau', 'Kaura Namoda', 'Maradun', 'Maru', 'Shinkafi', 'Talata Mafara',
      'Tsafe', 'Zurmi',
    ],
  };

  static List<String> get states => capitals.keys.toList()..sort();

  static String capitalFor(String state) => capitals[state] ?? '';

  static List<String> lgasFor(String? state) {
    if (state == null) return const [];
    return lgas[state] ?? const [];
  }

  /// The capital when it is a real LGA, otherwise the first entry, so the
  /// picker never starts on a value that is not in its own list.
  static String defaultLgaFor(String? state) {
    final options = lgasFor(state);
    if (options.isEmpty) return '';
    final capital = capitalFor(state ?? '');
    return options.contains(capital) ? capital : options.first;
  }
}
