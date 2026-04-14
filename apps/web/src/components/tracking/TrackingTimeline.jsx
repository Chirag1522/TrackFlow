import { format } from 'date-fns';
import { CheckCircle, Circle, AlertCircle } from 'lucide-react';
import StatusBadge from '../shipment/StatusBadge';

const getIcon = (status) => {
  if (status === 'Delivered') return <CheckCircle className="text-green-500" size={20} />;
  if (status === 'Failed' || status === 'Returned') return <AlertCircle className="text-red-500" size={20} />;
  return <Circle className="text-orange-500" size={20} />;
};

export default function TrackingTimeline({ events }) {
  if (!events?.length) return <p className="text-gray-400 text-sm">No events yet.</p>;

  return (
    <div className="flow-root">
      <ol className="space-y-4">
        {events.map((event, idx) => (
          <li key={event.id} className="relative pl-10">
            {idx < events.length - 1 && (
              <span className="absolute left-[9px] top-8 h-[calc(100%+12px)] w-0.5 bg-gray-200" />
            )}

            <div className="absolute left-0 top-1">{getIcon(event.status)}</div>

            <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <StatusBadge status={event.status} />
                <time className="text-xs text-gray-400">
                  {format(new Date(event.created_at), 'MMM d, yyyy h:mm a')}
                </time>
              </div>

              {event.location && <p className="mt-2 text-sm text-gray-700">{event.location}</p>}
              {event.note && <p className="mt-1 text-sm text-gray-500">{event.note}</p>}

              {event.proof_image_url && (
                <a href={event.proof_image_url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block">
                  <img
                    src={event.proof_image_url}
                    alt="Proof of delivery"
                    className="h-24 w-auto rounded-lg border border-gray-200 object-cover"
                  />
                </a>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
