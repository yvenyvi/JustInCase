import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import CustomPicker from './CustomPicker';

// Require local JSON assets
const phRegion = require('../../assets/ph-data/ph_region.json');
const phProvince = require('../../assets/ph-data/ph_province.json');
const phCity = require('../../assets/ph-data/ph_city.json');
const phBarangay = require('../../assets/ph-data/ph_barangay.json');

type AddressPickerProps = {
  region: string;
  setRegion: (val: string) => void;
  province: string;
  setProvince: (val: string) => void;
  city: string;
  setCity: (val: string) => void;
  barangay: string;
  setBarangay: (val: string) => void;
};

export default function AddressPicker({
  region,
  setRegion,
  province,
  setProvince,
  city,
  setCity,
  barangay,
  setBarangay,
}: AddressPickerProps) {
  const [regionCode, setRegionCode] = useState('');
  const [provinceCode, setProvinceCode] = useState('');
  const [cityCode, setCityCode] = useState('');
  const [barangayCode, setBarangayCode] = useState('');

  // Attempt fuzzy match to auto-select from OCR names
  useEffect(() => {
    if (region && !regionCode) {
      const match = phRegion.find((r: any) => 
        r.region_name.toLowerCase().includes(region.toLowerCase()) || 
        region.toLowerCase().includes(r.region_name.toLowerCase())
      );
      if (match) {
        setRegionCode(match.region_code);
        setRegion(match.region_name);
      }
    }
  }, [region]);

  useEffect(() => {
    if (province && !provinceCode && regionCode) {
      const match = phProvince.find((p: any) => 
        p.region_code === regionCode && 
        (p.province_name.toLowerCase().includes(province.toLowerCase()) || 
         province.toLowerCase().includes(p.province_name.toLowerCase()))
      );
      if (match) {
        setProvinceCode(match.province_code);
        setProvince(match.province_name);
      }
    }
  }, [province, regionCode]);

  useEffect(() => {
    if (city && !cityCode && (provinceCode || regionCode)) {
      const match = phCity.find((c: any) => 
        (c.province_code === provinceCode || c.region_desc === regionCode) && 
        (c.city_name.toLowerCase().includes(city.toLowerCase()) || 
         city.toLowerCase().includes(c.city_name.toLowerCase()))
      );
      if (match) {
        setCityCode(match.city_code);
        setCity(match.city_name);
      }
    }
  }, [city, provinceCode, regionCode]);

  useEffect(() => {
    if (barangay && !barangayCode && cityCode) {
      const match = phBarangay.find((b: any) => 
        b.city_code === cityCode && 
        (b.brgy_name.toLowerCase().includes(barangay.toLowerCase()) || 
         barangay.toLowerCase().includes(b.brgy_name.toLowerCase()))
      );
      if (match) {
        setBarangayCode(match.brgy_code);
        setBarangay(match.brgy_name);
      }
    }
  }, [barangay, cityCode]);

  // Options
  const regionOptions = phRegion.map((r: any) => ({
    label: r.region_name,
    value: r.region_code,
  }));

  const provinceOptions = phProvince
    .filter((p: any) => p.region_code === regionCode)
    .map((p: any) => ({
      label: p.province_name,
      value: p.province_code,
    }));

  const cityOptions = phCity
    .filter((c: any) => c.province_code === provinceCode || (regionCode === '13' && c.region_desc === '13')) // handle NCR
    .map((c: any) => ({
      label: c.city_name,
      value: c.city_code,
    }));

  const barangayOptions = phBarangay
    .filter((b: any) => b.city_code === cityCode)
    .map((b: any) => ({
      label: b.brgy_name,
      value: b.brgy_code,
    }));

  return (
    <View style={styles.container}>
      <View style={styles.field}>
        <Text style={styles.label}>Region</Text>
        <CustomPicker
          options={regionOptions}
          selectedValue={regionCode}
          onValueChange={(val) => {
            setRegionCode(val);
            const match = phRegion.find((r: any) => r.region_code === val);
            if (match) setRegion(match.region_name);
            setProvinceCode(''); setProvince('');
            setCityCode(''); setCity('');
            setBarangayCode(''); setBarangay('');
          }}
          placeholder="Select Region"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Province</Text>
        <CustomPicker
          options={provinceOptions}
          selectedValue={provinceCode}
          onValueChange={(val) => {
            setProvinceCode(val);
            const match = phProvince.find((p: any) => p.province_code === val);
            if (match) setProvince(match.province_name);
            setCityCode(''); setCity('');
            setBarangayCode(''); setBarangay('');
          }}
          placeholder={regionCode === '13' ? "Metro Manila" : "Select Province"}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>City / Municipality</Text>
        <CustomPicker
          options={cityOptions}
          selectedValue={cityCode}
          onValueChange={(val) => {
            setCityCode(val);
            const match = phCity.find((c: any) => c.city_code === val);
            if (match) setCity(match.city_name);
            setBarangayCode(''); setBarangay('');
          }}
          placeholder="Select City"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Barangay</Text>
        <CustomPicker
          options={barangayOptions}
          selectedValue={barangayCode}
          onValueChange={(val) => {
            setBarangayCode(val);
            const match = phBarangay.find((b: any) => b.brgy_code === val);
            if (match) setBarangay(match.brgy_name);
          }}
          placeholder="Select Barangay"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
    marginBottom: 16,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '500',
  },
});
