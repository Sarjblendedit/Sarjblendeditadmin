import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function AuthCallback() {
  const [message, setMessage] = useState('Verifying your email…');
  const url = Linking.useURL();
  useEffect(() => { if (!url) return; const { queryParams } = Linking.parse(url); const code = typeof queryParams?.code === 'string' ? queryParams.code : undefined; if (!code) { setMessage('The verification link is invalid or has expired.'); return; } supabase.auth.exchangeCodeForSession(code).then(({ error }) => { if (error) { setMessage(error.message); return; } router.replace('/book'); }); }, [url]);
  return <View style={styles.page}><ActivityIndicator color="#D4AF37" size="large"/><Text style={styles.title}>{message}</Text><Text style={styles.copy}>You can return to the app once verification is complete.</Text></View>;
}
const styles=StyleSheet.create({page:{flex:1,backgroundColor:'#0A0A0A',alignItems:'center',justifyContent:'center',padding:28},title:{color:'#FFF',fontSize:20,fontWeight:'800',marginTop:22,textAlign:'center'},copy:{color:'#999',textAlign:'center',marginTop:10}});
