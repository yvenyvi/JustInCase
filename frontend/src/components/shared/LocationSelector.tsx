import React, { useState, useEffect } from 'react';

const fetchJson = (file: string) =>
  fetch(`/ph-data/${file}.json`).then((r) => r.json());

interface LocationSelectorProps {
  onLocationChange: (location: {
    region: string;
    province: string;
    city: string;
    barangay: string;
    regionCode: string;
    provinceCode: string;
    cityCode: string;
    barangayCode: string;
  }) => void;
  initialValues?: {
    regionCode?: string;
    provinceCode?: string;
    cityCode?: string;
    barangayCode?: string;
  };
  /** OCR-extracted text names — component auto-matches to correct PSGC code when data loads */
  initialNames?: {
    region?: string;
    province?: string;
    city?: string;
    barangay?: string;
  };
  /** 'auth' uses the dark registration-form appearance; 'default' uses the light triage appearance */
  variant?: 'default' | 'auth';
}

const LocationSelector: React.FC<LocationSelectorProps> = ({
  onLocationChange,
  initialValues,
  initialNames,
  variant = 'default',
}) => {
  const isAuth = variant === 'auth';

  /** Returns select style. When a value is pre-selected, applies the same blue tint as inputAutofilled. */
  const getSelectStyle = (hasValue: boolean): React.CSSProperties =>
    isAuth
      ? {
          width: '100%',
          padding: '0.875rem 1rem',
          backgroundColor: hasValue ? 'rgba(37, 99, 235, 0.05)' : 'rgba(255, 255, 255, 0.05)',
          border: hasValue
            ? '1px solid rgba(37, 99, 235, 0.5)'
            : '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 'var(--radius-md)',
          color: '#fff',
          fontFamily: 'inherit',
          fontSize: '1rem',
          appearance: 'none' as const,
          cursor: 'pointer',
          transition: 'border-color 0.15s ease, background-color 0.15s ease',
        }
      : {
          padding: '0.6rem',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-surface)',
          color: 'var(--color-text-main)',
          width: '100%',
        };

  /** Dark background for each <option> so the dropdown popup stays dark in all browsers */
  const optionStyle: React.CSSProperties = isAuth
    ? { backgroundColor: '#101624', color: '#f0f4ff' }
    : {};

  const labelStyle: React.CSSProperties = isAuth
    ? { fontSize: '0.875rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.01em' }
    : { fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)' };

  const [regionData, setRegionData] = useState<any[]>([]);
  const [provinceData, setProvinceData] = useState<any[]>([]);
  const [cityData, setCityData] = useState<any[]>([]);
  const [barangayData, setBarangayData] = useState<any[]>([]);

  const [selectedRegion, setSelectedRegion] = useState(initialValues?.regionCode || '');
  const [selectedProvince, setSelectedProvince] = useState(initialValues?.provinceCode || '');
  const [selectedCity, setSelectedCity] = useState(initialValues?.cityCode || '');
  const [selectedBarangay, setSelectedBarangay] = useState(initialValues?.barangayCode || '');

  /** Fuzzy match: true if either string contains the other (case-insensitive). */
  const fuzzyMatch = (target: string, query: string): boolean => {
    const t = target.toLowerCase().trim();
    const q = query.toLowerCase().trim();
    const isMatch = t.includes(q) || q.includes(t);
    if (isMatch) {
      console.log(`[LocationMatch] Fuzzy match success: "${target}" matches "${query}"`);
    }
    return isMatch;
  };

  // ── Load regions on mount ────────────────────────────────────
  useEffect(() => {
    fetchJson('ph_region').then((res: any[]) => setRegionData(res)).catch(() => setRegionData([]));
  }, []);

  useEffect(() => {
    console.log('[LocationMatch] initialNames prop received:', initialNames);
  }, [initialNames]);

  // ── OCR prefill: match region by name once data arrives ──────
  useEffect(() => {
    if (initialNames?.region && regionData.length > 0 && !selectedRegion) {
      console.log('[LocationMatch] Attempting region match for:', initialNames.region);
      const found = regionData.find((r: any) => fuzzyMatch(r.region_name, initialNames.region!));
      if (found) setSelectedRegion(found.region_code);
    }
  }, [initialNames?.region, regionData, selectedRegion]);

  // ── Load provinces when region changes ───────────────────────
  useEffect(() => {
    if (selectedRegion) {
      fetchJson('ph_province').then((res: any[]) => res.filter((p) => p.region_code === selectedRegion)).then((res) => {
        setProvinceData(res);
        // Only reset downstream if this isn't a cascade triggered by OCR prefill
        if (!initialNames?.province) {
          setSelectedProvince('');
          setCityData([]);
          setBarangayData([]);
        }
      });
    } else {
      setProvinceData([]);
    }
  }, [selectedRegion]);

  // ── OCR prefill: match province by name ──────────────────────
  useEffect(() => {
    if (initialNames?.province && provinceData.length > 0 && !selectedProvince) {
      const found = provinceData.find((p: any) => fuzzyMatch(p.province_name, initialNames.province!));
      if (found) setSelectedProvince(found.province_code);
    }
  }, [initialNames?.province, provinceData, selectedProvince]);

  // ── Load cities when province changes ────────────────────────
  useEffect(() => {
    if (selectedProvince) {
      fetchJson('ph_city').then((res: any[]) => res.filter((c) => c.province_code === selectedProvince)).then((res) => {
        setCityData(res);
        if (!initialNames?.city) {
          setSelectedCity('');
          setBarangayData([]);
        }
      });
    } else {
      setCityData([]);
    }
  }, [selectedProvince]);

  // ── OCR prefill: match city by name ──────────────────────────
  useEffect(() => {
    if (initialNames?.city && cityData.length > 0 && !selectedCity) {
      const found = cityData.find((c: any) => fuzzyMatch(c.city_name, initialNames.city!));
      if (found) setSelectedCity(found.city_code);
    }
  }, [initialNames?.city, cityData, selectedCity]);

  // ── Load barangays when city changes ─────────────────────────
  useEffect(() => {
    if (selectedCity) {
      fetchJson('ph_barangay').then((res: any[]) => res.filter((b) => b.city_code === selectedCity)).then((res) => {
        setBarangayData(res);
        if (!initialNames?.barangay) {
          setSelectedBarangay('');
        }
      });
    } else {
      setBarangayData([]);
    }
  }, [selectedCity]);

  // ── OCR prefill: match barangay by name ──────────────────────
  useEffect(() => {
    if (initialNames?.barangay && barangayData.length > 0 && !selectedBarangay) {
      const found = barangayData.find((b: any) => fuzzyMatch(b.brgy_name, initialNames.barangay!));
      if (found) setSelectedBarangay(found.brgy_code);
    }
  }, [barangayData, initialNames?.barangay, selectedBarangay]);

  // ── Notify parent on any selection change ────────────────────
  useEffect(() => {
    const regionName = regionData.find((i) => i.region_code === selectedRegion)?.region_name || '';
    const provinceName = provinceData.find((i) => i.province_code === selectedProvince)?.province_name || '';
    const cityName = cityData.find((i) => i.city_code === selectedCity)?.city_name || '';
    const barangayName = barangayData.find((i) => i.brgy_code === selectedBarangay)?.brgy_name || '';

    console.log('[LocationMatch] Selection change notified to parent:', {
      region: regionName,
      province: provinceName,
      city: cityName,
      barangay: barangayName
    });

    onLocationChange({
      region: regionName,
      province: provinceName,
      city: cityName,
      barangay: barangayName,
      regionCode: selectedRegion,
      provinceCode: selectedProvince,
      cityCode: selectedCity,
      barangayCode: selectedBarangay,
    });
  }, [selectedRegion, selectedProvince, selectedCity, selectedBarangay, regionData, provinceData, cityData, barangayData]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Row 1: Region + Province */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: isAuth ? '0.5rem' : '0.4rem' }}>
          <label style={labelStyle}>Region</label>
          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            style={getSelectStyle(!!selectedRegion)}
          >
            <option value="" style={optionStyle}>Select Region</option>
            {regionData.map((item) => (
              <option key={item.region_code} value={item.region_code} style={optionStyle}>
                {item.region_name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: isAuth ? '0.5rem' : '0.4rem' }}>
          <label style={labelStyle}>Province</label>
          <select
            value={selectedProvince}
            onChange={(e) => setSelectedProvince(e.target.value)}
            disabled={!selectedRegion}
            style={{
              ...getSelectStyle(!!selectedProvince),
              opacity: !selectedRegion ? 0.4 : 1,
              cursor: !selectedRegion ? 'not-allowed' : 'pointer',
            }}
          >
            <option value="" style={optionStyle}>Select Province</option>
            {provinceData.map((item) => (
              <option key={item.province_code} value={item.province_code} style={optionStyle}>
                {item.province_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Row 2: City + Barangay */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: isAuth ? '0.5rem' : '0.4rem' }}>
          <label style={labelStyle}>City / Municipality</label>
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            disabled={!selectedProvince}
            style={{
              ...getSelectStyle(!!selectedCity),
              opacity: !selectedProvince ? 0.4 : 1,
              cursor: !selectedProvince ? 'not-allowed' : 'pointer',
            }}
          >
            <option value="" style={optionStyle}>Select City/Municipality</option>
            {cityData.map((item) => (
              <option key={item.city_code} value={item.city_code} style={optionStyle}>
                {item.city_name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: isAuth ? '0.5rem' : '0.4rem' }}>
          <label style={labelStyle}>Barangay</label>
          <select
            value={selectedBarangay}
            onChange={(e) => setSelectedBarangay(e.target.value)}
            disabled={!selectedCity}
            style={{
              ...getSelectStyle(!!selectedBarangay),
              opacity: !selectedCity ? 0.4 : 1,
              cursor: !selectedCity ? 'not-allowed' : 'pointer',
            }}
          >
            <option value="" style={optionStyle}>Select Barangay</option>
            {barangayData.map((item) => (
              <option key={item.brgy_code} value={item.brgy_code} style={optionStyle}>
                {item.brgy_name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default LocationSelector;
