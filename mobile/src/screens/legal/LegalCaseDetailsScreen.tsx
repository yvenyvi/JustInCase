import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, Platform, ActivityIndicator, Modal, TextInput, KeyboardAvoidingView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';
import { mobileSupabase } from '../../shared/supabase';
import Toast from 'react-native-toast-message';
import { theme } from '../../shared/theme';

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
  aiSummary?: string | null;
  updates: { date: string; activities: any[]; totalHours: number }[];
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
  const [isTimeLogsExpanded, setIsTimeLogsExpanded] = useState(false);
  
  // Modal State
  const [isLogModalVisible, setIsLogModalVisible] = useState(false);
  const [isWithdrawModalVisible, setIsWithdrawModalVisible] = useState(false);
  const [withdrawGround, setWithdrawGround] = useState('');
  const [withdrawExplanation, setWithdrawExplanation] = useState('');
  const [logHours, setLogHours] = useState('');
  const [logDesc, setLogDesc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({ visible: false, title: '', message: '', confirmText: '', onConfirm: () => {} });
  
  // Close Case Modal State
  const [isCloseModalVisible, setIsCloseModalVisible] = useState(false);
  const [closeOutcome, setCloseOutcome] = useState('Closed - Won');
  const [closeNotes, setCloseNotes] = useState('');

  // Update Status Modal State
  const [isUpdateStatusModalVisible, setIsUpdateStatusModalVisible] = useState(false);
  const [newStatus, setNewStatus] = useState('Demand Sent');

  useEffect(() => {
    fetchCaseDetails();

    const channel = mobileSupabase
      .channel(`legal_case_updates_${caseId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pro_bono_logs', filter: `case_id=eq.${caseId}` },
        () => {
          fetchTimeLogs();
          fetchCaseDetails(false);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cases', filter: `id=eq.${caseId}` },
        () => {
          fetchCaseDetails(false);
        }
      )
      .subscribe();

    return () => {
      mobileSupabase.removeChannel(channel);
    };
  }, [caseId]);

  const fetchCaseDetails = async (showLoader = true) => {
    if (showLoader) setIsLoading(true);
    try {
      const { data: { user } } = await mobileSupabase.auth.getUser();
      setCurrentUser(user);

      const { data: caseData, error: caseError } = await mobileSupabase
        .from('cases')
        .select(`
          id, title, status, description, created_at, attorney_id, client_id, ai_summary,
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

      const grouped: { [key: string]: { date: string, activities: any[], totalHours: number } } = {};
      const order: string[] = [];
      
      if (logsData && logsData.length > 0) {
        logsData.forEach((log: any) => {
          const dateStr = new Date(log.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          if (!grouped[dateStr]) {
            grouped[dateStr] = { date: dateStr, activities: [], totalHours: 0 };
            order.push(dateStr);
          }
          
          let text = log.detail;
          text = text.replace(/case [0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/gi, 'this case');
          text = text.replace(/time log [0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/gi, 'a time log');
          
          if (log.action_type === 'Hours Logged') {
            const match = text.match(/logged ([\d.]+) hours/);
            if (match && match[1]) {
              grouped[dateStr].totalHours += parseFloat(match[1]);
            }
          }
          grouped[dateStr].activities.push({ id: log.id, text, action: log.action_type });
        });
      } else {
        const initialDate = new Date(caseData.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        grouped[initialDate] = { 
          date: initialDate, 
          activities: [{ id: 'initial', text: 'Case submitted and pending review.', action: 'Initial' }], 
          totalHours: 0 
        };
        order.push(initialDate);
      }

      const parsedLogs = order.map(dateStr => grouped[dateStr]);

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
        aiSummary: caseData.ai_summary,
        updates: parsedLogs
      });


      // Fetch Time logs
      fetchTimeLogs();

    } catch (err) {
      console.error('Error fetching case details:', err);
    } finally {
      if (showLoader) setIsLoading(false);
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

      // Notification is handled by the database trigger `trg_notify_on_pro_bono_log`

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
      fetchCaseDetails();
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
      
      // Notify Client (handled automatically by database trigger trg_notify_on_case_status)

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
      
      const isPending = c.status === 'Pending Triage';
      const newStatus = isPending ? 'Pending Triage' : 'Withdrawn';
      const closingNotes = `Ground: ${withdrawGround}\nExplanation: ${withdrawExplanation}`;
      
      const updateData: any = { status: newStatus, closing_notes: closingNotes };
      if (isPending) updateData.attorney_id = null;

      const { error } = await mobileSupabase
        .from('cases')
        .update(updateData)
        .eq('id', c.id);
      
      if (error) throw error;
      
      // Notify Client
      if (c.clientId) {
         await mobileSupabase
          .from('notifications')
          .insert({
            user_id: c.clientId,
            title: isPending ? 'Attorney Declined' : 'Attorney Withdrew',
            body: isPending 
              ? 'An attorney declined your specific request. Your case is now open to the public network for others to accept.' 
              : `Your attorney withdrew based on: ${withdrawGround}.`,
            type: 'case_update',
            is_read: false
          });
      }

      await mobileSupabase.from('audit_logs').insert({
        user_id: currentUser.id,
        action_type: isPending ? 'Case Declined' : 'Case Withdrawn',
        detail: `Attorney ${isPending ? 'declined' : 'withdrew from'} case ${c.id}. Ground: ${withdrawGround}`
      });

      // Generate AI summary if case ended (withdrawn)
      if (newStatus === 'Withdrawn') {
        try {
          const { data: { session } } = await mobileSupabase.auth.getSession();
          const token = session?.access_token;
          const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://10.164.56.97:8000';
          
          await fetch(`${apiBaseUrl}/api/cases/${c.id}/summarize`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          });
        } catch (sumErr) {
          console.error('Failed to generate AI summary:', sumErr);
        }
      }

      setIsWithdrawModalVisible(false);
      Toast.show({ type: 'success', text1: 'Success', text2: isPending ? 'Case returned to open network.' : 'You have successfully withdrawn from this case.' });
      navigation.goBack();
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: err.message || 'Failed to process request.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseCase = async () => {
    setIsSubmitting(true);
    try {
      if (!c || !currentUser) return;
      const { error } = await mobileSupabase
        .from('cases')
        .update({ status: closeOutcome, closing_notes: closeNotes })
        .eq('id', c.id);
      
      if (error) throw error;

      if (c.clientId) {
        // Notification is handled automatically by database trigger trg_notify_on_case_status
      }

      await mobileSupabase.from('audit_logs').insert({
        user_id: currentUser.id,
        action_type: 'Case Closed',
        detail: `Attorney successfully closed case ${c.id} with outcome: ${closeOutcome}.`
      });

      // Generate AI summary
      try {
        const { data: { session } } = await mobileSupabase.auth.getSession();
        const token = session?.access_token;
        const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://10.164.56.97:8000';
        
        await fetch(`${apiBaseUrl}/api/cases/${c.id}/summarize`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
      } catch (sumErr) {
        console.error('Failed to generate AI summary:', sumErr);
      }

      setIsCloseModalVisible(false);
      Toast.show({ type: 'success', text1: 'Success', text2: 'Case closed successfully.' });
      fetchCaseDetails();
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: err.message || 'Failed to close case.' });
    } finally {
      setIsSubmitting(false);
    }

  };

  const handleUpdateStatus = async () => {
    setIsSubmitting(true);
    try {
      if (!c || !currentUser) return;
      const { error } = await mobileSupabase
        .from('cases')
        .update({ status: newStatus })
        .eq('id', c.id);
      
      if (error) throw error;

      await mobileSupabase.from('audit_logs').insert({
        user_id: currentUser.id,
        action_type: 'Status Updated',
        detail: `Attorney updated case status to ${newStatus}.`
      });

      setIsUpdateStatusModalVisible(false);
      Toast.show({ type: 'success', text1: 'Status Updated', text2: `Case is now marked as ${newStatus}.` });
      fetchCaseDetails();
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: err.message || 'Failed to update status.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    if (status.includes('Closed') || status === 'Withdrawn' || status === 'Dropped') return { bg: theme.colors.secondary, text: theme.colors.textSecondary, border: theme.colors.border };
    if (status === 'Demand Sent' || status === 'Hearing Scheduled') return { bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' };
    if (status === 'In Progress' || status === 'Accepted') return { bg: '#F0FDF4', text: '#16A34A', border: '#BBF7D0' };
    return { bg: '#FEF3C7', text: theme.colors.warning, border: '#FDE68A' };
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerBox]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
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
  const isCaseClosed = c.status.includes('Closed') || c.status === 'Withdrawn' || c.status === 'Dropped';

  // Real AI Parsing (Fallback to old logic if not JSON)
  let parsedDesc: any = { concern: c.description, opposing: '', urgency: '', location: '', income: '', deadline: '', evidence: 'None', outcome: '' };
  let aiData: any = null;

  try {
    const jsonDesc = JSON.parse(c.description);
    parsedDesc = {
      concern: jsonDesc.summary || jsonDesc.description || jsonDesc.concern || '',
      opposing: jsonDesc.opposingParty || jsonDesc.opposing_party || '',
      urgency: jsonDesc.urgency || '',
      location: jsonDesc.location || '',
      income: jsonDesc.income || '',
      deadline: jsonDesc.deadlineDate || jsonDesc.deadline || 'None',
      evidence: jsonDesc.evidence || 'None',
      outcome: jsonDesc.outcome || ''
    };
    aiData = jsonDesc.ai_assessment ? {
      primary_issue: jsonDesc.summary || jsonDesc.primary_issue || '',
      ai_assessment: jsonDesc.ai_assessment,
      missing_details: jsonDesc.missing_details || 'None identified'
    } : jsonDesc.aiAnalysis;
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

        {/* AI Case Journey Summary */}
        {isCaseClosed && c.aiSummary && (

          <View style={[styles.aiCard, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0', shadowColor: '#10B981' }]}>
            <View style={styles.aiHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="sparkles" size={18} color="#16A34A" />
                <Text style={[styles.aiTitle, { color: '#16A34A' }]}>AI Case Journey Summary</Text>
              </View>
            </View>
            <View style={styles.aiContent}>
              <Text style={{ fontSize: 14, color: theme.colors.textPrimary, lineHeight: 22 }}>
                {c.aiSummary}
              </Text>
            </View>
          </View>
        )}

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
            <Text style={[styles.infoValue, parsedDesc.urgency.toLowerCase().includes('high') ? { color: theme.colors.error } : {}]}>
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
                  <Text style={[styles.actionBtnTextPrimary, { color: '#DC2626' }]}>Decline Request</Text>
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
                  style={[styles.actionBtn, { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: '#CBD5E1' }]} 
                  onPress={() => setIsWithdrawModalVisible(true)}
                >
                  <Ionicons name="close-circle" size={20} color="#64748B" style={{ marginRight: 8 }} />
                  <Text style={[styles.actionBtnTextPrimary, { color: theme.colors.textSecondary }]}>Withdraw</Text>
                </Pressable>
                
                <Pressable style={[styles.actionBtn, { backgroundColor: '#F0FDFA', borderWidth: 1, borderColor: '#CCFBF1' }]} onPress={() => setIsLogModalVisible(true)}>
                  <Ionicons name="time" size={20} color={theme.colors.primary} style={{ marginRight: 8 }} />
                  <Text style={styles.actionBtnText}>Log Hours</Text>
                </Pressable>
              </View>

            <View style={{ flexDirection: 'row', gap: 12, width: '100%', marginTop: 12 }}>
              <Pressable 
                style={[styles.actionBtn, { flex: 1, backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#BBF7D0' }]} 
                onPress={() => setIsCloseModalVisible(true)}
              >
                <Ionicons name="checkmark-done-circle" size={20} color="#16A34A" style={{ marginRight: 8 }} />
                <Text style={[styles.actionBtnTextPrimary, { color: '#16A34A' }]}>Close Case</Text>
              </Pressable>

              <Pressable 
                style={[styles.actionBtn, { flex: 1, backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A' }]} 
                onPress={() => setIsUpdateStatusModalVisible(true)}
              >
                <Ionicons name="refresh-circle" size={20} color="#D97706" style={{ marginRight: 8 }} />
                <Text style={[styles.actionBtnTextPrimary, { color: '#D97706' }]}>Update Status</Text>
              </Pressable>
            </View>
            </>
          )}
        </View>

        {isAssigned && timeLogs.length > 0 && (
          <View style={{ marginTop: 32 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginLeft: 8, marginRight: 8 }}>
              <Text style={[styles.sectionLabel, { marginBottom: 0, marginLeft: 0 }]}>SUBMITTED TIME LOGS</Text>
              {timeLogs.some(l => l.isVerified) && (
                <Pressable onPress={() => setIsTimeLogsExpanded(!isTimeLogsExpanded)} style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ color: theme.colors.primary, fontSize: 13, fontWeight: '700', marginRight: 4 }}>
                    {isTimeLogsExpanded ? 'Hide Verified' : 'View All'}
                  </Text>
                  <Ionicons name={isTimeLogsExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={theme.colors.primary} />
                </Pressable>
              )}
            </View>
            <View style={styles.card}>
              {timeLogs.filter(l => isTimeLogsExpanded || !l.isVerified).map((log, index) => (
                <View key={log.id} style={[styles.logItem, index > 0 && styles.logItemBorder, { flexDirection: 'column', alignItems: 'stretch' }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={styles.logHours}>{log.hours} Hours</Text>
                      <Text style={styles.logDate}> • {log.date}</Text>
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
                  <Text style={styles.logDesc}>{log.description}</Text>
                </View>
              ))}
              {timeLogs.filter(l => isTimeLogsExpanded || !l.isVerified).length === 0 && (
                <Text style={{ textAlign: 'center', color: theme.colors.textSecondary, paddingVertical: 12 }}>No pending time logs.</Text>
              )}
            </View>
          </View>
        )}


      </ScrollView>

      {/* Log Hours Modal */}
      <Modal visible={isLogModalVisible} transparent animationType="slide" statusBarTranslucent>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
                <Text style={styles.modalSubmitBtnText}>Submit Hours</Text>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Withdraw Modal */}
      <Modal visible={isWithdrawModalVisible} transparent animationType="slide" statusBarTranslucent>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Withdraw / Decline Case</Text>
              <Pressable onPress={() => setIsWithdrawModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color="#64748B" />
              </Pressable>
            </View>
            
            <ScrollView style={styles.modalBody}>
              <Text style={{ color: theme.colors.textSecondary, fontSize: 13, marginBottom: 16 }}>
                Under Philippine law, withdrawal requires valid justifiable cause. Select a ground below:
              </Text>
              
              {['Loss of Trust and Confidence', 'Illegal or Unethical Conduct', 'Non-Payment of Fees', 'Conflict of Interest'].map((ground) => (
                <Pressable 
                  key={ground} 
                  style={[
                    styles.radioOption, 
                    withdrawGround === ground && { borderColor: theme.colors.primary, backgroundColor: '#F0FDFA' }
                  ]}
                  onPress={() => setWithdrawGround(ground)}
                >
                  <View style={[styles.radioCircle, withdrawGround === ground && { borderColor: theme.colors.primary }]}>
                    {withdrawGround === ground && <View style={styles.radioInner} />}
                  </View>
                  <Text style={[styles.radioText, withdrawGround === ground && { color: theme.colors.primary, fontWeight: '700' }]}>{ground}</Text>
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
        </KeyboardAvoidingView>
      </Modal>

      {/* Close Case Modal */}
      <Modal visible={isCloseModalVisible} transparent animationType="slide" statusBarTranslucent>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Finalize & Close Case</Text>
              <Pressable onPress={() => setIsCloseModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color="#64748B" />
              </Pressable>
            </View>
            
            <ScrollView style={styles.modalBody}>
              <Text style={{ color: theme.colors.textSecondary, fontSize: 13, marginBottom: 16 }}>
                Select the final outcome of this case. This action cannot be undone.
              </Text>
              
              {['Closed - Won', 'Closed - Lost', 'Dropped'].map((outcome) => (
                <Pressable 
                  key={outcome} 
                  style={[
                    styles.radioOption, 
                    closeOutcome === outcome && { borderColor: '#16A34A', backgroundColor: '#F0FDF4' }
                  ]}
                  onPress={() => setCloseOutcome(outcome)}
                >
                  <View style={[styles.radioCircle, closeOutcome === outcome && { borderColor: '#16A34A' }]}>
                    {closeOutcome === outcome && <View style={[styles.radioInner, { backgroundColor: '#16A34A' }]} />}
                  </View>
                  <Text style={[styles.radioText, closeOutcome === outcome && { color: '#16A34A', fontWeight: '700' }]}>{outcome}</Text>
                </Pressable>
              ))}

              <Text style={[styles.inputLabel, { marginTop: 16 }]}>Closing Notes (Optional)</Text>
              <TextInput
                style={[styles.textInput, { height: 100 }]}
                placeholder="Provide a final summary or notes..."
                placeholderTextColor="#94A3B8"
                multiline
                textAlignVertical="top"
                value={closeNotes}
                onChangeText={setCloseNotes}
              />
              
              <Pressable 
                style={[styles.btnPrimary, { marginTop: 24, backgroundColor: '#16A34A' }]} 
                onPress={handleCloseCase}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.btnPrimaryText}>Confirm & Close</Text>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Confirmation Modal */}
      <Modal visible={confirmConfig.visible} transparent animationType="slide" statusBarTranslucent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxWidth: 320, alignSelf: 'center', width: '100%' }]}>
            <Text style={[styles.modalTitle, { marginBottom: 12 }]}>{confirmConfig.title}</Text>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 15, lineHeight: 22, marginBottom: 24 }}>{confirmConfig.message}</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
              <Pressable style={{ paddingHorizontal: 16, paddingVertical: 10 }} onPress={() => setConfirmConfig(c => ({...c, visible: false}))}>
                <Text style={{ color: theme.colors.textSecondary, fontWeight: '600' }}>Cancel</Text>
              </Pressable>
              <Pressable style={{ backgroundColor: '#DC2626', paddingHorizontal: 16, paddingVertical: 10, borderRadius: theme.borderRadius.md }} onPress={() => { setConfirmConfig(c => ({...c, visible: false})); confirmConfig.onConfirm(); }}>
                <Text style={{ color: '#FFF', fontWeight: '600' }}>{confirmConfig.confirmText || 'Confirm'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Update Status Modal */}
      <Modal visible={isUpdateStatusModalVisible} transparent animationType="slide" statusBarTranslucent onRequestClose={() => setIsUpdateStatusModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Case Status</Text>
              <Pressable onPress={() => setIsUpdateStatusModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color="#64748B" />
              </Pressable>
            </View>

            <Text style={{ color: theme.colors.textSecondary, marginBottom: 16 }}>Select the new status for this case. The client will be automatically notified.</Text>
            
            <View style={{ gap: 12, marginBottom: 24 }}>
              {['In Progress', 'Hearing Scheduled', 'Demand Sent'].map(statusOption => (
                <Pressable
                  key={statusOption}
                  style={[
                    styles.outcomeBtn,
                    newStatus === statusOption && styles.outcomeBtnActive
                  ]}
                  onPress={() => setNewStatus(statusOption)}
                >
                  <Ionicons 
                    name={newStatus === statusOption ? "radio-button-on" : "radio-button-off"} 
                    size={20} 
                    color={newStatus === statusOption ? theme.colors.primary : "#94A3B8"} 
                    style={{ marginRight: 12 }}
                  />
                  <Text style={[
                    styles.outcomeText,
                    newStatus === statusOption && styles.outcomeTextActive
                  ]}>{statusOption}</Text>
                </Pressable>
              ))}
            </View>

            <Pressable 
              style={[styles.modalSubmitBtn, isSubmitting && { opacity: 0.7 }]} 
              onPress={handleUpdateStatus}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.modalSubmitBtnText}>Save Status Update</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.secondary, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: theme.colors.textPrimary, fontSize: 18, fontWeight: '700' },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 24, paddingBottom: 40 },
  titleSection: { marginBottom: 24 },
  caseTitle: { color: theme.colors.textPrimary, fontSize: 26, fontWeight: '800', marginBottom: 12 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: theme.borderRadius.md, borderWidth: 1, alignSelf: 'flex-start' },
  statusText: { fontSize: 13, fontWeight: '700' },
  dateLabel: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: '600' },
  
  aiCard: { backgroundColor: '#F5F3FF', borderRadius: theme.borderRadius.xl, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#DDD6FE', shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  aiHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  aiTitle: { color: '#7C3AED', fontSize: 16, fontWeight: '800', marginLeft: 8 },
  aiDescription: { color: '#8B5CF6', fontSize: 13, marginBottom: 16 },
  aiContent: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.md, padding: 16, borderWidth: 1, borderColor: '#EDE9FE' },
  aiRow: { marginBottom: 12 },
  aiLabel: { color: '#8B5CF6', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  aiValue: { color: theme.colors.textPrimary, fontSize: 14, fontWeight: '500', lineHeight: 20 },

  card: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.xl, padding: 20, marginBottom: 8, borderWidth: 1, borderColor: theme.colors.border },
  sectionLabel: { color: theme.colors.primary, fontSize: 12, fontWeight: '800', letterSpacing: 1, marginBottom: 16 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.secondary },
  infoLabel: { color: theme.colors.textSecondary, fontSize: 14 },
  infoValue: { color: theme.colors.textPrimary, fontSize: 14, fontWeight: '600', maxWidth: '60%', textAlign: 'right' },
  
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 16 },
  actionBtn: { flex: 1, backgroundColor: '#F0FDFA', borderRadius: theme.borderRadius.lg, paddingVertical: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#CCFBF1' },
  actionBtnPrimary: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  actionBtnText: { color: theme.colors.primary, fontSize: 14, fontWeight: '700' },
  actionBtnTextPrimary: { color: theme.colors.surface, fontSize: 14, fontWeight: '800' },
  
  logItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  logItemBorder: { borderTopWidth: 1, borderTopColor: theme.colors.secondary },
  logHours: { color: theme.colors.textPrimary, fontSize: 15, fontWeight: '700' },
  logDate: { color: theme.colors.textSecondary, fontSize: 13 },
  logDesc: { color: theme.colors.textSecondary, fontSize: 13, lineHeight: 18, marginTop: 4 },
  verifiedPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#DCFCE7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: theme.borderRadius.md },
  verifiedText: { color: '#15803D', fontSize: 12, fontWeight: '700' },

  timeline: { marginTop: 8 },
  timelineItem: { flexDirection: 'row' },
  timelineNode: { width: 32, alignItems: 'center' },
  timelineDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: theme.colors.primary, marginTop: 4 },
  timelineLine: { width: 2, flex: 1, backgroundColor: theme.colors.border, marginVertical: 4 },
  timelineContent: { flex: 1, paddingBottom: 24, paddingLeft: 8 },
  timelineDate: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 4 },
  timelineText: { color: theme.colors.textPrimary, fontSize: 15, lineHeight: 22 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: theme.colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40, shadowColor: '#000', shadowOffset: { width: 0, height: -5 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 10 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalBody: { maxHeight: 350 },
  modalTitle: { color: theme.colors.textPrimary, fontSize: 20, fontWeight: '800' },
  modalCloseBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.secondary, alignItems: 'center', justifyContent: 'center' },
  inputLabel: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 8 },
  textInput: { backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.borderRadius.md, padding: 16, fontSize: 15, color: theme.colors.textPrimary, marginBottom: 16 },
  textArea: { height: 100 },
  modalSubmitBtn: { backgroundColor: theme.colors.primary, paddingVertical: 14, borderRadius: theme.borderRadius.md, alignItems: 'center' },
  modalSubmitBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  btnPrimary: { backgroundColor: theme.colors.primary, padding: 16, borderRadius: theme.borderRadius.md, alignItems: 'center' },
  btnPrimaryText: { color: theme.colors.surface, fontSize: 15, fontWeight: '700' },
  radioOption: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: theme.borderRadius.md, borderWidth: 1, borderColor: theme.colors.border, marginBottom: 8 },
  radioCircle: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.primary },
  radioText: { color: theme.colors.textSecondary, fontSize: 14, fontWeight: '500' },
  outcomeBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 16, borderRadius: theme.borderRadius.md, borderWidth: 1, borderColor: theme.colors.border },
  outcomeBtnActive: { backgroundColor: '#F0F9FF', borderColor: theme.colors.primary },
  outcomeText: { fontSize: 16, color: theme.colors.textSecondary, fontWeight: '500' },
  outcomeTextActive: { color: theme.colors.primary, fontWeight: '700' }
});
