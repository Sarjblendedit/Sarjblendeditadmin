import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { Logo, PrimaryButton, theme } from '../components/ui';

export default function ResetPassword() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const url = Linking.useURL();

  useEffect(() => {
    const completeRecovery = async (incomingUrl: string | null) => {
      if (!incomingUrl) return;
      const { queryParams } = Linking.parse(incomingUrl);
      const code = typeof queryParams?.code === 'string' ? queryParams.code : undefined;
      if (!code) return;
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        Alert.alert('Reset link unavailable', 'This reset link may have expired. Please request a new one.');
        return;
      }
      setRecoveryReady(true);
    };
    completeRecovery(url);
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) setRecoveryReady(true);
    });
    return () => listener.subscription.unsubscribe();
  }, [url]);

  const sendReset = async () => {
    if (!email.trim()) return Alert.alert('Enter your email', 'Use the email address linked to your SARJ account.');
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: Linking.createURL('reset-password'),
    });
    setLoading(false);
    if (error) return Alert.alert('Could not send reset link', error.message);
    Alert.alert('Check your inbox', 'If that email has an account, we sent a password reset link. Check spam too.');
  };

  const savePassword = async () => {
    if (password.length < 8) return Alert.alert('Use a stronger password', 'Your new password must have at least 8 characters.');
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return Alert.alert('Could not update password', error.message);
    Alert.alert('Password updated', 'You can now sign in with your new password.', [{ text: 'Sign in', onPress: () => router.replace('/login') }]);
  };

  return <SafeAreaView style={s.page} edges={['top', 'left', 'right', 'bottom']}><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}><ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled"><View style={s.brand}><Logo /><Text style={s.brandName}>SARJ BLENDED IT</Text></View><Text style={s.eyebrow}>ACCOUNT RECOVERY</Text><Text style={s.title}>{recoveryReady ? 'Create a new password' : 'Reset your password'}</Text><Text style={s.copy}>{recoveryReady ? 'Choose a secure password, then return to sign in.' : 'Enter your account email and we will send you a secure reset link.'}</Text>{recoveryReady ? <Field label="NEW PASSWORD" value={password} onChangeText={setPassword} placeholder="At least 8 characters" secureTextEntry autoComplete="new-password" /> : <Field label="EMAIL ADDRESS" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" autoComplete="email" />}<PrimaryButton title={recoveryReady ? 'SAVE NEW PASSWORD  →' : 'SEND RESET LINK  →'} onPress={recoveryReady ? savePassword : sendReset} disabled={loading} loading={loading} /><Pressable onPress={() => router.replace('/login')} style={s.back}><Text style={s.backText}>Back to sign in</Text></Pressable></ScrollView></KeyboardAvoidingView></SafeAreaView>;
}

function Field({ label, ...props }: any) { return <View style={s.field}><Text style={s.label}>{label}</Text><TextInput {...props} style={s.input} placeholderTextColor="#666" /></View>; }
const s = StyleSheet.create({page:{flex:1,backgroundColor:theme.bg},content:{padding:24,paddingBottom:40,flexGrow:1},brand:{alignItems:'center',marginTop:22,marginBottom:46},brandName:{color:theme.text,fontSize:15,fontWeight:'900',letterSpacing:1,marginTop:12},eyebrow:{color:theme.gold,fontSize:9,fontWeight:'900',letterSpacing:1.5},title:{color:theme.text,fontSize:31,lineHeight:36,fontWeight:'900',marginTop:9},copy:{color:theme.muted,fontSize:13,lineHeight:20,marginTop:9,marginBottom:20},field:{marginTop:14,marginBottom:14},label:{color:'#B7A875',fontSize:9,fontWeight:'900',letterSpacing:1.2,marginBottom:7},input:{height:54,borderWidth:1,borderColor:theme.line,borderRadius:15,backgroundColor:theme.surface2,paddingHorizontal:15,color:theme.text,fontSize:14},back:{paddingVertical:22},backText:{color:theme.goldSoft,fontSize:12,fontWeight:'900',textAlign:'center'}});
