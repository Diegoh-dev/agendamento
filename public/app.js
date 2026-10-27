const API = "/api/appointments";

const createForm = document.getElementById("create-form");
const filterForm = document.getElementById("filter-form");
const tbody = document.getElementById("appointments");
const messageBox = document.getElementById("message");

const MESSAGE_TIMEOUT_MS = 4000;
let messageTimer;

function showMessage(text, type) {
  clearTimeout(messageTimer);
  messageBox.textContent = text;
  messageBox.className = `message ${type}`;
  messageTimer = setTimeout(hideMessage, MESSAGE_TIMEOUT_MS);
}

function hideMessage() {
  clearTimeout(messageTimer);
  messageBox.textContent = "";
  messageBox.className = "message hidden";
}

function toIso(localValue) {
  return localValue ? new Date(localValue).toISOString() : undefined;
}

function toDateFilter(date, time) {
  if (!date) return undefined;
  return time ? toIso(`${date}T${time}`) : date;
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = data?.error?.message ?? `Erro ${response.status}`;
    throw new Error(`${response.status} - ${message}`);
  }

  return data;
}

function renderAppointments(appointments) {
  tbody.replaceChildren();

  if (appointments.length === 0) {
    const row = tbody.insertRow();
    const cell = row.insertCell();
    cell.colSpan = 6;
    cell.textContent = "Nenhum agendamento encontrado.";
    return;
  }

  for (const appointment of appointments) {
    const row = tbody.insertRow();

    const idCell = row.insertCell();
    idCell.className = "id";
    idCell.textContent = appointment.id;

    row.insertCell().textContent = appointment.patientName;
    row.insertCell().textContent = appointment.doctorName;
    row.insertCell().textContent = new Date(
      appointment.scheduledAt,
    ).toLocaleString("pt-BR");

    const statusCell = row.insertCell();
    statusCell.className = `status-${appointment.status}`;
    statusCell.textContent = appointment.status;

    const actionCell = row.insertCell();
    if (appointment.status === "ACTIVE") {
      const button = document.createElement("button");
      button.className = "danger";
      button.textContent = "Cancelar";
      button.addEventListener("click", () => cancelAppointment(appointment.id));
      actionCell.appendChild(button);
    }
  }
}

async function loadAppointments() {
  const formData = new FormData(filterForm);
  const params = new URLSearchParams();

  const doctor = formData.get("doctor").trim();
  const patient = formData.get("patient").trim();
  const fromDate = formData.get("fromDate");
  const fromTime = formData.get("fromTime");
  const toDate = formData.get("toDate");
  const toTime = formData.get("toTime");

  if ((fromTime && !fromDate) || (toTime && !toDate)) {
    showMessage("Informe a data para usar o filtro de hora.", "error");
    return;
  }

  const from = toDateFilter(fromDate, fromTime);
  const to = toDateFilter(toDate, toTime);

  if (doctor) params.set("doctor", doctor);
  if (patient) params.set("patient", patient);
  if (from) params.set("from", from);
  if (to) params.set("to", to);

  try {
    const appointments = await request(`${API}?${params}`);
    renderAppointments(appointments);
  } catch (error) {
    showMessage(error.message, "error");
  }
}

async function cancelAppointment(id) {
  try {
    await request(`${API}/${id}/cancel`, { method: "PATCH" });
    showMessage("Agendamento cancelado.", "success");
    await loadAppointments();
  } catch (error) {
    showMessage(error.message, "error");
  }
}

createForm.addEventListener("input", hideMessage);

createForm.addEventListener(
  "invalid",
  () => showMessage("Preencha todos os campos corretamente.", "error"),
  true,
);

createForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(createForm);
  const submitButton = createForm.querySelector("button[type=submit]");

  hideMessage();
  submitButton.disabled = true;

  try {
    await request(API, {
      method: "POST",
      body: JSON.stringify({
        patientName: formData.get("patientName"),
        doctorName: formData.get("doctorName"),
        scheduledAt: toIso(formData.get("scheduledAt")),
      }),
    });
    showMessage("Agendamento criado.", "success");
    createForm.reset();
    await loadAppointments();
  } catch (error) {
    showMessage(error.message, "error");
  } finally {
    submitButton.disabled = false;
  }
});

filterForm.addEventListener("submit", (event) => {
  event.preventDefault();
  loadAppointments();
});

filterForm.addEventListener("reset", () => {
  setTimeout(loadAppointments);
});

loadAppointments();
