import { ChannelConfig, Conversation, AutomationRule, BotSettings, CannedResponse, QuickLeadScenario } from '../types';

export const initialChannels: ChannelConfig[] = [
  {
    id: 'chan_whatsapp',
    name: 'WhatsApp Business API',
    type: 'whatsapp',
    handleOrPhone: '+51 986 150 562',
    status: 'connected',
    botEnabled: true,
    messagesCount: 1428,
    lastActive: 'En línea',
    color: '#25D366',
    avatarBg: 'bg-emerald-600',
    webhookUrl: 'https://api.omniflow.io/v1/webhook/whatsapp_986150562',
    accountName: 'Línea Oficial WhatsApp (+51 986 150 562)'
  },
  {
    id: 'chan_instagram',
    name: 'Instagram Direct DMs',
    type: 'instagram',
    handleOrPhone: '@novatech_solutions',
    status: 'connected',
    botEnabled: true,
    messagesCount: 894,
    lastActive: 'Hace 5 min',
    color: '#E1306C',
    avatarBg: 'bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600',
    webhookUrl: 'https://api.omniflow.io/v1/webhook/meta_ig_dm_8820',
    accountName: 'NovaTech Brand & Commerce'
  },
  {
    id: 'chan_messenger',
    name: 'Facebook Messenger',
    type: 'messenger',
    handleOrPhone: 'fb.me/NovaTechOficial',
    status: 'connected',
    botEnabled: false,
    messagesCount: 512,
    lastActive: 'Hace 18 min',
    color: '#0084FF',
    avatarBg: 'bg-blue-600',
    webhookUrl: 'https://api.omniflow.io/v1/webhook/meta_messenger_3310',
    accountName: 'Página Facebook Verificada'
  },
  {
    id: 'chan_telegram',
    name: 'Telegram Bot API',
    type: 'telegram',
    handleOrPhone: '@NovaTech_SupportBot',
    status: 'connected',
    botEnabled: true,
    messagesCount: 340,
    lastActive: 'Hace 1 hora',
    color: '#0088cc',
    avatarBg: 'bg-sky-500',
    webhookUrl: 'https://api.omniflow.io/v1/webhook/tg_bot_7718',
    accountName: 'NovaTech 24/7 VIP Hub'
  },
  {
    id: 'chan_tiktok',
    name: 'TikTok Direct Messages',
    type: 'tiktok',
    handleOrPhone: '@novatech_oficial',
    status: 'connected',
    botEnabled: true,
    messagesCount: 215,
    lastActive: 'Hace 45 min',
    color: '#FE2C55',
    avatarBg: 'bg-neutral-900 border border-slate-700',
    webhookUrl: 'https://api.omniflow.io/v1/webhook/tiktok_shop_dm',
    accountName: 'TikTok Shop Channel'
  },
  {
    id: 'chan_webchat',
    name: 'Live Web Chat Widget',
    type: 'webchat',
    handleOrPhone: 'novatech.com/chat',
    status: 'connected',
    botEnabled: true,
    messagesCount: 680,
    lastActive: 'En línea',
    color: '#6366f1',
    avatarBg: 'bg-indigo-600',
    webhookUrl: 'https://api.omniflow.io/v1/widget/live_embed_01',
    accountName: 'Sitio Web Principal'
  }
];

