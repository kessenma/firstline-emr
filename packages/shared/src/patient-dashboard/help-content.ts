/**
 * In-product explanation of the dashboard's visibility and access rules.
 *
 * These rules are not discoverable from the UI — the original confusion was a
 * doctor who created a patient and could not find them, because the dashboard
 * silently hid untriaged patients. Both platforms render these sections so the
 * copy cannot drift.
 */

export interface HelpSection {
  id: string;
  title: string;
  bullets: string[];
}

export type DashboardHelpView =
  | 'dashboard'
  | 'follow-ups'
  | 'unassigned-specialty';

function whoSeesWhat(isDoctor: boolean): HelpSection {
  return {
    id: 'visibility',
    title: 'Who sees what',
    bullets: [
      'Everyone sees every patient on their mission at the dashboard level — nothing is hidden from this list.',
      isDoctor
        ? 'That includes patients outside your specialty, and patients nobody has triaged yet.'
        : 'Triage sees every patient on the mission, including ones not yet assigned a specialty.',
      'Use the filters to narrow the list; the badge on the filter button counts how many are active.',
    ],
  };
}

function openingACharter(isDoctor: boolean): HelpSection {
  return {
    id: 'chart-access',
    title: 'Opening a patient chart',
    bullets: isDoctor
      ? [
          'You can open charts for patients in your specialty, or any patient whose care team you are already on.',
          'For anyone else, you will be asked to join the care team first — pick a role and the chart opens.',
          'Joining is what records that you accessed the chart, so there is a clear trail.',
        ]
      : [
          'You can open any chart for a patient on your mission — you are never asked to join first.',
          'Doctors are different: they can open charts in their specialty, and are asked to join the care team for anyone else.',
        ],
  };
}

function careTeam(isTriage: boolean): HelpSection {
  return {
    id: 'care-team',
    title: 'Care team',
    bullets: [
      'A patient can have several people on their care team, and one of them is the lead.',
      isTriage
        ? 'You are added automatically the first time you set a patient’s specialty, status or priority — that record is what shows who triaged them.'
        : 'Triage members are added automatically when they set a patient’s specialty, status or priority.',
      'Doctors join explicitly, choosing a role when they do.',
    ],
  };
}

const MANUAL_PATIENTS: HelpSection = {
  id: 'manual-patients',
  title: 'Manually added patients',
  bullets: [
    'Patients created with the Create Patient form appear on the dashboard like any other.',
    'They have no Telegram conversation yet, so there are no messages to read.',
    'Their Messaging tab shows a link code instead — send that to the patient and, once they use it, messaging works exactly as it does for patients who arrived via the bot.',
  ],
};

const FILTERS: HelpSection = {
  id: 'filters',
  title: 'Filters',
  bullets: [
    'View switches between Active, Discharged and All patients.',
    'Care Team narrows to your own cases, or the ones you lead.',
    'Missions, Priority, Status, Specialty and Hospital narrow the list further.',
    'Advanced toggles cover follow-ups, unassigned specialty, Telegram-only and care-team conflicts.',
    'Clear all resets every filter back to the default view.',
  ],
};

const FOLLOW_UPS: HelpSection = {
  id: 'follow-ups',
  title: 'About follow-ups',
  bullets: [
    'This view shows patient follow-ups sent from the Telegram bot.',
    'You can see when each follow-up was sent and what it contained.',
  ],
};

const UNASSIGNED_SPECIALTY: HelpSection = {
  id: 'unassigned-specialty',
  title: 'About unassigned specialty',
  bullets: [
    'These patients have been assigned to a specialty that currently has no available doctors.',
    'Assigning a doctor to that specialty, or changing the patient’s specialty, removes them from this view.',
  ],
};

export function getDashboardHelpSections(
  accountType?: string | null,
  view: DashboardHelpView = 'dashboard',
): HelpSection[] {
  if (view === 'follow-ups') return [FOLLOW_UPS, FILTERS];
  if (view === 'unassigned-specialty') return [UNASSIGNED_SPECIALTY, FILTERS];

  const isDoctor = accountType === 'Doctor';
  const isTriage = accountType === 'Triage';

  return [
    whoSeesWhat(isDoctor),
    openingACharter(isDoctor),
    careTeam(isTriage),
    MANUAL_PATIENTS,
    FILTERS,
  ];
}

export function getDashboardHelpTitle(view: DashboardHelpView = 'dashboard'): string {
  if (view === 'follow-ups') return 'About Follow-Ups';
  if (view === 'unassigned-specialty') return 'About Unassigned Specialty';
  return 'How this dashboard works';
}
