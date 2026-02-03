export type EventType = 'meeting' | 'training' | 'project' | 'company' | 'other';

export interface Event {
  id: number;
  organization: number;
  title: string;
  description?: string;
  event_type: EventType;
  start_datetime: string;
  end_datetime: string;
  location?: string;
  is_all_day: boolean;
  editable_by_attendees: boolean;
  attendees: number[];
  attendees_details?: any[];
  created_by: number;
  created_by_details?: any;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
}

export interface EventFormData {
  title: string;
  description?: string;
  event_type: EventType;
  start_datetime: string;
  end_datetime: string;
  location?: string;
  is_all_day: boolean;
  attendees: number[];
}
