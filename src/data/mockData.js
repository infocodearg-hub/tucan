// Mock Data for Set&gol App

export const COMPLEX_INFO = {
  id: 'cmp_maracana',
  name: 'Complejo El Maracaná',
  city: 'Córdoba Capital, Argentina',
  address: 'Av. Colón 4500',
  phone: '+54 9 351 555-4321',
  canchas: [
    { id: 'c1', name: 'Cancha 1 - Sintético A', type: 'Fútbol 5', priceDay: 22000, priceNight: 26000, color: '#00E676' },
    { id: 'c2', name: 'Cancha 2 - Sintético B', type: 'Fútbol 5', priceDay: 22000, priceNight: 26000, color: '#00B0FF' },
    { id: 'c3', name: 'Cancha 3 - Cristal Pro', type: 'Pádel', priceDay: 18000, priceNight: 22000, color: '#A855F7' }
  ],
  señaMinimaPorcentaje: 50,
  cbu: '0000003100084920491823',
  alias: 'MARACANA.FUTBOL.MP',
  whatsappBotActive: true
};

export const TIME_SLOTS = [
  '14:00', '15:00', '16:00', '17:00', '18:00', 
  '19:00', '20:00', '21:00', '22:00', '23:00', '00:00'
];

export const INITIAL_BOOKINGS = [
  {
    id: 'b1',
    canchaId: 'c1',
    time: '19:00',
    date: '2026-08-04',
    clientName: 'Marcos Benítez',
    clientPhone: '+54 9 351 612-3456',
    status: 'partial', // 'partial' = señado, 'paid' = pagado, 'fixed' = turno fijo, 'blocked' = bloqueado
    totalPrice: 26000,
    depositPaid: 13000,
    paymentMethod: 'Mercado Pago (Automático WhatsApp Bot)',
    cantinaExtras: [
      { id: 'prod_gatorade', name: 'Gatorade 500ml', qty: 2, price: 2500 }
    ],
    notes: 'Solicitan pecheras rojas.',
    isFixed: false,
    channel: 'bot_ai'
  },
  {
    id: 'b2',
    canchaId: 'c1',
    time: '21:00',
    date: '2026-08-04',
    clientName: 'Gonzalo "El Hacha" Pérez',
    clientPhone: '+54 9 351 498-1122',
    status: 'fixed',
    totalPrice: 26000,
    depositPaid: 26000,
    paymentMethod: 'Transferencia Bancaria',
    cantinaExtras: [],
    notes: 'Turno Fijo de los Martes (Equipo Los Troncos). Abono al día.',
    isFixed: true,
    channel: 'manual'
  },
  {
    id: 'b3',
    canchaId: 'c2',
    time: '20:00',
    date: '2026-08-04',
    clientName: 'Mateo Rossi',
    clientPhone: '+54 9 351 777-8899',
    status: 'paid',
    totalPrice: 26000,
    depositPaid: 26000,
    paymentMethod: 'Mercado Pago (Link QR Bot)',
    cantinaExtras: [
      { id: 'prod_cerveza', name: 'Stella Artois 1L', qty: 2, price: 4200 }
    ],
    notes: 'Pagó el 100% por adelantado con Bot.',
    isFixed: false,
    channel: 'bot_ai'
  },
  {
    id: 'b4',
    canchaId: 'c2',
    time: '22:00',
    date: '2026-08-04',
    clientName: 'Santiago Ledesma',
    clientPhone: '+54 9 351 333-4455',
    status: 'partial',
    totalPrice: 26000,
    depositPaid: 13000,
    paymentMethod: 'Efectivo Mostrador',
    cantinaExtras: [],
    notes: 'Seña abonada en persona la semana pasada.',
    isFixed: false,
    channel: 'manual'
  },
  {
    id: 'b5',
    canchaId: 'c3',
    time: '18:00',
    date: '2026-08-04',
    clientName: 'Lucía Fernández & Pareja',
    clientPhone: '+54 9 351 901-2233',
    status: 'paid',
    totalPrice: 18000,
    depositPaid: 18000,
    paymentMethod: 'Mercado Pago',
    cantinaExtras: [
      { id: 'prod_agua', name: 'Agua Villavicencio 500ml', qty: 2, price: 1500 }
    ],
    notes: 'Turno de Pádel. Requieren alquiler de 2 paletas.',
    isFixed: false,
    channel: 'bot_ai'
  },
  {
    id: 'b6',
    canchaId: 'c1',
    time: '23:00',
    date: '2026-08-04',
    clientName: 'Mantenimiento Luces',
    clientPhone: '-',
    status: 'blocked',
    totalPrice: 0,
    depositPaid: 0,
    paymentMethod: '-',
    cantinaExtras: [],
    notes: 'Cambio de reflector LED número 3.',
    isFixed: false,
    channel: 'manual'
  },
  // `dayOffset` (relativo a hoy, 0 = hoy) — reparte turnos en varios días para
  // que la tira semanal y el historial de caja no arranquen vacíos fuera de hoy.
  {
    id: 'b7',
    canchaId: 'c3',
    time: '19:00',
    date: '2026-08-03',
    dayOffset: -1,
    clientName: 'Emilia Torres',
    clientPhone: '+54 9 351 445-6677',
    status: 'paid',
    totalPrice: 22000,
    depositPaid: 22000,
    paymentMethod: 'Mercado Pago',
    cantinaExtras: [
      { id: 'prod_agua', name: 'Agua Mineral 500ml', qty: 2, price: 1500 }
    ],
    notes: 'Turno de Pádel femenino, pagó completo.',
    isFixed: false,
    channel: 'bot_ai'
  },
  {
    id: 'b8',
    canchaId: 'c1',
    time: '18:00',
    date: '2026-08-03',
    dayOffset: -1,
    clientName: 'Rodrigo "Rulo" Medina',
    clientPhone: '+54 9 351 556-7788',
    status: 'partial',
    totalPrice: 22000,
    depositPaid: 11000,
    paymentMethod: 'Efectivo Mostrador',
    cantinaExtras: [],
    notes: 'Seña abonada en el mostrador.',
    isFixed: false,
    channel: 'manual'
  },
  {
    id: 'b9',
    canchaId: 'c2',
    time: '19:00',
    date: '2026-08-02',
    dayOffset: -2,
    clientName: 'Valentina Suárez',
    clientPhone: '+54 9 351 667-8899',
    status: 'paid',
    totalPrice: 22000,
    depositPaid: 22000,
    paymentMethod: 'Transferencia Bancaria',
    cantinaExtras: [
      { id: 'prod_papas', name: 'Papas Lays 140g', qty: 1, price: 2200 },
      { id: 'prod_coca', name: 'Coca Cola 500ml', qty: 2, price: 2000 }
    ],
    notes: '',
    isFixed: false,
    channel: 'manual'
  },
  {
    id: 'b10',
    canchaId: 'c1',
    time: '20:00',
    date: '2026-08-05',
    dayOffset: 1,
    clientName: 'Marcos Benítez',
    clientPhone: '+54 9 351 612-3456',
    status: 'partial',
    totalPrice: 26000,
    depositPaid: 13000,
    paymentMethod: 'Mercado Pago (Automático WhatsApp Bot)',
    cantinaExtras: [],
    notes: 'Reservó para mañana con el bot.',
    isFixed: false,
    channel: 'bot_ai'
  },
  {
    id: 'b11',
    canchaId: 'c3',
    time: '20:00',
    date: '2026-08-05',
    dayOffset: 1,
    clientName: 'Lucía Fernández & Pareja',
    clientPhone: '+54 9 351 901-2233',
    status: 'paid',
    totalPrice: 18000,
    depositPaid: 18000,
    paymentMethod: 'Mercado Pago',
    cantinaExtras: [],
    notes: 'Turno de Pádel de mañana.',
    isFixed: false,
    channel: 'bot_ai'
  },
  {
    id: 'b12',
    canchaId: 'c2',
    time: '21:00',
    date: '2026-08-06',
    dayOffset: 2,
    clientName: 'Mateo Rossi',
    clientPhone: '+54 9 351 777-8899',
    status: 'partial',
    totalPrice: 26000,
    depositPaid: 13000,
    paymentMethod: 'Efectivo Mostrador',
    cantinaExtras: [
      { id: 'prod_cerveza', name: 'Stella Artois 1L', qty: 1, price: 4200 }
    ],
    notes: '',
    isFixed: false,
    channel: 'manual'
  }
];

