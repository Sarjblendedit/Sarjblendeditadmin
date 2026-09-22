import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { theme } from './ui';

type Message = { id: string; sender: 'customer' | 'admin'; body: string; created_at: string };

export function CustomerChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | undefined;
    const start = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const load = async () => {
        const { data } = await supabase.from('customer_admin_messages').select('id,sender,body,created_at').eq('customer_id', user.id).order('created_at');
        setMessages((data as Message[]) ?? []);
      };
      await load();
      channel = supabase.channel(`customer-chat-${user.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'customer_admin_messages', filter: `customer_id=eq.${user.id}` }, () => { void load(); }).subscribe();
    };
    void start();
    return () => { if (channel) void supabase.removeChannel(channel); };
  }, []);

  useEffect(() => { if (open) setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 40); }, [messages, open]);

  const send = async () => {
    if (!userId || !text.trim() || sending) return;
    setSending(true);
    const body = text.trim(); setText('');
    const { error } = await supabase.from('customer_admin_messages').insert({ customer_id: userId, sender: 'customer', body });
    if (error) setText(body);
    setSending(false);
  };

  return <View pointerEvents="box-none" style={s.root}>
    {open && <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.panel}><View style={s.head}><View><Text style={s.eyebrow}>SARJ SUPPORT</Text><Text style={s.title}>Chat with Admin</Text><Text style={s.status}>● Usually replies quickly</Text></View><Pressable onPress={() => setOpen(false)} style={s.close}><Text style={s.closeText}>×</Text></Pressable></View><ScrollView ref={scrollRef} style={s.messages} contentContainerStyle={s.messageContent}>{messages.length ? messages.map(message => <View key={message.id} style={[s.bubble, message.sender === 'customer' && s.mine]}><Text style={[s.bubbleText, message.sender === 'customer' && s.mineText]}>{message.body}</Text><Text style={[s.time, message.sender === 'customer' && s.mineTime]}>{new Date(message.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</Text></View>) : <View style={s.empty}><Text style={s.emptyTitle}>How can we help?</Text><Text style={s.emptyCopy}>Send a message about a booking, service or payment and the SARJ team will reply here.</Text></View>}</ScrollView><View style={s.composer}><TextInput value={text} onChangeText={setText} placeholder="Write a message…" placeholderTextColor="#77808a" style={s.input} multiline maxLength={1500} /><Pressable onPress={() => void send()} disabled={!text.trim() || sending} style={[s.send, (!text.trim() || sending) && s.sendDisabled]}><Text style={s.sendText}>{sending ? '…' : '↑'}</Text></Pressable></View></KeyboardAvoidingView>}
    <Pressable onPress={() => setOpen(value => !value)} style={s.launcher}><Text style={s.launcherIcon}>{open ? '×' : '✦'}</Text><Text style={s.launcherText}>{open ? 'Close chat' : 'Live chat'}</Text></Pressable>
  </View>;
}
const s = StyleSheet.create({ root:{position:'absolute',right:14,bottom:78,alignItems:'flex-end',zIndex:50},panel:{width:300,maxHeight:430,marginBottom:10,overflow:'hidden',borderRadius:18,borderWidth:1,borderColor:'#3e3420',backgroundColor:'#111519',elevation:12,shadowColor:'#000',shadowOpacity:.45,shadowRadius:16,shadowOffset:{width:0,height:8}},head:{padding:13,flexDirection:'row',justifyContent:'space-between',backgroundColor:'#1b1912'},eyebrow:{fontSize:8,letterSpacing:1.2,fontWeight:'900',color:theme.gold},title:{marginTop:3,fontSize:15,fontWeight:'900',color:theme.text},status:{marginTop:4,fontSize:9,color:'#7dd4a4'},close:{width:28,height:28,borderRadius:14,alignItems:'center',justifyContent:'center',backgroundColor:'#292d31'},closeText:{fontSize:20,color:theme.text},messages:{maxHeight:245},messageContent:{padding:10,gap:7,flexGrow:1},bubble:{maxWidth:'84%',padding:9,borderRadius:12,alignSelf:'flex-start',backgroundColor:'#242a2e'},mine:{alignSelf:'flex-end',backgroundColor:'#d9b950'},bubbleText:{fontSize:12,lineHeight:17,color:'#edf0f3'},mineText:{color:'#15120d',fontWeight:'700'},time:{fontSize:8,color:'#9ba2a8',marginTop:3},mineTime:{color:'#554819'},empty:{padding:18,alignItems:'center'},emptyTitle:{color:theme.text,fontWeight:'900',fontSize:14},emptyCopy:{marginTop:7,textAlign:'center',fontSize:11,lineHeight:16,color:theme.muted},composer:{padding:8,gap:7,flexDirection:'row',borderTopWidth:1,borderColor:'#2d3338'},input:{flex:1,maxHeight:70,paddingHorizontal:10,paddingVertical:8,borderRadius:10,backgroundColor:'#20262b',color:theme.text,fontSize:12},send:{width:36,height:36,borderRadius:10,alignItems:'center',justifyContent:'center',backgroundColor:theme.gold},sendDisabled:{opacity:.45},sendText:{fontSize:19,fontWeight:'900',color:'#15120d'},launcher:{height:42,paddingHorizontal:13,borderRadius:21,flexDirection:'row',alignItems:'center',gap:6,backgroundColor:'#d9b950',elevation:7},launcherIcon:{fontSize:15,fontWeight:'900',color:'#17130a'},launcherText:{fontSize:11,fontWeight:'900',color:'#17130a'} });
