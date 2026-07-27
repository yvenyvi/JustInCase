import React, { useEffect, useState, useMemo } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, Platform, ActivityIndicator, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { mobileSupabase } from '../../shared/supabase';

// Fallback templates shown if Supabase has no data yet
const FALLBACK_TEMPLATES = [
  { slug: 'demand-deposit', title: 'Demand Letter para sa Security Deposit', description: 'Formal na sulat para sa pagbawi ng security deposit mula sa landlord.', category: 'Housing', estimated_minutes: 7, required_fields: [{key:'sender_name',label:'Iyong Buong Pangalan',type:'text',required:true},{key:'recipient_name',label:'Pangalan ng Landlord',type:'text',required:true},{key:'incident_date',label:'Petsa ng Pangyayari',type:'date',required:true},{key:'issue_summary',label:'Buod ng Isyu',type:'textarea',required:true}], optional_fields: [{key:'sender_address',label:'Iyong Address',type:'textarea',required:false},{key:'amount_claimed',label:'Halagang Kiniklaim',type:'text',required:false}] },
  { slug: 'wage-claim', title: 'Notice of Unpaid Wages', description: 'Notice para sa hindi nabayarang sahod, overtime, o final pay.', category: 'Labor', estimated_minutes: 10, required_fields: [{key:'sender_name',label:'Iyong Buong Pangalan',type:'text',required:true},{key:'recipient_name',label:'Pangalan ng Employer/HR',type:'text',required:true},{key:'incident_date',label:'Petsa ng Pangyayari',type:'date',required:true},{key:'issue_summary',label:'Detalyeng ng Hindi Nabayarang Sahod',type:'textarea',required:true}], optional_fields: [{key:'amount_claimed',label:'Halagang Kiniklaim',type:'text',required:false},{key:'position_title',label:'Trabaho/Posisyon',type:'text',required:false}] },
  { slug: 'illegal-dismissal-request', title: 'Request for Review of Illegal Dismissal', description: 'Formal request for reinstatement, due process review, or separation pay discussion.', category: 'Labor', estimated_minutes: 12, required_fields: [{key:'sender_name',label:'Employee Full Name',type:'text',required:true},{key:'recipient_name',label:'Employer / HR Name',type:'text',required:true},{key:'incident_date',label:'Date of Dismissal',type:'date',required:true},{key:'issue_summary',label:'Facts of Dismissal',type:'textarea',required:true}], optional_fields: [{key:'position_title',label:'Position',type:'text',required:false},{key:'relief_requested',label:'Requested Relief',type:'textarea',required:false}] },
  { slug: 'barangay-sumbong', title: 'Barangay Complaint Draft', description: 'Template complaint para sa Barangay Lupon Tagapamayapa.', category: 'Barangay', estimated_minutes: 9, required_fields: [{key:'sender_name',label:'Iyong Buong Pangalan',type:'text',required:true},{key:'recipient_name',label:'Pangalan ng Inirereklamo',type:'text',required:true},{key:'incident_date',label:'Petsa ng Pangyayari',type:'date',required:true},{key:'issue_summary',label:'Buod ng Reklamo',type:'textarea',required:true}], optional_fields: [{key:'relief_requested',label:'Hinihiling na Aksyon',type:'textarea',required:false}] },
  { slug: 'vawc-protection-request', title: 'VAWC Protection and Assistance Request', description: 'Draft request letter for immediate assistance and protection in VAWC situations.', category: 'Family', estimated_minutes: 13, required_fields: [{key:'sender_name',label:'Survivor/Complainant Name',type:'text',required:true},{key:'recipient_name',label:'Barangay / PNP Women and Children Desk / Court',type:'text',required:true},{key:'incident_date',label:'Latest Incident Date',type:'date',required:true},{key:'issue_summary',label:'Summary of Abuse/Threat',type:'textarea',required:true}], optional_fields: [{key:'respondent_name',label:'Respondent Name',type:'text',required:false},{key:'relief_requested',label:'Requested Protection',type:'textarea',required:false}] },
  { slug: 'child-support-demand', title: 'Child Support Demand Letter', description: 'Formal demand for regular child support and reimbursement of necessary expenses.', category: 'Family', estimated_minutes: 11, required_fields: [{key:'sender_name',label:'Parent/Guardian Name',type:'text',required:true},{key:'recipient_name',label:'Obligated Parent Name',type:'text',required:true},{key:'incident_date',label:'Demand Date',type:'date',required:true},{key:'issue_summary',label:'Child Needs and Current Situation',type:'textarea',required:true}], optional_fields: [{key:'amount_claimed',label:'Monthly Support Amount Requested',type:'text',required:false},{key:'child_name',label:'Child Name',type:'text',required:false}] },
  { slug: 'consumer-refund-demand', title: 'Consumer Refund and Remedy Demand', description: 'Formal demand for refund, replacement, or repair due to defective goods/services.', category: 'Consumer', estimated_minutes: 9, required_fields: [{key:'sender_name',label:'Consumer Full Name',type:'text',required:true},{key:'recipient_name',label:'Business / Seller Name',type:'text',required:true},{key:'incident_date',label:'Transaction or Incident Date',type:'date',required:true},{key:'issue_summary',label:'Issue and Defect Details',type:'textarea',required:true}], optional_fields: [{key:'amount_claimed',label:'Purchase Price / Refund Amount',type:'text',required:false},{key:'relief_requested',label:'Preferred Remedy',type:'textarea',required:false}] },
  { slug: 'cybercrime-complaint-draft', title: 'Cybercrime / Online Scam Complaint', description: 'Structured complaint draft for online scam, phishing, or unauthorized digital activity.', category: 'Cybercrime', estimated_minutes: 10, required_fields: [{key:'sender_name',label:'Complainant Full Name',type:'text',required:true},{key:'recipient_name',label:'Receiving Office (PNP/NBI/Prosecutor)',type:'text',required:true},{key:'incident_date',label:'Incident Date',type:'date',required:true},{key:'issue_summary',label:'Scam or Cyber Incident Facts',type:'textarea',required:true}], optional_fields: [{key:'amount_claimed',label:'Estimated Loss Amount',type:'text',required:false},{key:'evidence_list',label:'Available Evidence',type:'textarea',required:false}] },
  { slug: 'dole-complaint', title: 'DOLE Labor Standards Complaint', description: 'Formal complaint para sa DOLE Regional/Field Office tungkol sa paglabag sa labor standards.', category: 'Labor', estimated_minutes: 12, required_fields: [{key:'sender_name',label:'Iyong Buong Pangalan (Manggagawa)',type:'text',required:true},{key:'employer_name',label:'Pangalan ng Employer/Kumpanya',type:'text',required:true},{key:'employer_address',label:'Address ng Employer',type:'textarea',required:true},{key:'incident_date',label:'Petsa ng Paglabag',type:'date',required:true},{key:'issue_summary',label:'Buod ng Paglabag sa Labor Standards',type:'textarea',required:true}], optional_fields: [{key:'position_title',label:'Posisyon/Trabaho',type:'text',required:false},{key:'amount_claimed',label:'Kabuuang Halagang Kiniklaim',type:'text',required:false}] },
  { slug: 'custom-document-request', title: 'Custom Legal Document', description: 'Kung wala sa listahan ang kailangan mo, ilarawan dito para subukang gawan ng draft gamit ang AI.', category: 'General', estimated_minutes: 15, required_fields: [{key:'sender_name',label:'Iyong Buong Pangalan',type:'text',required:true},{key:'document_type',label:'Anong klaseng dokumento ito?',type:'text',required:true},{key:'issue_summary',label:'Buod ng sitwasyon at mga detalye',type:'textarea',required:true}], optional_fields: [{key:'recipient_name',label:'Pangalan ng Padadalhan (kung meron)',type:'text',required:false}] },
];

