import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Pressable, Platform, TextInput, ActivityIndicator, Image, Keyboard, ScrollView } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Ionicons } from '@expo/vector-icons';
import CustomPicker from '../../components/CustomPicker';
import { useNavigation } from '@react-navigation/native';
import { mobileSupabase } from '../../shared/supabase';
import Toast from 'react-native-toast-message';

export default function TriageScreen() {
  const navigation = useNavigation<any>();
  const scrollRef = useRef<ScrollView>(null);
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [lawyerPreference, setLawyerPreference] = useState<'Pro Bono' | 'Private' | ''>('');
  const [selectedLawyerId, setSelectedLawyerId] = useState<string>('');

  // Additional Fields
  const [urgency, setUrgency] = useState<'high' | 'medium' | 'low' | ''>('');
  const [income, setIncome] = useState('');
  const [province, setProvince] = useState('');
  
  const [opposingPartyType, setOpposingPartyType] = useState('');
  const [hasDeadline, setHasDeadline] = useState(false);
  const [deadlineDate, setDeadlineDate] = useState('');
  
  // New Fields
  const [evidence, setEvidence] = useState('');
  const [outcome, setOutcome] = useState('');

  const [realLawyers, setRealLawyers] = useState<any[]>([]);
  const [topLawyerId, setTopLawyerId] = useState<string | null>(null);
  const [topLawyerReason, setTopLawyerReason] = useState<string>('');

  const [aiAnalysisResult, setAiAnalysisResult] = useState<any>(null);

  // Perform AI Analysis on Step 5
  useEffect(() => {
    if (step === 5) {
      const performAnalysis = async () => {
        try {
          // 1. Fetch Real Lawyers First
          const { data: lawyersData } = await mobileSupabase
            .from('users')
            .select('id, first_name, last_name, firm_name, city_municipality, selfie_url, id_picture_url')
            .eq('role', 'Volunteer Attorney');
          
          const availableLawyers = lawyersData || [];
          setRealLawyers(availableLawyers);

          // 2. Call Backend Triage Analysis Endpoint
          const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8000';
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 12000);

          const response = await fetch(`${apiBaseUrl}/api/triage/analyze`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            signal: controller.signal,
            body: JSON.stringify({
              description,
              opposingPartyType,
              urgency,
              province,
              income,
              deadlineDate,
              hasDeadline,
              evidence,
              outcome,
              availableLawyers: availableLawyers.map(l => ({
                id: l.id,
                first_name: l.first_name,
                last_name: l.last_name,
                firm_name: l.firm_name,
                city_municipality: l.city_municipality
              }))
            })
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            throw new Error(`Backend triage API error: ${response.status}`);
          }

          const parsed = await response.json();
          setAiAnalysisResult(parsed);
          setCategory(parsed.category_of_law || 'General Practice');
          setTopLawyerId(parsed.recommended_lawyer_id || null);
          setTopLawyerReason(parsed.recommendation_reason || '');

        } catch (error) {
          console.error("AI Analysis Failed:", error);
          setCategory('General Practice');
          setAiAnalysisResult({
            category_of_law: "General Practice",
            primary_issue: "Could not generate summary.",
            ai_assessment: "AI analysis failed due to an error.",
            missing_details: "N/A"
          });
        } finally {
          setStep(6);
        }
      };

      performAnalysis();
    }
  }, [step]);

  const showToastError = (message: string) => {
    Toast.show({ type: 'error', text1: 'Required', text2: message });
  };

  const handleNext = () => {
    if (step === 1) {
      if (!urgency) { showToastError('Please select the urgency.'); return; }
      if (!income) { showToastError('Please select your income bracket.'); return; }
      if (!province.trim()) { showToastError('Please enter your province/city.'); return; }
    }
    if (step === 2) {
      if (!description.trim()) { showToastError('Please describe your problem.'); return; }
      if (!opposingPartyType) { showToastError('Please select the opposing party type.'); return; }
      if (!evidence) { showToastError('Please select available evidence.'); return; }
      if (!outcome.trim()) { showToastError('Please describe your desired outcome.'); return; }
      if (hasDeadline && !deadlineDate.trim()) { showToastError('Please provide the deadline date.'); return; }
    }
    if (step === 3 && !lawyerPreference) {
      showToastError('Please select a lawyer preference.');
      return;
    }
    setStep(prev => prev + 1);
  };

  const handleBack = () => {
    if (step === 5) return; // Prevent back on loading screen
    if (step > 1) {
      setStep(prev => prev - 1);
    } else {
      navigation.goBack();
    }
  };

  const handleSubmit = async (lawyerId?: string) => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await mobileSupabase.auth.getUser();
      if (!user) {
        Toast.show({ type: 'error', text1: 'Error', text2: 'You must be logged in to submit a case.' });
        return;
      }

      const dateStr = new Intl.DateTimeFormat('en-PH', { year: 'numeric', month: 'short', day: '2-digit' }).format(new Date());
      const caseTitle = `${category} Concern (${dateStr})`;

      const deadlineStr = hasDeadline && deadlineDate ? `Deadline: ${deadlineDate}` : 'No immediate deadline provided';
      const fullDescriptionObject = {
        isJsonFormat: true,
        rawInput: {
          category: category,
          description,
          opposingPartyType,
          urgency,
          province,
          income,
          hasDeadline,
          deadlineDate: hasDeadline ? deadlineDate : 'None',
          evidence,
          outcome
        },
        aiAnalysis: aiAnalysisResult
      };

      const { error } = await mobileSupabase.from('cases').insert({
        title: caseTitle,
        description: JSON.stringify(fullDescriptionObject),
        lawyer_preference: lawyerPreference,
        status: 'Pending Triage',
        client_id: user.id,
        category: category,
        attorney_id: selectedLawyerId || null
      });

      if (error) throw error;
      
      Toast.show({
        type: 'success',
        text1: 'Case Submitted!',
        text2: 'Your case has been successfully matched and submitted.'
      });

      navigation.navigate('PublicHome', { screen: 'Cases' });
    } catch (err: any) {
      console.error('Submit Case Error:', err);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: err.message || 'Unable to submit case at this time.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderHeader = () => {
    if (step === 5) return null; // Hide header during AI analysis
    
    return (
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#64748B" />
        </Pressable>
        <Text style={styles.headerTitle}>Humanap ng Tulong</Text>
        <View style={{ width: 44 }} />
      </View>
    );
  };

  const renderProgressBar = () => {
    if (step === 5) return null;
    
    const progressStep = step > 4 ? 4 : step;
    return (
      <View style={styles.progressContainer}>
        <View style={styles.dotRow}>
          {[1, 2, 3, 4].map((i) => (
            <React.Fragment key={i}>
              <View style={[styles.progressDot, progressStep >= i ? styles.progressDotActive : null]}>
                {progressStep > i ? (
                  <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                ) : (
                  <Text style={[styles.dotText, progressStep === i ? styles.dotTextActive : null]}>{i}</Text>
                )}
              </View>
              {i < 4 && <View style={[styles.progressLine, progressStep > i ? styles.progressLineActive : null]} />}
            </React.Fragment>
          ))}
        </View>
        <Text style={styles.progressText}>
          {step === 6 ? 'Final Match' : `Step ${progressStep} of 4`}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Ambient Background Glows */}
      <View style={styles.ambientGlow1} />
      <View style={styles.ambientGlow2} />
      
      {renderHeader()}
      {renderProgressBar()}

      <KeyboardAwareScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
        extraScrollHeight={Platform.OS === 'ios' ? 40 : 20}
      >
        {step === 1 && (
          <View>
            <Text style={styles.stepTitle}>Gaano ka-urgent ito?</Text>
            <Text style={styles.stepSubtitle}>Ang AI namin ang tutukoy kung anong kategorya ang iyong kaso base sa iyong kwento.</Text>
            
            <CustomPicker
              placeholder="Pumili ng urgency"
              selectedValue={urgency}
              onValueChange={(val) => setUrgency(val as any)}
              options={[
                { label: 'High - may immediate risk / deadline', value: 'high' },
                { label: 'Medium - kailangan ng legal guidance soon', value: 'medium' },
                { label: 'Low - planning and preventive legal help', value: 'low' },
              ]}
            />

            <Text style={[styles.stepTitle, { marginTop: 32 }]}>Monthly household income</Text>
            <CustomPicker
              placeholder="Pumili ng income bracket"
              selectedValue={income}
              onValueChange={setIncome}
              options={[
                { label: 'Below ₱15,000/buwan', value: 'Below ₱15,000/buwan' },
                { label: '₱15,001 - ₱25,000/buwan', value: '₱15,001 - ₱25,000/buwan' },
                { label: '₱25,001 - ₱50,000/buwan', value: '₱25,001 - ₱50,000/buwan' },
                { label: 'Higit sa ₱50,000/buwan', value: 'Higit sa ₱50,000/buwan' },
              ]}
            />

            <Text style={[styles.stepTitle, { marginTop: 32 }]}>Saan ang iyong kaso? (Province/City)</Text>
            <TextInput
              style={[styles.textInput, { marginTop: 16 }]}
              placeholder="Halimbawa: Metro Manila"
              placeholderTextColor="#94A3B8"
              value={province}
              onChangeText={setProvince}
              returnKeyType="done"
              onSubmitEditing={() => Keyboard.dismiss()}
              onFocus={() => {
                // KeyboardAwareScrollView handles scrolling automatically
              }}
            />
          </View>
        )}

        {step === 2 && (
          <View>
            <Text style={styles.stepTitle}>Ilarawan ang iyong problema</Text>
            <Text style={styles.stepSubtitle}>Ibigay ang mga mahalagang detalye para mas maintindihan namin ang iyong kaso.</Text>
            
            <TextInput
              style={styles.textArea}
              placeholder="Halimbawa: May nareceive akong eviction notice at may 7 araw na lang..."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              value={description}
              onChangeText={setDescription}
            />

            <Text style={[styles.stepTitle, { marginTop: 32 }]}>Sino ang kabilang panig?</Text>
            <CustomPicker
              placeholder="Pumili ng kabilang panig"
              selectedValue={opposingPartyType}
              onValueChange={setOpposingPartyType}
              options={[
                { label: 'Individual', value: 'individual' },
                { label: 'Employer', value: 'employer' },
                { label: 'Landlord/Property owner', value: 'landlord' },
                { label: 'Spouse/Family member', value: 'spouse_or_family' },
                { label: 'Company/Organization', value: 'company' },
                { label: 'Government office', value: 'government' },
              ]}
            />

            <Text style={[styles.stepTitle, { marginTop: 32 }]}>May legal deadline ba?</Text>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
              <Pressable 
                style={[styles.radioOption, { flex: 1 }, hasDeadline && styles.radioOptionSelected]}
                onPress={() => setHasDeadline(true)}
              >
                <Text style={[styles.radioOptionText, hasDeadline && styles.radioOptionTextSelected, { textAlign: 'center' }]}>Meron</Text>
              </Pressable>
              <Pressable 
                style={[styles.radioOption, { flex: 1 }, !hasDeadline && styles.radioOptionSelected]}
                onPress={() => { setHasDeadline(false); setDeadlineDate(''); }}
              >
                <Text style={[styles.radioOptionText, !hasDeadline && styles.radioOptionTextSelected, { textAlign: 'center' }]}>Wala</Text>
              </Pressable>
            </View>
            
            {hasDeadline && (
              <TextInput
                style={[styles.textInput, { marginTop: 16 }]}
                placeholder="MM/DD/YYYY"
                placeholderTextColor="#94A3B8"
                value={deadlineDate}
                onChangeText={setDeadlineDate}
              />
            )}
            
            <Text style={[styles.stepTitle, { marginTop: 32 }]}>Anong ebidensya ang meron ka?</Text>
            <CustomPicker
              placeholder="Pumili ng ebidensya"
              selectedValue={evidence}
              onValueChange={setEvidence}
              options={[
                { label: 'Wala', value: 'None' },
                { label: 'Photos / Videos', value: 'Photos/Videos' },
                { label: 'Documents / Contracts / Receipts', value: 'Documents' },
                { label: 'Witnesses', value: 'Witnesses' },
                { label: 'Iba pa', value: 'Other' },
              ]}
            />

            <Text style={[styles.stepTitle, { marginTop: 32 }]}>Anong gusto mong mangyari?</Text>
            <TextInput
              style={[styles.textInput, { marginTop: 16 }]}
              placeholder="Halimbawa: Gusto kong makuha ang huling sweldo ko..."
              placeholderTextColor="#94A3B8"
              value={outcome}
              onChangeText={setOutcome}
            />
          </View>
        )}

        {step === 3 && (
          <View>
            <Text style={styles.stepTitle}>Pumili ng Uri ng Abogado</Text>
            <Text style={styles.stepSubtitle}>Gusto mo ba ng libre o pribadong abogado?</Text>
            
            <View style={styles.preferencesList}>
              <Pressable 
                style={[styles.preferenceCard, lawyerPreference === 'Pro Bono' && styles.preferenceCardSelected]}
                onPress={() => setLawyerPreference('Pro Bono')}
              >
                <Ionicons name="heart" size={28} color={lawyerPreference === 'Pro Bono' ? "#0D9488" : "#94A3B8"} />
                <View style={styles.prefTextWrap}>
                  <Text style={[styles.prefTitle, lawyerPreference === 'Pro Bono' && styles.prefTitleSelected]}>Pro Bono Lawyer</Text>
                  <Text style={[styles.prefDesc, lawyerPreference === 'Pro Bono' && styles.prefDescSelected]}>Libreng serbisyo para sa mga kwalipikado, ngunit depende sa availability ng abogado.</Text>
                </View>
              </Pressable>

              <Pressable 
                style={[styles.preferenceCard, lawyerPreference === 'Private' && styles.preferenceCardSelected]}
                onPress={() => setLawyerPreference('Private')}
              >
                <Ionicons name="briefcase" size={28} color={lawyerPreference === 'Private' ? "#0D9488" : "#94A3B8"} />
                <View style={styles.prefTextWrap}>
                  <Text style={[styles.prefTitle, lawyerPreference === 'Private' && styles.prefTitleSelected]}>Private Lawyer</Text>
                  <Text style={[styles.prefDesc, lawyerPreference === 'Private' && styles.prefDescSelected]}>May kaukulang bayad, ngunit mas mabilis mabigyan ng pansin ang inyong kaso.</Text>
                </View>
              </Pressable>
            </View>
          </View>
        )}

        {step === 4 && (
          <View>
            <Text style={styles.stepTitle}>Suriin ang iyong detalye</Text>
            <Text style={styles.stepSubtitle}>Pakisiguro na tama ang lahat ng impormasyon bago isumite.</Text>
            
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Urgency</Text>
              <Text style={styles.summaryValue}>{urgency.toUpperCase()}</Text>

              <View style={styles.divider} />
              
              <Text style={styles.summaryLabel}>Location</Text>
              <Text style={styles.summaryValue}>{province}</Text>

              <View style={styles.divider} />

              <Text style={styles.summaryLabel}>Uri ng Abogado</Text>
              <Text style={styles.summaryValue}>{lawyerPreference}</Text>

              <View style={styles.divider} />

              <Text style={styles.summaryLabel}>Deskripsyon</Text>
              <Text style={styles.summaryValue}>{description}</Text>
            </View>
          </View>
        )}

        {step === 5 && (
          <View style={styles.aiLoadingContainer}>
            <View style={styles.aiIconWrapper}>
              <Ionicons name="sparkles" size={48} color="#0D9488" />
            </View>
            <Text style={styles.aiLoadingTitle}>Analysing with AI...</Text>
            <Text style={styles.aiLoadingSubtitle}>Matching your case to the best lawyers with the right specialty nearby.</Text>
            <ActivityIndicator size="large" color="#0D9488" style={{ marginTop: 24 }} />
          </View>
        )}

        {step === 6 && (
          <View>
            <Text style={styles.stepTitle}>Suggested Lawyers</Text>
            <Text style={styles.stepSubtitle}>Based on our AI analysis, here are the best matches for your case.</Text>
            
            <View style={styles.lawyerList}>
              {(() => {
                const topLawyer = realLawyers.find(l => l.id === topLawyerId);
                const otherLawyers = realLawyers.filter(l => l.id !== topLawyerId);

                return (
                  <>
                    {topLawyer && (
                      <View style={{ marginBottom: 24 }}>
                        <Text style={[styles.summaryLabel, { color: '#0D9488', marginBottom: 12 }]}>✨ AI Top Match</Text>
                        <Pressable 
                          style={[styles.lawyerCard, styles.topLawyerCard, selectedLawyerId === topLawyer.id && styles.lawyerCardSelected]}
                          onPress={() => setSelectedLawyerId(topLawyer.id)}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View style={[styles.lawyerAvatar, { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }]}>
                              {topLawyer.selfie_url || topLawyer.id_picture_url ? (
                                <Image source={{ uri: topLawyer.selfie_url || topLawyer.id_picture_url }} style={{ width: '100%', height: '100%' }} />
                              ) : (
                                <Ionicons name="person" size={32} color="#CBD5E1" />
                              )}
                            </View>
                            <View style={styles.lawyerInfo}>
                              <Text style={styles.lawyerName}>Atty. {topLawyer.first_name} {topLawyer.last_name}</Text>
                              <Text style={styles.lawyerSpecialty}>{category}</Text>
                              <View style={styles.lawyerMeta}>
                                <View style={styles.metaItem}>
                                  <Ionicons name="briefcase" size={14} color="#64748B" />
                                  <Text style={styles.metaText}>{topLawyer.firm_name || 'Independent'}</Text>
                                </View>
                                <View style={styles.metaItem}>
                                  <Ionicons name="location" size={14} color="#64748B" />
                                  <Text style={styles.metaText}>{topLawyer.city_municipality || 'Location Unspecified'}</Text>
                                </View>
                              </View>
                            </View>
                            <View style={[styles.selectRadio, selectedLawyerId === topLawyer.id && styles.selectRadioActive]}>
                              {selectedLawyerId === topLawyer.id && <View style={styles.selectRadioInner} />}
                            </View>
                          </View>
                          {topLawyerReason ? (
                            <View style={styles.aiReasonContainer}>
                              <Ionicons name="sparkles" size={16} color="#0D9488" style={{ marginTop: 2 }} />
                              <Text style={styles.aiReasonText}>{topLawyerReason}</Text>
                            </View>
                          ) : null}
                        </Pressable>
                      </View>
                    )}

                    {otherLawyers.length > 0 && (
                      <View>
                        {topLawyer && <Text style={[styles.summaryLabel, { marginBottom: 12 }]}>Other Available Lawyers</Text>}
                        <View style={{ gap: 16 }}>
                          {otherLawyers.map((lawyer) => (
                            <Pressable 
                              key={lawyer.id} 
                              style={[styles.lawyerCard, selectedLawyerId === lawyer.id && styles.lawyerCardSelected]}
                              onPress={() => setSelectedLawyerId(lawyer.id)}
                            >
                              <View style={[styles.lawyerAvatar, { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }]}>
                                {lawyer.selfie_url || lawyer.id_picture_url ? (
                                  <Image source={{ uri: lawyer.selfie_url || lawyer.id_picture_url }} style={{ width: '100%', height: '100%' }} />
                                ) : (
                                  <Ionicons name="person" size={32} color="#CBD5E1" />
                                )}
                              </View>
                              <View style={styles.lawyerInfo}>
                                <Text style={styles.lawyerName}>Atty. {lawyer.first_name} {lawyer.last_name}</Text>
                                <Text style={styles.lawyerSpecialty}>{category}</Text>
                                <View style={styles.lawyerMeta}>
                                  <View style={styles.metaItem}>
                                    <Ionicons name="briefcase" size={14} color="#64748B" />
                                    <Text style={styles.metaText}>{lawyer.firm_name || 'Independent'}</Text>
                                  </View>
                                  <View style={styles.metaItem}>
                                    <Ionicons name="location" size={14} color="#64748B" />
                                    <Text style={styles.metaText}>{lawyer.city_municipality || 'Location Unspecified'}</Text>
                                  </View>
                                </View>
                              </View>
                              <View style={[styles.selectRadio, selectedLawyerId === lawyer.id && styles.selectRadioActive]}>
                                {selectedLawyerId === lawyer.id && <View style={styles.selectRadioInner} />}
                              </View>
                            </Pressable>
                          ))}
                        </View>
                      </View>
                    )}

                    {realLawyers.length === 0 && (
                      <View style={{ alignItems: 'center', padding: 40 }}>
                        <Ionicons name="people-outline" size={48} color="#94A3B8" />
                        <Text style={{ marginTop: 12, color: '#64748B', textAlign: 'center' }}>No lawyers available at the moment.</Text>
                      </View>
                    )}
                  </>
                );
              })()}
            </View>
          </View>
        )}
      </KeyboardAwareScrollView>

      {step !== 5 && (
        <View style={styles.footer}>
          {step < 4 ? (
            <Pressable style={styles.btnPrimary} onPress={handleNext}>
              <Text style={styles.btnPrimaryText}>Next Step</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </Pressable>
          ) : step === 4 ? (
            <Pressable style={styles.btnPrimary} onPress={handleNext}>
              <Text style={styles.btnPrimaryText}>Find a Lawyer</Text>
              <Ionicons name="search" size={20} color="#FFFFFF" />
            </Pressable>
          ) : (
            <View>
              <Pressable 
                style={[styles.btnPrimary, !selectedLawyerId && styles.btnDisabled]} 
                onPress={() => handleSubmit(selectedLawyerId)} 
                disabled={isSubmitting || !selectedLawyerId}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.btnPrimaryText}>Isumite ang Kaso</Text>
                )}
              </Pressable>
              
              <Pressable 
                style={[styles.btnOutline, { marginTop: 16 }]} 
                onPress={() => {
                  setSelectedLawyerId('');
                  handleSubmit('');
                }} 
                disabled={isSubmitting}
              >
                <Text style={styles.btnOutlineText}>Skip & Assign to Any Available Lawyer</Text>
              </Pressable>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAF9' },
  ambientGlow1: { position: 'absolute', top: -100, left: -100, width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(20, 184, 166, 0.08)', transform: [{ scaleX: 1.5 }] },
  ambientGlow2: { position: 'absolute', top: 200, right: -150, width: 400, height: 400, borderRadius: 200, backgroundColor: 'rgba(99, 102, 241, 0.05)' },
  
  header: { paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'transparent' },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#94A3B8', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 2 },
  headerTitle: { color: '#0F172A', fontSize: 18, fontWeight: '800' },
  
  progressContainer: { paddingHorizontal: 24, paddingBottom: 20, paddingTop: 10, backgroundColor: 'transparent' },
  dotRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  progressDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#E2E8F0' },
  progressDotActive: { backgroundColor: '#0D9488', borderColor: '#0D9488', shadowColor: '#0D9488', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4 },
  dotText: { color: '#94A3B8', fontSize: 12, fontWeight: '700' },
  dotTextActive: { color: '#FFFFFF' },
  progressLine: { flex: 1, height: 3, backgroundColor: '#E2E8F0', marginHorizontal: 8, borderRadius: 2 },
  progressLineActive: { backgroundColor: '#0D9488' },
  progressText: { color: '#64748B', fontSize: 13, fontWeight: '700', textAlign: 'center', textTransform: 'uppercase', letterSpacing: 1 },
  
  scrollContent: { padding: 24, paddingBottom: 60, flexGrow: 1 },
  stepTitle: { color: '#0F172A', fontSize: 24, fontWeight: '900', marginBottom: 12, letterSpacing: -0.5, lineHeight: 32 },
  stepSubtitle: { color: '#475569', fontSize: 15, lineHeight: 22, marginBottom: 32 },
  
  // Step 1
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  categoryCard: { width: '47%', backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20, alignItems: 'center', shadowColor: '#94A3B8', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3, position: 'relative' },
  categoryCardSelected: { backgroundColor: '#F0FDFA', shadowColor: '#0D9488', shadowOpacity: 0.15, shadowOffset: { width: 0, height: 8 }, shadowRadius: 16, elevation: 6 },
  activeCheckBadge: { position: 'absolute', top: 12, right: 12, zIndex: 10, backgroundColor: '#FFFFFF', borderRadius: 12 },
  iconContainer: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  iconContainerSelected: { backgroundColor: '#0D9488', shadowColor: '#0D9488', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  categoryTitle: { color: '#334155', fontSize: 15, fontWeight: '700', textAlign: 'center', lineHeight: 22 },
  categoryTitleSelected: { color: '#0F766E', fontWeight: '800' },

  // Step 2
  textArea: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24, color: '#0F172A', fontSize: 15, shadowColor: '#94A3B8', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 2, minHeight: 180, lineHeight: 22 },

  // Step 3
  preferencesList: { gap: 16 },
  preferenceCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, shadowColor: '#94A3B8', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
  preferenceCardSelected: { backgroundColor: '#F0FDFA', shadowColor: '#0D9488', shadowOpacity: 0.15, shadowOffset: { width: 0, height: 8 }, shadowRadius: 16, elevation: 6 },
  prefTextWrap: { flex: 1, marginLeft: 20 },
  prefTitle: { color: '#0F172A', fontSize: 17, fontWeight: '800', marginBottom: 6 },
  prefTitleSelected: { color: '#0F766E' },
  prefDesc: { color: '#475569', fontSize: 14, lineHeight: 22 },
  prefDescSelected: { color: '#115E59' },

  // Step 4
  summaryCard: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 28, shadowColor: '#94A3B8', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
  summaryLabel: { color: '#64748B', fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 },
  summaryValue: { color: '#0F172A', fontSize: 16, fontWeight: '600', lineHeight: 24 },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 24 },

  // Step 5 (AI Loading)
  aiLoadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 100, paddingBottom: 40 },
  aiIconWrapper: { width: 140, height: 140, borderRadius: 70, backgroundColor: '#F0FDFA', alignItems: 'center', justifyContent: 'center', marginBottom: 40, shadowColor: '#0D9488', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.25, shadowRadius: 24, elevation: 10 },
  aiLoadingTitle: { color: '#0F172A', fontSize: 26, fontWeight: '900', textAlign: 'center', marginBottom: 16, letterSpacing: -0.5 },
  aiLoadingSubtitle: { color: '#475569', fontSize: 15, lineHeight: 24, textAlign: 'center', paddingHorizontal: 32 },

  // Step 6 (Lawyer List)
  lawyerList: { gap: 20 },
  lawyerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20, shadowColor: '#94A3B8', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
  lawyerCardSelected: { backgroundColor: '#F0FDFA', shadowColor: '#0D9488', shadowOpacity: 0.15, shadowOffset: { width: 0, height: 8 }, shadowRadius: 16, elevation: 6 },
  lawyerAvatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#E2E8F0', borderWidth: 3, borderColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
  lawyerInfo: { flex: 1, marginLeft: 20 },
  lawyerName: { color: '#0F172A', fontSize: 17, fontWeight: '900', marginBottom: 4, letterSpacing: -0.5 },
  lawyerSpecialty: { color: '#0D9488', fontSize: 14, fontWeight: '700', marginBottom: 12 },
  lawyerMeta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { color: '#475569', fontSize: 14, fontWeight: '700' },
  topLawyerCard: { flexDirection: 'column', alignItems: 'stretch', borderColor: '#0D9488', borderWidth: 2, backgroundColor: '#F0FDFA' },
  aiReasonContainer: { flexDirection: 'row', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#CCFBF1', gap: 8 },
  aiReasonText: { flex: 1, color: '#115E59', fontSize: 14, lineHeight: 20, fontWeight: '600' },
  selectRadio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center', marginLeft: 16 },
  selectRadioActive: { borderColor: '#0D9488', backgroundColor: '#FFFFFF', shadowColor: '#0D9488', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
  selectRadioInner: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#0D9488' },

  // Footer
  footer: { padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24, backgroundColor: 'transparent' },
  btnPrimary: { backgroundColor: '#0D9488', borderRadius: 20, paddingVertical: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, shadowColor: '#0D9488', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 },
  btnPrimaryText: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', letterSpacing: 0.5 },
  btnDisabled: { backgroundColor: '#94A3B8', shadowOpacity: 0 },
  btnOutline: { backgroundColor: 'transparent', padding: 18, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#CBD5E1' },
  btnOutlineText: { color: '#64748B', fontSize: 16, fontWeight: '700' },
  radioOption: { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 20, shadowColor: '#94A3B8', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 2 },
  radioOptionSelected: { backgroundColor: '#F0FDFA', shadowColor: '#0D9488', shadowOpacity: 0.15, shadowOffset: { width: 0, height: 8 }, shadowRadius: 16, elevation: 6 },
  radioOptionText: { color: '#475569', fontSize: 15, fontWeight: '700' },
  radioOptionTextSelected: { color: '#0F766E', fontWeight: '900' },
  textInput: { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 20, color: '#0F172A', fontSize: 15, shadowColor: '#94A3B8', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 2 },
});
