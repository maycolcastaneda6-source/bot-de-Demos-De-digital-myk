import React, { useState, useEffect } from 'react';
import { Sidebar, ActiveView } from './components/Sidebar';
import { ConversationList } from './components/ConversationList';
import { ChatView } from './components/ChatView';
import { ContactCRMDrawer } from './components/ContactCRMDrawer';
import { CRMPipelineView } from './components/CRMPipelineView';
import { AutomationsView } from './components/AutomationsView';
import { ChannelsHubView } from './components/ChannelsHubView';
import { AnalyticsView } from './components/AnalyticsView';
import { SimulatorModal } from './components/SimulatorModal';
import { CannedResponsesModal } from './components/CannedResponsesModal';
import { NewConversationModal } from './components/NewConversationModal';
import { 
  initialChannels, 
  initialConversations, 
  initialBotSettings, 
  initialAutomationRules, 
  initialCannedResponses 
} from './data/initialData';
import {
  initialDentalAppointments,
  initialBeautyAppointments,
  initialGreenApiConfig
} from './data/demoData';
import { 
  Conversation, 
  ChannelConfig, 
  BotSettings, 
  AutomationRule, 
  CannedResponse, 
  DealStage, 
  ChannelType, 
  Message,
  DentalAppointment,
  BeautyAppointment,
  GreenApiConfig
} from './types';
import { LiveDemosHubView } from './components/LiveDemosHubView';

