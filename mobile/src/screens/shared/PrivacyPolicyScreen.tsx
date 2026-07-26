import React from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

export default function PrivacyPolicyScreen() {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#64748B" />
        </Pressable>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.lastUpdated}>Last Updated: July 2026</Text>
        
        <Text style={styles.heading}>1. Paano Namin Kinokolekta ang Data</Text>
        <Text style={styles.paragraph}>
          Kinokolekta namin ang iyong personal na impormasyon (tulad ng pangalan, address, birth date) at mga ID na in-upload mo upang ma-verify ang iyong pagkakakilanlan at matiyak na lehitimo ang mga kasong isinusumite sa platform.
        </Text>

        <Text style={styles.heading}>2. Paggamit ng Iyong Impormasyon</Text>
        <Text style={styles.paragraph}>
          Ang iyong data ay ginagamit eksklusibo para sa layunin ng JusticeLink app: upang ipares ka sa mga abogado, magpadala ng mga update tungkol sa iyong kaso, at para sa identity verification sa tulong ng Didit. Hindi namin ibebenta ang iyong personal na impormasyon sa anumang third party.
        </Text>

        <Text style={styles.heading}>3. Proteksyon ng mga Dokumento</Text>
        <Text style={styles.paragraph}>
          Lahat ng legal na dokumento, chat messages sa mga abogado, at mga ebidensyang in-upload mo ay naka-encrypt. Tanging ikaw, ang iyong nakatalagang abogado, at ang mga otorisadong admin (sa mga limitadong sitwasyon) lamang ang makakakita nito.
        </Text>

        <Text style={styles.heading}>4. Pag-verify Gamit ang Didit</Text>
        <Text style={styles.paragraph}>
          Ginagamit ng platform ang Didit Verification upang matiyak na bawat user ay totoong tao at may isang account lamang. Sa prosesong ito, ang iyong ID at selfie ay ipinapadala nang secure at idinidirekta sa mga ligtas naming storage servers para sa aming records.
        </Text>

        <Text style={styles.heading}>5. Iyong mga Karapatan</Text>
        <Text style={styles.paragraph}>
          Ayon sa Data Privacy Act of 2012 (RA 10173), may karapatan kang humingi ng kopya ng lahat ng data na nasa amin, o ipabura ang iyong account at mga kaugnay nitong datos, maliban sa mga dokumentong kinakailangang itago para sa legal compliance.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 24, 
    paddingTop: Platform.OS === 'ios' ? 60 : 40, 
    paddingBottom: 20, 
    backgroundColor: '#FFFFFF', 
    borderBottomWidth: 1, 
    borderBottomColor: '#E2E8F0' 
  },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#1E293B', fontSize: 18, fontWeight: '700' },
  scrollContent: { padding: 24, paddingBottom: 60 },
  lastUpdated: { color: '#64748B', fontSize: 14, marginBottom: 24, fontStyle: 'italic' },
  heading: { color: '#0D9488', fontSize: 16, fontWeight: '700', marginBottom: 8, marginTop: 16 },
  paragraph: { color: '#334155', fontSize: 15, lineHeight: 24, marginBottom: 16 },
});
