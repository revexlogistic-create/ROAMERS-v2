/**
 * data/seed-experiences.js
 * Initial Roamers Community travel catalog. Seeded into the JSON store on first run.
 * After seeding, the source of truth is data/experiences.json — admin edits persist there.
 */
module.exports = [
  /* ── VOYAGE GROUPE ──────────────────────────── */
  {
    id:'sahara', segment:'groupe', type:'desert',
    title:'Sahara Desert Immersion', loc:'Merzouga, Erg Chebbi', dur:'3 Days / 2 Nights',
    days:3, nights:2, price:1800, pChild:1100, rating:4.9, rev:124, maxP:20, minP:4,
    badge:'Bestseller', dif:'Modéré',
    tags:['Désert','Groupe','Camping'],
    img:'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800&q=80',
    imgs:[
      'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800&q=80',
      'https://images.unsplash.com/photo-1532960401447-7dd05bef20b0?w=800&q=80',
      'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=800&q=80',
      'https://images.unsplash.com/photo-1549144511-f099e773c147?w=800&q=80'
    ],
    desc:'Lose yourself in the golden dunes of Erg Chebbi. Ride camels at sunset, sleep in a luxury Berber camp under millions of stars, and wake to a sunrise that will stay with you forever.',
    hi:['Camel trekking at sunset across the dunes','Sleep in a luxury Berber desert camp','Traditional Berber music and dinner around the fire','4x4 dune bashing experience','Sunrise meditation on the dunes','Meeting with a local Berber family'],
    inc:['Transport from Marrakech and back','2 nights desert camp accommodation','All meals (full board)','Expert certified Berber guide','Camel ride (1 hour)','4x4 vehicle and safety equipment'],
    exc:['Flights and personal insurance','Alcoholic beverages','Personal expenses','Tips (optional)'],
    it:[
      {d:1,t:'Marrakech → Merzouga',desc:'Drive through the High Atlas. Lunch stop at Todra Gorge. Arrive at sunset for your first camel ride.'},
      {d:2,t:'Full Sahara Immersion Day',desc:'Wake before dawn for sunrise on the dunes. Afternoon 4x4 adventure. Evening traditional dinner and Gnawa music.'},
      {d:3,t:'Return via Draa Valley',desc:'Sunrise walk, Berber breakfast, then depart through the Draa Valley. Arrive Marrakech by evening.'}
    ]
  },
  {
    id:'atlas-groupe', segment:'groupe', type:'mountain',
    title:'High Atlas Trek — Toubkal Summit', loc:'Toubkal, Atlas Mountains', dur:'4 Days / 3 Nights',
    days:4, nights:3, price:2200, pChild:1300, rating:4.8, rev:89, maxP:14, minP:4,
    badge:'Groupe', dif:'Sportif',
    tags:['Montagne','Groupe','Trek'],
    img:'https://images.unsplash.com/photo-1548759806-821b06afb3bb?w=800&q=80',
    imgs:[
      'https://images.unsplash.com/photo-1548759806-821b06afb3bb?w=800&q=80',
      'https://images.unsplash.com/photo-1542621334-a254cf47733d?w=800&q=80',
      'https://images.unsplash.com/photo-1529963183134-61a90db47eaf?w=800&q=80',
      'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=800&q=80'
    ],
    desc:'Summit Jebel Toubkal (4,167m) — the highest peak in North Africa with your group. Trek through Berber villages, alpine meadows, and rugged terrain.',
    hi:['Summit Toubkal (4,167m) with expert mountain guide','Trek through authentic Berber villages','Stay in high-altitude mountain refuges','Panoramic 360° summit views','Cultural exchange with local Berber families'],
    inc:['Expert CAF-certified mountain guide','3 nights in refuges and guesthouse','All meals during the trek','Trek permits and park fees','Safety equipment and first aid kit'],
    exc:['Personal trekking gear and boots','Travel and mountain insurance','Personal medical kit'],
    it:[
      {d:1,t:'Marrakech → Imlil → Aremd',desc:'Drive to Imlil. Begin gentle trek to Aremd Berber village.'},
      {d:2,t:'Aremd → Toubkal Base Camp',desc:'Full day trekking through stunning alpine scenery.'},
      {d:3,t:'Summit Day — 4167m',desc:'Pre-dawn start. Reach the summit by mid-morning. Descend celebrating.'},
      {d:4,t:'Return to Marrakech',desc:'Morning trek back to Imlil. Transfer to Marrakech. Farewell lunch.'}
    ]
  },
  {
    id:'cote-groupe', segment:'groupe', type:'coastal',
    title:'Atlantic Coast Road Trip — Groupe', loc:'Casablanca → Essaouira → Agadir', dur:'5 Days / 4 Nights',
    days:5, nights:4, price:2800, pChild:1700, rating:4.8, rev:52, maxP:16, minP:4,
    badge:'Groupe', dif:'Facile',
    tags:['Côte','Groupe','Road Trip'],
    img:'https://images.unsplash.com/photo-1568392200955-97c7e6e9eb6e?w=800&q=80',
    imgs:[
      'https://images.unsplash.com/photo-1568392200955-97c7e6e9eb6e?w=800&q=80',
      'https://images.unsplash.com/photo-1561634507-97862c73c024?w=800&q=80',
      'https://images.unsplash.com/photo-1532960401447-7dd05bef20b0?w=800&q=80',
      'https://images.unsplash.com/photo-1549144511-f099e773c147?w=800&q=80'
    ],
    desc:'Hit the Atlantic coast in a private van. From Casablanca energy to Essaouira ramparts, argan cooperatives, surf lessons, and golden beaches — the best of coastal Morocco for groups.',
    hi:['Essaouira UNESCO-listed walled city at sunset','Visit a women argan oil cooperative','Surfing lesson in Taghazout','Fresh seafood by the Atlantic','Souss-Massa National Park wildlife walk'],
    inc:['Private van with certified driver-guide','4 nights in riads and hotels','All breakfasts','Argan cooperative visit','Surfing lesson with equipment'],
    exc:['Flights','Lunches and most dinners','Personal expenses'],
    it:[
      {d:1,t:'Casablanca → Oualidia',desc:'Drive south. Visit El Jadida. Oysters lunch in Oualidia.'},
      {d:2,t:'Safi → Essaouira',desc:'Explore Safi pottery village. Arrive Essaouira.'},
      {d:3,t:'Essaouira Full Day',desc:'Argan cooperative. Afternoon free. Sunset on the ramparts.'},
      {d:4,t:'→ Taghazout',desc:'Surfing lesson. Overnight beach accommodation.'},
      {d:5,t:'→ Agadir Departure',desc:'Morning beach. Souss-Massa Park.'}
    ]
  },
  {
    id:'fes-groupe', segment:'groupe', type:'cultural',
    title:'Villes Impériales — Circuit Culturel', loc:'Fes, Meknès, Marrakech', dur:'5 Days / 4 Nights',
    days:5, nights:4, price:2400, pChild:1400, rating:4.7, rev:67, maxP:16, minP:4,
    badge:'Groupe', dif:'Facile',
    tags:['Culture','Groupe','Histoire'],
    img:'https://images.unsplash.com/photo-1539020140153-e479b8c22e70?w=800&q=80',
    imgs:[
      'https://images.unsplash.com/photo-1539020140153-e479b8c22e70?w=800&q=80',
      'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=800&q=80',
      'https://images.unsplash.com/photo-1572073263888-da4af9af2bf5?w=800&q=80',
      'https://images.unsplash.com/photo-1551632436-cbf8dd35adfa?w=800&q=80'
    ],
    desc:"Immerse your group in Morocco's imperial heritage. Three cities, three dynasties, one unforgettable cultural journey through medinas, palaces, and artisan quarters unchanged for centuries.",
    hi:['Private access to Chouara tannery in Fes','Meet working artisans: zellij, brass, leather',"Al Qarawiyyin — world's oldest university",'Medersa Bou Inania architecture tour','Djemaa el-Fna evening experience Marrakech'],
    inc:['Expert bilingual cultural guide','4 nights in boutique riads','Cooking class with ingredients','All breakfasts and 2 dinners','All entrance fees','Transport throughout'],
    exc:['Flights to Morocco','Personal lunches and shopping'],
    it:[
      {d:1,t:'Arrival Fes',desc:'Arrive Fes. Guided medina tour. Tannery visit.'},
      {d:2,t:'Fes Artisan Quarter',desc:'Morning with craftsmen. Afternoon Meknès day trip.'},
      {d:3,t:'Fes → Marrakech',desc:'Travel south through Morocco.'},
      {d:4,t:'Marrakech Souks',desc:'Djemaa el-Fna. Souk exploration. Cooking class.'},
      {d:5,t:'Farewell Marrakech',desc:'Morning medina walk. Departure.'}
    ]
  },

  /* ── WEEKEND À THÈME ────────────────────────── */
  {
    id:'wknd-sahara', segment:'weekend', type:'desert',
    title:'Weekend Désert — Bivouac Sahara', loc:'Merzouga, Erg Chebbi', dur:'2 Days / 1 Night',
    days:2, nights:1, price:1100, pChild:650, rating:4.9, rev:98, maxP:14, minP:2,
    badge:'Weekend', dif:'Facile',
    tags:['Désert','Weekend','Bivouac'],
    img:'https://images.unsplash.com/photo-1532960401447-7dd05bef20b0?w=800&q=80',
    imgs:[
      'https://images.unsplash.com/photo-1532960401447-7dd05bef20b0?w=800&q=80',
      'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800&q=80',
      'https://images.unsplash.com/photo-1549144511-f099e773c147?w=800&q=80',
      'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=800&q=80'
    ],
    desc:'A 48-hour Sahara escape — the perfect weekend reset. Fly or drive to Merzouga, mount a camel at sunset, sleep under the stars in a luxury bivouac, and drive back refreshed Monday morning.',
    hi:['Arrive Friday evening in Merzouga','Sunset camel trek into the dunes','Luxury Berber bivouac overnight','Sunrise meditation on the dunes','Saturday morning 4x4 adventure before return'],
    inc:['1 night luxury desert bivouac','All meals full board','Camel trek','4x4 adventure','Airport or hotel transfer'],
    exc:['Flights','Personal insurance'],
    it:[
      {d:1,t:'Arrival → Camel Trek → Bivouac',desc:'Arrive Merzouga late afternoon. Sunset camel trek. Berber dinner and music around the fire.'},
      {d:2,t:'Sunrise → 4x4 → Return',desc:'Sunrise on the dunes. Berber breakfast. 4x4 dune adventure. Return transfer.'}
    ]
  },
  {
    id:'wknd-atlas', segment:'weekend', type:'mountain',
    title:'Weekend Atlas — Cascades et Villages Berbères', loc:"Vallée de l'Ourika, Atlas", dur:'2 Days / 1 Night',
    days:2, nights:1, price:850, pChild:500, rating:4.8, rev:74, maxP:12, minP:2,
    badge:'Weekend', dif:'Modéré',
    tags:['Montagne','Weekend','Nature'],
    img:'https://images.unsplash.com/photo-1542621334-a254cf47733d?w=800&q=80',
    imgs:[
      'https://images.unsplash.com/photo-1542621334-a254cf47733d?w=800&q=80',
      'https://images.unsplash.com/photo-1548759806-821b06afb3bb?w=800&q=80',
      'https://images.unsplash.com/photo-1529963183134-61a90db47eaf?w=800&q=80',
      'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=800&q=80'
    ],
    desc:'Escape Marrakech for a weekend in the High Atlas. Hike through walnut and apple orchards to the Setti Fatma waterfalls, stay overnight in a traditional Berber guesthouse.',
    hi:['Ourika Valley scenic drive','Hike to Setti Fatma waterfalls (7 cascades)','Overnight in a Berber mountain guesthouse','Traditional Amazigh dinner and music','Sunrise walk through Berber villages'],
    inc:['Certified mountain guide','1 night in Berber guesthouse','All meals full board','Transport from Marrakech and back'],
    exc:['Personal equipment','Tips'],
    it:[
      {d:1,t:'Marrakech → Ourika → Setti Fatma',desc:'Morning drive up the Ourika Valley. Market visit. Afternoon waterfall hike. Berber dinner.'},
      {d:2,t:'Sunrise Walk → Village → Return',desc:'Early morning village walk. Argan oil cooperative visit. Return to Marrakech by noon.'}
    ]
  },
  {
    id:'wknd-surf', segment:'weekend', type:'coastal',
    title:'Weekend Surf & Yoga — Taghazout', loc:'Taghazout, Côte Atlantique', dur:'2 Days / 1 Night',
    days:2, nights:1, price:950, pChild:null, rating:4.7, rev:61, maxP:10, minP:2,
    badge:'Weekend', dif:'Facile',
    tags:['Côte','Weekend','Surf','Yoga'],
    img:'https://images.unsplash.com/photo-1561634507-97862c73c024?w=800&q=80',
    imgs:[
      'https://images.unsplash.com/photo-1561634507-97862c73c024?w=800&q=80',
      'https://images.unsplash.com/photo-1568392200955-97c7e6e9eb6e?w=800&q=80',
      'https://images.unsplash.com/photo-1532960401447-7dd05bef20b0?w=800&q=80',
      'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800&q=80'
    ],
    desc:"A perfectly balanced Atlantic weekend. Two surf sessions with ISA-certified instructors, sunset yoga on the beach, farm-to-table seafood dinners, and a beachside bungalow.",
    hi:["2 surf lessons on Taghazout's best beginner breaks",'Sunset beach yoga session','Fresh Atlantic seafood dinner','Agadir souk morning walk','Bungalow accommodation steps from the sea'],
    inc:['1 night beachside accommodation','2 surf lessons (board + wetsuit included)','1 yoga session','All breakfasts','Surfboard storage'],
    exc:['Transport to Taghazout','Lunches and dinner day 2'],
    it:[
      {d:1,t:'Arrival → Surf Session 1 → Yoga',desc:'Check in Friday afternoon. Evening surf lesson. Sunset yoga. Seafood dinner.'},
      {d:2,t:'Surf Session 2 → Agadir → Return',desc:'Morning surf. Brunch. Afternoon Agadir souk visit. Return.'}
    ]
  },
  {
    id:'chef', segment:'weekend', type:'cultural',
    title:'Weekend Chefchaouen — La Perle Bleue', loc:'Chefchaouen, Montagnes du Rif', dur:'3 Days / 2 Nights',
    days:3, nights:2, price:1400, pChild:850, rating:4.7, rev:78, maxP:12, minP:2,
    badge:'Weekend', dif:'Facile',
    tags:['Culture','Weekend','Photo'],
    img:'https://images.unsplash.com/photo-1551632436-cbf8dd35adfa?w=800&q=80',
    imgs:[
      'https://images.unsplash.com/photo-1551632436-cbf8dd35adfa?w=800&q=80',
      'https://images.unsplash.com/photo-1539020140153-e479b8c22e70?w=800&q=80',
      'https://images.unsplash.com/photo-1572073263888-da4af9af2bf5?w=800&q=80',
      'https://images.unsplash.com/photo-1529963183134-61a90db47eaf?w=800&q=80'
    ],
    desc:"Photography, culture, and mountain air in Morocco's most beautiful blue city. Wander the labyrinthine blue medina, hike in the Rif Mountains, meet artisans.",
    hi:['Free exploration of the iconic blue medina','Rif Mountain hike to Ain Tissimane waterfall','Goat cheese farm visit','Hemp weaving artisan workshop','Sunset from the Spanish Mosque hilltop'],
    inc:['Expert local Chefchaouen guide','2 nights in a charming blue riad','All breakfasts','Mountain hike with guide','Goat farm visit and cheese tasting'],
    exc:['Flights','Meals except breakfast','Personal shopping'],
    it:[
      {d:1,t:'Arrival and Blue Medina Exploration',desc:'Guided tour of the blue medina, kasbah museum. Sunset from the Spanish Mosque.'},
      {d:2,t:'Rif Mountain Day Hike',desc:'Full day hike to waterfall. Goat cheese farm lunch.'},
      {d:3,t:'Souks and Artisan Workshop',desc:'Weekly market visit. Hemp weaving workshop. Farewell lunch.'}
    ]
  },

  /* ── SUR MESURE ──────────────────────────────── */
  {
    id:'mesure-desert', segment:'mesure', type:'desert',
    title:'Circuit Désert Sur Mesure', loc:'Au choix — Merzouga, Zagora, Draa', dur:'Flexible — 3 à 10 jours',
    days:5, nights:4, price:2200, pChild:1300, rating:5.0, rev:29, maxP:10, minP:2,
    badge:'Sur Mesure', dif:'Modéré',
    tags:['Désert','Sur Mesure','Privé'],
    img:'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=800&q=80',
    imgs:[
      'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=800&q=80',
      'https://images.unsplash.com/photo-1532960401447-7dd05bef20b0?w=800&q=80',
      'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800&q=80',
      'https://images.unsplash.com/photo-1549144511-f099e773c147?w=800&q=80'
    ],
    desc:'Your Sahara, your rules. We design a completely bespoke desert journey around your dates, group size, interests, and budget.',
    hi:['100% private — no shared groups','Itinerary designed from scratch by our experts','Choose your desert: Erg Chebbi or Erg Chigaga','Luxury bivouac or authentic nomad camp','Flexible dates and duration'],
    inc:['Full itinerary design consultation','Private transport and guide','Accommodation of your choice','Meals as agreed','All permits and logistics'],
    exc:['Flights','Personal insurance','Activities outside agreed itinerary'],
    it:[
      {d:1,t:'Discovery Call & Itinerary Design',desc:'Our experts build your perfect desert journey.'},
      {d:2,t:'Departure Day',desc:'Private transfer to your chosen desert destination.'},
      {d:3,t:'Desert Immersion',desc:'Days shaped entirely around your preferences.'},
      {d:4,t:'Deep Desert or Valley Exploration',desc:'Extended routes, villages, oases — as you prefer.'},
      {d:5,t:'Return Journey',desc:'Private transfer back at your chosen time.'}
    ]
  },
  {
    id:'mesure-mountain', segment:'mesure', type:'mountain',
    title:'Trek Sur Mesure — Atlas et Vallées', loc:"Toubkal, M'Goun, Aït Benhaddou", dur:'Flexible — 2 à 12 jours',
    days:6, nights:5, price:2600, pChild:1500, rating:5.0, rev:18, maxP:8, minP:2,
    badge:'Sur Mesure', dif:'Sportif',
    tags:['Montagne','Sur Mesure','Privé'],
    img:'https://images.unsplash.com/photo-1529963183134-61a90db47eaf?w=800&q=80',
    imgs:[
      'https://images.unsplash.com/photo-1529963183134-61a90db47eaf?w=800&q=80',
      'https://images.unsplash.com/photo-1548759806-821b06afb3bb?w=800&q=80',
      'https://images.unsplash.com/photo-1542621334-a254cf47733d?w=800&q=80',
      'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=800&q=80'
    ],
    desc:'For those who want more than a standard route. We design mountain itineraries that match your fitness level, interests, and time.',
    hi:["Choose your mountain: Toubkal, M'Goun, or Sirwa",'Fully private with certified mountain guide','Fitness-appropriate pace and difficulty','Access to off-the-map Berber villages','Possible combination with desert or coastal leg'],
    inc:['Full route design consultation','Private CAF-certified mountain guide','All accommodation on route','Full board meals','Trek permits and safety equipment'],
    exc:['Personal trekking gear','Personal insurance'],
    it:[
      {d:1,t:'Consultation & Route Design',desc:'We map your perfect mountain itinerary.'},
      {d:2,t:'Start at Imlil or your chosen trailhead',desc:'Private transport from Marrakech.'},
      {d:3,t:'Mountain Days',desc:'Route shaped around your abilities and interests.'},
      {d:4,t:'High Camp or Village Stay',desc:'Remote accommodation or traditional guesthouse.'},
      {d:5,t:'Summit or Plateau Day',desc:'The high point of your trek.'},
      {d:6,t:'Return',desc:'Descent and return transfer.'}
    ]
  },
  {
    id:'coastal', segment:'mesure', type:'coastal',
    title:'Road Trip Côtier Sur Mesure', loc:'Casablanca → Essaouira → Agadir', dur:'Flexible — 3 à 7 jours',
    days:5, nights:4, price:2800, pChild:1700, rating:4.8, rev:52, maxP:8, minP:2,
    badge:'Sur Mesure', dif:'Facile',
    tags:['Côte','Sur Mesure','Road Trip'],
    img:'https://images.unsplash.com/photo-1568392200955-97c7e6e9eb6e?w=800&q=80',
    imgs:[
      'https://images.unsplash.com/photo-1568392200955-97c7e6e9eb6e?w=800&q=80',
      'https://images.unsplash.com/photo-1561634507-97862c73c024?w=800&q=80',
      'https://images.unsplash.com/photo-1532960401447-7dd05bef20b0?w=800&q=80',
      'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800&q=80'
    ],
    desc:"Morocco's Atlantic coastline from your own private 4x4. We design the route, you set the pace.",
    hi:['Fully private 4x4 with expert driver-guide','Route designed around your interests','Argan cooperative, surf lesson, whale watching optional','Select your accommodation level','Flexible departure and pace'],
    inc:['Private 4x4 with certified driver-guide','Accommodation of your choice','All breakfasts','Argan cooperative visit','Activities as agreed'],
    exc:['Flights','Most lunches and dinners'],
    it:[
      {d:1,t:'Casablanca → Oualidia',desc:'Drive south. El Jadida Portuguese cistern.'},
      {d:2,t:'→ Essaouira',desc:'Safi pottery. Arrive blue-white Essaouira.'},
      {d:3,t:'Essaouira',desc:'Free day. Argan cooperative. Ramparts at sunset.'},
      {d:4,t:'→ Taghazout',desc:'Surf or watch. Seafood by the ocean.'},
      {d:5,t:'→ Agadir',desc:'Souss-Massa Nature Reserve. Farewell lunch.'}
    ]
  },
  {
    id:'mesure-cultural', segment:'mesure', type:'cultural',
    title:'Immersion Culturelle Sur Mesure', loc:'Marrakech, Fes, Chefchaouen, Essaouira', dur:'Flexible — 3 à 14 jours',
    days:7, nights:6, price:2000, pChild:1200, rating:5.0, rev:22, maxP:8, minP:2,
    badge:'Sur Mesure', dif:'Facile',
    tags:['Culture','Sur Mesure','Immersion'],
    img:'https://images.unsplash.com/photo-1572073263888-da4af9af2bf5?w=800&q=80',
    imgs:[
      'https://images.unsplash.com/photo-1572073263888-da4af9af2bf5?w=800&q=80',
      'https://images.unsplash.com/photo-1539020140153-e479b8c22e70?w=800&q=80',
      'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=800&q=80',
      'https://images.unsplash.com/photo-1551632436-cbf8dd35adfa?w=800&q=80'
    ],
    desc:"Morocco's culture is layered, complex, and endlessly surprising. We build a cultural journey that goes as deep as you want.",
    hi:['Fully private cultural guide for each city','Artisan workshop access not open to public','Private riad dinner with Moroccan family','Music evening in a private home','Customizable depth — light cultural dip or full immersion'],
    inc:['Private cultural expert guides','Boutique riad accommodation','All breakfasts and selected meals','All entrance fees and workshops','Private transport between destinations'],
    exc:['International flights','Personal purchases'],
    it:[
      {d:1,t:'Arrival and Welcome Dinner',desc:'First impressions of Marrakech. Private riad dinner.'},
      {d:2,t:'Marrakech Deep Dive',desc:'Souks, craftsmen, gardens, and hidden riads.'},
      {d:3,t:'→ Fes — Medieval City',desc:"Drive or train to Morocco's cultural capital."},
      {d:4,t:'Fes el-Bali Immersion',desc:'Tanneries, madrasas, artisan quarters.'},
      {d:5,t:'Day Trip to Chefchaouen',desc:'The blue city and Rif mountain culture.'},
      {d:6,t:'→ Essaouira Atlantic Culture',desc:'Gnawa music. Jewish heritage. Atlantic art scene.'},
      {d:7,t:'Farewell Marrakech',desc:'Return south. Final medina walk. Departure.'}
    ]
  },

  /* ── TEAM BUILDING ──────────────────────────── */
  {
    id:'team-desert', segment:'team', type:'desert',
    title:'Team Building Désert — Cohésion Extrême', loc:'Merzouga, Erg Chebbi', dur:'2 Days / 1 Night',
    days:2, nights:1, price:3200, pChild:null, rating:5.0, rev:31, maxP:60, minP:8,
    badge:'Team Building', dif:'Modéré',
    tags:['Team Building','Désert','Corporate'],
    img:'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800&q=80',
    imgs:[
      'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800&q=80',
      'https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=800&q=80',
      'https://images.unsplash.com/photo-1532960401447-7dd05bef20b0?w=800&q=80',
      'https://images.unsplash.com/photo-1549144511-f099e773c147?w=800&q=80'
    ],
    desc:'Remove every comfort zone. The Sahara desert is the ultimate leadership laboratory.',
    hi:['Desert navigation challenge — orient by stars and dunes','Bivouac setup as team challenge','Leadership workshop at sunrise on the dunes','Silence protocol — 2-hour mindful desert walk','Facilitated reflection and action planning session'],
    inc:['Certified professional facilitator','Private desert bivouac','All meals full board','All outdoor equipment','Post-program team report','Transport from Casablanca or Marrakech'],
    exc:['Personal expenses','Alcoholic beverages'],
    it:[
      {d:1,t:'Arrival → Desert Navigation Challenge → Bivouac',desc:'Arrive Merzouga. Orientation challenge. Team bivouac setup. Berber dinner and debrief.'},
      {d:2,t:'Sunrise Workshop → Debrief → Return',desc:'Sunrise leadership session. Action planning. Return transfer.'}
    ]
  },
  {
    id:'team', segment:'team', type:'mountain',
    title:'Team Building Atlas — Défi Montagne', loc:"Vallée de l'Ourika, Atlas", dur:'2 Days / 1 Night',
    days:2, nights:1, price:2500, pChild:null, rating:4.9, rev:56, maxP:80, minP:8,
    badge:'Team Building', dif:'Modéré',
    tags:['Team Building','Montagne','Corporate'],
    img:'https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=800&q=80',
    imgs:[
      'https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=800&q=80',
      'https://images.unsplash.com/photo-1542621334-a254cf47733d?w=800&q=80',
      'https://images.unsplash.com/photo-1508854710579-5cecc3a9ff17?w=800&q=80',
      'https://images.unsplash.com/photo-1529963183134-61a90db47eaf?w=800&q=80'
    ],
    desc:'Leave the conference room behind. Our signature corporate team building program. Trusted by 120+ companies.',
    hi:['Customized outdoor challenge courses','Leadership and communication workshops','Moroccan cooking team challenge','Waterfall hike and group activities','Evening bonfire with live Gnawa music'],
    inc:['Full program design and facilitation','Transport from Casablanca or Marrakech','1 night in a mountain lodge','All meals full board','All outdoor equipment','Post-program feedback report'],
    exc:['Flights if applicable','Personal expenses','Alcoholic beverages'],
    it:[
      {d:1,t:'Arrival → Icebreakers → Outdoor Challenges',desc:'Morning arrival. Icebreaker activities. Afternoon outdoor challenge circuits. Evening bonfire.'},
      {d:2,t:'Leadership Workshop → Cooking Challenge → Debrief',desc:'Morning workshop. Cooking challenge lunch. Afternoon action planning. Return transfer.'}
    ]
  },
  {
    id:'team-coastal', segment:'team', type:'coastal',
    title:'Team Building Côte — Voile & Leadership', loc:'Essaouira, Côte Atlantique', dur:'2 Days / 1 Night',
    days:2, nights:1, price:2900, pChild:null, rating:4.8, rev:24, maxP:40, minP:8,
    badge:'Team Building', dif:'Modéré',
    tags:['Team Building','Côte','Voile'],
    img:'https://images.unsplash.com/photo-1568392200955-97c7e6e9eb6e?w=800&q=80',
    imgs:[
      'https://images.unsplash.com/photo-1568392200955-97c7e6e9eb6e?w=800&q=80',
      'https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=800&q=80',
      'https://images.unsplash.com/photo-1561634507-97862c73c024?w=800&q=80',
      'https://images.unsplash.com/photo-1532960401447-7dd05bef20b0?w=800&q=80'
    ],
    desc:"The Atlantic wind as your team facilitator. Sailing and kite surfing challenges off Essaouira's famous coast.",
    hi:['Sailing challenge — 2-hour offshore team race','Kitesurfing or windsurfing initiation','Beach leadership workshop at sunset','Seafood team dinner in Essaouira medina','Facilitated reflection: sea metaphors for teamwork'],
    inc:['Certified facilitator','2 sailing sessions with instructor','All safety equipment','Seafood team dinner','1 night in a boutique riad'],
    exc:['Transport to Essaouira','Alcoholic beverages'],
    it:[
      {d:1,t:'Arrival → Sailing Challenge → Debrief',desc:'Arrive Essaouira. Safety briefing. 2-hour team sailing challenge. Evening debrief and dinner.'},
      {d:2,t:'Kitesurfing Initiation → Final Workshop → Return',desc:'Morning water sports. Midday leadership workshop. Post-lunch action planning. Return.'}
    ]
  },
  {
    id:'team-cultural', segment:'team', type:'cultural',
    title:'Team Building Culturel — Médina & Cohésion', loc:'Marrakech Médina', dur:'1 Day',
    days:1, nights:0, price:1800, pChild:null, rating:4.8, rev:43, maxP:80, minP:8,
    badge:'Team Building', dif:'Facile',
    tags:['Team Building','Culture','Marrakech'],
    img:'https://images.unsplash.com/photo-1572073263888-da4af9af2bf5?w=800&q=80',
    imgs:[
      'https://images.unsplash.com/photo-1572073263888-da4af9af2bf5?w=800&q=80',
      'https://images.unsplash.com/photo-1539020140153-e479b8c22e70?w=800&q=80',
      'https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=800&q=80',
      'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=800&q=80'
    ],
    desc:"The ultimate urban team challenge. Navigate Marrakech's 9,000-alley medina as a team.",
    hi:['Medina team navigation challenge (GPS-free)','Cultural mission stations throughout the souks','Moroccan cooking competition in a private riad','Artisan craft challenge','Evening celebration dinner with live music'],
    inc:['Certified facilitator','All medina challenge materials','Cooking class with ingredients','Private riad for the day','Celebration dinner'],
    exc:['Transport to Marrakech','Personal shopping'],
    it:[
      {d:1,t:'Morning: Navigation Challenge',desc:'Teams navigate the medina independently. Cultural missions at key sites.'},
      {d:2,t:'Afternoon: Cooking Competition',desc:'Teams cook a Moroccan feast against the clock. Evening celebration.'}
    ]
  }
];
