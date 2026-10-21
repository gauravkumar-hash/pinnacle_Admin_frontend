// Configuration presets for different types of operating hours
interface TimeSelectionValues {
  start_time: string;
  end_time: string;
  cutoff_time?: number;
  max_bookings?: number;
  max_clinic_bookings?: number | null;
  max_corporate_bookings?: number | null;
  delivery_zones?: string;
  max_deliveries?: number;
  max_queue_size?: number;
  avg_service_time?: number;
  queue_cutoff?: number;
}

export interface TimeSelectionConfig {
  fields: {
    id: string
    label: string
    type: 'number' | 'text'
    required?: boolean
    min?: number
    max?: number
    defaultValue?: string | number | boolean
    help?: string
  }[]
  validation?: (values: TimeSelectionValues) => string | null
}

// Basic operating hours (just start and end time)
export const BASIC_CONFIG: TimeSelectionConfig = {
  fields: [],
  validation: (values) => {
    if (values.start_time >= values.end_time) {
      return 'End time must be after start time'
    }
    return null
  }
}

// Appointment operating hours (with cutoff time and max bookings)
export const APPOINTMENT_CONFIG: TimeSelectionConfig = {
  fields: [
    { 
      id: 'cutoff_time', 
      label: 'Cutoff Time (minutes)', 
      type: 'number', 
      min: 0, 
      max: 120, 
      defaultValue: 0,
      required: false
    },
    { 
      id: 'max_bookings', 
      label: 'Max Bookings', 
      type: 'number', 
      min: 1, 
      max: 100, 
      defaultValue: 1,
      required: true
    },
    {
      id: 'max_clinic_bookings',
      label: 'Max Clinic Patient Bookings',
      type: 'number',
      min: 0,
      max: 100,
      required: false,
      help: 'Per 15 min, for patients without a corporate code. Empty = no separate limit, 0 = clinic patients cannot book.'
    },
    {
      id: 'max_corporate_bookings',
      label: 'Max Corporate Patient Bookings',
      type: 'number',
      min: 0,
      max: 100,
      required: false,
      help: 'Per 15 min, for patients booking with a corporate code. Empty = no separate limit, 0 = corporate patients cannot book.'
    }
  ],
  validation: (values) => {
    if (values.start_time >= values.end_time) {
      return 'End time must be after start time'
    }
    if (!values.max_bookings || values.max_bookings < 1) {
      return 'Max bookings must be at least 1'
    }
    if (values.max_clinic_bookings != null && values.max_clinic_bookings > values.max_bookings) {
      return 'Max clinic patient bookings cannot be more than max bookings'
    }
    if (values.max_corporate_bookings != null && values.max_corporate_bookings > values.max_bookings) {
      return 'Max corporate patient bookings cannot be more than max bookings'
    }
    return null
  }
}

// Delivery operating hours (with delivery zones and capacity)
export const DELIVERY_CONFIG: TimeSelectionConfig = {
  fields: [
    { 
      id: 'delivery_zones', 
      label: 'Delivery Zones', 
      type: 'text', 
      defaultValue: '',
      required: false
    },
    { 
      id: 'max_deliveries', 
      label: 'Max Deliveries', 
      type: 'number', 
      min: 1, 
      max: 50, 
      defaultValue: 10,
      required: true
    },
    { 
      id: 'cutoff_time', 
      label: 'Order Cutoff (minutes)', 
      type: 'number', 
      min: 0, 
      max: 180, 
      defaultValue: 30,
      required: false
    }
  ],
  validation: (values) => {
    if (values.start_time >= values.end_time) {
      return 'End time must be after start time'
    }
    if (!values.max_deliveries || values.max_deliveries < 1) {
      return 'Max deliveries must be at least 1'
    }
    return null
  }
}

// Walk-in operating hours (with queue management)
export const WALKIN_CONFIG: TimeSelectionConfig = {
  fields: [
    { 
      id: 'max_queue_size', 
      label: 'Max Queue Size', 
      type: 'number', 
      min: 1, 
      max: 200, 
      defaultValue: 50,
      required: true
    },
    { 
      id: 'avg_service_time', 
      label: 'Avg Service Time (minutes)', 
      type: 'number', 
      min: 5, 
      max: 120, 
      defaultValue: 15,
      required: false
    },
    { 
      id: 'queue_cutoff', 
      label: 'Queue Cutoff (minutes before closing)', 
      type: 'number', 
      min: 0, 
      max: 120, 
      defaultValue: 30,
      required: false
    }
  ],
  validation: (values) => {
    if (values.start_time >= values.end_time) {
      return 'End time must be after start time'
    }
    if (!values.max_queue_size || values.max_queue_size < 1) {
      return 'Max queue size must be at least 1'
    }
    return null
  }
}

// Export default configurations
export const TIME_SELECTION_CONFIGS = {
  BASIC: BASIC_CONFIG,
  APPOINTMENT: APPOINTMENT_CONFIG,
  DELIVERY: DELIVERY_CONFIG,
  WALKIN: WALKIN_CONFIG
} as const

export type ConfigType = keyof typeof TIME_SELECTION_CONFIGS