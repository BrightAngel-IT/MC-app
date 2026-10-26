import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Image, Modal } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { AuthContext } from '../../context/authContext';
import { useTheme } from '../../context/themeContext';
import { SIZES } from '../../styles/theme';
import { Ionicons } from '@expo/vector-icons';


const RegisterScreen = ({ navigation }) => {
  const { register } = useContext(AuthContext);
  const { colors, isDarkMode, toggleTheme } = useTheme();

  const [fullName, setFullName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [licenseFront, setLicenseFront] = useState(null);
  const [idFront, setIdFront] = useState(null);
  const [idBack, setIdBack] = useState(null);
  const [licenseBack, setLicenseBack] = useState(null);
  const [role, setRole] = useState('PATIENT');
  const [specializations, setSpecializations] = useState([]); // array for multiple
  const [qualifications, setQualifications] = useState('');
  const [address, setAddress] = useState('');
  const [idCardNumber, setIdCardNumber] = useState('');
  const [workingHospital, setWorkingHospital] = useState('');
  const [isCurrentlyWorking, setIsCurrentlyWorking] = useState(true);
  
  const [locationLat, setLocationLat] = useState(null);
  const [locationLng, setLocationLng] = useState(null);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState({ latitude: 7.8731, longitude: 80.7718, latitudeDelta: 0.1, longitudeDelta: 0.1 });
  
  const [businessName, setBusinessName] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseIssuedYear, setLicenseIssuedYear] = useState('');
  const [ambulanceVehicleNumber, setAmbulanceVehicleNumber] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [focusedInput, setFocusedInput] = useState('');

  const pickImage = async (setImageFunc) => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.1,
      base64: true
    });

    if (!result.canceled && result.assets[0].base64) {
      setImageFunc('data:image/jpeg;base64,' + result.assets[0].base64);
    }
  };

  const styles = getStyles(colors);

  const roles = [
    { label: 'Patient', value: 'PATIENT', theme: colors.roles.PATIENT },
    { label: 'Doctor', value: 'DOCTOR', theme: colors.roles.DOCTOR },
    { label: 'Nurse', value: 'NURSE', theme: colors.roles.NURSE },
    { label: 'Caregiver', value: 'CAREGIVER', theme: colors.roles.CAREGIVER },
    { label: 'Lab Tech', value: 'LAB_TECH', theme: colors.roles.LAB_TECH },
    { label: 'Paramedic', value: 'PARAMEDIC', theme: colors.roles.PARAMEDIC },
    { label: 'Pharmacist', value: 'PHARMACIST', theme: colors.roles.PHARMACIST },
    { label: 'Elder Home', value: 'ELDER_HOME', theme: colors.roles.ELDER_HOME },
  ];

  const activeTheme = roles.find(r => r.value === role)?.theme || colors.roles.PATIENT;

  const validateForm = () => {
    let newErrors = {};

    // Name Validation
    if (!fullName.trim()) {
      newErrors.fullName = role === "ELDER_HOME" ? "Home Name is required" : "Full Name is required";
    } else if (!/^[a-zA-Z\s]+$/.test(fullName)) {
      newErrors.fullName = role === "ELDER_HOME" ? "Home Name can only contain letters and spaces" : "Full Name can only contain letters and spaces";
    }

    if (role === 'ELDER_HOME' && !ownerName.trim()) {
        newErrors.ownerName = 'Owner Name is required';
      }
      // Email Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      newErrors.email = 'Email Address is required';
    } else if (!emailRegex.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Phone Validation (Optional but must be 10 digits if provided)
    if (phone && !/^\d{10}$/.test(phone)) {
      newErrors.phone = 'Phone number must be exactly 10 digits';
    }

    // Password Validation
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long';
    } else if (!/(?=.*[A-Z])/.test(password)) {
      newErrors.password = 'Password must contain at least one uppercase letter';
    } else if (!/(?=.*\d)/.test(password)) {
      newErrors.password = 'Password must contain at least one number';
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // License Validation
    if (role !== 'PATIENT' && role !== 'OVERSEAS_GUARDIAN' && role !== 'ADMIN') {
      if (!licenseFront) newErrors.licenseFront = 'Front side of license is required';
      if (!licenseBack) newErrors.licenseBack = 'Back side of license is required';
    }

    if (role === 'DOCTOR' && specializations.length === 0) {
      newErrors.specializations = 'At least one Specialization is required for Doctors';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleGetLocation = async () => {
    setMapModalVisible(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        let loc = await Location.getCurrentPositionAsync({});
        setSelectedRegion({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });
      }
    } catch (error) {
      console.log('Location fetch failed', error);
    }
  };

  const handleRegister = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      const result = await register({ 
        email: email.trim().toLowerCase(), password, phone, role, fullName,
        licenseFrontImageBase64: licenseFront,
        idFrontImageBase64: idFront,
        idBackImageBase64: idBack,
        licenseBackImageBase64: licenseBack,
        specialization: role === 'DOCTOR' ? specializations.join(', ') : undefined,
        qualifications: role === 'DOCTOR' ? qualifications.trim() : undefined,
        address,
        locationLat: role !== 'PATIENT' ? locationLat : undefined,
        locationLng: role !== 'PATIENT' ? locationLng : undefined,
        nicNumber: idCardNumber, // Sending idCardNumber as nicNumber for roles that use it
        idCardNumber: ['DOCTOR', 'NURSE', 'CAREGIVER', 'LAB_TECH', 'PARAMEDIC'].includes(role) ? idCardNumber : undefined,
        workingHospital: ['DOCTOR', 'NURSE', 'CAREGIVER', 'LAB_TECH'].includes(role) ? workingHospital : undefined,
        isCurrentlyWorking: ['DOCTOR', 'NURSE', 'CAREGIVER', 'LAB_TECH', 'PARAMEDIC'].includes(role) ? isCurrentlyWorking : undefined,
        ambulanceVehicleNumber: role === 'PARAMEDIC' ? ambulanceVehicleNumber : undefined,
        attachedHospital: role === 'PARAMEDIC' ? workingHospital : undefined,
        businessName: role === 'PHARMACIST' ? businessName : undefined,
        licenseNumber: ['PHARMACIST', 'LAB_TECH', 'ELDER_HOME'].includes(role) ? licenseNumber : undefined,
        licenseIssuedYear: ['DOCTOR', 'NURSE', 'CAREGIVER', 'LAB_TECH', 'PARAMEDIC', 'PHARMACIST', 'ELDER_HOME'].includes(role) ? licenseIssuedYear : undefined
      });
      
      setLoading(false);
      if (!result.success) {
        setErrors({ general: result.message });
      }
    } catch (error) {
      setLoading(false);
      setErrors({ general: 'An unexpected error occurred' });
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={toggleTheme} style={styles.themeBtn}>
          <Text style={styles.themeBtnText}>{isDarkMode ? '☀️' : '🌙'}</Text>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join Healthcare Super App</Text>

        {errors.general ? <Text style={styles.generalError}>{errors.general}</Text> : null}

        <Text style={styles.label}>I am a...</Text>
        <View style={styles.roleContainer}>
          {roles.map((r) => {
            const isActive = role === r.value;
            return (
              <TouchableOpacity 
                key={r.value}
                style={[
                  styles.roleCard, 
                  isActive && { backgroundColor: r.theme.bgTint, borderColor: r.theme.accent }
                ]}
                onPress={() => {
                  setRole(r.value);
                  setErrors(prev => ({ ...prev, licenseFront: null, licenseBack: null }));
                }}
              >
                <Text style={[
                  styles.roleText, 
                  isActive && { color: r.theme.textTint, fontWeight: 'bold' }
                ]}>
                  {r.label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>{role === 'ELDER_HOME' ? 'Elder Home Name *' : 'Full Name *'}</Text>
          <TextInput
            style={[
              styles.input, 
              focusedInput === 'name' && { borderColor: activeTheme.accent },
              errors.fullName && styles.inputError
            ]}
            placeholder="John Doe"
            placeholderTextColor={colors.textMuted}
            value={fullName}
            onChangeText={(t) => { setFullName(t); setErrors(p => ({...p, fullName: null})); }}
            onFocus={() => setFocusedInput('name')}
            onBlur={() => setFocusedInput('')}
          />
          {errors.fullName && <Text style={styles.errorText}>{errors.fullName}</Text>}
        </View>

        {role === 'ELDER_HOME' && (
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Owner Name *</Text>
            <TextInput
              style={[
                styles.input, 
                focusedInput === 'ownerName' && { borderColor: activeTheme.accent },
                errors.ownerName && styles.inputError
              ]}
              placeholder="Enter owner's full name"
              placeholderTextColor={colors.textMuted}
              value={ownerName}
              onChangeText={(t) => { setOwnerName(t); setErrors(p => ({...p, ownerName: null})); }}
              onFocus={() => setFocusedInput('ownerName')}
              onBlur={() => setFocusedInput('')}
            />
            {errors.ownerName && <Text style={styles.errorText}>{errors.ownerName}</Text>}
          </View>
        )}

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email Address *</Text>
          <TextInput
            style={[
              styles.input, 
              focusedInput === 'email' && { borderColor: activeTheme.accent },
              errors.email && styles.inputError
            ]}
            placeholder="Enter your email"
            placeholderTextColor={colors.textMuted}
            value={email}
            onChangeText={(t) => { setEmail(t); setErrors(p => ({...p, email: null})); }}
            autoCapitalize="none"
            keyboardType="email-address"
            onFocus={() => setFocusedInput('email')}
            onBlur={() => setFocusedInput('')}
          />
          {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={[
              styles.input, 
              focusedInput === 'phone' && { borderColor: activeTheme.accent },
              errors.phone && styles.inputError
            ]}
            placeholder="07X XXX XXXX"
            placeholderTextColor={colors.textMuted}
            value={phone}
            onChangeText={(t) => { setPhone(t); setErrors(p => ({...p, phone: null})); }}
            keyboardType="phone-pad"
            onFocus={() => setFocusedInput('phone')}
            onBlur={() => setFocusedInput('')}
          />
          {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Address *</Text>
          <TextInput
            style={[
              styles.input, 
              focusedInput === 'address' && { borderColor: activeTheme.accent }
            ]}
            placeholder="Enter your address"
            placeholderTextColor={colors.textMuted}
            value={address}
            onChangeText={setAddress}
            onFocus={() => setFocusedInput('address')}
            onBlur={() => setFocusedInput('')}
          />
        </View>

        

        <View style={styles.inputContainer}>
          <Text style={styles.label}>ID Card Number / NIC *</Text>
          <TextInput
            style={[
              styles.input, 
              focusedInput === 'idCardNumber' && { borderColor: activeTheme.accent }
            ]}
            placeholder="NIC or Passport Number"
            placeholderTextColor={colors.textMuted}
            value={idCardNumber}
            onChangeText={setIdCardNumber}
            onFocus={() => setFocusedInput('idCardNumber')}
            onBlur={() => setFocusedInput('')}
          />
        </View>

        {['DOCTOR', 'NURSE', 'CAREGIVER', 'LAB_TECH', 'PARAMEDIC'].includes(role) && (
          <>
            <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 15}}>
              <TouchableOpacity
                onPress={() => setIsCurrentlyWorking(!isCurrentlyWorking)}
                style={{
                  width: 24, height: 24, borderRadius: 4, borderWidth: 1, 
                  borderColor: isCurrentlyWorking ? activeTheme.primary : colors.border,
                  backgroundColor: isCurrentlyWorking ? activeTheme.primary : 'transparent',
                  marginRight: 10, justifyContent: 'center', alignItems: 'center'
                }}
              >
                {isCurrentlyWorking && <Text style={{color: '#fff', fontSize: 14, fontWeight: 'bold'}}>✓</Text>}
              </TouchableOpacity>
              <Text style={[styles.label, {marginBottom: 0}]}>I am currently working at a hospital/clinic/service</Text>
            </View>

            {isCurrentlyWorking && (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>{role === 'PARAMEDIC' ? 'Attached Hospital / Ambulance Service Name *' : 'Current Working Hospital / Clinic *'}</Text>
                <TextInput
                  style={[
                    styles.input, 
                    focusedInput === 'workingHospital' && { borderColor: activeTheme.accent }
                  ]}
                  placeholder={role === 'PARAMEDIC' ? "Ambulance Service Name" : "Hospital Name"}
                  placeholderTextColor={colors.textMuted}
                  value={workingHospital}
                  onChangeText={setWorkingHospital}
                  onFocus={() => setFocusedInput('workingHospital')}
                  onBlur={() => setFocusedInput('')}
                />
              </View>
            )}

            {role === 'PARAMEDIC' && (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Ambulance Vehicle Registration Number (Optional)</Text>
                <TextInput
                  style={[
                    styles.input, 
                    focusedInput === 'ambulanceVehicleNumber' && { borderColor: activeTheme.accent }
                  ]}
                  placeholder="e.g., WP-1234"
                  placeholderTextColor={colors.textMuted}
                  value={ambulanceVehicleNumber}
                  onChangeText={setAmbulanceVehicleNumber}
                  onFocus={() => setFocusedInput('ambulanceVehicleNumber')}
                  onBlur={() => setFocusedInput('')}
                />
              </View>
            )}
          </>
        )}

        {role === 'PHARMACIST' && (
          <>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Pharmacy / Business Name *</Text>
              <TextInput
                style={[
                  styles.input, 
                  focusedInput === 'businessName' && { borderColor: activeTheme.accent }
                ]}
                placeholder="e.g., City Pharmacy"
                placeholderTextColor={colors.textMuted}
                value={businessName}
                onChangeText={setBusinessName}
                onFocus={() => setFocusedInput('businessName')}
                onBlur={() => setFocusedInput('')}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Pharmacy License Number / BR Number *</Text>
              <TextInput
                style={[
                  styles.input, 
                  focusedInput === 'licenseNumber' && { borderColor: activeTheme.accent }
                ]}
                placeholder="Enter License Number"
                placeholderTextColor={colors.textMuted}
                value={licenseNumber}
                onChangeText={setLicenseNumber}
                onFocus={() => setFocusedInput('licenseNumber')}
                onBlur={() => setFocusedInput('')}
              />
            </View>
          </>
        )}
        
        {['DOCTOR', 'NURSE', 'CAREGIVER', 'LAB_TECH', 'PARAMEDIC', 'PHARMACIST'].includes(role) && (
          <View style={styles.inputContainer}>
            <Text style={styles.label}>License / Certificate Issued Year</Text>
            <TextInput
              style={[
                styles.input, 
                focusedInput === 'licenseIssuedYear' && { borderColor: activeTheme.accent }
              ]}
              placeholder="e.g. 2018"
              placeholderTextColor={colors.textMuted}
              value={licenseIssuedYear}
              onChangeText={setLicenseIssuedYear}
              keyboardType="number-pad"
              maxLength={4}
              onFocus={() => setFocusedInput('licenseIssuedYear')}
              onBlur={() => setFocusedInput('')}
            />
          </View>
        )}

        {role === 'LAB_TECH' && (
          <View style={styles.inputContainer}>
            <Text style={styles.label}>License Number / Registration Number *</Text>
            <TextInput
              style={[
                styles.input, 
                focusedInput === 'licenseNumber' && { borderColor: activeTheme.accent }
              ]}
              placeholder="Enter License Number"
              placeholderTextColor={colors.textMuted}
              value={licenseNumber}
              onChangeText={setLicenseNumber}
              onFocus={() => setFocusedInput('licenseNumber')}
              onBlur={() => setFocusedInput('')}
            />
          </View>
        )}

        {role === 'DOCTOR' && (
          <>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Qualifications (Optional)</Text>
              <TextInput
                style={[
                  styles.input, 
                  focusedInput === 'qualifications' && { borderColor: activeTheme.accent }
                ]}
                placeholder="e.g., MBBS, MD"
                placeholderTextColor={colors.textMuted}
                value={qualifications}
                onChangeText={setQualifications}
                onFocus={() => setFocusedInput('qualifications')}
                onBlur={() => setFocusedInput('')}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Specializations (Select up to 3) *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 8 }}>
                {['General Physician', 'Cardiologist', 'Dentist', 'Dermatologist', 'Neurologist', 'Pediatrician', 'Psychiatrist', 'Orthopedic'].map((spec) => {
                  const isSelected = specializations.includes(spec);
                  return (
                    <TouchableOpacity
                      key={spec}
                      onPress={() => { 
                        setSpecializations(prev => {
                          if (prev.includes(spec)) return prev.filter(s => s !== spec);
                          if (prev.length >= 3) return prev; // limit to 3
                          return [...prev, spec];
                        });
                        setErrors(p => ({...p, specializations: null})); 
                      }}
                      style={[
                        styles.specChip,
                        isSelected && { backgroundColor: activeTheme.bgTint, borderColor: activeTheme.accent }
                      ]}
                    >
                      <Text style={[
                        styles.specChipText,
                        isSelected && { color: activeTheme.textTint, fontWeight: 'bold' }
                      ]}>
                        {spec}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              {errors.specializations && <Text style={styles.errorText}>{errors.specializations}</Text>}
            </View>
          </>
        )}


        <View style={styles.inputContainer}>
          <Text style={styles.label}>Password *</Text>
            <TextInput
              style={[
                styles.input,
                focusedInput === 'password' && { borderColor: activeTheme.accent },
                errors.password && styles.inputError
              ]}
              placeholder="Create a strong password"
              placeholderTextColor={activeTheme.textMuted}
              value={password}
              secureTextEntry
              autoComplete="new-password"
              textContentType="newPassword"
              onChangeText={(t) => { setPassword(t); setErrors(p => ({...p, password: null})); }}
              onFocus={() => setFocusedInput('password')}
              onBlur={() => setFocusedInput(null)}
            />
          {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
        </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Confirm Password *</Text>
              <TextInput
                style={[
                  styles.input,
                  focusedInput === 'confirmPassword' && { borderColor: activeTheme.accent },
                  errors.confirmPassword && styles.inputError
                ]}
                placeholder="Confirm your password"
                placeholderTextColor={activeTheme.textMuted}
                value={confirmPassword}
                secureTextEntry
                autoComplete="new-password"
                textContentType="newPassword"
                onChangeText={(t) => { setConfirmPassword(t); setErrors(p => ({...p, confirmPassword: null})); }}
                onFocus={() => setFocusedInput('confirmPassword')}
                onBlur={() => setFocusedInput(null)}
              />
            {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
          </View>

        {role !== 'PATIENT' && role !== 'OVERSEAS_GUARDIAN' && role !== 'ADMIN' && (
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: activeTheme.textTint }]}>Upload License / Registration Images *</Text>
            
            <View style={styles.imagePickerContainer}>
              <TouchableOpacity style={styles.imagePickerBtn} onPress={() => pickImage(setLicenseFront)}>
                <Text style={styles.imagePickerText}>Select Front Side</Text>
              </TouchableOpacity>
              {licenseFront && <Image source={{ uri: licenseFront }} style={styles.previewImage} />}
              {errors.licenseFront && <Text style={styles.errorText}>{errors.licenseFront}</Text>}
            </View>

            <View style={styles.imagePickerContainer}>
              <TouchableOpacity style={styles.imagePickerBtn} onPress={() => pickImage(setLicenseBack)}>
                <Text style={styles.imagePickerText}>Select Back Side</Text>
              </TouchableOpacity>
              {licenseBack && <Image source={{ uri: licenseBack }} style={styles.previewImage} />}
              {errors.licenseBack && <Text style={styles.errorText}>{errors.licenseBack}</Text>}
            </View>
          </View>
        )}

        {role !== 'PATIENT' && role !== 'OVERSEAS_GUARDIAN' && (
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: activeTheme.textTint }]}>Upload ID Card Images *</Text>
            
            <View style={styles.imagePickerContainer}>
              <TouchableOpacity style={styles.imagePickerBtn} onPress={() => pickImage(setIdFront)}>
                <Text style={styles.imagePickerText}>Select ID Front</Text>
              </TouchableOpacity>
              {idFront && <Image source={{ uri: idFront }} style={styles.previewImage} />}
              {errors.idFront && <Text style={styles.errorText}>{errors.idFront}</Text>}
            </View>

            <View style={styles.imagePickerContainer}>
              <TouchableOpacity style={styles.imagePickerBtn} onPress={() => pickImage(setIdBack)}>
                <Text style={styles.imagePickerText}>Select ID Back</Text>
              </TouchableOpacity>
              {idBack && <Image source={{ uri: idBack }} style={styles.previewImage} />}
              {errors.idBack && <Text style={styles.errorText}>{errors.idBack}</Text>}
            </View>
          </View>
        )}

        <TouchableOpacity 
          style={[
            styles.registerButton, 
            { backgroundColor: activeTheme.primary, shadowColor: activeTheme.accent }
          ]} 
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={isDarkMode ? '#ffffff' : '#ffffff'} />
          ) : (
            <Text style={styles.registerButtonText}>Create Account</Text>
          )}
        </TouchableOpacity>

        <View style={styles.loginContainer}>
          <Text style={styles.loginText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={[styles.loginLink, { color: activeTheme.accent }]}>Sign In</Text>
          </TouchableOpacity>
        </View>
        
            </ScrollView>
  </KeyboardAvoidingView>
);
};

const getStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: SIZES.padding,
    paddingTop: 50,
    alignItems: 'flex-end',
  },
  themeBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: colors.surfaceLight,
  },
  themeBtnText: {
    fontSize: 18,
  },
  content: {
    padding: SIZES.padding,
    paddingBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textLight,
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: colors.textLight,
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: SIZES.radius,
    padding: 16,
    fontSize: 16,
    color: colors.text,
  },
  inputError: {
    borderColor: colors.danger,
    borderWidth: 1.5,
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    marginTop: 6,
    fontWeight: '500',
  },
  generalError: {
    color: colors.danger,
    marginBottom: 16,
    textAlign: 'center',
    fontWeight: 'bold',
    backgroundColor: colors.danger + '20', // slight red bg
    padding: 10,
    borderRadius: SIZES.radius,
  },
  roleContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 28,
  },
  roleCard: {
    width: '47%',
    paddingVertical: 14,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  roleText: {
    color: colors.textMuted,
    fontWeight: '600',
    fontSize: 15,
  },
  registerButton: {
    padding: 16,
    borderRadius: SIZES.radius,
    alignItems: 'center',
    marginTop: 10,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  registerButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
  },
  loginText: {
    color: colors.textLight,
    fontSize: 14,
  },
  loginLink: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  specChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  specChipText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  imagePickerContainer: {
    marginBottom: 12,
  },
  imagePickerBtn: {
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    padding: 16,
    borderRadius: SIZES.radius,
    alignItems: 'center',
  },
  imagePickerText: {
    color: colors.textLight,
    fontWeight: '600',
  },
  previewImage: {
    width: '100%',
    height: 150,
    borderRadius: SIZES.radius,
    marginTop: 8,
    resizeMode: 'cover',
  }
});

export default RegisterScreen;
