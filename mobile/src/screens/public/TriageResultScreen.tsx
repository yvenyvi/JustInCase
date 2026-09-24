import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View, Pressable, Platform, Linking, TextInput } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { theme } from '../../shared/theme';
import { WorkflowProgress } from '../../components/ui/WorkflowProgress';

export default function TriageResultScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const initialResult = useMemo(() => route.params?.result || {}, [route.params?.result]);
  const [result, setResult] = useState(initialResult);
  const [isEditing, setIsEditing] = useState(false);

  const updateField = (field: string, value: string) => {
    setResult((current: any) => ({ ...current, [field]: value }));
  };

  const updateListField = (field: string, value: string) => {
    setResult((current: any) => ({
      ...current,
      [field]: value.split('\n').map(item => item.trim()).filter(Boolean),
    }));
  };

  const handleNext = () => {
    navigation.navigate('PublicTriageLawyerSelection', { result });
  };

  const handleCancel = () => {
    navigation.reset({ index: 0, routes: [{ name: 'PublicHome' }] });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#64748B" />
        </Pressable>
        <Text style={styles.headerTitle}>Assessment Result</Text>
        <View style={{ width: 44 }} />
      </View>
      <WorkflowProgress steps={['Describe concern', 'Review assessment', 'Choose attorney']} current={1} />

      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        enableOnAndroid
        enableAutomaticScroll
        extraScrollHeight={24}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.resultHeader}>
          <Ionicons name="checkmark-circle" size={48} color="#059669" />
          <Text style={styles.resultTitle}>Review Your Case</Text>
          <Text style={styles.reviewHint}>Suriin at itama ang detalye bago pumili ng abogado.</Text>
        </View>

        {!!result.legal_sources?.length && (
          <View style={styles.aiResultCard}>
            <Text style={styles.aiResultTitle}>Legal sources</Text>
            <Text style={styles.sourceNote}>Juris summaries are AI-generated research aids. Verify the authoritative text.</Text>
            {result.legal_sources.map((source: any) => (
              <View key={`${source.dataset}-${source.id}`} style={styles.sourceItem}>
                <Text style={styles.sourceTitle}>{source.title}</Text>
                {!!source.citation && <Text style={styles.aiDetailLabel}>{source.citation}</Text>}
                <View style={styles.sourceLinks}>
                  <Pressable onPress={() => Linking.openURL(source.url)}><Text style={styles.sourceLink}>Juris record</Text></Pressable>
                  {!!source.source_url && <Pressable onPress={() => Linking.openURL(source.source_url)}><Text style={styles.sourceLink}>Authoritative source</Text></Pressable>}
                </View>
              </View>
            ))}
          </View>
        )}

        {result.research_unavailable && <Text style={styles.sourceNote}>External legal sources could not be verified. The assessment was completed using the existing guidance.</Text>}

        <View style={styles.aiResultCard}>
          <View style={styles.aiResultHeader}>
            <Ionicons name="bulb-outline" size={24} color={theme.colors.primary} />
            <Text style={[styles.aiResultTitle, { flex: 1 }]}>Case Profile</Text>
            <Pressable testID="edit-case-profile" onPress={() => setIsEditing(value => !value)} style={styles.editButton}>
              <Ionicons name={isEditing ? 'checkmark' : 'create-outline'} size={16} color={theme.colors.primary} />
              <Text style={styles.editButtonText}>{isEditing ? 'Done' : 'Edit'}</Text>
            </Pressable>
          </View>
          
          <View style={[styles.aiDetailRow, { flexDirection: 'row', gap: 16 }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.aiDetailLabel}>Kategorya ng Batas:</Text>
              {isEditing ? <TextInput style={styles.editInput} value={result.category_of_law || ''} onChangeText={value => updateField('category_of_law', value)} /> : <Text style={styles.aiDetailValue}>{result.category_of_law}</Text>}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.aiDetailLabel}>Urgency:</Text>
              {isEditing ? (
                <View style={styles.choiceRow}>
                  {['Low', 'Medium', 'High'].map(value => (
                    <Pressable key={value} onPress={() => updateField('urgency', value)} style={[styles.choiceChip, result.urgency === value && styles.choiceChipSelected]}>
                      <Text style={[styles.choiceText, result.urgency === value && styles.choiceTextSelected]}>{value}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : <Text style={styles.aiDetailValue}>{result.urgency}</Text>}
            </View>
          </View>

          <View style={styles.aiDetailRow}>
            <Text style={styles.aiDetailLabel}>Tiyak na Uri ng Kaso:</Text>
            {isEditing ? <TextInput style={styles.editInput} value={result.case_subcategory || ''} onChangeText={value => updateField('case_subcategory', value)} /> : <Text style={styles.aiDetailValue}>{result.case_subcategory || 'Hindi tinukoy'}</Text>}
          </View>
          
          <View style={styles.aiDetailRow}>
            <Text style={styles.aiDetailLabel}>Pangunahing Isyu:</Text>
            {isEditing ? (
              <TextInput testID="primary-issue-input" style={styles.editInput} value={result.primary_issue || ''} onChangeText={value => updateField('primary_issue', value)} multiline />
            ) : <Text style={styles.aiDetailValue}>{result.primary_issue}</Text>}
          </View>

          <View style={styles.aiDetailRow}>
            <Text style={styles.aiDetailLabel}>Buod ng Kaso:</Text>
            {isEditing ? (
              <TextInput testID="case-summary-input" style={[styles.editInput, styles.tallInput]} value={result.case_summary || result.primary_issue || ''} onChangeText={value => updateField('case_summary', value)} multiline />
            ) : <Text style={styles.aiDetailValue}>{result.case_summary || result.primary_issue}</Text>}
          </View>

          <View style={styles.twoColumnRow}>
            <View style={styles.columnField}>
              <Text style={styles.aiDetailLabel}>Kabilang Panig:</Text>
              {isEditing ? <TextInput style={styles.editInput} value={result.opposing_party || ''} onChangeText={value => updateField('opposing_party', value)} /> : <Text style={styles.aiDetailValue}>{result.opposing_party || 'Hindi tinukoy'}</Text>}
            </View>
            <View style={styles.columnField}>
              <Text style={styles.aiDetailLabel}>Lokasyon:</Text>
              {isEditing ? <TextInput testID="location-input" style={styles.editInput} value={result.location || ''} onChangeText={value => updateField('location', value)} /> : <Text style={styles.aiDetailValue}>{result.location || 'Hindi tinukoy'}</Text>}
            </View>
          </View>

          <View style={styles.aiDetailRow}>
            <Text style={styles.aiDetailLabel}>Mahahalagang Pangyayari:</Text>
            {isEditing ? (
              <TextInput style={[styles.editInput, styles.tallInput]} value={(result.chronology || []).join('\n')} onChangeText={value => updateListField('chronology', value)} placeholder="Isang pangyayari bawat linya" multiline />
            ) : result.chronology?.length ? result.chronology.map((item: string, index: number) => <Text key={`${item}-${index}`} style={styles.listItem}>• {item}</Text>) : <Text style={styles.aiDetailValue}>Walang ibinigay na timeline.</Text>}
          </View>

          <View style={styles.aiDetailRow}>
            <Text style={styles.aiDetailLabel}>Mahahalagang Petsa o Deadline:</Text>
            {isEditing ? (
              <TextInput style={[styles.editInput, styles.tallInput]} value={(result.important_dates || []).join('\n')} onChangeText={value => updateListField('important_dates', value)} placeholder="Isang petsa bawat linya" multiline />
            ) : result.important_dates?.length ? result.important_dates.map((item: string, index: number) => <Text key={`${item}-${index}`} style={styles.listItem}>• {item}</Text>) : <Text style={styles.aiDetailValue}>Walang tinukoy na petsa.</Text>}
          </View>

          <View style={styles.aiDetailRow}>
            <Text style={styles.aiDetailLabel}>Ebidensya:</Text>
            {isEditing ? <TextInput style={styles.editInput} value={result.evidence || ''} onChangeText={value => updateField('evidence', value)} multiline /> : <Text style={styles.aiDetailValue}>{result.evidence || 'Walang tinukoy'}</Text>}
          </View>

          <View style={styles.aiDetailRow}>
            <Text style={styles.aiDetailLabel}>Nais na Resulta:</Text>
            {isEditing ? <TextInput testID="desired-outcome-input" style={styles.editInput} value={result.desired_outcome || ''} onChangeText={value => updateField('desired_outcome', value)} multiline /> : <Text style={styles.aiDetailValue}>{result.desired_outcome || 'Hindi tinukoy'}</Text>}
          </View>

          <View style={styles.aiDetailRow}>
            <Text style={styles.aiDetailLabel}>Agarang Panganib:</Text>
            {isEditing ? (
              <TextInput style={[styles.editInput, styles.tallInput]} value={(result.safety_risks || []).join('\n')} onChangeText={value => updateListField('safety_risks', value)} placeholder="Isang panganib bawat linya" multiline />
            ) : result.safety_risks?.length ? result.safety_risks.map((item: string, index: number) => <Text key={`${item}-${index}`} style={[styles.listItem, { color: theme.colors.warning }]}>• {item}</Text>) : <Text style={styles.aiDetailValue}>Walang agarang panganib na natukoy.</Text>}
          </View>

          <View style={styles.aiDetailRow}>
            <Text style={styles.aiDetailLabel}>Uri ng Abogado:</Text>
            {isEditing ? (
              <View style={styles.choiceRow}>
                {['Pro Bono', 'Private', 'Any'].map(value => (
                  <Pressable key={value} onPress={() => updateField('lawyer_preference', value)} style={[styles.choiceChip, result.lawyer_preference === value && styles.choiceChipSelected]}>
                    <Text style={[styles.choiceText, result.lawyer_preference === value && styles.choiceTextSelected]}>{value}</Text>
                  </Pressable>
                ))}
              </View>
            ) : <Text style={styles.aiDetailValue}>{result.lawyer_preference || 'Any'}</Text>}
          </View>

          <View style={styles.aiDetailRow}>
            <Text style={styles.aiDetailLabel}>AI Assessment:</Text>
            <Text style={styles.aiDetailValue}>{result.ai_assessment}</Text>
          </View>

          {(isEditing || (result.missing_details && result.missing_details.toLowerCase() !== "none")) && (
            <View style={[styles.aiDetailRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
              <Text style={styles.aiDetailLabel}>Mga Kulang na Detalye:</Text>
              {isEditing ? <TextInput style={styles.editInput} value={result.missing_details} onChangeText={value => updateField('missing_details', value)} multiline /> : <Text style={[styles.aiDetailValue, { color: theme.colors.warning }]}>{result.missing_details}</Text>}
            </View>
          )}
        </View>

      </KeyboardAwareScrollView>

      <View style={styles.footer}>
        <Pressable 
          style={styles.btnPrimary} 
          onPress={handleNext}
        >
          <Text style={styles.btnPrimaryText}>Kumpirmahin at Pumili ng Abogado</Text>
        </Pressable>
        <Pressable 
          style={styles.btnSecondary} 
          onPress={handleCancel}
        >
          <Text style={styles.btnSecondaryText}>Kanselahin</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.border, zIndex: 10 },
  backBtn: { width: 44, height: 44, borderRadius: theme.borderRadius.round, backgroundColor: theme.colors.secondary, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...theme.typography.subheading },
  scrollContent: { padding: 24, paddingBottom: 40 },
  
  resultHeader: { alignItems: 'center', marginBottom: 24 },
  resultTitle: { ...theme.typography.heading, marginTop: 12 },
  reviewHint: { ...theme.typography.body, color: theme.colors.textSecondary, textAlign: 'center', marginTop: 8 },
  
  aiResultCard: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.xl, padding: 20, marginBottom: 24, ...theme.shadows.soft, borderWidth: 1, borderColor: theme.colors.border },
  aiResultHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
  aiResultTitle: { color: theme.colors.primary, fontSize: 16, fontWeight: '800' },
  editButton: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 18, backgroundColor: theme.colors.primaryLight },
  editButtonText: { color: theme.colors.primary, fontSize: 13, fontWeight: '800' },
  aiDetailRow: { marginBottom: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.secondary, paddingBottom: 16 },
  aiDetailLabel: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 6 },
  aiDetailValue: { color: theme.colors.textPrimary, fontSize: 15, lineHeight: 22, fontWeight: '500' },
  editInput: { color: theme.colors.textPrimary, backgroundColor: theme.colors.secondary, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, minHeight: 42 },
  tallInput: { minHeight: 84, textAlignVertical: 'top' },
  twoColumnRow: { flexDirection: 'row', gap: 12, marginBottom: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.secondary, paddingBottom: 16 },
  columnField: { flex: 1 },
  listItem: { color: theme.colors.textPrimary, fontSize: 15, lineHeight: 22, marginBottom: 4 },
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  choiceChip: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 16, paddingHorizontal: 9, paddingVertical: 7, backgroundColor: theme.colors.surface },
  choiceChipSelected: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight },
  choiceText: { color: theme.colors.textSecondary, fontSize: 11, fontWeight: '700' },
  choiceTextSelected: { color: theme.colors.primary },
  sourceNote: { color: theme.colors.textSecondary, fontSize: 12, lineHeight: 18, marginVertical: 8 },
  sourceItem: { borderTopWidth: 1, borderTopColor: theme.colors.border, paddingVertical: 12 },
  sourceTitle: { color: theme.colors.textPrimary, fontSize: 14, fontWeight: '700', marginBottom: 4 },
  sourceLinks: { flexDirection: 'row', gap: 18 },
  sourceLink: { color: theme.colors.primary, fontSize: 13, fontWeight: '700' },

  footer: { padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24, backgroundColor: 'transparent', gap: 12 },
  btnPrimary: { backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.xl, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', ...theme.shadows.medium },
  btnPrimaryText: { color: theme.colors.surface, fontSize: 16, fontWeight: '800' },
  btnSecondary: { backgroundColor: theme.colors.secondary, borderRadius: theme.borderRadius.xl, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  btnSecondaryText: { color: theme.colors.textSecondary, fontSize: 16, fontWeight: '700' },
});
