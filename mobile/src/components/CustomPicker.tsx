import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, FlatList, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Option = {
  label: string;
  value: string;
};

type CustomPickerProps = {
  options: Option[];
  selectedValue: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
};

export default function CustomPicker({ options, selectedValue, onValueChange, placeholder = "Select an option" }: CustomPickerProps) {
  const [modalVisible, setModalVisible] = useState(false);

  const selectedOption = options.find(o => o.value === selectedValue);

  const handleSelect = (val: string) => {
    onValueChange(val);
    setModalVisible(false);
  };

  return (
    <>
      <Pressable style={styles.trigger} onPress={() => setModalVisible(true)}>
        <Text style={[styles.triggerText, !selectedOption && styles.placeholderText]}>
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={20} color="#64748B" />
      </Pressable>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setModalVisible(false)} />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{placeholder}</Text>
              <Pressable onPress={() => setModalVisible(false)} hitSlop={12}>
                <Ionicons name="close" size={24} color="#64748B" />
              </Pressable>
            </View>
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              contentContainerStyle={styles.listContainer}
              renderItem={({ item }) => {
                const isSelected = item.value === selectedValue;
                return (
                  <Pressable 
                    style={[styles.optionRow, isSelected && styles.optionRowSelected]} 
                    onPress={() => handleSelect(item.value)}
                  >
                    <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>{item.label}</Text>
                    {isSelected && <Ionicons name="checkmark-circle" size={24} color="#0D9488" />}
                  </Pressable>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  triggerText: {
    color: '#1E293B',
    fontSize: 16,
  },
  placeholderText: {
    color: '#94A3B8',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
    paddingBottom: Platform.OS === 'ios' ? 32 : 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  listContainer: {
    paddingVertical: 8,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  optionRowSelected: {
    backgroundColor: '#F0FDFA',
  },
  optionText: {
    fontSize: 16,
    color: '#334155',
    fontWeight: '500',
  },
  optionTextSelected: {
    color: '#0F766E',
    fontWeight: '700',
  },
});