export const TURNOS_FIJOS_RECURRENTES = [
  {
    id: 'tf1',
    day: 'Martes',
    time: '21:00 hs',
    cancha: 'Cancha 1 (Fútbol 5)',
    teamName: 'Los Troncos F.C.',
    captain: 'Gonzalo Pérez',
    phone: '+54 9 351 498-1122',
    monthlyStatus: 'Al día',
    monthlyPrice: 104000
  },
  {
    id: 'tf2',
    day: 'Miércoles',
    time: '20:00 hs',
    cancha: 'Cancha 2 (Fútbol 5)',
    teamName: 'Asado & Gambeta',
    captain: 'Carlos Giménez',
    phone: '+54 9 351 222-9988',
    monthlyStatus: 'Al día',
    monthlyPrice: 104000
  },
  {
    id: 'tf3',
    day: 'Jueves',
    time: '22:00 hs',
    cancha: 'Cancha 1 (Fútbol 5)',
    teamName: 'La Scaloneta de Córdoba',
    captain: 'Facundo Quiroga',
    phone: '+54 9 351 654-9870',
    monthlyStatus: 'Pendiente Seña Mes',
    monthlyPrice: 104000
  },
  {
    id: 'tf4',
    day: 'Viernes',
    time: '21:00 hs',
    cancha: 'Cancha 3 (Pádel)',
    teamName: 'Padeleros del Sur',
    captain: 'Martín Gómez',
    phone: '+54 9 351 111-3344',
    monthlyStatus: 'Al día',
    monthlyPrice: 88000
  },
  {
    id: 'tf5',
    day: 'Lunes',
    time: '20:00 hs',
    cancha: 'Cancha 2 (Fútbol 5)',
    teamName: 'Los del Barrio F.C.',
    captain: 'Emilia Torres',
    phone: '+54 9 351 445-6677',
    monthlyStatus: 'Al día',
    monthlyPrice: 104000
  },
  {
    id: 'tf6',
    day: 'Sábado',
    time: '18:00 hs',
    cancha: 'Cancha 3 (Pádel)',
    teamName: 'Dupla Suárez-Medina',
    captain: 'Valentina Suárez',
    phone: '+54 9 351 667-8899',
    monthlyStatus: 'Pendiente Seña Mes',
    monthlyPrice: 88000
  },
  {
    id: 'tf7',
    day: 'Domingo',
    time: '19:00 hs',
    cancha: 'Cancha 1 (Fútbol 5)',
    teamName: 'Domingueros F.C.',
    captain: 'Rodrigo Medina',
    phone: '+54 9 351 556-7788',
    monthlyStatus: 'Al día',
    monthlyPrice: 104000
  }
];

