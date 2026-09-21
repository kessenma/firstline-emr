import React from 'react';
import Image from 'next/image';

type ExportData = {
  patient: any;
  medOrders: any[];
  rxOrders: any[];
  telegram: {
    chatId: string | null;
    messages: Array<{ text: string; sender: string; timestamp: string; type: string; mediaUrl?: string }>
  } | null;
  included?: {
    sections: string[];
    fields: string[];
  };
};

interface Props {
  data: ExportData | null;
  exportDateISO: string;
}

const SectionHeader: React.FC<{ title: string }> = ({ title }) => (
  <div className="mt-6 mb-2 border-b border-border pb-1">
    <h3 className="text-xl font-semibold">{title}</h3>
  </div>
);

const Row: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => (
  <div className="flex text-sm py-0.5">
    <span className="w-48 font-medium text-muted-foreground">{label}</span>
    <span className="flex-1">{value ?? '-'}</span>
  </div>
);

export const ExportPatientChartView: React.FC<Props> = ({ data, exportDateISO }) => {
  if (!data || !data.patient) {
    return (
      <div className="p-6">
        <h2 className="text-lg font-semibold">Preparing export…</h2>
      </div>
    );
  }

  const patient = data.patient;
  const patientName = `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Patient';
  const headerTitle = `${patientName} — Chart Export`;

  const defaultSections = ['patient', 'specialties', 'notes', 'medOrders', 'rxOrders', 'telegram', 'additional'];
  const defaultFields = [
    // Patient Details
    'name','dob','phone','city','country','language','hospital','priority','status','chiefComplaint','diagnosis','icd10','allergies','email',
    // Additional Details
    'genderPreference','previouslyRegistered','baselineAmbu','occupation','pmhx','pshx','famhx','smokeCount','drinkCount','otherDrugs','prevMeds','currentMeds','coordinatorId','triagedBy','doctor'
  ];
  const includedSections = Array.isArray(data.included?.sections) && data.included!.sections.length > 0 ? data.included!.sections : defaultSections;
  const includedFields = Array.isArray(data.included?.fields) && data.included!.fields.length > 0 ? data.included!.fields : defaultFields;
  const hasSection = (key: string) => includedSections.includes(key);
  const hasField = (key: string) => includedFields.includes(key);

  return (
    <div className="p-6 bg-background text-foreground">
      {/* Logo */}
      <div className="mb-4">
        <Image
          src="/assets/images/fajr-logo.svg"
          alt="Fajr MedFlow Logo"
          width={160}
          height={48}
          priority
          className="h-12 w-auto"
        />
      </div>
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold">{headerTitle}</h1>
        <div className="text-sm text-muted-foreground">Export date: {new Date(exportDateISO).toLocaleString()}</div>
      </div>

      {/* Patient Details */}
      {hasSection('patient') && (
        <>
          <SectionHeader title="Patient Details" />
          <div>
            {hasField('name') && <Row label="Name" value={patientName} />}
            {hasField('dob') && <Row label="DOB" value={patient.dob ? new Date(patient.dob).toLocaleDateString() : undefined} />}
            {hasField('phone') && <Row label="Phone" value={patient.phone ? `+${patient.phone.countryCode} ${patient.phone.phoneNumber}` : undefined} />}
            {hasField('city') && <Row label="City" value={patient.city} />}
            {hasField('country') && <Row label="Country" value={patient.country} />}
            {hasField('language') && <Row label="Language" value={patient.language} />}
            {hasField('hospital') && <Row label="Hospital" value={patient.hospital} />}
            {hasField('priority') && <Row label="Priority" value={patient.priority} />}
            {hasField('status') && <Row label="Status" value={patient.status} />}
            {hasField('chiefComplaint') && <Row label="Chief Complaint" value={patient.chiefComplaint} />}
            {hasField('diagnosis') && <Row label="Diagnosis" value={patient.diagnosis} />}
            {hasField('icd10') && <Row label="ICD10" value={patient.icd10} />}
            {hasField('allergies') && <Row label="Allergies" value={patient.allergies} />}
            {hasField('email') && <Row label="Email" value={patient.email} />}
          </div>
        </>
      )}

      {/* Specialties */}
      {hasSection('specialties') && (
        <>
          <SectionHeader title="Specialties" />
          <div>
            {Array.isArray(patient.specialties) && patient.specialties.length > 0 ? (
            <ul className="list-disc list-inside text-sm">
              {patient.specialties.map((s: string, idx: number) => (
                <li key={`${s}-${idx}`}>{s}</li>
              ))}
            </ul>
          ) : (
            <div className="text-sm text-muted-foreground">No specialties listed.</div>
          )}
          </div>
        </>
      )}

      {/* Notes */}
      {hasSection('notes') && (
        <>
          <SectionHeader title="Notes" />
          <div className="space-y-2">
            {(patient.notes || []).length === 0 && (
              <div className="text-sm text-muted-foreground">No notes available.</div>
            )}
            {(patient.notes || []).map((n: any) => (
              <div key={n._id || `${n.title}-${n.createdAt}`} className="border border-border rounded p-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{n.title || 'Note'}</span>
                  <span>{n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}</span>
                </div>
                <div className="text-sm text-foreground whitespace-pre-wrap">{n.note}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Med Orders */}
      {hasSection('medOrders') && (
        <>
          <SectionHeader title="Medication Orders" />
          <div className="space-y-2">
            {data.medOrders.length === 0 && <div className="text-sm text-muted-foreground">No medication orders.</div>}
            {data.medOrders.map((order: any) => (
              <div key={order._id} className="border border-border rounded p-2">
                <div className="text-xs text-muted-foreground">
                  <span>Prescribing Dr: {order.prescribingDr}</span>
                  {order.orderDate && <span className="ml-2">Date: {new Date(order.orderDate).toLocaleDateString()}</span>}
                </div>
                <ul className="list-disc list-inside text-sm">
                  {(order.medications || []).map((m: any, idx: number) => (
                    <li key={`${order._id}-${idx}`}>
                      <span className="font-medium">{m.medication}</span>
                      {m.dosage ? ` — ${m.dosage}` : ''}
                      {m.frequency ? ` — ${m.frequency}` : ''}
                      {m.diagnosis ? ` (${m.diagnosis})` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Rx Orders */}
      {hasSection('rxOrders') && (
        <>
          <SectionHeader title="Rx Orders" />
          <div className="space-y-2">
            {data.rxOrders.length === 0 && <div className="text-sm text-muted-foreground">No Rx orders.</div>}
            {data.rxOrders.map((rx: any) => (
              <div key={rx._id || rx.rxOrderId} className="border border-border rounded p-2">
                <div className="text-xs text-muted-foreground">
                  <span>Prescribing Dr: {rx.prescribingDr}</span>
                  {rx.prescribedDate && <span className="ml-2">Date: {new Date(rx.prescribedDate).toLocaleDateString()}</span>}
                  {rx.validTill && <span className="ml-2">Valid Till: {new Date(rx.validTill).toLocaleDateString()}</span>}
                </div>
                <ul className="list-disc list-inside text-sm">
                  {(rx.prescriptions || []).map((p: any, idx: number) => (
                    <li key={`${rx._id || rx.rxOrderId}-${idx}`}>
                      <span className="font-medium">{p.medication}</span>
                      {p.dosage ? ` — ${p.dosage}` : ''}
                      {p.frequency ? ` — ${p.frequency}` : ''}
                      {p.diagnosis ? ` (${p.diagnosis})` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Telegram Messages */}
      {hasSection('telegram') && (
        <>
          <SectionHeader title="Telegram Messages" />
          <div className="space-y-2">
            {!data.telegram && <div className="text-sm text-muted-foreground">No linked Telegram thread.</div>}
            {data.telegram && (
              <div>
                <div className="text-xs text-muted-foreground mb-1">Chat ID: {data.telegram.chatId || 'N/A'}</div>
                <div className="space-y-1">
                  {data.telegram.messages.length === 0 && (
                    <div className="text-sm text-muted-foreground">No messages.</div>
                  )}
                  {data.telegram.messages.map((m, idx) => (
                    <div key={`${m.timestamp}-${idx}`} className="border border-border rounded p-2">
                      <div className="text-xs text-muted-foreground flex justify-between">
                        <span>{m.sender}</span>
                        <span>{new Date(m.timestamp).toLocaleString()}</span>
                      </div>
                      <div className="text-sm text-foreground whitespace-pre-wrap">{m.text || (m.mediaUrl ? '(media)' : '')}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Additional Details */}
      {hasSection('additional') && (
        <>
          <SectionHeader title="Additional Details" />
          <div>
            {hasField('genderPreference') && <Row label="Gender Preference" value={patient.genderPreference} />}
            {hasField('previouslyRegistered') && <Row label="Previously Registered" value={patient.previouslyRegistered} />}
            {hasField('baselineAmbu') && <Row label="Baseline Ambulatory" value={patient.baselineAmbu} />}
            {hasField('occupation') && <Row label="Occupation" value={patient.occupation} />}
            {hasField('pmhx') && <Row label="PMHx" value={patient.pmhx} />}
            {hasField('pshx') && <Row label="PSHx" value={patient.pshx} />}
            {hasField('famhx') && <Row label="Family Hx" value={patient.famhx} />}
            {hasField('smokeCount') && <Row label="Smoke Count" value={patient.smokeCount} />}
            {hasField('drinkCount') && <Row label="Drink Count" value={patient.drinkCount} />}
            {hasField('otherDrugs') && <Row label="Other Drugs" value={patient.otherDrugs} />}
            {hasField('prevMeds') && <Row label="Previous Meds" value={patient.prevMeds} />}
            {hasField('currentMeds') && <Row label="Current Meds" value={patient.currentMeds} />}
            {hasField('coordinatorId') && <Row label="Coordinator" value={patient.coordinatorId ? String(patient.coordinatorId) : undefined} />}
            {hasField('triagedBy') && <Row label="Triaged By" value={patient.triagedBy ? `${patient.triagedBy.firstName || ''} ${patient.triagedBy.lastName || ''}`.trim() : undefined} />}
            {hasField('careTeam') && <Row label="Doctor" value={(() => { const lead = patient.careTeam?.find((m: any) => m.isLead && m.role === 'surgeon'); return lead ? `${lead.firstName || ''} ${lead.lastName || ''}`.trim() : undefined; })()} />}
          </div>
        </>
      )}
    </div>
  );
};

export default ExportPatientChartView;
