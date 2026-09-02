import { ChannelType } from '../types';

export const getChannelMeta = (channel: ChannelType) => {
  switch (channel) {
    case 'whatsapp':
      return {
        name: 'WhatsApp',
        color: '#25D366',
        badgeBg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
        dotColor: 'bg-emerald-500',
        iconEmoji: '🟢',
        prefix: 'wa.me/'
      };
    case 'instagram':
      return {
        name: 'Instagram',
        color: '#E1306C',
        badgeBg: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
        dotColor: 'bg-rose-500',
        iconEmoji: '📸',
        prefix: 'ig.me/'
      };
    case 'messenger':
      return {
        name: 'Messenger',
        color: '#0084FF',
        badgeBg: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
        dotColor: 'bg-blue-500',
        iconEmoji: '⚡',
        prefix: 'm.me/'
      };
    case 'telegram':
      return {
        name: 'Telegram',
        color: '#0088cc',
        badgeBg: 'bg-sky-500/10 border-sky-500/30 text-sky-400',
        dotColor: 'bg-sky-500',
        iconEmoji: '✈️',
        prefix: 't.me/'
      };
    case 'tiktok':
      return {
        name: 'TikTok',
        color: '#FE2C55',
        badgeBg: 'bg-pink-500/10 border-pink-500/30 text-pink-400',
        dotColor: 'bg-pink-500',
        iconEmoji: '🎵',
        prefix: 'tiktok.com/'
      };
    case 'webchat':
      return {
        name: 'WebChat',
        color: '#6366F1',
        badgeBg: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400',
        dotColor: 'bg-indigo-500',
        iconEmoji: '💬',
        prefix: 'web/'
      };
    case 'email':
      return {
        name: 'Email',
        color: '#F59E0B',
        badgeBg: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
        dotColor: 'bg-amber-500',
        iconEmoji: '✉️',
        prefix: 'mailto:'
      };
    case 'sms':
      return {
        name: 'SMS',
        color: '#8B5CF6',
        badgeBg: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
        dotColor: 'bg-purple-500',
        iconEmoji: '📱',
        prefix: 'sms:'
      };
    default:
      return {
        name: 'Omnicanal',
        color: '#64748B',
        badgeBg: 'bg-slate-500/10 border-slate-500/30 text-slate-400',
        dotColor: 'bg-slate-500',
        iconEmoji: '💬',
        prefix: ''
      };
  }
};

export const getSentimentMeta = (sentiment: string) => {
  switch (sentiment) {
    case 'positivo':
      return {
        label: 'Positivo',
        color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
        icon: '😊'
      };
    case 'urgente':
      return {
        label: 'Urgente / Reclamo',
        color: 'text-rose-400 bg-rose-500/10 border-rose-500/30 animate-pulse',
        icon: '🚨'
      };
    case 'negativo':
      return {
        label: 'Negativo',
        color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
        icon: '⚠️'
      };
    default:
      return {
        label: 'Neutral',
        color: 'text-slate-400 bg-slate-500/10 border-slate-500/30',
        icon: '😐'
      };
  }
};

export const getDealStageColor = (stage: string) => {
  switch (stage) {
    case 'Prospecto':
      return 'bg-slate-800 text-slate-300 border-slate-700';
    case 'Calificado':
      return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
    case 'Propuesta':
      return 'bg-purple-500/15 text-purple-300 border-purple-500/30';
    case 'Negociación':
      return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
    case 'Cerrado Ganado':
      return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold';
    case 'Soporte':
      return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
    default:
      return 'bg-slate-800 text-slate-300 border-slate-700';
  }
};