export const CANTINA_PRODUCTS = [
  { id: 'prod_gatorade', name: 'Gatorade 500ml', category: 'Bebidas', price: 2500, stock: 48, icon: '🥤' },
  { id: 'prod_cerveza', name: 'Stella Artois 1L', category: 'Bebidas', price: 4200, stock: 30, icon: '🍺' },
  { id: 'prod_fernet', name: 'Fernet Branca + Coca 1.5L', category: 'Tragos', price: 9500, stock: 15, icon: '🍸' },
  { id: 'prod_agua', name: 'Agua Mineral 500ml', category: 'Bebidas', price: 1500, stock: 60, icon: '💧' },
  { id: 'prod_coca', name: 'Coca Cola 500ml', category: 'Bebidas', price: 2000, stock: 40, icon: '🥤' },
  { id: 'prod_papas', name: 'Papas Lays 140g', category: 'Snacks', price: 2200, stock: 25, icon: '🍟' },
  { id: 'prod_pelota', name: 'Alquiler Pelota Penalty F5', category: 'Servicios', price: 1500, stock: 5, icon: '⚽' },
  { id: 'prod_pecheras', name: 'Alquiler Pecheras (10u)', category: 'Servicios', price: 2000, stock: 10, icon: '🎽' },
  { id: 'prod_paleta', name: 'Alquiler Paleta Pádel Varlion', category: 'Servicios', price: 3500, stock: 6, icon: '🎾' }
];

