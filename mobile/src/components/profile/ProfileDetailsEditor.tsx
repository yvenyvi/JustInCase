import React from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { theme } from '../../shared/theme';
import { mobileSupabase } from '../../shared/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { useMobileAuth } from '../../shared/MobileAuthContext';

export type EditableProfileDetails = {
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  suffix?: string | null;
  date_of_birth?: string | null;
  phone_number?: string | null;
  region?: string | null;
  province?: string | null;
  city_municipality?: string | null;
  barangay?: string | null;
  street_address?: string | null;
  firm_name?: string | null;
};

type Props = {
  visible: boolean;
  profile: EditableProfileDetails;
  attorney?: boolean;
  onClose: () => void;
  onSaved: () => void;
};

const fields: { key: keyof EditableProfileDetails; label: string; placeholder: string; keyboardType?: 'default' | 'phone-pad'; multiline?: boolean; attorneyOnly?: boolean }[] = [
  { key: 'first_name', label: 'First name', placeholder: 'First name' },
  { key: 'middle_name', label: 'Middle name', placeholder: 'Middle name (optional)' },
  { key: 'last_name', label: 'Last name', placeholder: 'Last name' },
  { key: 'suffix', label: 'Suffix', placeholder: 'Jr., III (optional)' },
  { key: 'date_of_birth', label: 'Date of birth', placeholder: 'YYYY-MM-DD' },
  { key: 'phone_number', label: 'Phone number', placeholder: 'Phone number', keyboardType: 'phone-pad' },
  { key: 'firm_name', label: 'Law firm', placeholder: 'Law firm or independent practice', attorneyOnly: true },
  { key: 'street_address', label: 'Street / house no.', placeholder: 'Street / house no.', multiline: true },
  { key: 'barangay', label: 'Barangay', placeholder: 'Barangay' },
  { key: 'city_municipality', label: 'City / municipality', placeholder: 'City / municipality' },
  { key: 'province', label: 'Province', placeholder: 'Province' },
  { key: 'region', label: 'Region', placeholder: 'Region' },
];

