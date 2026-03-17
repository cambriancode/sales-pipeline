export type DemoStageCode = 'identified' | 'first_contact' | 'qualified' | 'proposal_sent' | 'first_order_expected' | 'won';

export interface DemoOpportunity {
  id: string;
  title: string;
  accountName: string;
  stageNameEs: string;
  stageNameEn: string;
  stageCode: DemoStageCode;
  probability: number;
  annualValue: number;
  weightedValue: number;
  nextActionDate: string;
  nextActionEs: string;
  nextActionEn: string;
  ownerName: string;
  typeEs: string;
  typeEn: string;
  status: 'open' | 'won';
  city: string;
  notesEs: string;
  notesEn: string;
  productsEs: string[];
  productsEn: string[];
}

export interface DemoAccount {
  id: string;
  name: string;
  city: string;
  country: string;
  typeEs: string;
  typeEn: string;
}

export interface DemoTask {
  id: string;
  descriptionEs: string;
  descriptionEn: string;
  opportunityTitle: string;
  dueDate: string;
  status: 'open' | 'overdue' | 'completed';
}

export const demoAccounts: DemoAccount[] = [
  {
    id: 'demo-1',
    name: 'Hotel Grupo Costa Azul',
    city: 'Cancún',
    country: 'México',
    typeEs: 'Hotel',
    typeEn: 'Hotel',
  },
  {
    id: 'demo-2',
    name: 'Festival Sabores del Norte',
    city: 'Monterrey',
    country: 'México',
    typeEs: 'Evento',
    typeEn: 'Event',
  },
  {
    id: 'demo-3',
    name: 'Restaurante La Terraza',
    city: 'Ciudad de México',
    country: 'México',
    typeEs: 'Restaurante',
    typeEn: 'Restaurant',
  },
];

export const demoOpportunities: DemoOpportunity[] = [
  {
    id: 'demo-hotel-chain',
    title: 'Cadena hotelera · programa de cerveza artesanal',
    accountName: 'Hotel Grupo Costa Azul',
    stageNameEs: 'Calificada / decisores involucrados',
    stageNameEn: 'Qualified / decision makers engaged',
    stageCode: 'qualified',
    probability: 30,
    annualValue: 480000,
    weightedValue: 144000,
    nextActionDate: '2026-03-20',
    nextActionEs: 'Presentar propuesta de portafolio para bares de alberca',
    nextActionEn: 'Present portfolio proposal for pool bars',
    ownerName: 'Brenda Nielsen',
    typeEs: 'Beer',
    typeEn: 'Beer',
    status: 'open',
    city: 'Cancún',
    notesEs: 'Interés en etiquetas premium y programa estacional para huéspedes internacionales.',
    notesEn: 'Interest in premium labels and seasonal program for international guests.',
    productsEs: ['Lager de la Casa', 'IPA Tropical', 'Programa de degustación'],
    productsEn: ['House Lager', 'Tropical IPA', 'Tasting program'],
  },
  {
    id: 'demo-festival-event',
    title: 'Festival gastronómico · barra de cerveza y experiencia guiada',
    accountName: 'Festival Sabores del Norte',
    stageNameEs: 'Propuesta / documentación enviada',
    stageNameEn: 'Proposal / documentation sent',
    stageCode: 'proposal_sent',
    probability: 60,
    annualValue: 180000,
    weightedValue: 108000,
    nextActionDate: '2026-03-18',
    nextActionEs: 'Dar seguimiento a propuesta económica y logística',
    nextActionEn: 'Follow up on commercial and logistics proposal',
    ownerName: 'Brenda Nielsen',
    typeEs: 'Event',
    typeEn: 'Event',
    status: 'open',
    city: 'Monterrey',
    notesEs: 'Se compartió paquete con barra móvil, staff y tasting dirigido para 400 asistentes.',
    notesEn: 'A package with mobile bar, staff, and guided tasting for 400 guests was shared.',
    productsEs: ['Barra móvil', 'Paquete tasting', 'Staff de servicio'],
    productsEn: ['Mobile bar', 'Tasting package', 'Service staff'],
  },
  {
    id: 'demo-restaurant-launch',
    title: 'Restaurante · primer pedido para lanzamiento de terraza',
    accountName: 'Restaurante La Terraza',
    stageNameEs: 'Primer pedido esperado',
    stageNameEn: 'First order expected',
    stageCode: 'first_order_expected',
    probability: 80,
    annualValue: 96000,
    weightedValue: 76800,
    nextActionDate: '2026-03-17',
    nextActionEs: 'Confirmar volumen inicial y fecha de entrega',
    nextActionEn: 'Confirm first volume and delivery date',
    ownerName: 'Brenda Nielsen',
    typeEs: 'Beer',
    typeEn: 'Beer',
    status: 'open',
    city: 'Ciudad de México',
    notesEs: 'Cliente listo para abrir terraza de primavera con dos líneas de cerveza y material POP.',
    notesEn: 'Customer ready to launch spring terrace with two beer lines and POP material.',
    productsEs: ['Session IPA', 'Amber Ale', 'Kit POP terraza'],
    productsEn: ['Session IPA', 'Amber Ale', 'Terrace POP kit'],
  },
];

export const demoTasks: DemoTask[] = [
  {
    id: 'demo-task-1',
    descriptionEs: 'Agendar presentación final con compras regionales',
    descriptionEn: 'Schedule final presentation with regional procurement',
    opportunityTitle: 'Cadena hotelera · programa de cerveza artesanal',
    dueDate: '2026-03-20',
    status: 'open',
  },
  {
    id: 'demo-task-2',
    descriptionEs: 'Enviar versión 2 de propuesta con opción de catering',
    descriptionEn: 'Send proposal v2 with catering option',
    opportunityTitle: 'Festival gastronómico · barra de cerveza y experiencia guiada',
    dueDate: '2026-03-18',
    status: 'overdue',
  },
  {
    id: 'demo-task-3',
    descriptionEs: 'Cerrar detalle de entrega y cobranza inicial',
    descriptionEn: 'Close delivery and initial payment details',
    opportunityTitle: 'Restaurante · primer pedido para lanzamiento de terraza',
    dueDate: '2026-03-17',
    status: 'open',
  },
];