export const initialConversations: Conversation[] = [
  {
    id: 'conv_1',
    channel: 'whatsapp',
    contactId: 'cnt_1',
    contactName: 'Carlos Mendoza Ramos',
    contactAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    contactHandleOrPhone: '+52 55 9812 4321',
    contactEmail: 'carlos.mendoza@grupoinnova.com',
    contactCompany: 'Grupo Innova Logistics',
    lastMessage: 'Perfecto, envíame la cotización para 15 licencias y cerramos el contrato esta semana.',
    lastMessageTime: '13:42',
    unreadCount: 1,
    status: 'open',
    priority: 'high',
    assignedAgent: 'Maycol Castañeda',
    tags: ['Lead Caliente', 'Corporativo', 'Licencias Pro'],
    botActive: false,
    sentiment: 'positivo',
    leadScore: 92,
    dealStage: 'Negociación',
    dealValue: 4800,
    summary: 'Cliente corporativo solicitando cotización formal para 15 puestos anuales con soporte dedicado.',
    notes: 'Solicitó descuento del 10% por pago anual anticipado. Alta probabilidad de cierre.',
    messages: [
      {
        id: 'm1_1',
        conversationId: 'conv_1',
        sender: 'customer',
        text: 'Hola buenas tardes, vi su solución en LinkedIn y necesito automatizar los canales de mi equipo comercial (15 asesores).',
        timestamp: '13:30',
        status: 'read'
      },
      {
        id: 'm1_2',
        conversationId: 'conv_1',
        sender: 'bot',
        text: '¡Hola Carlos! Qué gusto saludarte. Te comparto que nuestro plan Enterprise incluye integración con WhatsApp Business API, Instagram y CRM sin límite de contactos.',
        timestamp: '13:31',
        status: 'read',
        aiGenerated: true
      },
      {
        id: 'm1_3',
        conversationId: 'conv_1',
        sender: 'customer',
        text: 'Excelente, ¿incluye capacitación e integración con nuestro CRM actual?',
        timestamp: '13:35',
        status: 'read'
      },
      {
        id: 'm1_4',
        conversationId: 'conv_1',
        sender: 'agent',
        authorName: 'Maycol Castañeda',
        text: '¡Hola Carlos! Con gusto tomo tu caso. Sí, incluye onboarding guiado y sincronización bidireccional vía Webhook y API REST.',
        timestamp: '13:38',
        status: 'read'
      },
      {
        id: 'm1_5',
        conversationId: 'conv_1',
        sender: 'customer',
        text: 'Perfecto, envíame la cotización para 15 licencias y cerramos el contrato esta semana.',
        timestamp: '13:42',
        status: 'delivered'
      }
    ]
  },
  {
    id: 'conv_2',
    channel: 'instagram',
    contactId: 'cnt_2',
    contactName: 'Valeria Sotomayor',
    contactAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    contactHandleOrPhone: '@valeria_soto_design',
    contactEmail: 'valeria@studiodesign.co',
    contactCompany: 'Valeria Soto Studio',
    lastMessage: '¿Tienen disponible la integración directa para catálogo de productos en Instagram Shopping?',
    lastMessageTime: '13:15',
    unreadCount: 0,
    status: 'open',
    priority: 'medium',
    assignedAgent: 'Bot IA (Autónomo)',
    tags: ['Instagram DM', 'E-commerce', 'Catálogo'],
    botActive: true,
    sentiment: 'positivo',
    leadScore: 78,
    dealStage: 'Calificado',
    dealValue: 1200,
    summary: 'Diseñadora de moda interesada en conectar catálogo de productos para responder DMs con checkout.',
    notes: 'Interesada en plan mensual Pro.',
    messages: [
      {
        id: 'm2_1',
        conversationId: 'conv_2',
        sender: 'customer',
        text: 'Hola! Vi su reel sobre automatización de historias y DMs.',
        timestamp: '13:10',
        status: 'read'
      },
      {
        id: 'm2_2',
        conversationId: 'conv_2',
        sender: 'bot',
        text: '¡Hola Valeria! ✨ Gracias por contactarnos. Nuestro sistema permite responder automáticamente palabras clave en Historias, Comentarios y DMs al instante.',
        timestamp: '13:11',
        status: 'read',
        aiGenerated: true
      },
      {
        id: 'm2_3',
        conversationId: 'conv_2',
        sender: 'customer',
        text: '¿Tienen disponible la integración directa para catálogo de productos en Instagram Shopping?',
        timestamp: '13:15',
        status: 'read'
      }
    ]
  },
  {
    id: 'conv_3',
    channel: 'messenger',
    contactId: 'cnt_3',
    contactName: 'Ing. Roberto Andrade',
    contactAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    contactHandleOrPhone: 'fb/roberto.andrade.77',
    contactEmail: 'randrade@constructora-alfa.mx',
    contactCompany: 'Constructora Alfa del Norte',
    lastMessage: 'Buenas tardes, llevo 2 horas intentando pagar con tarjeta corporativa y me rechaza el cobro. Necesito solucionar esto ya.',
    lastMessageTime: '12:50',
    unreadCount: 2,
    status: 'open',
    priority: 'high',
    assignedAgent: 'Soporte Urgente',
    tags: ['Reclamo / Urgente', 'Pasarela Pagos', 'Facturación'],
    botActive: false,
    sentiment: 'urgente',
    leadScore: 45,
    dealStage: 'Soporte',
    dealValue: 2400,
    summary: 'Problema con autorización de pasarela de pago bancaria al intentar renovar membresía.',
    notes: 'Escalado con prioridad al equipo de finanzas.',
    messages: [
      {
        id: 'm3_1',
        conversationId: 'conv_3',
        sender: 'customer',
        text: 'Buenas tardes, llevo 2 horas intentando pagar con tarjeta corporativa y me rechaza el cobro. Necesito solucionar esto ya.',
        timestamp: '12:50',
        status: 'delivered'
      }
    ]
  },
  {
    id: 'conv_4',
    channel: 'telegram',
    contactId: 'cnt_4',
    contactName: 'Lucía Fernández',
    contactAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    contactHandleOrPhone: '@lucia_crypto_dev',
    contactEmail: 'lucia.fdz@fintechhub.io',
    contactCompany: 'Fintech Hub Latino',
    lastMessage: '¿Tienen documentación para conectar webhooks personalizados con nuestro backend Node.js?',
    lastMessageTime: '11:20',
    unreadCount: 0,
    status: 'pending',
    priority: 'medium',
    assignedAgent: 'Bot IA (Autónomo)',
    tags: ['Desarrollador', 'Webhooks / API', 'Telegram'],
    botActive: true,
    sentiment: 'neutral',
    leadScore: 65,
    dealStage: 'Prospecto',
    dealValue: 850,
    summary: 'Desarrolladora pidiendo documentación técnica para integración con API.',
    notes: 'Le enviamos el link de Swagger y Postman Collection.',
    messages: [
      {
        id: 'm4_1',
        conversationId: 'conv_4',
        sender: 'customer',
        text: 'Hola equipo, estamos evaluando su plataforma para centralizar las alertas y tickets de nuestra comunidad.',
        timestamp: '11:15',
        status: 'read'
      },
      {
        id: 'm4_2',
        conversationId: 'conv_4',
        sender: 'bot',
        text: '¡Hola Lucía! Qué gusto. Contamos con soporte completo para bots de Telegram con comandos personalizados y pasarela de webhooks en tiempo real.',
        timestamp: '11:16',
        status: 'read',
        aiGenerated: true
      },
      {
        id: 'm4_3',
        conversationId: 'conv_4',
        sender: 'customer',
        text: '¿Tienen documentación para conectar webhooks personalizados con nuestro backend Node.js?',
        timestamp: '11:20',
        status: 'read'
      }
    ]
  },
  {
    id: 'conv_5',
    channel: 'webchat',
    contactId: 'cnt_5',
    contactName: 'Esteban Morales',
    contactAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    contactHandleOrPhone: 'Sesión Web #8849',
    contactEmail: 'esteban.morales@retailplus.com',
    contactCompany: 'Retail Plus Store',
    lastMessage: 'Ya realizamos el pago por Stripe de la suscripción anual. ¡Muchas gracias por la excelente atención!',
    lastMessageTime: 'Ayer',
    unreadCount: 0,
    status: 'resolved',
    priority: 'low',
    assignedAgent: 'Maycol Castañeda',
    tags: ['Cliente Activo', 'Pago Completado', 'Anual'],
    botActive: false,
    sentiment: 'positivo',
    leadScore: 100,
    dealStage: 'Cerrado Ganado',
    dealValue: 3600,
    summary: 'Lead convertido con éxito en plan Anual Enterprise.',
    notes: 'Cliente muy satisfecho con la demo.',
    messages: [
      {
        id: 'm5_1',
        conversationId: 'conv_5',
        sender: 'customer',
        text: 'Hola, ¿pueden enviarme el enlace de pago directo para la suscripción anual?',
        timestamp: 'Ayer 16:30',
        status: 'read'
      },
      {
        id: 'm5_2',
        conversationId: 'conv_5',
        sender: 'agent',
        authorName: 'Maycol Castañeda',
        text: '¡Hola Esteban! Con gusto. Aquí tienes el link seguro de pago directo con Stripe: https://checkout.omniflow.io/inv_8829',
        timestamp: 'Ayer 16:35',
        status: 'read'
      },
      {
        id: 'm5_3',
        conversationId: 'conv_5',
        sender: 'customer',
        text: 'Ya realizamos el pago por Stripe de la suscripción anual. ¡Muchas gracias por la excelente atención!',
        timestamp: 'Ayer 16:42',
        status: 'read'
      },
      {
        id: 'm5_4',
        conversationId: 'conv_5',
        sender: 'agent',
        authorName: 'Maycol Castañeda',
        text: '¡Confirmado y activado! Bienvenido a OmniFlow. Tu gerente de cuenta te contactará mañana para configurar los canales.',
        timestamp: 'Ayer 16:45',
        status: 'read'
      }
    ]
  }
];

