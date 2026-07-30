import { APPLICATION_STATUS_CONFIG } from '../lib/constants';
import type { ApplicationStatus } from '../lib/types';

interface Props {
  status: ApplicationStatus;
  size?: 'sm' | 'md';
}

export default function ApplicationStatusBadge({ status, size = 'md' }: Props) {
  const cfg = APPLICATION_STATUS_CONFIG[status] ?? APPLICATION_STATUS_CONFIG.draft;
  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full border ${cfg.color} ${cfg.bg} ${cfg.border} ${
        size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1'
      }`}
    >
      {cfg.label}
    </span>
  );
}
