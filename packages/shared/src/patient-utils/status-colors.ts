/** Get status badge color based on patient status */
export const getStatusColor = (
  status: string,
): { background: string; text: string } => {
  switch (status?.toLowerCase()) {
    case 'not started':
      return { background: '#F3F4F6', text: '#374151' };
    case 'in progress':
      return { background: '#DBEAFE', text: '#1E40AF' };
    case 'completed':
      return { background: '#D1FAE5', text: '#065F46' };
    case 'urgent':
      return { background: '#FEE2E2', text: '#991B1B' };
    default:
      return { background: '#F3F4F6', text: '#374151' };
  }
};

/** Get priority badge color based on patient priority (DB-canonical values) */
export const getPriorityColor = (
  priority: string,
): { background: string; text: string } => {
  switch (priority?.toLowerCase()) {
    case 'emergency':
      return { background: '#FEE2E2', text: '#991B1B' };
    case 'urgent':
      return { background: '#FFEDD5', text: '#9A3412' };
    case 'moderate':
      return { background: '#FEF3C7', text: '#92400E' };
    case 'routine':
      return { background: '#D1FAE5', text: '#065F46' };
    default:
      return { background: '#F3F4F6', text: '#374151' };
  }
};