export const initialBotSettings: BotSettings = {
  enabled: true,
  botName: 'OmniBot AI (Gemini 3.7)',
  systemPrompt: `Eres el Asistente Inteligente oficial de OmniFlow / NovaTech.
Tu misión principal es atender a los clientes por WhatsApp, Instagram, Messenger y Telegram de forma rápida, educada, empática y comercialmente persuasiva.
1. Saluda con entusiasmo y personaliza el trato según el canal.
2. Si el cliente pregunta precios o cotizaciones, da los rangos (Plan Starter: $49/mes, Pro: $120/mes, Enterprise: $350/mes) y ofrece agendar una demo.
3. Si el cliente tiene un problema o se muestra enojado, pide disculpas, recopila su número de pedido o cuenta y notifica que lo transfieres con un supervisor.
4. Responde con frases concisas, fáciles de leer en dispositivos móviles, usando emojis pertinentes.`,
  knowledgeBase: `--- INFORMACIÓN DE LA EMPRESA ---
Nombre: OmniFlow Solutions
Servicios: Plataforma Omnicanal para WhatsApp, Instagram, Messenger, Telegram, TikTok y Webchat con IA integrada y CRM de Ventas.
Planes y Precios:
- Plan Starter ($49 USD/mes): Hasta 3 canales, 1,000 conversaciones/mes, 2 agentes humanos, CRM básico.
- Plan Pro ($120 USD/mes): Todos los canales ilimitados, 5,000 conversaciones/mes, 10 agentes, Bot IA Gemini 24/7, Automatizaciones y Triggers.
- Plan Enterprise ($350 USD/mes): Canales infinitos, volumen masivo, API dedicada, Onboarding personalizado, SLA 99.9%.

Horarios de Atención Humana: Lunes a Viernes de 8:00 AM a 8:00 PM (Hora Centro). Sábados de 9:00 AM a 2:00 PM.
El Bot IA atiende 24 horas al día, los 7 días de la semana.
Métodos de pago aceptados: Tarjetas de crédito/débito (Visa, Mastercard, AMEX), PayPal, Stripe, Transferencia bancaria (SPEI / Wire Transfer).
Garantía: 14 días de prueba sin compromiso de permanencia.`,
  handoffKeywords: ['humano', 'asesor', 'agente', 'hablar con persona', 'urgente', 'queja', 'supervisor', 'gerente'],
  autoQualify: true,
  tone: 'Profesional, cercano y resolutivo',
  responseDelaySeconds: 1,
  autoAnalyzeLead: true
};

