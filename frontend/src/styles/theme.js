export const SIZES = {
  padding: 16,
  radius: 12,
  radiusLg: 16,
  radiusFull: 999,
  fontSm: 12,
  fontMd: 14,
  fontLg: 16,
  fontXl: 20,
  font2Xl: 24,
  font3Xl: 32,
};

const baseRoles = {
  PATIENT: {
    primary: '#0891b2', // cyan-600
    accent: '#06b6d4',  // cyan-500
  },
  DOCTOR: {
    primary: '#2563eb', // blue-600
    accent: '#3b82f6',  // blue-500
  },
  NURSE: {
    primary: '#059669', // emerald-600
    accent: '#10b981',  // emerald-500
  },
  ADMIN: {
    primary: '#9333ea', // purple-600
    accent: '#a855f7',  // purple-500
  },
  VENDOR: {
    primary: '#ea580c', // orange-600
    accent: '#f97316',  // orange-500
  },
  PARAMEDIC: {
    primary: '#e11d48', // rose-600
    accent: '#f43f5e',  // rose-500
  },
  CAREGIVER: {
    primary: '#d97706', // amber-600
    accent: '#f59e0b',  // amber-500
  },
  LAB_TECH: {
    primary: '#4f46e5', // indigo-600
    accent: '#6366f1',  // indigo-500
  },
  PHARMACIST: {
    primary: '#0d9488', // teal-600
    accent: '#14b8a6',  // teal-500
  },
      ELDER_HOME: {
        primary: '#f97316',
        accent: '#f97316',
        bgTint: '#fff7ed',
        textTint: '#c2410c'
      },
  OVERSEAS_GUARDIAN: {
    primary: '#475569', // slate-600
    accent: '#64748b',  // slate-500
  }
};

const baseEmergency = {
  danger: '#e11d48', // rose-600 (SOS)
  dangerHover: '#f43f5e', // rose-500
  success: '#10b981', // emerald-500
  warning: '#f59e0b', // amber-500
};

export const darkTheme = {
  isDark: true,
  background: '#020617', // Deep Dark Slate
  surface: '#0f172a', // Card Background
  surfaceLight: '#1e293b', // Borders & Light surfaces
  
  text: '#ffffff', // Primary white
  textLight: '#94a3b8', // Secondary Slate
  textMuted: '#64748b', // Muted text
  border: '#1e293b',
  
  primary: '#0891b2', 
  secondary: '#3b82f6',
  
  roles: {
    PATIENT: { ...baseRoles.PATIENT, bgTint: '#083344', textTint: '#67e8f9' },
    DOCTOR: { ...baseRoles.DOCTOR, bgTint: '#172554', textTint: '#93c5fd' },
    NURSE: { ...baseRoles.NURSE, bgTint: '#064e3b', textTint: '#6ee7b7' },
    ADMIN: { ...baseRoles.ADMIN, bgTint: '#3b0764', textTint: '#d8b4fe' },
    VENDOR: { ...baseRoles.VENDOR, bgTint: '#431407', textTint: '#fdba74' },
    PARAMEDIC: { ...baseRoles.PARAMEDIC, bgTint: '#4c0519', textTint: '#fda4af' },
    CAREGIVER: { ...baseRoles.CAREGIVER, bgTint: '#451a03', textTint: '#fcd34d' },
    LAB_TECH: { ...baseRoles.LAB_TECH, bgTint: '#1e1b4b', textTint: '#a5b4fc' },
    PHARMACIST: { ...baseRoles.PHARMACIST, bgTint: '#134e4a', textTint: '#5eead4' },
    ELDER_HOME: { ...baseRoles.ELDER_HOME, bgTint: '#431407', textTint: '#fdba74' },
    OVERSEAS_GUARDIAN: { ...baseRoles.OVERSEAS_GUARDIAN, bgTint: '#0f172a', textTint: '#cbd5e1' }
  },
  ...baseEmergency
};

export const lightTheme = {
  isDark: false,
  background: '#f8fafc', // Light slate background
  surface: '#ffffff', // Clean white cards
  surfaceLight: '#f1f5f9', // Slightly darker surface
  
  text: '#0f172a', // Dark slate text
  textLight: '#475569', // Muted dark text
  textMuted: '#94a3b8', 
  border: '#e2e8f0', // Light borders
  
  primary: '#0891b2', 
  secondary: '#3b82f6',
  
  roles: {
    PATIENT: { ...baseRoles.PATIENT, bgTint: '#cffafe', textTint: '#0891b2' },
    DOCTOR: { ...baseRoles.DOCTOR, bgTint: '#dbeafe', textTint: '#2563eb' },
    NURSE: { ...baseRoles.NURSE, bgTint: '#d1fae5', textTint: '#059669' },
    ADMIN: { ...baseRoles.ADMIN, bgTint: '#f3e8ff', textTint: '#9333ea' },
    VENDOR: { ...baseRoles.VENDOR, bgTint: '#ffedd5', textTint: '#ea580c' },
    PARAMEDIC: { ...baseRoles.PARAMEDIC, bgTint: '#ffe4e6', textTint: '#e11d48' },
    CAREGIVER: { ...baseRoles.CAREGIVER, bgTint: '#fef3c7', textTint: '#d97706' },
    LAB_TECH: { ...baseRoles.LAB_TECH, bgTint: '#e0e7ff', textTint: '#4f46e5' },
    PHARMACIST: { ...baseRoles.PHARMACIST, bgTint: '#ccfbf1', textTint: '#0d9488' },
    ELDER_HOME: { ...baseRoles.ELDER_HOME, bgTint: '#ffedd5', textTint: '#ea580c' },
    OVERSEAS_GUARDIAN: { ...baseRoles.OVERSEAS_GUARDIAN, bgTint: '#f1f5f9', textTint: '#475569' }
  },
  ...baseEmergency
};