export const CLIENTS_DATABASE = [
  {
    id: 'cli1',
    name: 'Marcos Benítez',
    phone: '+54 9 351 612-3456',
    matchesPlayed: 18,
    cancellations: 0,
    badge: 'Jugador VIP ⭐️',
    score: '10/10',
    lastMatch: 'Hoy 19:00 hs',
    totalSpent: 340000
  },
  {
    id: 'cli2',
    name: 'Gonzalo Pérez',
    phone: '+54 9 351 498-1122',
    matchesPlayed: 45,
    cancellations: 1,
    badge: 'Capitán Fijo 🛡️',
    score: '9.8/10',
    lastMatch: 'Hoy 21:00 hs',
    totalSpent: 920000
  },
  {
    id: 'cli3',
    name: 'Joaquín "El Rápido" Silva',
    phone: '+54 9 351 888-2211',
    matchesPlayed: 6,
    cancellations: 3,
    badge: 'Ojo: Cancela tarde ⚠️',
    score: '5.5/10',
    lastMatch: 'Hace 12 días',
    totalSpent: 98000
  },
  {
    id: 'cli4',
    name: 'Mateo Rossi',
    phone: '+54 9 351 777-8899',
    matchesPlayed: 12,
    cancellations: 0,
    badge: 'Cliente Fiel 🌟',
    score: '10/10',
    lastMatch: 'Hoy 20:00 hs',
    totalSpent: 280000
  },
  {
    id: 'cli5',
    name: 'Emilia Torres',
    phone: '+54 9 351 445-6677',
    matchesPlayed: 22,
    cancellations: 0,
    badge: 'Capitana Fija 🛡️',
    score: '10/10',
    lastMatch: 'Ayer 19:00 hs',
    totalSpent: 410000
  },
  {
    id: 'cli6',
    name: 'Rodrigo "Rulo" Medina',
    phone: '+54 9 351 556-7788',
    matchesPlayed: 9,
    cancellations: 1,
    badge: 'Cliente Nuevo',
    score: '8.5/10',
    lastMatch: 'Ayer 18:00 hs',
    totalSpent: 150000
  },
  {
    id: 'cli7',
    name: 'Valentina Suárez',
    phone: '+54 9 351 667-8899',
    matchesPlayed: 15,
    cancellations: 0,
    badge: 'Jugadora VIP ⭐️',
    score: '9.5/10',
    lastMatch: 'Hace 2 días',
    totalSpent: 300000
  }
];

export const BOT_CHATS_SIMULATED = [
  {
    id: 'chat1',
    clientName: 'Agustín Roldán',
    phone: '+54 9 351 999-4411',
    unread: false,
    botStatus: 'auto', // 'auto' | 'human'
    messages: [
      { sender: 'user', text: 'Hola pá, tenés libre la cancha 1 para hoy a las 8 de la noche o las 9?', time: '17:42' },
      { sender: 'bot', text: '¡Hola Agustín! 👋 Para hoy en Cancha 1 (Fútbol 5) tenemos disponible:\n\n⚽ 20:00 hs ($26.000)\n\nLa de las 21:00 hs ya está reservada. ¿Te guardo el turno de las 20:00 hs?', time: '17:42' },
      { sender: 'user', text: 'Sisi guardamelo a las 20hs porfa, somos los pibes de siempre', time: '17:43' },
      { sender: 'bot', text: '¡Excelente! 🎯 Reservado a tu nombre:\n\n📅 Hoy 20:00 hs - Cancha 1\n💰 Seña requerida: $13.000 (50%)\n\nPodés abonar por Mercado Pago haciendo clic acá 👇\nhttps://mpago.la/tucan-maracana-20hs\nO al Alias: MARACANA.FUTBOL.MP\n\nEnviame la foto del comprobante apenas transfieras.', time: '17:43' }
    ]
  },
  {
    id: 'chat2',
    clientName: 'Nico Zabala',
    phone: '+54 9 351 123-9900',
    unread: true,
    botStatus: 'human', // Intervención requerida
    messages: [
      { sender: 'user', text: 'Che queremos hacer un torneo del trabajo el sábado que viene de 14 a 18hs y queríamos saber si nos hacen precio por las dos canchas juntas con asado', time: '17:48' },
      { sender: 'bot', text: '¡Hola Nico! 🏆 Qué buena idea. Tu consulta sobre el torneo de 4 horas con parrilla requiere atención especial del encargado. En un momento se comunica con vos.', time: '17:48' },
      { sender: 'system', text: '⚠️ La IA derivó la conversación a Intervención Humana (Consulta de Torneo / Evento especial).', time: '17:48' }
    ]
  }
];
