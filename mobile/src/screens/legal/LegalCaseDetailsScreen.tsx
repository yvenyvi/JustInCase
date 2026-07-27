import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, Platform, ActivityIndicator, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';
import { mobileSupabase } from '../../shared/supabase';
import Toast from 'react-native-toast-message';

type LegalCaseDetailsRouteProp = RouteProp<RootStackParamList, 'LegalCaseDetails'>;

type CaseData = {
  id: string;
  title: string;
  status: string;
  assignedTo: string | null;
  attorneyId: string | null;
  clientId: string | null;
  clientName: string | null;
  createdAt: string;
  description: string;
  updates: { id: string; date: string; text: string }[];
};

type TimeLog = {
  id: string;
  hours: number;
  description: string;
  date: string;
  isVerified: boolean;
};

export default function LegalCaseDetailsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<LegalCaseDetailsRouteProp>();
  const { caseId } = route.params;

  const [c, setC] = useState<CaseData | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAiCollapsed, setIsAiCollapsed] = useState(true);
  
  // Modal State
  const [isLogModalVisible, setIsLogModalVisible] = useState(false);
  const [isWithdrawModalVisible, setIsWithdrawModalVisible] = useState(false);
  const [withdrawGround, setWithdrawGround] = useState('');
  const [withdrawExplanation, setWithdrawExplanation] = useState('');
  const [logHours, setLogHours] = useState('');
  const [logDesc, setLogDesc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchCaseDetails();
  }, [caseId]);

  const fetchCaseDetails = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await mobileSupabase.auth.getUser();
      setCurrentUser(user);

      const { data: caseData, error: caseError } = await mobileSupabase
        .from('cases')
        .select(`
          id, title, status, description, created_at, attorney_id, client_id,
          attorney:users!cases_attorney_id_fkey(first_name, last_name),
          client:users!cases_client_id_fkey(first_name, last_name)
        `)
        .eq('id', caseId)
        .single();

      if (caseError) throw caseError;

      // Fetch audit logs
      const { data: logsData } = await mobileSupabase
        .from('audit_logs')
        .select('id, action_type, detail, created_at')
        .like('detail', `%${caseId}%`)
        .order('created_at', { ascending: false });

      let parsedLogs = (logsData || []).map((log: any) => ({
        id: log.id,
        date: new Date(log.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        text: `${log.action_type} - ${log.detail}`
      }));
      
      if (parsedLogs.length === 0) {
        parsedLogs = [{
          id: 'initial',
          date: new Date(caseData.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          text: 'Case submitted and pending review.'
        }];
      }

      const attorneyObj = Array.isArray(caseData.attorney) ? caseData.attorney[0] : caseData.attorney;
      const clientObj = Array.isArray(caseData.client) ? caseData.client[0] : caseData.client;

      setC({
        id: caseData.id,
        title: caseData.title,
        status: caseData.status,
        assignedTo: attorneyObj ? `Atty. ${attorneyObj.first_name} ${attorneyObj.last_name}`.trim() : null,
        attorneyId: caseData.attorney_id,
        clientId: caseData.client_id,
        clientName: clientObj ? `${clientObj.first_name} ${clientObj.last_name}`.trim() : 'Unknown Client',
        createdAt: new Date(caseData.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        description: caseData.description || '',
        updates: parsedLogs
      });

      // Fetch Time logs
      fetchTimeLogs();

    } catch (err) {
      console.error('Error fetching case details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTimeLogs = async () => {
    try {
      const { data: tLogs } = await mobileSupabase
        .from('pro_bono_logs')
        .select('id, hours, description, created_at, is_verified')
        .eq('case_id', caseId)
        .order('created_at', { ascending: false });

      if (tLogs) {
        setTimeLogs(tLogs.map(l => ({
          id: l.id,
          hours: l.hours,
          description: l.description,
          date: new Date(l.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          isVerified: l.is_verified
        })));
      }
    } catch (err) {
      console.error('Error fetching time logs:', err);
    }
  };

  const handleLogSubmit = async () => {
    const hoursNum = parseFloat(logHours);
    if (isNaN(hoursNum) || hoursNum <= 0) {
      Toast.show({ type: 'error', text1: 'Invalid Input', text2: 'Please enter a valid number of hours.' });
      return;
    }
    if (!logDesc.trim()) {
      Toast.show({ type: 'error', text1: 'Required Field', text2: 'Please provide a description.' });
      return;
    }
    if (!c || !currentUser) return;

    setIsSubmitting(true);
    try {
      const { error: logErr } = await mobileSupabase
        .from('pro_bono_logs')
        .insert({
          attorney_id: currentUser.id,
          case_id: c.id,
          hours: hoursNum,
          description: logDesc,
          is_verified: false
        });

      if (logErr) throw logErr;

      if (c.clientId) {
        await mobileSupabase
          .from('notifications')
          .insert({
            user_id: c.clientId,
            title: 'Verify Attorney Hours',
            body: `Your attorney logged ${hoursNum} hours on case "${c.title}". Please verify.`,
            type: 'case_update',
            is_read: false
          });
      }

      await mobileSupabase.from('audit_logs').insert({
        user_id: currentUser.id,
        action_type: 'Hours Logged',
        detail: `Attorney logged ${hoursNum} hours for case ${c.id}.`
      });

      setLogHours('');
      setLogDesc('');
      setIsLogModalVisible(false);
      Toast.show({ type: 'success', text1: 'Success', text2: 'Hours logged successfully. Client has been notified for verification.' });
      fetchTimeLogs();
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: err.message || 'Could not log hours.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAcceptCase = async () => {
    try {
      if (!c || !currentUser) return;
      const { error } = await mobileSupabase
        .from('cases')
        .update({ attorney_id: currentUser.id, status: 'In Progress' })
        .eq('id', c.id);
      
      if (error) throw error;
      
      // Notify Client
      if (c.clientId) {
         await mobileSupabase
          .from('notifications')
          .insert({
            user_id: c.clientId,
            title: 'Case Accepted',
            body: `An attorney has accepted your case "${c.title}".`,
            type: 'case_update',
            is_read: false
          });
      }

      await mobileSupabase.from('audit_logs').insert({
        user_id: currentUser.id,
        action_type: 'Case Accepted',
        detail: `Attorney accepted case ${c.id}.`
      });

      Toast.show({ type: 'success', text1: 'Success', text2: 'You have accepted this case.' });
      fetchCaseDetails();
    } catch (err) {
      console.error(err);
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to accept case.' });
    }
  };

  const handleWithdrawCase = async () => {
    if (!withdrawGround) {
      Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Please select a valid ground for withdrawal.' });
      return;
    }
    if (!withdrawExplanation) {
      Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Please provide a detailed explanation.' });
      return;
    }
    try {
      setIsSubmitting(true);
      if (!c || !currentUser) return;
      const closingNotes = `Ground: ${withdrawGround}\nExplanation: ${withdrawExplanation}`;
      const { error } = await mobileSupabase
        .from('cases')
        .update({ status: 'Withdrawn', closing_notes: closingNotes, attorney_id: null })
        .eq('id', c.id);
      
      if (error) throw error;
      
      // Notify Client
      if (c.clientId) {
         await mobileSupabase
          .from('notifications')
          .insert({
            user_id: c.clientId,
            title: 'Attorney Withdrew',
            body: `Your attorney withdrew based on: ${withdrawGround}.`,
            type: 'case_update',
            is_read: false
          });
      }

      await mobileSupabase.from('audit_logs').insert({
        user_id: currentUser.id,
        action_type: 'Case Withdrawn/Rejected',
        detail: `Attorney withdrew from case ${c.id}. Ground: ${withdrawGround}`
      });

      setIsWithdrawModalVisible(false);
      Toast.show({ type: 'success', text1: 'Success', text2: 'You have successfully withdrawn from this case.' });
      navigation.goBack();
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: err.message || 'Failed to withdraw from case.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    if (status.includes('Closed') || status === 'Withdrawn') return { bg: '#F1F5F9', text: '#64748B', border: '#E2E8F0' };
    if (status === 'In Progress' || status === 'Accepted') return { bg: '#F0FDF4', text: '#16A34A', border: '#BBF7D0' };
    return { bg: '#FEF3C7', text: '#D97706', border: '#FDE68A' };
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerBox]}>
        <ActivityIndicator size="large" color="#0D9488" />
      </View>
    );
  }

  if (!c) {
    return (
      <View style={[styles.container, styles.centerBox]}>
        <Text style={styles.infoLabel}>Case not found.</Text>
      </View>
    );
  }

  const colors = getStatusColor(c.status);
  const isAssigned = c.attorneyId === currentUser?.id;
  const isAvailable = c.attorneyId === null;

  // Real AI Parsing (Fallback to old logic if not JSON)
  let parsedDesc: any = { concern: c.description, opposing: '', urgency: '', location: '', income: '', deadline: '', evidence: 'None', outcome: '' };
  let aiData: any = null;

  try {
    const jsonDesc = JSON.parse(c.description);
    if (jsonDesc.isJsonFormat) {
      parsedDesc = {
        concern: jsonDesc.rawInput.description || '',
        opposing: jsonDesc.rawInput.opposingPartyType || '',
        urgency: jsonDesc.rawInput.urgency || '',
        location: jsonDesc.rawInput.province || '',
        income: jsonDesc.rawInput.income || '',
        deadline: jsonDesc.rawInput.deadlineDate || 'None',
        evidence: jsonDesc.rawInput.evidence || 'None',
        outcome: jsonDesc.rawInput.outcome || ''
      };
      aiData = jsonDesc.aiAnalysis;
    }
  } catch (e) {
    // Fallback to legacy plain text parsing
    const descLines = c.description.split('\n');
    const concernLines: string[] = [];
    descLines.forEach(line => {
      if (line.startsWith('Concern: ')) concernLines.push(line.substring('Concern: '.length));
      else if (line.startsWith('Opposing party: ')) parsedDesc.opposing = line.substring('Opposing party: '.length);
      else if (line.startsWith('Urgency: ')) parsedDesc.urgency = line.substring('Urgency: '.length);
      else if (line.startsWith('Location: ')) parsedDesc.location = line.substring('Location: '.length);
      else if (line.startsWith('Income bracket: ')) parsedDesc.income = line.substring('Income bracket: '.length);
      else if (line.startsWith('Deadline: ')) parsedDesc.deadline = line.substring('Deadline: '.length);
      else if (line === 'No immediate deadline provided') parsedDesc.deadline = 'None';
      else concernLines.push(line);
    });
    parsedDesc.concern = concernLines.join('\n').trim();
    
    // Fallback AI simulation for old cases
    aiData = {
      primary_issue: parsedDesc.concern,
      ai_assessment: "Legacy case format. No AI assessment available.",
      missing_details: "N/A"
    };
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#64748B" />
        </Pressable>
        <Text style={styles.headerTitle}>Legal Case View</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.titleSection}>
          <Text style={styles.caseTitle}>{c.title}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={[styles.statusBadge, { backgroundColor: colors.bg, borderColor: colors.border }]}>
              <Text style={[styles.statusText, { color: colors.text }]}>{c.status}</Text>
            </View>
            <Text style={styles.dateLabel}>{c.createdAt}</Text>
          </View>
        </View>

        {/* AI Case Brief Widget */}
        <View style={styles.aiCard}>
          <Pressable 
            style={[styles.aiHeader, { marginBottom: isAiCollapsed ? 0 : 6 }]} 
            onPress={() => setIsAiCollapsed(!isAiCollapsed)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="sparkles" size={18} color="#8B5CF6" />
              <Text style={styles.aiTitle}>AI Insights</Text>
            </View>
            <Ionicons name={isAiCollapsed ? "chevron-down" : "chevron-up"} size={20} color="#8B5CF6" />
          </Pressable>
          
          {!isAiCollapsed && (
            <View style={styles.aiContent}>
              <View style={styles.aiRow}>
                <Text style={styles.aiLabel}>Primary Issue</Text>
                <Text style={styles.aiValue}>{aiData?.primary_issue || parsedDesc.concern || 'Not specified'}</Text>
              </View>
              <View style={styles.aiRow}>
                <Text style={styles.aiLabel}>AI Assessment</Text>
                <Text style={styles.aiValue}>{aiData?.ai_assessment || 'No assessment available.'}</Text>
              </View>
              <View style={styles.aiRow}>
                <Text style={styles.aiLabel}>Missing Details</Text>
                <Text style={[styles.aiValue, { color: '#B45309' }]}>{aiData?.missing_details || 'None identified'}</Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>CLIENT INTAKE DATA</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Client Name</Text>
            <Text style={styles.infoValue}>{c.clientName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Opposing Party</Text>
            <Text style={styles.infoValue}>{parsedDesc.opposing || 'None'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Urgency</Text>
            <Text style={[styles.infoValue, parsedDesc.urgency.toLowerCase().includes('high') ? { color: '#EF4444' } : {}]}>
              {parsedDesc.urgency || 'Standard'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Available Evidence</Text>
            <Text style={styles.infoValue}>{parsedDesc.evidence}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Desired Outcome</Text>
            <Text style={styles.infoValue}>{parsedDesc.outcome || 'N/A'}</Text>
          </View>
          {parsedDesc.income ? (
            <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.infoLabel}>Reported Income</Text>
              <Text style={styles.infoValue}>{parsedDesc.income}</Text>
            </View>
          ) : null}
        </View>

        {/* Attorney Actions */}
        <View style={styles.actionGrid}>
          {(isAvailable || (isAssigned && c.status === 'Pending Triage')) && (
            <>
              <Pressable 
                style={[styles.actionBtn, styles.actionBtnPrimary, { width: '100%' }]} 
                onPress={handleAcceptCase}
              >
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.actionBtnTextPrimary}>Accept Case</Text>
              </Pressable>

              {isAssigned && c.status === 'Pending Triage' && (
                <Pressable 
                  style={[styles.actionBtn, { backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#FECACA', width: '100%' }]} 
                  onPress={() => setIsWithdrawModalVisible(true)}
                >
                  <Ionicons name="close-circle" size={20} color="#DC2626" style={{ marginRight: 8 }} />
                  <Text style={[styles.actionBtnTextPrimary, { color: '#DC2626' }]}>Reject Request</Text>
                </Pressable>
              )}
            </>
          )}

          {isAssigned && c.status !== 'Pending Triage' && !c.status.includes('Closed') && c.status !== 'Withdrawn' && c.status !== 'Dropped' && (
            <>
              <Pressable 
                style={[styles.actionBtn, styles.actionBtnPrimary, { width: '100%' }]} 
                onPress={() => navigation.navigate('ChatThread', { threadId: c.id, threadName: c.clientName || 'Client' })}
              >
                <Ionicons name="chatbubbles" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.actionBtnTextPrimary}>Message Client</Text>
              </Pressable>
              
              <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
                <Pressable 
                  style={[styles.actionBtn, { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CBD5E1' }]} 
                  onPress={() => setIsWithdrawModalVisible(true)}
                >
                  <Ionicons name="close-circle" size={20} color="#64748B" style={{ marginRight: 8 }} />
                  <Text style={[styles.actionBtnTextPrimary, { color: '#64748B' }]}>Withdraw</Text>
                </Pressable>
                
                <Pressable style={[styles.actionBtn, { backgroundColor: '#F0FDFA', borderWidth: 1, borderColor: '#CCFBF1' }]} onPress={() => setIsLogModalVisible(true)}>
                  <Ionicons name="time" size={20} color="#0D9488" style={{ marginRight: 8 }} />
                  <Text style={styles.actionBtnText}>Log Hours</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>

        {isAssigned && timeLogs.length > 0 && (
          <View style={{ marginTop: 32 }}>
            <Text style={[styles.sectionLabel, { marginLeft: 8 }]}>SUBMITTED TIME LOGS</Text>
            <View style={styles.card}>
              {timeLogs.map((log, index) => (
                <View key={log.id} style={[styles.logItem, index > 0 && styles.logItemBorder]}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                      <Text style={styles.logHours}>{log.hours} Hours</Text>
                      <Text style={styles.logDate}> • {log.date}</Text>
                    </View>
                    <Text style={styles.logDesc}>{log.description}</Text>
                  </View>
                  
                  {log.isVerified ? (
                    <View style={styles.verifiedPill}>
                      <Ionicons name="checkmark-circle" size={14} color="#15803D" style={{ marginRight: 4 }} />
                      <Text style={styles.verifiedText}>Verified</Text>
                    </View>
                  ) : (
                    <View style={[styles.verifiedPill, { backgroundColor: '#FEF3C7' }]}>
                      <Ionicons name="time" size={14} color="#B45309" style={{ marginRight: 4 }} />
                      <Text style={[styles.verifiedText, { color: '#B45309' }]}>Pending</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        <Text style={[styles.sectionLabel, { marginTop: 32, marginLeft: 8 }]}>CASE TIMELINE</Text>
        <View style={styles.timeline}>
          {c.updates.map((update, index) => (
            <View key={update.id} style={styles.timelineItem}>
              <View style={styles.timelineNode}>
                <View style={styles.timelineDot} />
                {index < c.updates.length - 1 && <View style={styles.timelineLine} />}
              </View>
              <View style={styles.timelineContent}>
                <Text style={styles.timelineDate}>{update.date}</Text>
                <Text style={styles.timelineText}>{update.text}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Log Hours Modal */}
      <Modal visible={isLogModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Log Attorney Hours</Text>
              <Pressable onPress={() => setIsLogModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color="#64748B" />
              </Pressable>
            </View>
            
            <Text style={styles.inputLabel}>Hours Rendered</Text>
            <TextInput 
              style={styles.textInput}
              keyboardType="numeric"
              placeholder="e.g. 2.5"
              value={logHours}
              onChangeText={setLogHours}
            />

            <Text style={styles.inputLabel}>Description of Work</Text>
            <TextInput 
              style={[styles.textInput, styles.textArea]}
              placeholder="Drafted documents, client consultation, etc."
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              value={logDesc}
              onChangeText={setLogDesc}
            />

            <Pressable 
              style={[styles.modalSubmitBtn, isSubmitting && { opacity: 0.7 }]} 
              onPress={handleLogSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.modalSubmitText}>Submit Hours</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Withdraw Modal */}
      <Modal visible={isWithdrawModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Withdraw / Reject Case</Text>
              <Pressable onPress={() => setIsWithdrawModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color="#64748B" />
              </Pressable>
            </View>
            
            <ScrollView style={styles.modalBody}>
              <Text style={{ color: '#475569', fontSize: 13, marginBottom: 16 }}>
                Under Philippine law, withdrawal requires valid justifiable cause. Select a ground below:
              </Text>
              
              {['Loss of Trust and Confidence', 'Illegal or Unethical Conduct', 'Non-Payment of Fees', 'Conflict of Interest'].map((ground) => (
                <Pressable 
                  key={ground} 
                  style={[
                    styles.radioOption, 
                    withdrawGround === ground && { borderColor: '#0D9488', backgroundColor: '#F0FDFA' }
                  ]}
                  onPress={() => setWithdrawGround(ground)}
                >
                  <View style={[styles.radioCircle, withdrawGround === ground && { borderColor: '#0D9488' }]}>
                    {withdrawGround === ground && <View style={styles.radioInner} />}
                  </View>
                  <Text style={[styles.radioText, withdrawGround === ground && { color: '#0D9488', fontWeight: '700' }]}>{ground}</Text>
                </Pressable>
              ))}

              <Text style={[styles.inputLabel, { marginTop: 16 }]}>Detailed Explanation (Required)</Text>
              <TextInput
                style={[styles.textInput, { height: 100 }]}
                placeholder="Provide reasoning for withdrawal..."
                placeholderTextColor="#94A3B8"
                multiline
                textAlignVertical="top"
                value={withdrawExplanation}
                onChangeText={setWithdrawExplanation}
              />
              
              <Pressable 
                style={[styles.btnPrimary, { marginTop: 24, backgroundColor: '#DC2626' }]} 
                onPress={handleWithdrawCase}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.btnPrimaryText}>Confirm Withdrawal</Text>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#1E293B', fontSize: 18, fontWeight: '700' },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 24, paddingBottom: 40 },
  titleSection: { marginBottom: 24 },
  caseTitle: { color: '#1E293B', fontSize: 26, fontWeight: '800', marginBottom: 12 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, alignSelf: 'flex-start' },
  statusText: { fontSize: 13, fontWeight: '700' },
  dateLabel: { color: '#64748B', fontSize: 13, fontWeight: '600' },
  
  aiCard: { backgroundColor: '#F5F3FF', borderRadius: 20, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#DDD6FE', shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  aiHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  aiTitle: { color: '#7C3AED', fontSize: 16, fontWeight: '800', marginLeft: 8 },
  aiDescription: { color: '#8B5CF6', fontSize: 13, marginBottom: 16 },
  aiContent: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#EDE9FE' },
  aiRow: { marginBottom: 12 },
  aiLabel: { color: '#8B5CF6', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  aiValue: { color: '#1E293B', fontSize: 14, fontWeight: '500', lineHeight: 20 },

  card: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, marginBottom: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  sectionLabel: { color: '#0D9488', fontSize: 12, fontWeight: '800', letterSpacing: 1, marginBottom: 16 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  infoLabel: { color: '#64748B', fontSize: 14 },
  infoValue: { color: '#1E293B', fontSize: 14, fontWeight: '600', maxWidth: '60%', textAlign: 'right' },
  
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 16 },
  actionBtn: { flex: 1, backgroundColor: '#F0FDFA', borderRadius: 16, paddingVertical: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#CCFBF1' },
  actionBtnPrimary: { backgroundColor: '#0D9488', borderColor: '#0D9488' },
  actionBtnText: { color: '#0D9488', fontSize: 14, fontWeight: '700' },
  actionBtnTextPrimary: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  
  logItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  logItemBorder: { borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  logHours: { color: '#1E293B', fontSize: 15, fontWeight: '700' },
  logDate: { color: '#94A3B8', fontSize: 13 },
  logDesc: { color: '#475569', fontSize: 13, lineHeight: 18, marginTop: 4 },
  verifiedPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#DCFCE7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  verifiedText: { color: '#15803D', fontSize: 12, fontWeight: '700' },

  timeline: { marginTop: 8 },
  timelineItem: { flexDirection: 'row' },
  timelineNode: { width: 32, alignItems: 'center' },
  timelineDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#0D9488', marginTop: 4 },
  timelineLine: { width: 2, flex: 1, backgroundColor: '#E2E8F0', marginVertical: 4 },
  timelineContent: { flex: 1, paddingBottom: 24, paddingLeft: 8 },
  timelineDate: { color: '#64748B', fontSize: 12, fontWeight: '600', marginBottom: 4 },
  timelineText: { color: '#1E293B', fontSize: 15, lineHeight: 22 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'center', padding: 24 },
  modalContent: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalBody: { maxHeight: 350 },
  modalTitle: { color: '#1E293B', fontSize: 20, fontWeight: '800' },
  modalCloseBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  inputLabel: { color: '#475569', fontSize: 13, fontWeight: '600', marginBottom: 8 },
  textInput: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 16, fontSize: 15, color: '#0F172A', marginBottom: 16 },
  textArea: { height: 100 },
  modalSubmitBtn: { backgroundColor: '#0D9488', borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 8 },
  modalSubmitText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  btnPrimary: { backgroundColor: '#0D9488', padding: 16, borderRadius: 12, alignItems: 'center' },
  btnPrimaryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  radioOption: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 8 },
  radioCircle: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#0D9488' },
  radioText: { color: '#475569', fontSize: 14, fontWeight: '500' }
});
