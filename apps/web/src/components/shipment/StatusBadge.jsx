import { Badge } from '../ui';

const STATUS_CONFIG = {
  Created: { color: 'gray', label: 'Created' },
  Picked_Up: { color: 'blue', label: 'Picked Up' },
  At_Sorting_Facility: { color: 'purple', label: 'At Sorting' },
  In_Transit: { color: 'orange', label: 'In Transit' },
  Out_for_Delivery: { color: 'yellow', label: 'Out for Delivery' },
  Delivered: { color: 'green', label: 'Delivered' },
  Failed: { color: 'red', label: 'Failed' },
  Retry: { color: 'orange', label: 'Retry' },
  Returned: { color: 'gray', label: 'Returned' },
};

export default function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || { color: 'gray', label: status };
  return <Badge color={config.color}>{config.label}</Badge>;
}

export { STATUS_CONFIG };
