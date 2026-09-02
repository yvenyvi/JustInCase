import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, Platform, ActivityIndicator, Modal, TextInput, Alert, KeyboardAvoidingView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import { RootStackParamList } from '../../navigation/types';
import { mobileSupabase } from '../../shared/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { theme } from '../../shared/theme';

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
  feedbackRating?: number | null;
  clientFeedback?: string | null;
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

export default function CaseDetailsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<CaseDetailsRouteProp>();
  const { caseId } = route.params;


  
  // Modal State
  const [isLogModalVisible, setIsLogModalVisible] = useState(false);
  const [logHours, setLogHours] = useState('');
  const [logDesc, setLogDesc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({ visible: false, title: '', message: '', confirmText: '', onConfirm: () => {} });

  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [isTimeLogsExpanded, setIsTimeLogsExpanded] = useState(false);
  
  // Feedback State
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  const queryClient = useQueryClient();

  const { data: sessionData } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const { data } = await mobileSupabase.auth.getUser();
      return data.user;
    }
  });
  const currentUser = sessionData;

  const { data: c, isLoading: isLoadingCase } = useQuery({
    queryKey: ['caseDetails', caseId],
    queryFn: async () => {
      const { data: caseData, error: caseError } = await mobileSupabase
        .from('cases')
        .select(`
          id, title, status, description, created_at, attorney_id, client_id, feedback_rating, client_feedback, ai_summary,
          attorney:users!cases_attorney_id_fkey(first_name, last_name)
        `)
        .eq('id', caseId)
        .single();


      if (caseError) {
        if (caseError.code === 'PGRST116') {
          return null;
        }
        throw caseError;
      }

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

      return {
        id: caseData.id,
        title: caseData.title,
        status: caseData.status,
        assignedTo: attorneyObj ? `Atty. ${attorneyObj.first_name} ${attorneyObj.last_name}`.trim() : null,
        attorneyId: caseData.attorney_id,
        clientId: caseData.client_id,
        createdAt: new Date(caseData.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        description: caseData.description || '',
        feedbackRating: caseData.feedback_rating,
        clientFeedback: caseData.client_feedback,
        aiSummary: caseData.ai_summary,
        updates: parsedLogs
      } as CaseData;

    },
    enabled: !!caseId
  });

  const { data: timeLogs = [], isLoading: isLoadingLogs } = useQuery({
    queryKey: ['caseTimeLogs', caseId],
    queryFn: async () => {
      const { data: tLogs } = await mobileSupabase
        .from('pro_bono_logs')
        .select('id, hours, description, created_at, is_verified')
        .eq('case_id', caseId)
        .order('created_at', { ascending: false });

      if (tLogs) {
        return tLogs.map((l: any) => ({
          id: l.id,
          hours: l.hours,
          description: l.description,
          date: new Date(l.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          isVerified: l.is_verified
        })) as TimeLog[];
      }
      return [];
    },
    enabled: !!caseId
  });

  const { data: caseDocuments = [], isLoading: isLoadingDocs } = useQuery({
    queryKey: ['caseDocuments', caseId],
    queryFn: async () => {
      const { data: docs } = await mobileSupabase
        .from('case_documents')
        .select('*')
        .eq('case_id', caseId)
        .order('created_at', { ascending: false });
      return docs || [];
    },
    enabled: !!caseId
  });

  const isLoading = isLoadingCase || isLoadingLogs || isLoadingDocs;

  // Stubs to support existing mutations without refactoring all handlers
  const fetchCaseDetails = () => queryClient.invalidateQueries({ queryKey: ['caseDetails', caseId] });
  const fetchTimeLogs = () => queryClient.invalidateQueries({ queryKey: ['caseTimeLogs', caseId] });
  const fetchDocuments = () => queryClient.invalidateQueries({ queryKey: ['caseDocuments', caseId] });

  useEffect(() => {
    const channel = mobileSupabase
      .channel(`public_case_updates_${caseId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pro_bono_logs', filter: `case_id=eq.${caseId}` },
        () => {
          fetchTimeLogs();
          fetchCaseDetails();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cases', filter: `id=eq.${caseId}` },
        () => {
          fetchCaseDetails();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'case_documents', filter: `case_id=eq.${caseId}` },
        () => {
          fetchDocuments();
        }
      )
      .subscribe();

    return () => {
      mobileSupabase.removeChannel(channel);
    };
  }, [caseId, queryClient]);

  const handleUploadDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets[0] || !currentUser) return;
      
      const file = result.assets[0];
      if ((file.size || 0) > 10 * 1024 * 1024) { // 10MB limit
        Toast.show({ type: 'error', text1: 'File too large', text2: 'Please select a file under 10MB.' });
        return;
      }

      setIsUploadingDoc(true);

      const fileExt = file.name.split('.').pop();
      const fileName = `${caseId}/${Date.now()}.${fileExt}`;
      
      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || 'application/octet-stream',
      } as any);

      // Upload to Storage
      const { data: uploadData, error: uploadError } = await mobileSupabase.storage
        .from('case-documents')
        .upload(fileName, formData, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get Public URL
      const { data: urlData } = mobileSupabase.storage
        .from('case-documents')
        .getPublicUrl(fileName);

      // Save to database
      const { error: dbError } = await mobileSupabase
        .from('case_documents')
        .insert({
          case_id: caseId,
          uploaded_by: currentUser.id,
          file_name: file.name,
          file_url: urlData.publicUrl,
          file_size: file.size || 0,
        });

      if (dbError) throw dbError;

      // Audit Log
      await mobileSupabase.from('audit_logs').insert({
        user_id: currentUser.id,
        action_type: 'Document Uploaded',
        detail: `${isAttorney ? 'Attorney' : 'Client'} uploaded document: ${file.name} for this case.`
      });

      Toast.show({ type: 'success', text1: 'Uploaded', text2: 'Document successfully uploaded.' });
      fetchDocuments();
      fetchCaseDetails();
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Upload Failed', text2: err.message || 'Could not upload document.' });
    } finally {
      setIsUploadingDoc(false);
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

      // Notification is handled by the database trigger

      await mobileSupabase.from('audit_logs').insert({
        user_id: currentUser.id,
        action_type: 'Hours Logged',
        detail: `Attorney logged ${hoursNum} hours for case ${c.id}.`
      });

      setLogHours('');
      setLogDesc('');
      setIsLogModalVisible(false);
      Toast.show({ type: 'success', text1: 'Success', text2: 'Hours logged successfully.' });
      fetchTimeLogs();
      fetchCaseDetails();
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: err.message || 'Could not log hours.' });
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
      
      Toast.show({ type: 'success', text1: 'Accepted', text2: 'You have verified this time log.' });
      fetchTimeLogs();
    } catch (err) {
      console.error('Error verifying log:', err);
    }
  };

  const handleRejectLog = async (logId: string) => {
    setConfirmConfig({
      visible: true,
      title: "Reject Hours",
      message: "Are you sure you want to reject and delete this time log?",
      confirmText: "Reject",
      onConfirm: async () => {
        try {
          await mobileSupabase.from('pro_bono_logs').delete().eq('id', logId);
          Toast.show({ type: 'info', text1: 'Rejected', text2: 'The time log has been rejected and removed.' });
          fetchTimeLogs();
        } catch (err) {
          console.error('Error rejecting log:', err);
        }
      }
    });
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
  const isAttorney = currentUser?.id === c.attorneyId;
  const isAssigned = c.attorneyId === currentUser?.id;
  const isAvailable = c.attorneyId === null;
  const isCaseClosed = c.status.includes('Closed') || c.status === 'Withdrawn' || c.status === 'Dropped' || c.status === 'Resolved';
  const isClient = currentUser?.id === c.clientId;

  // Parse description
  let parsedDesc: any = { concern: c.description, opposing: '', urgency: '', location: '', income: '', deadline: '', evidence: '', outcome: '' };

  try {
    const jsonDesc = JSON.parse(c.description);
    parsedDesc = {
      concern: jsonDesc.summary || jsonDesc.description || jsonDesc.concern || '',
      opposing: jsonDesc.opposingParty || jsonDesc.opposing_party || '',
      urgency: jsonDesc.urgency || '',
      location: jsonDesc.location || '',
      income: jsonDesc.income || '',
      deadline: jsonDesc.deadlineDate || jsonDesc.deadline || 'None',
      evidence: jsonDesc.evidence || '',
      outcome: jsonDesc.outcome || ''
    };
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

  const handleWithdrawCase = () => {
    setConfirmConfig({
      visible: true,
      title: "Kanselahin ang Kaso",
      message: "Sigurado ka bang gusto mong kanselahin ang kasong ito?",
      confirmText: "Kanselahin",
      onConfirm: async () => {
        setIsSubmitting(true);
        try {
          if (!c || !currentUser) return;
          const { error } = await mobileSupabase
            .from('cases')
            .update({ status: 'Withdrawn' })
            .eq('id', c.id);
          if (error) throw error;

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

          Toast.show({ type: 'success', text1: 'Success', text2: 'Nakansela na ang iyong kaso.' });
          fetchCaseDetails();
        } catch (err: any) {
          Toast.show({ type: 'error', text1: 'Error', text2: err.message || 'Nabigo ang pagkansela ng kaso.' });
        } finally {
          setIsSubmitting(false);
        }
      }

    });
  };

  const handleFeedbackSubmit = async () => {
    if (feedbackRating === 0) {
      Toast.show({ type: 'error', text1: 'Missing Rating', text2: 'Please select a star rating first.' });
      return;
    }
    setIsSubmittingFeedback(true);
    try {
      const trimmedComment = feedbackComment.trim() || null;
      const { error } = await mobileSupabase.from('cases').update({
        client_feedback: trimmedComment ? trimmedComment : 'Rated via mobile',
        feedback_rating: feedbackRating,
        client_comment: trimmedComment,
      }).eq('id', c!.id);
      
      if (error) throw error;
      
      await mobileSupabase.from('audit_logs').insert({
        user_id: currentUser!.id,
        action_type: 'Case Feedback Submitted',
        detail: `Client rated case ${c!.id}: ${feedbackRating}/5 stars`
      });

      Toast.show({ type: 'success', text1: 'Thank you!', text2: 'Your feedback has been submitted.' });
      fetchCaseDetails();
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: err.message || 'Could not submit feedback.' });
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Ambient Background Glows */}
      <View style={styles.ambientGlow1} />
      <View style={styles.ambientGlow2} />
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
          <Text style={styles.sectionLabel}>OVERVIEW</Text>

          <View style={styles.gridContainer}>
            <View style={styles.gridItem}>
              <Text style={styles.infoLabel}>Assigned Attorney</Text>
              <Text style={styles.infoValueCompact}>{c.assignedTo || 'Unassigned'}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.infoLabel}>Date Created</Text>
              <Text style={styles.infoValueCompact}>{c.createdAt}</Text>
            </View>
            {parsedDesc.urgency ? (
              <View style={styles.gridItem}>
                <Text style={styles.infoLabel}>Urgency</Text>
                <Text style={styles.infoValueCompact}>{parsedDesc.urgency}</Text>
              </View>
            ) : null}
            {parsedDesc.location ? (
              <View style={styles.gridItem}>
                <Text style={styles.infoLabel}>Location</Text>
                <Text style={styles.infoValueCompact}>{parsedDesc.location}</Text>
              </View>
            ) : null}
            {parsedDesc.opposing ? (
              <View style={[styles.gridItem, { width: '100%' }]}>
                <Text style={styles.infoLabel}>Opposing Party</Text>
                <Text style={styles.infoValueCompact}>{parsedDesc.opposing}</Text>
              </View>
            ) : null}
            {parsedDesc.evidence ? (
              <View style={[styles.gridItem, { width: '100%' }]}>
                <Text style={styles.infoLabel}>Available Evidence</Text>
                <Text style={styles.infoValueCompact}>{parsedDesc.evidence}</Text>
              </View>
            ) : null}
            {parsedDesc.outcome ? (
              <View style={[styles.gridItem, { width: '100%' }]}>
                <Text style={styles.infoLabel}>Desired Outcome</Text>
                <Text style={styles.infoValueCompact}>{parsedDesc.outcome}</Text>
              </View>
            ) : null}
          </View>
          
          <View style={styles.descriptionBox}>
            <Text style={styles.infoLabel}>Concern</Text>
            <Text style={[styles.descriptionText, { marginTop: 4 }]}>{parsedDesc.concern}</Text>
          </View>
        </View>

        {!isCaseClosed && (
          <View style={styles.actionGrid}>
            {isClient && (
              <Pressable 
                style={[styles.actionBtn, { backgroundColor: '#FEE2E2', borderColor: '#FECACA' }]} 
                onPress={handleWithdrawCase}
              >
                <Ionicons name="close-circle" size={20} color="#DC2626" style={{ marginRight: 8 }} />
                <Text style={[styles.actionBtnText, { color: '#DC2626' }]}>Cancel Case</Text>
              </Pressable>
            )}

            <Pressable 
              style={[styles.actionBtn, styles.actionBtnPrimary]} 
              onPress={() => navigation.navigate('ChatThread', { threadId: c.id, threadName: c.assignedTo || 'Support' })}
            >
              <Ionicons name="chatbubbles" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.actionBtnTextPrimary}>Message {isAttorney ? 'Client' : 'Attorney'}</Text>
            </Pressable>
            
            {isAttorney && (
              <Pressable style={styles.actionBtn} onPress={() => setIsLogModalVisible(true)}>
                <Ionicons name="time" size={20} color={theme.colors.primary} style={{ marginRight: 8 }} />
                <Text style={styles.actionBtnText}>Log Hours</Text>
              </Pressable>
            )}
          </View>
        )}

        {caseDocuments.length > 0 && (
          <View style={{ marginTop: 32 }}>
            <Text style={[styles.sectionLabel, { marginLeft: 8 }]}>DOCUMENTS</Text>
            <View style={styles.card}>
              {caseDocuments.map((doc, index) => (
                <View key={doc.id} style={[styles.logItem, index > 0 && styles.logItemBorder]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <View style={styles.docIconBox}>
                      <Ionicons name="document-text" size={20} color={theme.colors.primary} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.docTitle} numberOfLines={1}>{doc.file_name}</Text>
                      <Text style={styles.docDate}>{new Date(doc.created_at).toLocaleDateString()}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {timeLogs.length > 0 && (
          <View style={{ marginTop: 32 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginLeft: 8, marginRight: 8 }}>
              <Text style={[styles.sectionLabel, { marginBottom: 0, marginLeft: 0 }]}>TIME LOGS</Text>
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
                    ) : isClient ? (
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <Pressable style={[styles.verifyBtn, { backgroundColor: '#FEE2E2', paddingVertical: 6, paddingHorizontal: 12 }]} onPress={() => handleRejectLog(log.id)}>
                          <Text style={[styles.verifyBtnText, { color: '#DC2626' }]}>Reject</Text>
                        </Pressable>
                        <Pressable style={[styles.verifyBtn, { paddingVertical: 6, paddingHorizontal: 12 }]} onPress={() => handleVerify(log.id)}>
                          <Text style={styles.verifyBtnText}>Accept</Text>
                        </Pressable>
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

        {isClient && isCaseClosed && (c.feedbackRating === null || c.feedbackRating === undefined) && (
          <View style={[styles.card, { marginTop: 32, backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
            <Text style={[styles.sectionLabel, { color: '#1E3A8A' }]}>RATE YOUR ATTORNEY</Text>
            <Text style={{ color: '#1E3A8A', fontSize: 14, marginBottom: 12 }}>How was your experience working with {c.assignedTo || 'your attorney'}?</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              {[1, 2, 3, 4, 5].map((s) => (
                <Pressable key={s} onPress={() => setFeedbackRating(s)}>
                  <Ionicons name="star" size={32} color={s <= feedbackRating ? '#F59E0B' : '#CBD5E1'} />
                </Pressable>
              ))}
            </View>
            <TextInput
              style={[styles.textInput, styles.textArea, { backgroundColor: '#FFFFFF', borderColor: '#BFDBFE' }]}
              placeholder="Leave a comment (optional)"
              multiline
              numberOfLines={3}
              value={feedbackComment}
              onChangeText={setFeedbackComment}
            />
            <Pressable 
              style={[styles.actionBtn, styles.actionBtnPrimary, { marginTop: 12 }]} 
              onPress={handleFeedbackSubmit}
              disabled={isSubmittingFeedback}
            >
              {isSubmittingFeedback ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.actionBtnTextPrimary}>Submit Review</Text>}
            </Pressable>
          </View>
        )}
        
        {isCaseClosed && c.feedbackRating !== null && c.feedbackRating !== undefined && (
          <View style={[styles.card, { marginTop: 32 }]}>
            <Text style={styles.sectionLabel}>CLIENT REVIEW</Text>
            <View style={{ flexDirection: 'row', gap: 4, marginBottom: 8 }}>
              {[1, 2, 3, 4, 5].map((s) => (
                <Ionicons key={s} name="star" size={20} color={s <= c.feedbackRating! ? '#F59E0B' : '#CBD5E1'} />
              ))}
            </View>
            {c.clientFeedback && <Text style={styles.descriptionText}>"{c.clientFeedback}"</Text>}
          </View>
        )}


      </ScrollView>

      {/* Log Hours Modal */}
      <Modal visible={isLogModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
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
        </KeyboardAvoidingView>
      </Modal>

      {/* Confirmation Modal */}
      <Modal visible={confirmConfig.visible} transparent animationType="slide">
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

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  ambientGlow1: { position: 'absolute', top: -100, left: -100, width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(20, 184, 166, 0.08)', transform: [{ scaleX: 1.5 }] },
  ambientGlow2: { position: 'absolute', top: 200, right: -150, width: 400, height: 400, borderRadius: 200, backgroundColor: 'rgba(99, 102, 241, 0.05)' },
  header: { paddingHorizontal: 16, paddingTop: 60, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'transparent' },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.secondary, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: theme.colors.textPrimary, fontSize: 18, fontWeight: '700' },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 24, paddingBottom: 40 },
  titleSection: { marginBottom: 24 },
  caseTitle: { color: theme.colors.textPrimary, fontSize: 26, fontWeight: '800', marginBottom: 12 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: theme.borderRadius.md, borderWidth: 1, alignSelf: 'flex-start' },
  statusText: { fontSize: 13, fontWeight: '700' },
  
  card: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.xl, padding: 20, marginBottom: 8, borderWidth: 1, borderColor: theme.colors.border, shadowColor: theme.colors.textSecondary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  sectionLabel: { color: theme.colors.primary, fontSize: 12, fontWeight: '800', letterSpacing: 1, marginBottom: 16 },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.secondary, paddingBottom: 16 },
  gridItem: { width: '45%' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.secondary },
  infoLabel: { color: theme.colors.textSecondary, fontSize: 13, marginBottom: 4 },
  infoValue: { color: theme.colors.textPrimary, fontSize: 14, fontWeight: '600', maxWidth: '60%', textAlign: 'right' },
  infoValueCompact: { color: theme.colors.textPrimary, fontSize: 14, fontWeight: '600', textAlign: 'left' },
  descriptionBox: { marginTop: 16, backgroundColor: theme.colors.background, padding: 16, borderRadius: theme.borderRadius.md, borderWidth: 1, borderColor: theme.colors.border },
  descriptionText: { color: theme.colors.textSecondary, fontSize: 14, lineHeight: 22 },
  
  actionGrid: { flexDirection: 'column', gap: 12, marginTop: 16 },
  actionBtn: { flex: 1, backgroundColor: '#F0FDFA', borderRadius: theme.borderRadius.lg, paddingVertical: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#CCFBF1' },
  actionBtnPrimary: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  actionBtnText: { color: theme.colors.primary, fontSize: 14, fontWeight: '700' },
  actionBtnTextPrimary: { color: theme.colors.surface, fontSize: 14, fontWeight: '800' },
  
  logItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  logItemBorder: { borderTopWidth: 1, borderTopColor: theme.colors.secondary },
  logHours: { color: theme.colors.textPrimary, fontSize: 15, fontWeight: '700' },
  logDate: { color: theme.colors.textSecondary, fontSize: 13 },
  logDesc: { color: theme.colors.textSecondary, fontSize: 13, lineHeight: 18, marginTop: 4 },
  verifyBtn: { backgroundColor: theme.colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: theme.borderRadius.md },
  verifyBtnText: { color: theme.colors.surface, fontSize: 13, fontWeight: '700' },
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
  
  docIconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  docTitle: { color: theme.colors.textPrimary, fontSize: 14, fontWeight: '600' },
  docDate: { color: theme.colors.textSecondary, fontSize: 12, marginTop: 2 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: theme.colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40, shadowColor: '#000', shadowOffset: { width: 0, height: -5 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 10 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { color: theme.colors.textPrimary, fontSize: 20, fontWeight: '800' },
  modalCloseBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.secondary, alignItems: 'center', justifyContent: 'center' },
  inputLabel: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 8 },
  textInput: { backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.borderRadius.md, padding: 16, fontSize: 15, color: theme.colors.textPrimary, marginBottom: 20 },
  textArea: { height: 100 },
  modalSubmitBtn: { backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.lg, padding: 16, alignItems: 'center', marginTop: 8 },
  modalSubmitText: { color: theme.colors.surface, fontSize: 16, fontWeight: '700' },
  aiCard: { backgroundColor: '#F5F3FF', borderRadius: theme.borderRadius.xl, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#DDD6FE', shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  aiHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  aiTitle: { color: '#7C3AED', fontSize: 16, fontWeight: '800', marginLeft: 8 },
  aiContent: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.md, padding: 16, borderWidth: 1, borderColor: '#EDE9FE' },
});

