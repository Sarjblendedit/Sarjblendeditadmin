import { useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { supabase } from '../lib/supabase';

type Service = { id: string; name: string; description: string | null; base_price: number };
const money = (value: number) => `K${Number(value).toFixed(0)}`;

export default function Home() {
  const [services, setServices] = useState<Service[]>([]);
  useEffect(() => { supabase.from('services').select('id,name,description,base_price').eq('is_active', true).order('sort_order').then(({ data }) => setServices(data ?? [])); }, []);
  return <SafeAreaView style={styles.page}>
    <View style={styles.hero}><Text style={styles.eyebrow}>BOOKED OUT • MOBILE BARBER</Text><Text style={styles.title}>SARJ{`\n`}BLENDED IT</Text><Text style={styles.copy}>Premium grooming, wherever you are.</Text><Link href="/book" asChild><Pressable style={styles.goldButton}><Text style={styles.goldButtonText}>BOOK APPOINTMENT</Text></Pressable></Link></View>
    <Text style={styles.section}>SERVICES</Text>
    <FlatList data={services} keyExtractor={(item) => item.id} contentContainerStyle={styles.list} renderItem={({ item }) => <Link href={{ pathname: '/book', params: { service: item.id } }} asChild><Pressable style={styles.card}><View><Text style={styles.service}>{item.name}</Text><Text style={styles.desc}>{item.description ?? 'Mobile grooming service'}</Text></View><Text style={styles.price}>from {money(item.base_price)}</Text></Pressable></Link>} ListEmptyComponent={<Text style={styles.desc}>Services will appear after your Supabase setup is connected.</Text>} />
    <View style={styles.contact}><Text style={styles.contactTitle}>BOOKING & ENQUIRIES</Text><Text style={styles.desc}>+260 9756 16716  •  sarjblendedit@gmail.com</Text></View>
  </SafeAreaView>;
}
const styles = StyleSheet.create({ page:{flex:1,backgroundColor:'#0A0A0A'}, hero:{padding:24,paddingTop:40,borderBottomWidth:1,borderColor:'#2A2516'},eyebrow:{color:'#D4AF37',fontSize:11,fontWeight:'700',letterSpacing:1.5},title:{color:'#FFF',fontSize:42,lineHeight:45,fontWeight:'900',letterSpacing:1,marginTop:12},copy:{color:'#B8B8B8',fontSize:16,marginTop:12},goldButton:{backgroundColor:'#D4AF37',marginTop:24,alignSelf:'flex-start',paddingHorizontal:18,paddingVertical:14},goldButtonText:{color:'#0A0A0A',fontSize:12,fontWeight:'900',letterSpacing:1},section:{color:'#D4AF37',fontWeight:'800',letterSpacing:1.3,fontSize:12,margin:24},list:{paddingHorizontal:16,gap:10},card:{backgroundColor:'#151515',borderWidth:1,borderColor:'#292929',padding:16,flexDirection:'row',justifyContent:'space-between'},service:{color:'#FFF',fontSize:16,fontWeight:'700'},desc:{color:'#9B9B9B',fontSize:13,marginTop:5},price:{color:'#D4AF37',fontWeight:'700',fontSize:13},contact:{margin:24,paddingTop:18,borderTopWidth:1,borderColor:'#292929'},contactTitle:{color:'#FFF',fontWeight:'800',fontSize:12,letterSpacing:1} });

