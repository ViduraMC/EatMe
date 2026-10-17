import type { TimelineStep } from '../components';
import type { TKey } from '../i18n';
import type { Formatters } from '../i18n/format';
import type { AssignmentStatus } from '../types/assignment';

interface AssignmentTimes {
  status: AssignmentStatus;
  assignedAt: string;
  respondedAt: string | null;
  pickupDonorConfirmedAt: string | null;
  pickupDriverConfirmedAt: string | null;
  dropoffDriverConfirmedAt: string | null;
  dropoffRecipientConfirmedAt?: string | null;
  completedAt: string | null;
}

type T = (key: TKey, params?: Record<string, string | number>) => string;

/**
 * A delivery's full journey, built from the assignment's own timestamps.
 *
 * The API also returns a ready-made timeline, but its event names are
 * English sentences. Building the steps here from the same fields lets them
 * be shown in the user's language, and lets the next expected step be shown
 * as "current" rather than simply missing.
 */
export function assignmentSteps(a: AssignmentTimes, t: T, f: Formatters): TimelineStep[] {
  const when = (iso: string | null | undefined) => (iso ? f.dayTime(iso) : undefined);
  const declined = a.status === 'declined';
  const cancelled = a.status === 'cancelled';

  const steps: TimelineStep[] = [
    {
      key: 'assigned',
      title: t('coordinator.stepAssigned'),
      subtitle: when(a.assignedAt),
      state: 'done',
    },
  ];

  if (declined) {
    steps.push({
      key: 'declined',
      title: t('coordinator.stepDeclined'),
      subtitle: when(a.respondedAt),
      state: 'failed',
    });
    return steps;
  }

  steps.push(
    a.respondedAt
      ? {
          key: 'accepted',
          title: t('coordinator.stepAccepted'),
          subtitle: when(a.respondedAt),
          state: 'done',
        }
      : {
          key: 'accepted',
          title: t('coordinator.stepWaitingDriver'),
          state: cancelled ? 'upcoming' : 'current',
          icon: 'hourglass-outline',
        },
  );

  const bothPickedUp = !!a.pickupDonorConfirmedAt && !!a.pickupDriverConfirmedAt;
  steps.push({
    key: 'donorPickup',
    title: t('coordinator.stepDonorPickup'),
    subtitle: when(a.pickupDonorConfirmedAt),
    state: a.pickupDonorConfirmedAt
      ? 'done'
      : a.respondedAt && !cancelled
        ? 'current'
        : 'upcoming',
  });
  steps.push({
    key: 'driverPickup',
    title: t('coordinator.stepDriverPickup'),
    subtitle: when(a.pickupDriverConfirmedAt),
    state: a.pickupDriverConfirmedAt
      ? 'done'
      : a.respondedAt && !cancelled
        ? 'current'
        : 'upcoming',
  });
  steps.push({
    key: 'dropoff',
    title: a.dropoffDriverConfirmedAt
      ? t('coordinator.stepDropoff')
      : t('coordinator.stepWaitingDropoff'),
    subtitle: when(a.dropoffDriverConfirmedAt),
    state: a.dropoffDriverConfirmedAt ? 'done' : bothPickedUp ? 'current' : 'upcoming',
    icon: 'mc:truck-fast-outline',
  });
  steps.push({
    key: 'completed',
    title: t('coordinator.stepCompleted'),
    subtitle: when(a.completedAt),
    state: a.status === 'completed' ? 'done' : 'upcoming',
    icon: 'mc:home-heart',
  });
  return steps;
}

/** Four-dot version for cards: assigned, accepted, picked up, delivered. */
export function compactSteps(a: AssignmentTimes): TimelineStep[] {
  const pickedUp = a.status === 'in_transit' || a.status === 'completed';
  return [
    { key: 'assigned', title: '', state: 'done' },
    {
      key: 'accepted',
      title: '',
      state: a.status === 'declined' ? 'failed' : a.respondedAt ? 'done' : 'current',
    },
    {
      key: 'pickup',
      title: '',
      state: pickedUp ? 'done' : a.status === 'accepted' ? 'current' : 'upcoming',
    },
    {
      key: 'delivered',
      title: '',
      state:
        a.status === 'completed'
          ? 'done'
          : a.status === 'in_transit'
            ? 'current'
            : 'upcoming',
    },
  ];
}
