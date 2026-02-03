export interface Notification {
  id: number;
  user: number;
  notification_type: 'shift_created' | 'shift_updated' | 'shift_deleted' | 'vacation_approved' | 'vacation_rejected' | 'vacation_request';
  title: string;
  message: string;
  is_read: boolean;
  is_emailed: boolean;
  related_shift?: number | null;
  related_vacation?: number | null;
  created_at: string;
}

export interface Holiday {
  id: number;
  organization: number;
  name: string;
  date: string;
  is_recurring: boolean;
  description?: string;
  created_at: string;
}
