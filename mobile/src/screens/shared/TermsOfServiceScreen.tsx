import React from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../shared/theme';

export default function TermsOfServiceScreen() {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#64748B" />
        </Pressable>
        <Text style={styles.headerTitle}>Terms of Service</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.lastUpdated}>Last Updated: July 2026</Text>
        
        <Text style={styles.heading}>1. Pagtanggap sa mga Tuntunin</Text>
        <Text style={styles.paragraph}>
          Sa pamamagitan ng pag-access at paggamit ng JusticeLink, sumasang-ayon ka na sumunod sa mga Tuntunin ng Serbisyo na ito. Kung hindi ka sumasang-ayon sa anumang bahagi ng mga tuntunin, mangyaring huwag gamitin ang aming application.
        </Text>

        <Text style={styles.heading}>2. Paggamit ng Serbisyo</Text>
        <Text style={styles.paragraph}>
          Ang JusticeLink ay isang platform na nag-uugnay sa mga mamamayan sa mga pro-bono na abogado at nagbibigay ng impormasyon tungkol sa mga legal na karapatan. Hindi ito pamalit sa pormal na legal na payo mula sa isang pribadong abogado, maliban na lang kung pormal nang tinanggap ng abogado ang iyong kaso sa pamamagitan ng app.
        </Text>

        <Text style={styles.heading}>3. Mga Pananagutan ng User</Text>
        <Text style={styles.paragraph}>
          Kinakailangang magbigay ng totoo at tumpak na impormasyon, lalo na sa pag-upload ng iyong mga dokumento at government ID para sa verification. May karapatan ang JusticeLink na isuspinde ang anumang account na magpapadala ng pekeng impormasyon o gagamit ng system para sa panloloko.
        </Text>

        <Text style={styles.heading}>4. Pagkapribado at Seguridad</Text>
        <Text style={styles.paragraph}>
          Tinitiyak ng JusticeLink na ligtas ang iyong mga personal na impormasyon at mga detalye ng kaso. Ang lahat ng komunikasyon sa pagitan mo at ng iyong abogado ay sakop ng attorney-client privilege.
        </Text>

        <Text style={styles.heading}>5. Limitasyon ng Pananagutan</Text>
        <Text style={styles.paragraph}>
          Bagama't sinisikap naming maging tumpak ang lahat ng impormasyon sa app (tulad ng Rights Library at Document Generators), hindi mananagot ang JusticeLink platform o ang mga developer nito sa anumang resulta na nag-ugat sa maling pagkakaintindi ng batas. Palaging komunsulta sa iyong nakatalagang abogado para sa legal na katiyakan.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.surface },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 24, 
    paddingTop: Platform.OS === 'ios' ? 60 : 40, 
    paddingBottom: 20, 
    backgroundColor: theme.colors.surface, 
    borderBottomWidth: 1, 
    borderBottomColor: theme.colors.border 
  },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.secondary, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: theme.colors.textPrimary, fontSize: 18, fontWeight: '700' },
  scrollContent: { padding: 24, paddingBottom: 60 },
  lastUpdated: { color: theme.colors.textSecondary, fontSize: 14, marginBottom: 24, fontStyle: 'italic' },
  heading: { color: theme.colors.primary, fontSize: 16, fontWeight: '700', marginBottom: 8, marginTop: 16 },
  paragraph: { color: '#334155', fontSize: 15, lineHeight: 24, marginBottom: 16 },
});
