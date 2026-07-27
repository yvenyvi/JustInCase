import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, Platform, ActivityIndicator, Modal, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';
import { mobileSupabase } from '../../shared/supabase';

type CaseDetailsRouteProp = RouteProp<RootStackParamList, 'CaseDetails'>;

type CaseData = {
  id: string;
  title: string;
  status: string;
  assignedTo: string | null;
  attorneyId: string | null;
  clientId: string | null;
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

export default function CaseDetailsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<CaseDetailsRouteProp>();
  const { caseId } = route.params;

  const [c, setC] = useState<CaseData | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal State
  const [isLogModalVisible, setIsLogModalVisible] = useState(false);
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
          attorney:users!cases_attorney_id_fkey(first_name, last_name)
        `)
        .eq('id', caseId)
        .single();

      if (caseError) throw caseError;

      // Fetch audit logs
      const { data: logsData } = await mobileSupabase
        .from('audit_logs')
        .select('id, action, details, created_at')
        .like('details', `%${caseId}%`)
        .order('created_at', { ascending: false });

      let parsedLogs = (logsData || []).map((log: any) => ({
        id: log.id,
        date: new Date(log.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        text: `${log.action} - ${log.details}`
      }));
      
      if (parsedLogs.length === 0) {
        parsedLogs = [{
          id: 'initial',
          date: new Date(caseData.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          text: 'Case submitted and pending review.'
        }];
      }

      const attorneyObj = Array.isArray(caseData.attorney) ? caseData.attorney[0] : caseData.attorney;

      setC({
        id: caseData.id,
        title: caseData.title,
        status: caseData.status,
        assignedTo: attorneyObj ? `Atty. ${attorneyObj.first_name} ${attorneyObj.last_name}`.trim() : null,
        attorneyId: caseData.attorney_id,
        clientId: caseData.client_id,
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
      Alert.alert('Invalid Input', 'Please enter a valid number of hours.');
      return;
    }
    if (!logDesc.trim()) {
      Alert.alert('Required Field', 'Please provide a description.');
      return;
    }
    if (!c || !currentUser) return;

    setIsSubmitting(true);
    try {
      // 1. Insert time log
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

      // 2. Notify Client
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

      setLogHours('');
      setLogDesc('');
      setIsLogModalVisible(false);
      Alert.alert('Success', 'Hours logged successfully. Client has been notified for verification.');
      fetchTimeLogs();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not log hours.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerify = async (logId: string) => {
    try {
      if (!currentUser) return;
      await mobileSupabase
        .from('pro_bono_logs')
        .update({ 
          is_verified: true,
          verified_by: currentUser.id,
          verified_at: new Date().toISOString()
        })
        .eq('id', logId);
      
      Alert.alert('Verified', 'You have verified this time log.');
      fetchTimeLogs();
    } catch (err) {
      console.error('Error verifying log:', err);
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
  const isAttorney = currentUser?.id === c.attorneyId;
  const isClient = currentUser?.id === c.clientId;

  // Parse description
  let parsedDesc: any = { concern: c.description, opposing: '', urgency: '', location: '', income: '', deadline: '', evidence: '', outcome: '' };

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
        evidence: jsonDesc.rawInput.evidence || '',
        outcome: jsonDesc.rawInput.outcome || ''
      };
    }
  } catch (e) {
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
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#64748B" />
        </Pressable>
        <Text style={styles.headerTitle}>Case Details</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.titleSection}>
          <Text style={styles.caseTitle}>{c.title}</Text>
          <View style={[styles.statusBadge, { backgroundColor: colors.bg, borderColor: colors.border }]}>
            <Text style={[styles.statusText, { color: colors.text }]}>{c.status}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>OVERVIEW</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Assigned Attorney</Text>
            <Text style={styles.infoValue}>{c.assignedTo || 'Unassigned'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Date Created</Text>
            <Text style={styles.infoValue}>{c.createdAt}</Text>
          </View>
          {parsedDesc.opposing ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Opposing Party</Text>
              <Text style={styles.infoValue}>{parsedDesc.opposing}</Text>
            </View>
          ) : null}
          {parsedDesc.urgency ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Urgency</Text>
              <Text style={styles.infoValue}>{parsedDesc.urgency}</Text>
            </View>
          ) : null}
          {parsedDesc.location ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Location</Text>
              <Text style={styles.infoValue}>{parsedDesc.location}</Text>
            </View>
          ) : null}
          {parsedDesc.income ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Income Bracket</Text>
              <Text style={styles.infoValue}>{parsedDesc.income}</Text>
            </View>
          ) : null}
          {parsedDesc.evidence ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Available Evidence</Text>
              <Text style={styles.infoValue}>{parsedDesc.evidence}</Text>
            </View>
          ) : null}
          {parsedDesc.outcome ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Desired Outcome</Text>
              <Text style={styles.infoValue}>{parsedDesc.outcome}</Text>
            </View>
          ) : null}
          <View style={styles.descriptionBox}>
            <Text style={styles.descriptionText}>{parsedDesc.concern}</Text>
          </View>
        </View>

        <View style={styles.actionGrid}>
          <Pressable 
            style={[styles.actionBtn, styles.actionBtnPrimary]} 
            onPress={() => navigation.navigate('ChatThread', { threadId: c.id, threadName: c.assignedTo || 'Support' })}
          >
            <Ionicons name="chatbubbles" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.actionBtnTextPrimary}>Message {isAttorney ? 'Client' : 'Attorney'}</Text>
          </Pressable>
          
          {isAttorney ? (
            <Pressable style={styles.actionBtn} onPress={() => setIsLogModalVisible(true)}>
              <Ionicons name="time" size={20} color="#0D9488" style={{ marginRight: 8 }} />
              <Text style={styles.actionBtnText}>Log Hours</Text>
            </Pressable>
          ) : (
            <Pressable style={styles.actionBtn}>
              <Ionicons name="document-attach" size={20} color="#0D9488" style={{ marginRight: 8 }} />
              <Text style={styles.actionBtnText}>Upload Doc</Text>
            </Pressable>
          )}
        </View>

        {timeLogs.length > 0 && (
          <View style={{ marginTop: 32 }}>
            <Text style={[styles.sectionLabel, { marginLeft: 8 }]}>TIME LOGS</Text>
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
                  ) : isClient ? (
                    <Pressable style={styles.verifyBtn} onPress={() => handleVerify(log.id)}>
                      <Text style={styles.verifyBtnText}>Verify</Text>
                    </Pressable>
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
  
  card: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, marginBottom: 8, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#94A3B8', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  sectionLabel: { color: '#0D9488', fontSize: 12, fontWeight: '800', letterSpacing: 1, marginBottom: 16 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  infoLabel: { color: '#64748B', fontSize: 14 },
  infoValue: { color: '#1E293B', fontSize: 14, fontWeight: '600', maxWidth: '60%', textAlign: 'right' },
  descriptionBox: { marginTop: 16, backgroundColor: '#F8FAFC', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  descriptionText: { color: '#475569', fontSize: 14, lineHeight: 22 },
  
  actionGrid: { flexDirection: 'row', gap: 12, marginTop: 16 },
  actionBtn: { flex: 1, backgroundColor: '#F0FDFA', borderRadius: 16, paddingVertical: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#CCFBF1' },
  actionBtnPrimary: { backgroundColor: '#0D9488', borderColor: '#0D9488' },
  actionBtnText: { color: '#0D9488', fontSize: 14, fontWeight: '700' },
  actionBtnTextPrimary: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  
  logItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  logItemBorder: { borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  logHours: { color: '#1E293B', fontSize: 15, fontWeight: '700' },
  logDate: { color: '#94A3B8', fontSize: 13 },
  logDesc: { color: '#475569', fontSize: 13, lineHeight: 18, marginTop: 4 },
  verifyBtn: { backgroundColor: '#0D9488', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  verifyBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
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
  modalTitle: { color: '#1E293B', fontSize: 20, fontWeight: '800' },
  modalCloseBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  inputLabel: { color: '#475569', fontSize: 13, fontWeight: '600', marginBottom: 8 },
  textInput: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 16, fontSize: 15, color: '#1E293B', marginBottom: 20 },
  textArea: { height: 100 },
  modalSubmitBtn: { backgroundColor: '#0D9488', borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 8 },
  modalSubmitText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