export interface DocumentTemplate {
  slug: string;
  title: string;
  description: string;
  category: string;
  estimated_minutes: number;
  law_basis?: string;
}

export default function DocumentGeneratorScreen() {
  const navigation = useNavigation<any>();
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const CUSTOM_TEMPLATE = FALLBACK_TEMPLATES.find(t => t.slug === 'custom-document-request')!;

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const { data, error } = await mobileSupabase
          .from('document_templates')
          .select('*');
        if (!error && data && data.length > 0) {
          // Sort Supabase templates, then always pin Custom at the bottom
          const sorted = data
            .filter((t: any) => t.slug !== 'custom-document-request')
            .sort((a: any, b: any) => a.title.localeCompare(b.title));
          setTemplates([...sorted, CUSTOM_TEMPLATE]);
        } else {
          setTemplates(FALLBACK_TEMPLATES.sort((a, b) => a.title.localeCompare(b.title)));
        }
      } catch (err) {
        console.error('Error fetching document templates:', err);
        setTemplates(FALLBACK_TEMPLATES.sort((a, b) => a.title.localeCompare(b.title)));
      } finally {
        setIsLoading(false);
      }
    };
    fetchTemplates();
  }, []);

  const getIconForCategory = (category: string) => {
    if (category.toLowerCase().includes('labor')) return 'briefcase-outline';
    if (category.toLowerCase().includes('family')) return 'home-outline';
    if (category.toLowerCase().includes('housing')) return 'business-outline';
    if (category.toLowerCase().includes('civil')) return 'document-text-outline';
    if (category.toLowerCase().includes('cybercrime')) return 'shield-checkmark-outline';
    if (category.toLowerCase().includes('consumer')) return 'cart-outline';
    return 'document-text-outline';
  };

  // Derive unique categories (excluding the custom template category if we want it isolated, but it's General)
  const categories = useMemo(() => {
    const cats = new Set<string>();
    templates.forEach(t => {
      if (t.slug !== 'custom-document-request') cats.add(t.category);
    });
    return Array.from(cats).sort();
  }, [templates]);

  // Filter templates based on search and category
  const filteredTemplates = useMemo(() => {
    return templates
      .filter(t => t.slug !== 'custom-document-request')
      .filter(t => {
        const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              t.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory ? t.category === selectedCategory : true;
        return matchesSearch && matchesCategory;
      });
  }, [templates, searchQuery, selectedCategory]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#64748B" />
        </Pressable>
        <Text style={styles.headerTitle}>Legal Documents</Text>
        <View style={{ width: 44 }} />
      </View>

      {isLoading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#0D9488" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.heroSection}>
            <Text style={styles.heroTitle}>Gumawa ng Legal na Dokumento</Text>
            <Text style={styles.heroSubtitle}>Libre at mabilis. Pumili ng template sa ibaba upang simulan ang paggawa ng iyong dokumento.</Text>
            
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#94A3B8" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Maghanap ng dokumento..."
                placeholderTextColor="#94A3B8"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery('')} style={styles.clearBtn}>
                  <Ionicons name="close-circle" size={18} color="#94A3B8" />
                </Pressable>
              )}
            </View>
          </View>

          <View style={styles.filtersWrapper}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScroll}>
              <Pressable
                style={[styles.filterChip, selectedCategory === null && styles.filterChipActive]}
                onPress={() => setSelectedCategory(null)}
              >
                <Text style={[styles.filterChipText, selectedCategory === null && styles.filterChipTextActive]}>All</Text>
              </Pressable>
              {categories.map(cat => (
                <Pressable
                  key={cat}
                  style={[styles.filterChip, selectedCategory === cat && styles.filterChipActive]}
                  onPress={() => setSelectedCategory(cat)}
                >
                  <Text style={[styles.filterChipText, selectedCategory === cat && styles.filterChipTextActive]}>{cat}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <Text style={styles.sectionLabel}>Mga Available na Templates ({filteredTemplates.length})</Text>

          <View style={styles.list}>
            {filteredTemplates.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="document-text-outline" size={48} color="#CBD5E1" />
                <Text style={styles.emptyStateText}>Walang nahanap na dokumento.</Text>
              </View>
            ) : (
              filteredTemplates.map((tpl) => (
                <Pressable 
                  key={tpl.slug} 
                  style={styles.card}
                  onPress={() => navigation.navigate('PublicDocumentForm', { template: tpl })}
                >
                  <View style={styles.cardIcon}>
                    <Ionicons name={getIconForCategory(tpl.category) as any} size={28} color="#0D9488" />
                  </View>
                  <View style={styles.cardContent}>
                    <View style={styles.cardHeaderRow}>
                      <Text style={styles.categoryBadge}>{tpl.category}</Text>
                      <Text style={styles.timeEstimate}>~{tpl.estimated_minutes} min</Text>
                    </View>
                    <Text style={styles.cardTitle}>{tpl.title}</Text>
                    <Text style={styles.cardDesc}>{tpl.description}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
                </Pressable>
              ))
            )}

            {/* Custom document request — always pinned at the bottom */}
            <View style={styles.customSectionDivider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerLabel}>Hindi makita ang kailangan mo?</Text>
              <View style={styles.dividerLine} />
            </View>
            <Pressable
              style={styles.customCard}
              onPress={() => navigation.navigate('PublicDocumentForm', { template: CUSTOM_TEMPLATE })}
            >
              <View style={styles.customCardIcon}>
                <Ionicons name="sparkles" size={28} color="#7C3AED" />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.customCardTitle}>Custom Legal Document</Text>
                <Text style={styles.cardDesc}>Ilarawan ang iyong sitwasyon at hayaan ang AI na gumawa ng angkop na draft para sa iyo.</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#7C3AED" />
            </Pressable>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#1E293B', fontSize: 18, fontWeight: '700' },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 24, paddingBottom: 60 },
  heroSection: { marginBottom: 32 },
  heroTitle: { color: '#1E293B', fontSize: 28, fontWeight: '800', marginBottom: 12 },
  heroSubtitle: { color: '#64748B', fontSize: 16, lineHeight: 24 },
  sectionLabel: { color: '#0D9488', fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16, marginLeft: 4 },
  list: { gap: 16 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#94A3B8', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  cardIcon: { width: 52, height: 52, borderRadius: 16, backgroundColor: '#F0FDFA', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  cardContent: { flex: 1, marginRight: 12 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  categoryBadge: { color: '#0D9488', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, backgroundColor: '#F0FDFA', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, overflow: 'hidden' },
  timeEstimate: { color: '#64748B', fontSize: 12, fontWeight: '600' },
  cardTitle: { color: '#1E293B', fontSize: 16, fontWeight: '700', marginBottom: 4 },
  cardDesc: { color: '#64748B', fontSize: 13, lineHeight: 20 },
  customSectionDivider: { flexDirection: 'row', alignItems: 'center', marginTop: 8, marginBottom: 4, gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E2E8F0' },
  dividerLabel: { color: '#94A3B8', fontSize: 12, fontWeight: '600', textAlign: 'center' },
  customCard: { backgroundColor: '#FAF5FF', borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#DDD6FE', borderStyle: 'dashed', shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  customCardIcon: { width: 52, height: 52, borderRadius: 16, backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  customCardTitle: { color: '#6D28D9', fontSize: 16, fontWeight: '700', marginBottom: 4 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, paddingHorizontal: 16, marginTop: 20, height: 52, shadowColor: '#94A3B8', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  searchIcon: { marginRight: 12 },
  searchInput: { flex: 1, fontSize: 15, color: '#1E293B' },
  clearBtn: { padding: 4 },
  filtersWrapper: { marginHorizontal: -24, marginBottom: 24 },
  filtersScroll: { paddingHorizontal: 24, gap: 10 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
  filterChipActive: { backgroundColor: '#0D9488', borderColor: '#0D9488' },
  filterChipText: { color: '#64748B', fontSize: 14, fontWeight: '600' },
  filterChipTextActive: { color: '#FFFFFF' },
  emptyState: { padding: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC', borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0', borderStyle: 'dashed' },
  emptyStateText: { color: '#94A3B8', fontSize: 15, marginTop: 12, fontWeight: '500' },
});
