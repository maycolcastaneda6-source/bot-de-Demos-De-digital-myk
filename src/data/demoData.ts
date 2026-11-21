import { DentalAppointment, BeautyAppointment, GreenApiConfig, SalesLead } from '../types';

export const initialDentalAppointments: DentalAppointment[] = [
  {
    id: 'dent_1',
    registrationDate: '27/08 08:15 AM',
    patientName: 'Carlos Mendoza',
    whatsapp: '+51 987654321',
    treatment: 'Limpieza Dental',
    requestedDateTime: '28/08 - 4:00 PM',
    status: '🟢 Nueva Cita',
    notes: 'Registrado automáticamente vía Bot WhatsApp Esencial'
  },
  {
    id: 'dent_2',
    registrationDate: '27/08 09:30 AM',
    patientName: 'Lucía Castro',
    whatsapp: '+51 912345678',
    treatment: 'Evaluación Ortodoncia',
    requestedDateTime: '29/08 - 10:00 AM',
    status: '🟡 Confirmado',
    notes: 'Confirmado por recepción para Dr. Ramírez'
  },
  {
    id: 'dent_3',
    registrationDate: '27/08 11:45 AM',
    patientName: 'Roberto Sánchez',
    whatsapp: '+51 955443322',
    treatment: 'Blanqueamiento',
    requestedDateTime: '27/08 - 6:00 PM',
    status: '🔵 Atendido',
    notes: 'Tratamiento completado con éxito'
  }
];

export const initialBeautyAppointments: BeautyAppointment[] = [
  {
    id: 'bt_1',
    date: '27/08 10:30 AM',
    clientName: 'Valeria Morales',
    whatsapp: '+51 977112233',
    service: 'Manicure Acrílica',
    amount: 60,
    dateTimeRequested: '28/08 - 3:00 PM',
    status: 'Por Confirmar',
    stylist: 'Mía Recepción IA',
    notes: 'Diseño baby boomer solicitado en chat'
  },
  {
    id: 'bt_2',
    date: '27/08 11:15 AM',
    clientName: 'Andrea Benítez',
    whatsapp: '+51 966223344',
    service: 'Alisado con Queratina',
    amount: 180,
    dateTimeRequested: '28/08 - 5:00 PM',
    status: 'Por Confirmar',
    stylist: 'Mía Recepción IA',
    notes: 'Cabello largo, promo tratamiento intensivo'
  },
  {
    id: 'bt_3',
    date: '27/08 09:00 AM',
    clientName: 'Sofía Paredes',
    whatsapp: '+51 944556677',
    service: 'Pedicure Spa',
    amount: 45,
    dateTimeRequested: '27/08 - 11:00 AM',
    status: 'En Atención',
    stylist: 'Gabriela (Especialista)',
    notes: 'En cabina 2 de reflexología'
  },
  {
    id: 'bt_4',
    date: '26/08 04:00 PM',
    clientName: 'Camila Vega',
    whatsapp: '+51 933889900',
    service: 'Corte de Cabello + Cepillado',
    amount: 50,
    dateTimeRequested: '26/08 - 5:30 PM',
    status: 'Finalizado / Pagado',
    stylist: 'Valeria Estilista',
    notes: 'Pago con Yape completado S/ 50'
  }
];

export const initialGreenApiConfig: GreenApiConfig = {
  idInstance: '710722724819',
  apiTokenInstance: '',
  apiUrl: 'https://7107.api.greenapi.com',
  webhookUrl: '/api/green-api/webhook',
  connectedPhone: '+51 986 150 562',
  status: 'connected',
  lastPing: 'En línea y recibiendo webhooks',
  pollingEnabled: true
};

export const initialSalesGreenApiConfig: GreenApiConfig = {
  idInstance: '710722803080',
  apiTokenInstance: '',
  apiUrl: 'https://7107.api.greenapi.com',
  webhookUrl: '/api/green-api/sales/webhook',
  connectedPhone: '+51 929 327 654',
  status: 'disconnected',
  lastPing: 'Motor Directo Sin Límites listo para vincular por QR o código de 8 dígitos',
  pollingEnabled: true,
  autoRespondAll: true,
  replyMode: 'text_only',
  provider: 'baileys'
};

export const initialSalesLeads: SalesLead[] = [
  {
    id: 'lead_1',
    registrationDate: 'Hoy 09:15 AM',
    clientName: 'Jorge Paredes',
    whatsapp: '+51 945112233',
    serviceInterest: 'Combo Asistente IA + Web Gratis',
    businessType: 'Clínica Dental',
    lastMessage: 'Quisiera contratar el plan de Asistente IA + Web, me envían las cuentas de Yape?',
    status: '💳 Pago / Cierre',
    estimatedValue: 390,
    paymentMethod: 'Yape (929327654)',
    paymentStatus: 'Por Verificar',
    priority: 'Alta',
    notes: 'Solicitó cuentas oficiales a nombre de Maycol Castañeda para separar proyecto'
  },
  {
    id: 'lead_2',
    registrationDate: 'Hoy 11:40 AM',
    clientName: 'Mariana Quispe',
    whatsapp: '+51 981223344',
    serviceInterest: 'App a la Medida',
    businessType: 'Distribuidora & Delivery',
    lastMessage: 'Necesito una app para gestionar pedidos, stock y reportes en tiempo real',
    status: '📄 Cotizado',
    estimatedValue: 750,
    paymentMethod: 'Scotiabank Ahorro Soles',
    paymentStatus: 'Pendiente',
    priority: 'Alta',
    notes: 'Propuesta técnica enviada • Solicita panel administrativo + notificaciones'
  },
  {
    id: 'lead_3',
    registrationDate: 'Ayer 04:20 PM',
    clientName: 'Carlos Villacorta',
    whatsapp: '+51 974332211',
    serviceInterest: 'Web Profesional PRO',
    businessType: 'Estudio Contable Corporativo',
    lastMessage: 'Excelente, ya realicé la transferencia al CCI de Scotiabank',
    status: '✅ Cerrado',
    estimatedValue: 290,
    paymentMethod: 'Scotiabank CCI',
    paymentStatus: 'Confirmado',
    priority: 'Media',
    notes: 'Abono confirmado • En etapa de diseño e integración SSL + SEO en la nube'
  }
];