export const initialAutomationRules: AutomationRule[] = [
  {
    id: 'rule_1',
    title: 'Autorespuesta y calificación de nuevos leads en WhatsApp',
    description: 'Cuando un nuevo contacto escribe por WhatsApp por primera vez, enviar saludo interactivo y registrar en CRM.',
    isActive: true,
    channel: 'whatsapp',
    trigger: 'new_conversation',
    action: 'trigger_ai_bot',
    actionPayload: 'Activar OmniBot AI con captura de datos iniciales',
    executionsCount: 412
  },
  {
    id: 'rule_2',
    title: 'Detección de intención de compra (Palabras Clave "precio / cotizar / comprar")',
    description: 'Detecta palabras de compra y mueve automáticamente el prospecto a la etapa "Calificado" en el CRM.',
    isActive: true,
    channel: 'all',
    trigger: 'keyword',
    triggerValue: 'precio, cotización, costo, comprar, plan, contratar',
    action: 'move_crm_stage',
    actionPayload: 'Mover a etapa: Calificado + Tag "Interesado"',
    executionsCount: 289
  },
  {
    id: 'rule_3',
    title: 'Desvío inteligente a agente cuando hay Sentimiento Negativo o Reclamo',
    description: 'Si la IA detecta sentimiento crítico o frustración, desactiva el bot y notifica con sonido de alta prioridad a soporte.',
    isActive: true,
    channel: 'all',
    trigger: 'sentiment_negative',
    action: 'assign_agent',
    actionPayload: 'Asignar a: Soporte Urgente Nivel 2 + Tag "Reclamo"',
    executionsCount: 38
  },
  {
    id: 'rule_4',
    title: 'Respuesta Fuera de Horario Comercial',
    description: 'Si escriben fuera de horario laboral, informar tiempos de atención y ofrecer respuesta autónoma por IA.',
    isActive: true,
    channel: 'all',
    trigger: 'offline_hours',
    action: 'send_template',
    actionPayload: 'Plantilla: "Hola, nuestro equipo humano descansa, pero nuestro Bot IA puede ayudarte de inmediato."',
    executionsCount: 156
  }
];

