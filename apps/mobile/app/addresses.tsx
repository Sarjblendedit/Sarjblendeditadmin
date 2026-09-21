import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackButton, Card, OperationalHero, PrimaryButton, theme } from '../components/ui';
import { supabase } from '../lib/supabase';

type SavedAddress = { id: string; label: string; address: string; is_default: boolean };

export default function Addresses() {
  const [userId, setUserId] = useState('');
  const [items, setItems] = useState<SavedAddress[]>([]);
  const [label, setLabel] = useState('Home');
  const [address, setAddress] = useState('');
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadAddresses = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace('/login'); return; }
    setUserId(user.id);
    const { data, error } = await supabase.from('customer_saved_addresses')
      .select('id,label,address,is_default')
      .eq('customer_id', user.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) { Alert.alert('Unable to load addresses', error.message); return; }
    setItems((data as SavedAddress[]) ?? []);
  }, []);

  useEffect(() => { void loadAddresses(); }, [loadAddresses]);

  const addAddress = async () => {
    if (!label.trim() || !address.trim()) {
      Alert.alert('Address required', 'Give this location a name and enter the full service address.');
      return;
    }
    if (!userId) return;
    setSaving(true);
    const { error } = await supabase.from('customer_saved_addresses').insert({
      customer_id: userId,
      label: label.trim(),
      address: address.trim(),
      is_default: items.length === 0,
    });
    setSaving(false);
    if (error) { Alert.alert('Unable to save address', error.message); return; }
    setAddress('');
    setLabel('Home');
    setAdding(false);
    await loadAddresses();
  };

  const makeDefault = async (item: SavedAddress) => {
    if (!userId || item.is_default) return;
    const { error: clearError } = await supabase.from('customer_saved_addresses')
      .update({ is_default: false }).eq('customer_id', userId).eq('is_default', true);
    if (clearError) { Alert.alert('Unable to update address', clearError.message); return; }
    const { error } = await supabase.from('customer_saved_addresses')
      .update({ is_default: true }).eq('id', item.id).eq('customer_id', userId);
    if (error) { Alert.alert('Unable to update address', error.message); return; }
    await loadAddresses();
  };

  const remove = (item: SavedAddress) => Alert.alert(
    'Remove saved address',
    `Remove ${item.label}? This will not affect existing bookings.`,
    [{ text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: async () => {
      const { error } = await supabase.from('customer_saved_addresses').delete().eq('id', item.id).eq('customer_id', userId);
      if (error) Alert.alert('Unable to remove address', error.message); else await loadAddresses();
    }}],
  );

  return <SafeAreaView style={s.page} edges={['left', 'right', 'bottom']}><ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void loadAddresses().finally(() => setRefreshing(false)); }} tintColor={theme.gold} colors={[theme.gold]} />}><Pressable onPress={() => router.back()}><BackButton title="Settings" /></Pressable><OperationalHero eyebrow="SERVICE LOCATIONS" title="Saved addresses" copy="Save your usual locations to make your next booking quicker." icon="⌂" />
    {items.map(item => <Card key={item.id} style={s.card}><View style={s.cardTop}><View style={s.locationIcon}><Text style={s.locationIconText}>⌖</Text></View><View style={s.addressCopy}><View style={s.titleLine}><Text style={s.addressLabel}>{item.label}</Text>{item.is_default && <Text style={s.defaultBadge}>DEFAULT</Text>}</View><Text style={s.addressText}>{item.address}</Text></View></View><View style={s.actions}>{!item.is_default && <Pressable onPress={() => void makeDefault(item)} style={s.defaultButton}><Text style={s.defaultText}>MAKE DEFAULT</Text></Pressable>}<Pressable onPress={() => remove(item)} style={s.removeButton}><Text style={s.removeText}>REMOVE</Text></Pressable></View></Card>)}
    {items.length === 0 && !adding && <Card style={s.empty}><Text style={s.emptyTitle}>No saved addresses yet</Text><Text style={s.emptyText}>Add a home, office or hotel address for a faster booking experience.</Text></Card>}
    {adding ? <Card style={s.form}><Text style={s.formTitle}>Add a service location</Text><Text style={s.fieldLabel}>LOCATION NAME</Text><TextInput value={label} onChangeText={setLabel} placeholder="Home, Office, Hotel..." placeholderTextColor={theme.mutedDark} style={s.input} /><Text style={s.fieldLabel}>FULL ADDRESS</Text><TextInput value={address} onChangeText={setAddress} placeholder="Street, area, city" placeholderTextColor={theme.mutedDark} style={[s.input, s.addressInput]} multiline /><View style={s.formActions}><Pressable onPress={() => setAdding(false)} style={s.cancel}><Text style={s.cancelText}>CANCEL</Text></Pressable><View style={s.save}><PrimaryButton title="SAVE ADDRESS" onPress={addAddress} loading={saving} disabled={saving} /></View></View></Card> : <PrimaryButton title="ADD A SAVED ADDRESS  →" onPress={() => setAdding(true)} />}
  </ScrollView></SafeAreaView>;
}

const s = StyleSheet.create({page:{flex:1,backgroundColor:theme.bg},content:{padding:20,paddingBottom:42},card:{marginBottom:11,padding:16},cardTop:{flexDirection:'row'},locationIcon:{width:40,height:40,borderRadius:14,backgroundColor:theme.goldSurface,borderWidth:1,borderColor:theme.goldDark,alignItems:'center',justifyContent:'center',marginRight:12},locationIconText:{color:theme.gold,fontSize:18,fontWeight:'900'},addressCopy:{flex:1},titleLine:{flexDirection:'row',alignItems:'center',gap:8},addressLabel:{color:theme.text,fontSize:14,fontWeight:'900'},defaultBadge:{color:theme.gold,fontSize:8,fontWeight:'900',letterSpacing:1,backgroundColor:theme.goldSurface,paddingHorizontal:7,paddingVertical:4,borderRadius:7},addressText:{color:theme.muted,fontSize:11,lineHeight:17,marginTop:5},actions:{flexDirection:'row',justifyContent:'flex-end',gap:9,marginTop:15},defaultButton:{paddingVertical:8,paddingHorizontal:10,borderRadius:10,backgroundColor:theme.goldSurface},defaultText:{color:theme.goldSoft,fontSize:9,fontWeight:'900',letterSpacing:.6},removeButton:{paddingVertical:8,paddingHorizontal:10,borderRadius:10,backgroundColor:'#251415'},removeText:{color:'#DE8989',fontSize:9,fontWeight:'900',letterSpacing:.6},empty:{padding:22,alignItems:'center',marginBottom:13},emptyTitle:{color:theme.text,fontSize:16,fontWeight:'900'},emptyText:{color:theme.muted,fontSize:11,lineHeight:17,textAlign:'center',marginTop:7},form:{padding:18,marginBottom:13},formTitle:{color:theme.text,fontSize:17,fontWeight:'900',marginBottom:18},fieldLabel:{color:theme.goldDark,fontSize:8,fontWeight:'900',letterSpacing:1.2,marginBottom:7},input:{height:50,borderRadius:14,borderWidth:1,borderColor:theme.line,backgroundColor:theme.surface3,color:theme.text,paddingHorizontal:14,fontSize:13,marginBottom:15},addressInput:{height:82,paddingTop:13,textAlignVertical:'top'},formActions:{flexDirection:'row',alignItems:'center',gap:10},cancel:{height:50,paddingHorizontal:13,alignItems:'center',justifyContent:'center'},cancelText:{color:theme.goldSoft,fontSize:9,fontWeight:'900'},save:{flex:1}});
