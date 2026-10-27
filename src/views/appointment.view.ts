export type AppointmentRecord = {
  id: string;
  patientName: string;
  doctorName: string;
  scheduledAt: Date;
  status: "ACTIVE" | "CANCELLED";
};

export function toAppointmentResponse(appointment: AppointmentRecord) {
  return {
    id: appointment.id,
    patientName: appointment.patientName,
    doctorName: appointment.doctorName,
    scheduledAt: appointment.scheduledAt.toISOString(),
    status: appointment.status,
  };
}
