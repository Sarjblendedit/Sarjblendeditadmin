import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { Logo, PrimaryButton, theme } from '../components/ui';

export default function Login() {
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [loading, setLoading] = useState(false);
  const submit = async () => {
    if (!email.trim() || !password) return Alert.alert('Enter your details', 'Email and password are required.');
    if (password.length < 6) return Alert.alert('Use a stronger password', 'Your password must have at least 6 characters.');
    if (mode === 'signUp' && !name.trim()) return Alert.alert('Add your name', 'Please enter your full name.');
    setLoading(true);
    const result = mode === 'signUp'
      ? await supabase.auth.signUp({ email: email.trim().toLowerCase(), password, options: { data: { full_name: name.trim() }, emailRedirectTo: Linking.createURL('auth/callback') } })
      : await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    setLoading(false);
    if (result.error) return Alert.alert('Could not continue', result.error.message);
    if (mode === 'signUp' && !result.data.session) return Alert.alert('Check your inbox', 'Confirm your email, then return here and sign in.');
    router.replace('/book');
  };
  return <SafeAreaView style={s.page} edges={['top', 'left', 'right', 'bottom']}><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}><ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled"><View style={s.brand}><Logo /><Text style={s.brandName}>SARJ BLENDED IT</Text><Text style={s.brandSub}>PREMIUM MOBILE GROOMING</Text></View><Text style={s.eyebrow}>{mode === 'signIn' ? 'WELCOME BACK' : 'JOIN SARJ'}</Text><Text style={s.title}>{mode === 'signIn' ? 'Ready for your next look?' : 'Create your client profile.'}</Text><Text style={s.copy}>Book, track, and manage every appointment from one place.</Text>{mode === 'signUp' && <Field label="FULL NAME" value={name} onChangeText={setName} placeholder="Your name" autoCapitalize="words" />}<Field label="EMAIL ADDRESS" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" autoComplete="email" /><Field label="PASSWORD" value={password} onChangeText={setPassword} placeholder="Minimum 6 characters" secureTextEntry autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'} /><Pressable onPress={() => router.push('/reset-password')} hitSlop={8} style={s.forgotButton}><Text style={s.forgotText}>Forgot your password?</Text></Pressable><PrimaryButton title={mode === 'signIn' ? 'SIGN IN  →' : 'CREATE ACCOUNT  →'} onPress={submit} disabled={loading} loading={loading} /><Pressable onPress={() => setMode(mode === 'signIn' ? 'signUp' : 'signIn')} style={s.switchButton}><Text style={s.switchText}>{mode === 'signIn' ? 'New to SARJ? ' : 'Already have an account? '}<Text style={s.switchStrong}>{mode === 'signIn' ? 'Create an account' : 'Sign in'}</Text></Text></Pressable></ScrollView></KeyboardAvoidingView></SafeAreaView>;
}
function Field({ label, ...props }: any) { return <View style={s.field}><Text style={s.label}>{label}</Text><TextInput {...props} style={s.input} placeholderTextColor="#666" /></View>; }
const s = StyleSheet.create({ page:{flex:1,backgroundColor:theme.bg},content:{padding:24,paddingBottom:40,flexGrow:1},brand:{alignItems:'center',marginTop:22,marginBottom:46},brandName:{color:theme.text,fontSize:15,fontWeight:'900',letterSpacing:1,marginTop:12},brandSub:{color:theme.muted,fontSize:8,fontWeight:'800',letterSpacing:1.5,marginTop:4},eyebrow:{color:theme.gold,fontSize:9,fontWeight:'900',letterSpacing:1.5},title:{color:theme.text,fontSize:31,lineHeight:36,fontWeight:'900',marginTop:9},copy:{color:theme.muted,fontSize:13,lineHeight:20,marginTop:9,marginBottom:20},field:{marginTop:14},label:{color:'#B7A875',fontSize:9,fontWeight:'900',letterSpacing:1.2,marginBottom:7},input:{height:54,borderWidth:1,borderColor:theme.line,borderRadius:15,backgroundColor:theme.surface2,paddingHorizontal:15,color:theme.text,fontSize:14},forgotButton:{alignSelf:'flex-end',paddingTop:13,paddingBottom:10},forgotText:{color:theme.goldSoft,fontSize:12,fontWeight:'800'},switchButton:{paddingVertical:22},switchText:{color:theme.muted,textAlign:'center',fontSize:12},switchStrong:{color:theme.goldSoft,fontWeight:'900'}});