export default function App() {
  // State with LocalStorage fallbacks
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    const saved = localStorage.getItem('omniflow_conversations');
    return saved ? JSON.parse(saved) : initialConversations;
  });

  const [channels, setChannels] = useState<ChannelConfig[]>(() => {
    const saved = localStorage.getItem('omniflow_channels');
    if (!saved) return initialChannels;
    try {
      const parsed: ChannelConfig[] = JSON.parse(saved);
      // Ensure WhatsApp channel has the requested number if unmodified placeholder
      return parsed.map(c => 
        c.type === 'whatsapp' && (c.handleOrPhone.includes('4169') || !c.handleOrPhone)
          ? { ...c, handleOrPhone: '+51 986 150 562', accountName: 'Línea Oficial WhatsApp (+51 986 150 562)' }
          : c
      );
    } catch {
      return initialChannels;
    }
  });

  const [botSettings, setBotSettings] = useState<BotSettings>(() => {
    const saved = localStorage.getItem('omniflow_bot_settings');
    return saved ? JSON.parse(saved) : initialBotSettings;
  });

  const [rules, setRules] = useState<AutomationRule[]>(() => {
    const saved = localStorage.getItem('omniflow_rules');
    return saved ? JSON.parse(saved) : initialAutomationRules;
  });

  const [cannedResponses, setCannedResponses] = useState<CannedResponse[]>(() => {
    const saved = localStorage.getItem('omniflow_canned');
    return saved ? JSON.parse(saved) : initialCannedResponses;
  });

  const [dentalAppointments, setDentalAppointments] = useState<DentalAppointment[]>(() => {
    const saved = localStorage.getItem('omniflow_dental_appointments');
    return saved ? JSON.parse(saved) : initialDentalAppointments;
  });

  const [beautyAppointments, setBeautyAppointments] = useState<BeautyAppointment[]>(() => {
    const saved = localStorage.getItem('omniflow_beauty_appointments');
    return saved ? JSON.parse(saved) : initialBeautyAppointments;
  });

  const [greenApiConfig, setGreenApiConfig] = useState<GreenApiConfig>(() => {
    const saved = localStorage.getItem('omniflow_greenapi_config');
    return saved ? JSON.parse(saved) : initialGreenApiConfig;
  });

  // UI State
  const [activeView, setActiveView] = useState<ActiveView>('demos');
  const [selectedId, setSelectedId] = useState<string>(conversations[0]?.id || 'conv_1');
  const [isCRMDrawerOpen, setIsCRMDrawerOpen] = useState(true);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [isCannedModalOpen, setIsCannedModalOpen] = useState(false);
  const [isNewConvModalOpen, setIsNewConvModalOpen] = useState(false);
  const [cannedInsertText, setCannedInsertText] = useState<string>('');
  const [isAnalyzingAI, setIsAnalyzingAI] = useState(false);

  // Sync to LocalStorage
  useEffect(() => {
    localStorage.setItem('omniflow_conversations', JSON.stringify(conversations));
  }, [conversations]);

  useEffect(() => {
    localStorage.setItem('omniflow_channels', JSON.stringify(channels));
  }, [channels]);

  useEffect(() => {
    localStorage.setItem('omniflow_bot_settings', JSON.stringify(botSettings));
  }, [botSettings]);

  useEffect(() => {
    localStorage.setItem('omniflow_rules', JSON.stringify(rules));
  }, [rules]);

  useEffect(() => {
    localStorage.setItem('omniflow_canned', JSON.stringify(cannedResponses));
  }, [cannedResponses]);

  useEffect(() => {
    localStorage.setItem('omniflow_dental_appointments', JSON.stringify(dentalAppointments));
  }, [dentalAppointments]);

  useEffect(() => {
    localStorage.setItem('omniflow_beauty_appointments', JSON.stringify(beautyAppointments));
  }, [beautyAppointments]);

  useEffect(() => {
    localStorage.setItem('omniflow_greenapi_config', JSON.stringify(greenApiConfig));
  }, [greenApiConfig]);

  // Active selected conversation
  const selectedConversation = conversations.find(c => c.id === selectedId) || conversations[0];

  const unreadTotal = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  // Send message from agent or private note
  const handleSendMessage = (text: string, isPrivateNote?: boolean, mediaType?: 'image' | 'audio' | 'document') => {
    if (!selectedConversation) return;

    const newMsg: Message = {
      id: `msg_${Date.now()}`,
      conversationId: selectedConversation.id,
      sender: 'agent',
      authorName: 'Maycol Castañeda',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sent',
      isPrivateNote,
      mediaType
    };

    setConversations(prev =>
      prev.map(conv => {
        if (conv.id === selectedConversation.id) {
          return {
            ...conv,
            unreadCount: 0,
            lastMessage: isPrivateNote ? `[Nota Interna]: ${text}` : text,
            lastMessageTime: newMsg.timestamp,
            messages: [...conv.messages, newMsg]
          };
        }
        return conv;
      })
    );
  };

  // Toggle Bot active status for a specific conversation
  const handleToggleBot = (id: string) => {
    setConversations(prev =>
      prev.map(c => (c.id === id ? { ...c, botActive: !c.botActive } : c))
    );
  };

  // Update Deal Stage
  const handleUpdateDealStage = (id: string, stage: DealStage) => {
    setConversations(prev =>
      prev.map(c => (c.id === id ? { ...c, dealStage: stage } : c))
    );
  };

  // Update any field in conversation (tags, deal value, notes, etc.)
  const handleUpdateConversation = (updatedFields: Partial<Conversation>) => {
    if (!selectedConversation) return;
    setConversations(prev =>
      prev.map(c => (c.id === selectedConversation.id ? { ...c, ...updatedFields } : c))
    );
  };

  // Trigger AI analysis with Gemini
  const handleAnalyzeWithAI = async (id: string) => {
    const targetConv = conversations.find(c => c.id === id);
    if (!targetConv) return;

    try {
      setIsAnalyzingAI(true);
      const res = await fetch('/api/ai/analyze-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: targetConv.messages,
          contactInfo: {
            name: targetConv.contactName,
            phone: targetConv.contactHandleOrPhone,
            company: targetConv.contactCompany,
            currentStage: targetConv.dealStage
          }
        })
      });

      const analysis = await res.json();
      if (analysis) {
        setConversations(prev =>
          prev.map(c => {
            if (c.id === id) {
              return {
                ...c,
                sentiment: analysis.sentiment || c.sentiment,
                leadScore: analysis.leadScore ?? c.leadScore,
                summary: analysis.summary || c.summary,
                dealStage: (analysis.recommendedStage as DealStage) || c.dealStage,
                tags: analysis.suggestedTags ? [...new Set([...c.tags, ...analysis.suggestedTags])] : c.tags
              };
            }
            return c;
          })
        );
      }
    } catch (err) {
      console.error('Error analyzing with AI:', err);
    } finally {
      setIsAnalyzingAI(false);
    }
  };

  // Simulated Incoming Message (from Simulator or Webhook)
  const handleSimulatedIncomingMessage = async (
    channel: ChannelType,
    senderName: string,
    senderPhone: string,
    avatar: string,
    messageText: string
  ): Promise<string | void> => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // 1. Check if conversation already exists for this phone/handle
    let existingConv = conversations.find(c => c.contactHandleOrPhone === senderPhone);
    let convId = existingConv ? existingConv.id : `conv_${Date.now()}`;

    const incomingMsg: Message = {
      id: `msg_${Date.now()}`,
      conversationId: convId,
      sender: 'customer',
      text: messageText,
      timestamp,
      status: 'delivered'
    };

    let updatedConversation: Conversation;

    // Check Automation Rules Trigger
    let autoStage: DealStage = 'Prospecto';
    let addedTags: string[] = [channel.toUpperCase()];
    const lowerText = messageText.toLowerCase();

    if (lowerText.includes('precio') || lowerText.includes('cotiz') || lowerText.includes('costo') || lowerText.includes('comprar')) {
      autoStage = 'Calificado';
      addedTags.push('Interesado');
    }
    if (lowerText.includes('urgente') || lowerText.includes('queja') || lowerText.includes('reclamo') || lowerText.includes('factura')) {
      autoStage = 'Soporte';
      addedTags.push('Urgente');
    }

    if (existingConv) {
      updatedConversation = {
        ...existingConv,
        lastMessage: messageText,
        lastMessageTime: timestamp,
        unreadCount: existingConv.unreadCount + 1,
        dealStage: autoStage !== 'Prospecto' ? autoStage : existingConv.dealStage,
        tags: [...new Set([...existingConv.tags, ...addedTags])],
        messages: [...existingConv.messages, incomingMsg]
      };

      setConversations(prev => prev.map(c => (c.id === convId ? updatedConversation : c)));
    } else {
      updatedConversation = {
        id: convId,
        channel,
        contactId: `cnt_${Date.now()}`,
        contactName: senderName,
        contactAvatar: avatar,
        contactHandleOrPhone: senderPhone,
        lastMessage: messageText,
        lastMessageTime: timestamp,
        unreadCount: 1,
        status: 'open',
        priority: lowerText.includes('urgente') ? 'high' : 'medium',
        assignedAgent: 'Bot IA (Autónomo)',
        tags: ['Nuevo Lead', ...addedTags],
        botActive: true,
        sentiment: lowerText.includes('urgente') ? 'urgente' : 'positivo',
        leadScore: lowerText.includes('precio') || lowerText.includes('cotiz') ? 85 : 65,
        dealStage: autoStage,
        dealValue: 1800,
        summary: `Lead entrante desde ${channel}. Mensaje: "${messageText}"`,
        messages: [incomingMsg]
      };

      setConversations(prev => [updatedConversation, ...prev]);
    }

    setSelectedId(convId);

    // 2. Increment channel counter
    setChannels(prev =>
      prev.map(ch => (ch.type === channel ? { ...ch, messagesCount: ch.messagesCount + 1, lastActive: 'Ahora' } : ch))
    );

    // 3. If Bot is enabled globally and for this conversation, trigger response
    if (botSettings.enabled && updatedConversation.botActive) {
      try {
        let botReplyText = '¡Hola! Gracias por comunicarte con nosotros.';

        // For WhatsApp, route through the dual-demo engine (Odonto S/490 & Belleza S/890)
        if (channel === 'whatsapp') {
          const demoRes = await fetch('/api/demo/process-message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              phone: senderPhone,
              senderName: senderName,
              message: messageText
            })
          });
          const demoData = await demoRes.json();
          botReplyText = demoData.reply || botReplyText;

          if (demoData.newDentalRow) {
            setDentalAppointments(prev => [demoData.newDentalRow, ...prev]);
          }
          if (demoData.newBeautyRow) {
            setBeautyAppointments(prev => [demoData.newBeautyRow, ...prev]);
          }
        } else {
          const res = await fetch('/api/ai/chat-reply', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: updatedConversation.messages,
              channel: channel,
              contactName: senderName,
              systemPrompt: botSettings.systemPrompt,
              knowledgeBase: botSettings.knowledgeBase,
              agentRole: 'bot',
              tone: botSettings.tone
            })
          });
          const data = await res.json();
          botReplyText = data.reply || botReplyText;
        }

        const botMsg: Message = {
          id: `msg_bot_${Date.now()}`,
          conversationId: convId,
          sender: 'bot',
          text: botReplyText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'sent',
          aiGenerated: true
        };

        setConversations(prev =>
          prev.map(c => {
            if (c.id === convId) {
              return {
                ...c,
                lastMessage: botReplyText,
                lastMessageTime: botMsg.timestamp,
                messages: [...c.messages, botMsg]
              };
            }
            return c;
          })
        );

        return botReplyText;
      } catch (err) {
        console.error('Error getting bot response:', err);
      }
    }
  };

  // Live Sync Demo Appointments & Green API status from Server
  const syncServerDemoData = useCallback(async () => {
    try {
      const res = await fetch('/api/demo/data');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.dentalAppointments) && data.dentalAppointments.length > 0) {
          setDentalAppointments(data.dentalAppointments);
        }
        if (Array.isArray(data.beautyAppointments) && data.beautyAppointments.length > 0) {
          setBeautyAppointments(data.beautyAppointments);
        }
        if (data.greenApiConfig) {
          setGreenApiConfig(prev => ({ ...prev, ...data.greenApiConfig }));
        }
      }
    } catch (e) {
      // Background poll failure is silent
    }
  }, []);

  useEffect(() => {
    syncServerDemoData();
    const interval = setInterval(syncServerDemoData, 2500);
    return () => clearInterval(interval);
  }, [syncServerDemoData]);

  // Demo Appointment Handlers
  const handleUpdateDentalStatus = (id: string, status: DentalAppointment['status']) => {
    setDentalAppointments(prev => prev.map(d => d.id === id ? { ...d, status } : d));
    fetch('/api/demo/dental/update-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status })
    }).catch(console.error);
  };

  const handleUpdateBeautyStatus = (id: string, status: BeautyAppointment['status']) => {
    setBeautyAppointments(prev => prev.map(b => b.id === id ? { ...b, status } : b));
    fetch('/api/demo/beauty/update-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status })
    }).catch(console.error);
  };

  const handleAddDentalAppointment = (app: DentalAppointment) => {
    setDentalAppointments(prev => [app, ...prev]);
  };

  const handleAddBeautyAppointment = (app: BeautyAppointment) => {
    setBeautyAppointments(prev => [app, ...prev]);
  };

  const handleUpdateGreenApiConfig = (cfg: Partial<GreenApiConfig>) => {
    setGreenApiConfig(prev => ({ ...prev, ...cfg }));
    fetch('/api/green-api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cfg)
    }).catch(console.error);
  };

  // Rule management
  const handleToggleRule = (id: string) => {
    setRules(prev => prev.map(r => (r.id === id ? { ...r, isActive: !r.isActive } : r)));
  };

  const handleAddRule = (rule: AutomationRule) => {
    setRules(prev => [rule, ...prev]);
  };

  const handleDeleteRule = (id: string) => {
    setRules(prev => prev.filter(r => r.id !== id));
  };

  const handleToggleChannelBot = (id: string) => {
    setChannels(prev => prev.map(c => (c.id === id ? { ...c, botEnabled: !c.botEnabled } : c)));
  };

  const handleUpdateChannel = (id: string, updates: Partial<ChannelConfig>) => {
    setChannels(prev => prev.map(c => (c.id === id ? { ...c, ...updates } : c)));
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      {/* 1. Global Navigation Sidebar */}
      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        channels={channels}
        unreadTotal={unreadTotal}
        aiBotActive={botSettings.enabled}
        onOpenSimulator={() => setIsSimulatorOpen(true)}
      />

      {/* 2. Primary Views */}
      <main className="flex-1 flex overflow-hidden relative">
        {activeView === 'inbox' && (
          <div className="flex-1 flex overflow-hidden">
            {/* Conversation Selector List */}
            <ConversationList
              conversations={conversations}
              selectedId={selectedId}
              onSelect={(id) => {
                setSelectedId(id);
                // Mark as read
                setConversations(prev =>
                  prev.map(c => (c.id === id ? { ...c, unreadCount: 0 } : c))
                );
              }}
              onNewConversationClick={() => setIsNewConvModalOpen(true)}
            />

            {/* Active Chat Conversation Stream */}
            {selectedConversation ? (
              <ChatView
                conversation={selectedConversation}
                onSendMessage={handleSendMessage}
                onToggleBot={handleToggleBot}
                onUpdateDealStage={handleUpdateDealStage}
                onToggleCRMDrawer={() => setIsCRMDrawerOpen(!isCRMDrawerOpen)}
                onOpenCannedResponses={() => setIsCannedModalOpen(true)}
                cannedInsertText={cannedInsertText}
                onClearCannedInsert={() => setCannedInsertText('')}
                botSettings={botSettings}
                onAnalyzeWithAI={handleAnalyzeWithAI}
                isAnalyzingAI={isAnalyzingAI}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center bg-slate-950 text-slate-500">
                Selecciona una conversación para ver el chat.
              </div>
            )}

            {/* Right CRM Contact Drawer */}
            {isCRMDrawerOpen && selectedConversation && (
              <ContactCRMDrawer
                conversation={selectedConversation}
                onClose={() => setIsCRMDrawerOpen(false)}
                onUpdateConversation={handleUpdateConversation}
                onAnalyzeWithAI={handleAnalyzeWithAI}
                isAnalyzingAI={isAnalyzingAI}
              />
            )}
          </div>
        )}

        {activeView === 'demos' && (
          <LiveDemosHubView
            dentalAppointments={dentalAppointments}
            beautyAppointments={beautyAppointments}
            greenApiConfig={greenApiConfig}
            onUpdateDentalStatus={handleUpdateDentalStatus}
            onUpdateBeautyStatus={handleUpdateBeautyStatus}
            onAddDentalAppointment={handleAddDentalAppointment}
            onAddBeautyAppointment={handleAddBeautyAppointment}
            onUpdateGreenApiConfig={handleUpdateGreenApiConfig}
            onOpenSimulator={() => setIsSimulatorOpen(true)}
            onSimulateWhatsAppMessage={(senderPhone, senderName, text) => {
              handleSimulatedIncomingMessage(
                'whatsapp',
                senderName,
                senderPhone,
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
                text
              );
            }}
          />
        )}

        {activeView === 'crm' && (
          <CRMPipelineView
            conversations={conversations}
            onSelectConversation={(id) => {
              setSelectedId(id);
              setActiveView('inbox');
            }}
            onUpdateDealStage={handleUpdateDealStage}
            onOpenNewLeadModal={() => setIsNewConvModalOpen(true)}
          />
        )}

        {activeView === 'automations' && (
          <AutomationsView
            botSettings={botSettings}
            onUpdateBotSettings={setBotSettings}
            rules={rules}
            onToggleRule={handleToggleRule}
            onAddRule={handleAddRule}
            onDeleteRule={handleDeleteRule}
          />
        )}

        {activeView === 'channels' && (
          <ChannelsHubView
            channels={channels}
            onToggleChannelBot={handleToggleChannelBot}
            onUpdateChannel={handleUpdateChannel}
            onOpenSimulator={() => setIsSimulatorOpen(true)}
            onSimulateWebhook={(channel, text) => {
              handleSimulatedIncomingMessage(
                channel,
                'Cliente Webhook Test',
                '+51 912 345 678',
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
                text
              );
            }}
          />
        )}

        {activeView === 'analytics' && (
          <AnalyticsView
            conversations={conversations}
            channels={channels}
          />
        )}
      </main>

      {/* 3. Omnichannel Live Simulator Modal */}
      <SimulatorModal
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        onSendSimulatedMessage={handleSimulatedIncomingMessage}
      />

      {/* 4. Canned Responses & Quick Templates Modal */}
      <CannedResponsesModal
        isOpen={isCannedModalOpen}
        onClose={() => setIsCannedModalOpen(false)}
        cannedResponses={cannedResponses}
        onSelectResponse={(text) => setCannedInsertText(text)}
        onAddResponse={(newR) => setCannedResponses(prev => [newR, ...prev])}
      />

      {/* 5. New Lead & Conversation Modal */}
      <NewConversationModal
        isOpen={isNewConvModalOpen}
        onClose={() => setIsNewConvModalOpen(false)}
        onCreate={(newConv) => {
          setConversations(prev => [newConv, ...prev]);
          setSelectedId(newConv.id);
          setActiveView('inbox');
        }}
      />
    </div>
  );
}