export function ProfileDetailsEditor({ visible, profile, attorney = false, onClose, onSaved }: Props) {
  const queryClient = useQueryClient();
  const { user } = useMobileAuth();
  const [values, setValues] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const [showBirthDatePicker, setShowBirthDatePicker] = React.useState(false);
  const [draftBirthDate, setDraftBirthDate] = React.useState(new Date());

  React.useEffect(() => {
    if (!visible) return;
    const initial: Record<string, string> = {};
    fields.forEach(({ key }) => { initial[key] = String(profile[key] ?? ''); });
    setValues(initial);
    setError('');
    setShowBirthDatePicker(false);
  }, [visible, profile]);

  const parseDateOnly = (dateText?: string | null) => {
    if (!dateText || !/^\d{4}-\d{2}-\d{2}$/.test(dateText)) return null;
    const [year, month, day] = dateText.split('-').map(Number);
    const date = new Date(year, month - 1, day, 12);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
      ? date
      : null;
  };

  const toDateOnly = (date: Date) => {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
  };

  const openBirthDatePicker = () => {
    const currentDate = parseDateOnly(values.date_of_birth) || new Date();
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: currentDate,
        mode: 'date',
        display: 'calendar',
        maximumDate: new Date(),
        onValueChange: (_event, selectedDate) => {
          if (selectedDate) setValues(current => ({ ...current, date_of_birth: toDateOnly(selectedDate) }));
        },
      });
      return;
    }
    setDraftBirthDate(currentDate);
    setShowBirthDatePicker(true);
  };

  const save = async () => {
    if (!values.first_name?.trim() || !values.last_name?.trim()) {
      setError('First and last name are required.');
      return;
    }
    if (values.date_of_birth) {
      const date = parseDateOnly(values.date_of_birth.trim());
      if (!date) {
        setError('Choose a valid date of birth.');
        return;
      }
      if (toDateOnly(date) > toDateOnly(new Date())) {
        setError('Date of birth cannot be in the future.');
        return;
      }
    }
    setSaving(true);
    setError('');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const details: Record<string, string | null> = {};
      fields.filter(field => !field.attorneyOnly || attorney).forEach(({ key }) => {
        details[key] = values[key]?.trim() || null;
      });
      const { data: updatedProfile, error: updateError } = await mobileSupabase
        .rpc('users_update_own_profile_details', { p_details: details })
        .abortSignal(controller.signal);
      if (updateError) {
        if (updateError.code === 'PGRST202') {
          throw new Error('Profile editing is not enabled in the database yet. Please ask the project administrator to apply the latest Supabase migration.');
        }
        throw updateError;
      }

      if (updatedProfile && user?.id) {
        if (attorney) {
          queryClient.setQueryData(['legalProfile', user.id], (current: any) => current ? { ...current, ...updatedProfile } : updatedProfile);
        } else {
          queryClient.setQueryData(['publicProfile', user.id], (current: any) => current
            ? { ...current, profile: { ...current.profile, ...updatedProfile } }
            : current);
        }
      }
      // Profile names and locations are joined into several cached views.
      // Mark those queries stale so dashboards, case views, attorney listings,
      // and message lists refresh their display from public.users.
      const relatedKeys = [
        ['publicProfile'], ['legalProfile'], ['publicDashboard'], ['legalDashboard'],
        ['publicAllCases'], ['legalMyCases'], ['legalAvailableCases'], ['caseDetails'],
        ['publicMessageThreads'], ['legalMessageThreads'], ['publicAttorneyProfile'],
      ];
      relatedKeys.forEach(queryKey => {
        void queryClient.invalidateQueries({ queryKey, refetchType: 'active' });
      });
      onSaved();
    } catch (e: any) {
      setError(e?.name === 'AbortError'
        ? 'Saving took too long. Check your connection and try again.'
        : e?.message || 'Could not save your profile. Please try again.');
    } finally {
      clearTimeout(timeout);
      setSaving(false);
    }
  };

  return <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={onClose}>
    <View style={styles.overlay}>
      <View style={styles.sheet}>
        <View style={styles.headingRow}>
          <View style={styles.headingIcon}><Ionicons name="person-circle-outline" size={23} color={theme.colors.primary} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Edit profile details</Text>
            <Text style={styles.subtitle}>Your ID and verification details cannot be changed here.</Text>
          </View>
          <Pressable onPress={onClose} accessibilityLabel="Close editor" style={styles.close}><Ionicons name="close" size={22} color="#475569" /></Pressable>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.form}>
          {fields.filter(field => !field.attorneyOnly || attorney).map(field => <View key={field.key}>
            <Text style={styles.label}>{field.label}</Text>
            {field.key === 'date_of_birth' ? (
              <>
                {Platform.OS === 'web' ? (
                  <TextInput
                    value={values.date_of_birth || ''}
                    onChangeText={text => setValues(current => ({ ...current, date_of_birth: text }))}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    style={styles.input}
                  />
                ) : (
                  <View style={styles.dateRow}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Choose date of birth"
                      onPress={openBirthDatePicker}
                      style={styles.dateButton}
                    >
                      <Ionicons name="calendar-outline" size={19} color={theme.colors.primary} />
                      <Text style={[styles.dateText, !values.date_of_birth && styles.datePlaceholder]}>
                        {parseDateOnly(values.date_of_birth)?.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }) || 'Select date of birth'}
                      </Text>
                      <Ionicons name="chevron-down" size={17} color="#64748B" />
                    </Pressable>
                    {!!values.date_of_birth && (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Clear date of birth"
                        onPress={() => setValues(current => ({ ...current, date_of_birth: '' }))}
                        style={styles.dateClear}
                      >
                        <Ionicons name="close" size={18} color="#64748B" />
                      </Pressable>
                    )}
                  </View>
                )}
                {Platform.OS === 'ios' && showBirthDatePicker && (
                  <View style={styles.datePickerPanel}>
                    <View style={styles.datePickerActions}>
                      <Pressable onPress={() => setShowBirthDatePicker(false)}><Text style={styles.datePickerCancel}>Cancel</Text></Pressable>
                      <Pressable onPress={() => {
                        setValues(current => ({ ...current, date_of_birth: toDateOnly(draftBirthDate) }));
                        setShowBirthDatePicker(false);
                      }}><Text style={styles.datePickerDone}>Done</Text></Pressable>
                    </View>
                    <DateTimePicker
                      value={draftBirthDate}
                      mode="date"
                      display="spinner"
                      maximumDate={new Date()}
                      onValueChange={(_event, date) => { if (date) setDraftBirthDate(date); }}
                    />
                  </View>
                )}
              </>
            ) : (
              <TextInput
                value={values[field.key] || ''}
                onChangeText={text => setValues(current => ({ ...current, [field.key]: text }))}
                placeholder={field.placeholder}
                placeholderTextColor="#94A3B8"
                keyboardType={field.keyboardType || 'default'}
                multiline={field.multiline}
                style={[styles.input, field.multiline && styles.multiline]}
                autoCapitalize={field.key === 'phone_number' ? 'none' : 'words'}
              />
            )}
          </View>)}
          <View style={styles.readOnlyNote}><Ionicons name="lock-closed-outline" size={17} color="#64748B" /><Text style={styles.noteText}>Email, uploaded ID, ID number, expiration date, and verification status stay unchanged.</Text></View>
          {!!error && <Text style={styles.error}>{error}</Text>}
        </ScrollView>
        <View style={styles.actions}>
          <Pressable style={styles.cancel} onPress={onClose} disabled={saving}><Text style={styles.cancelText}>Cancel</Text></Pressable>
          <Pressable style={styles.save} onPress={() => void save()} disabled={saving}>
            {saving ? <><ActivityIndicator color="#fff" size="small" /><Text style={styles.saveText}>Saving…</Text></> : <><Ionicons name="checkmark" size={18} color="#fff" /><Text style={styles.saveText}>Save changes</Text></>}
          </Pressable>
        </View>
      </View>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15, 23, 42, 0.48)' },
  sheet: { maxHeight: '92%', backgroundColor: '#fff', borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingTop: 22, paddingHorizontal: 20, paddingBottom: 20 },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 18, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  headingIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  title: { color: '#1E293B', fontSize: 18, fontWeight: '800' }, subtitle: { color: '#64748B', fontSize: 12, marginTop: 3 },
  close: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F5F9' },
  form: { gap: 12, paddingTop: 16, paddingBottom: 12 }, label: { color: '#475569', fontSize: 13, fontWeight: '700', marginBottom: 6 },
  input: { minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: '#D8E1EC', backgroundColor: '#F8FAFC', paddingHorizontal: 14, color: '#1E293B', fontSize: 15 },
  dateRow: { flexDirection: 'row', gap: 8 },
  dateButton: { flex: 1, minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: '#D8E1EC', backgroundColor: '#F8FAFC', paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  dateText: { flex: 1, color: '#1E293B', fontSize: 15 }, datePlaceholder: { color: '#94A3B8' },
  dateClear: { width: 42, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#F1F5F9' },
  datePickerPanel: { marginTop: 8, borderRadius: 14, backgroundColor: '#F8FAFC', overflow: 'hidden' },
  datePickerActions: { minHeight: 44, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  datePickerCancel: { color: '#64748B', fontSize: 15, fontWeight: '600' }, datePickerDone: { color: theme.colors.primary, fontSize: 15, fontWeight: '800' },
  multiline: { minHeight: 72, paddingTop: 12, textAlignVertical: 'top' },
  readOnlyNote: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: '#F1F5F9', borderRadius: 12, padding: 12, marginTop: 3 },
  noteText: { flex: 1, color: '#64748B', fontSize: 12, lineHeight: 18 }, error: { color: '#B91C1C', fontSize: 13 },
  actions: { flexDirection: 'row', gap: 10, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  cancel: { flex: 1, minHeight: 48, borderRadius: 13, borderWidth: 1, borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: '#475569', fontSize: 15, fontWeight: '700' },
  save: { flex: 1.4, minHeight: 48, borderRadius: 13, backgroundColor: theme.colors.primary, flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center' },
  saveText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