export const initialCannedResponses: CannedResponse[] = [
  {
    id: 'canned_1',
    shortcut: '/saludo',
    title: 'Saludo formal y bienvenida',
    content: '¡Hola! Es un placer saludarte. Bienvenido/a a OmniFlow. ¿Cómo podemos apoyarte el día de hoy?',
    category: 'General'
  },
  {
    id: 'canned_2',
    shortcut: '/precios',
    title: 'Tabla de precios y planes',
    content: 'Contamos con 3 planes diseñados a tu medida:\n✨ Starter: $49/mes (3 canales, 2 agentes)\n🚀 Pro: $120/mes (Canales ilimitados + IA 24/7)\n🏢 Enterprise: $350/mes (API, soporte dedicado y SLA)\n\n¿Te gustaría probar una demo guiada de 15 minutos?',
    category: 'Ventas'
  },
  {
    id: 'canned_3',
    shortcut: '/metodos_pago',
    title: 'Métodos de pago disponibles',
    content: 'Aceptamos pagos seguros vía tarjeta de crédito/débito con Stripe, PayPal y transferencias bancarias directas. Generamos factura fiscal en todos los pagos.',
    category: 'Ventas'
  },
  {
    id: 'canned_4',
    shortcut: '/horarios',
    title: 'Horarios de atención',
    content: 'Nuestro equipo humano atiende de Lunes a Viernes de 8:00 AM a 8:00 PM. Fuera de ese horario, nuestro asistente de Inteligencia Artificial sigue activo para ti 24/7.',
    category: 'Soporte'
  },
  {
    id: 'canned_5',
    shortcut: '/humano',
    title: 'Transferencia a asesor humano',
    content: 'Comprendo perfectamente. Estoy transfiriendo tu chat con uno de nuestros especialistas humanos. En un momento se pondrá en contacto contigo.',
    category: 'Soporte'
  }
];

export const leadScenarios: QuickLeadScenario[] = [
  {
    id: 'sc_menu',
    title: '📱 Menú Principal de Demostraciones',
    channel: 'whatsapp',
    senderName: 'Maycol / Geancarlos (Cliente)',
    senderPhone: '+51 987 654 321',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    message: 'Hola',
    category: 'Menú Digital MYK Lab'
  },
  {
    id: 'sc_dental',
    title: '🦷 Opción 1: Demo Odontología (Plan Esencial S/ 490)',
    channel: 'whatsapp',
    senderName: 'Carlos Mendoza',
    senderPhone: '+51 987 654 321',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    message: '1',
    category: 'Odontología Sonrisas VIP'
  },
  {
    id: 'sc_beauty',
    title: '💅 Opción 2: Demo Centro de Belleza (Plan PRO S/ 890)',
    channel: 'whatsapp',
    senderName: 'Andrea Benítez',
    senderPhone: '+51 966 223 344',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    message: '2',
    category: 'Glow Belleza IA Mía'
  },
  {
    id: 'sc_beauty_natural',
    title: '🌸 Preguntar a Mía por Alisado y Cita (Lenguaje Natural)',
    channel: 'whatsapp',
    senderName: 'Valeria Morales',
    senderPhone: '+51 977 112 233',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    message: 'Hola! Cuánto cuesta el alisado con queratina y tienen espacio mañana en la tarde?',
    category: 'Glow Belleza IA Mía'
  },
  {
    id: 'sc_dental_data',
    title: '🦷 Enviar Datos para Limpieza Dental',
    channel: 'whatsapp',
    senderName: 'Roberto Sánchez',
    senderPhone: '+51 955 443 322',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    message: 'Roberto Sánchez, Mañana a las 5:00 PM para Blanqueamiento',
    category: 'Odontología Sonrisas VIP'
  }
];
