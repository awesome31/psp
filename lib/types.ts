export type PatientCall = {
  id: string;
  status: string;
  summary: string | null;
  endedAt: string | null;
};

export type Patient = {
  id: string;
  name: string;
  phone: string;
  callType: string;
  scheduledAt: string;
  status: string;
  calls: PatientCall[];
};

export type CallRecord = {
  id: string;
  callType: string;
  status: string;
  summary: string | null;
  recordingUrl: string | null;
  structuredData: Record<string, unknown> | null;
  createdAt: string;
  endedAt: string | null;
  patient: { name: string; phone: string };
};
