import React from 'react';

type ViewKey = 'hub' | 'podcast' | 'coflow' | 'workshops' | 'revenue' | 'well' | 'team';

const viewCopy: Record<ViewKey, { eyebrow: string; description: string; next: string }> = {
  hub: { eyebrow: 'The shared landing place', description: 'A clear read on what is moving through the well this week.', next: 'Notice what wants attention first.' },
  podcast: { eyebrow: 'Ideas in motion', description: 'Topics, guests, and episodes gathered before they become a finished offering.', next: 'Choose the conversation that wants tending.' },
  coflow: { eyebrow: 'Relational timing', description: 'Careful coordination for invitations, check-ins, and the next right shared moment.', next: 'Protect consent before creating contact.' },
  workshops: { eyebrow: 'Practice made shareable', description: 'Workshops, applicants, and feedback held as living containers for collective learning.', next: 'Tend the container that is ready to open.' },
  revenue: { eyebrow: 'The Source', description: 'Resource movement held with care, clarity, and shared structure.', next: 'Open the next channel that wants tending.' },
  well: { eyebrow: 'A place to pause, see, and choose', description: 'Decisions held in view so clarity can arrive without forcing the river.', next: 'Name the smallest useful response.' },
  team: { eyebrow: 'Conditions for flow', description: 'A calm read on what is connected, fresh, and ready for a gentle tending move.', next: 'Keep the system legible, not busy.' },
};

interface Props { view: ViewKey; }

export function DashboardViewIntro({ view }: Props) {
  const copy = viewCopy[view];
  return (
    <section className="dashboard-view-intro" data-testid={`view-intro-${view}`}>
      <div>
        <p className="dashboard-view-eyebrow">{copy.eyebrow}</p>
        <p className="dashboard-view-description">{copy.description}</p>
      </div>
      <div className="dashboard-view-next"><span>Next right move</span><strong>{copy.next}</strong></div>
    </section>
  );
}
