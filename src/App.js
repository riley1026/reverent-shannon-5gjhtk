import { useState } from "react";

const TYPO_SCENARIOS = {
  typo_crm_yes: {
    label: "Typo + number verified in CRM",
    method: "No call needed — fix directly",
    color: "#1D9E75",
    bg: "#E1F5EE",
    steps: [
      { id: "crm_verify", text: "Confirm the corrected number matches what is in their CRM profile" },
      { id: "make_change", text: "Make the phone number correction" },
    ],
  },
  typo_crm_no: {
    label: "Typo + number NOT in CRM",
    method: "Message thread verification (no call needed)",
    color: "#185FA5",
    bg: "#E6F1FB",
    steps: [
      { id: "email_match", text: "Confirm request is from the same email/user tied to their Applause profile" },
      { id: "dob", text: "Verify date of birth" },
      { id: "ssn4", text: "Verify last 4 of social" },
      { id: "make_change", text: "Make the phone number correction" },
    ],
  },
};

const FULL_SCENARIOS = {
  kyc_yes_crm_yes: {
    label: "KYC verified + number matches CRM",
    method: "Message thread verification (no call needed)",
    color: "#1D9E75",
    bg: "#E1F5EE",
    steps: [
      { id: "email_match", text: "Confirm request is from the same email/user tied to their Applause profile" },
      { id: "call_original", text: "Attempt call to original number on file — listen for 'not in service' message or voicemail name mismatch" },
      { id: "crm_verify", text: "Verify new number is already updated in CRM profile" },
      { id: "dob", text: "Verify date of birth" },
      { id: "ssn4", text: "Verify last 4 of social" },
      { id: "current_phone", text: "Verify current phone number on account" },
    ],
  },
  kyc_yes_crm_no: {
    label: "KYC verified + number NOT in CRM",
    method: "Phone call verification",
    color: "#185FA5",
    bg: "#E6F1FB",
    steps: [
      { id: "email_match", text: "Confirm request is from the same email/user tied to their Applause profile" },
      { id: "call_original", text: "Attempt call to original number on file — listen for 'not in service' or voicemail name" },
      { id: "current_phone", text: "On call: verify current number on account" },
      { id: "dob", text: "On call: verify date of birth" },
      { id: "ssn4", text: "On call: verify last 4 of social" },
      { id: "address", text: "On call: verify address" },
      { id: "recent3", text: "On call: name 3 recently serviced customers (not the one who submitted the request)" },
    ],
  },
  kyc_no_employee: {
    label: "No KYC + employee role account",
    method: "Phone call verification",
    color: "#BA7517",
    bg: "#FAEEDA",
    steps: [
      { id: "email_match", text: "Confirm request is from the same email/user tied to their Applause profile" },
      { id: "call_original", text: "Attempt call to original number on file — listen for 'not in service' or voicemail name" },
      { id: "current_phone", text: "On call: verify current number on account" },
      { id: "recent3", text: "On call: name 3 recently serviced customers (not the one who submitted the request)" },
    ],
  },
  kyc_no_standard: {
    label: "No KYC + standard account",
    method: "Phone call + double verification",
    color: "#A32D2D",
    bg: "#FCEBEB",
    steps: [
      { id: "email_match", text: "Confirm request is from the same email/user tied to their Applause profile" },
      { id: "call_original", text: "Attempt call to original number on file — listen for 'not in service' or voicemail name" },
      { id: "current_phone", text: "On call: verify current number on account" },
      { id: "recent3", text: "On call: name 3 recently serviced customers (not the one who submitted the request)" },
      { id: "account_review", text: "Review account: note creation date, balance, and any suspicious activity" },
      { id: "double_check", text: "Apply double verification — consider calling their office or requesting admin confirmation" },
    ],
  },
};

const ROADBLOCKS = [
  {
    id: "admin_requesting",
    title: "Admin is requesting on behalf of user",
    content: "The account belongs to the tech, not the admin or company. The service worker must confirm the change directly. Copy the service worker's email from their Applause account into the thread. If they push back: explain that Applause accounts hold access to money — number changes require compliance verification.",
  },
  {
    id: "third_party",
    title: "Need third-party verification (office call)",
    content: `Call the user's company office directly.\n\nScript: "This is [your name] with Applause and I'm helping [user's first name] with an account update. For the security of their account, I need to verify their phone number — can you confirm the last 4 digits of their number?"\n\nFollow-up: "Thank you, we have the area code as (XXX) for that number — is that right?"`,
  },
  {
    id: "suspicious",
    title: "Something feels off / potential fraud",
    content: "Before proceeding: review account creation date, current balance, and recent activity. If anything looks suspicious, do not make the change. Escalate internally before proceeding. When in doubt, slow is better than fast.",
  },
];

const allStepKeys = () => {
  const keys = {};
  [...Object.entries(TYPO_SCENARIOS), ...Object.entries(FULL_SCENARIOS)].forEach(([k, v]) => {
    v.steps.forEach(s => { keys[`${k}_${s.id}`] = false; });
  });
  return keys;
};

export default function App() {
  const [changeType, setChangeType] = useState(null); // "typo" | "full"
  const [scenario, setScenario] = useState(null);
  const [checked, setChecked] = useState(allStepKeys());
  const [notes, setNotes] = useState("");
  const [repName, setRepName] = useState("");
  const [ticketId, setTicketId] = useState("");
  const [userName, setUserName] = useState("");
  const [copied, setCopied] = useState(false);
  const [openRoadblock, setOpenRoadblock] = useState(null);
  const [editingStep, setEditingStep] = useState(null);
  const [stepEdits, setStepEdits] = useState({});

  const scenarioMap = changeType === "typo" ? TYPO_SCENARIOS : FULL_SCENARIOS;
  const s = scenario ? scenarioMap[scenario] : null;

  const toggle = (key) => setChecked(p => ({ ...p, [key]: !p[key] }));
  const completedCount = s ? s.steps.filter(st => checked[`${scenario}_${st.id}`]).length : 0;
  const totalCount = s ? s.steps.length : 0;
  const getStepText = (scenarioKey, stepId, fallback) => stepEdits[`${scenarioKey}_${stepId}`] ?? fallback;

  const handleChangeType = (type) => {
    setChangeType(type);
    setScenario(null);
  };

  const handleCopy = () => {
    if (!s) return;
    const typeLabel = changeType === "typo" ? "Obvious typo correction" : "Complete number change";
    const lines = [
      `Phone Number Update Verification`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `Rep: ${repName || "—"}`,
      `Ticket ID: ${ticketId || "—"}`,
      `User: ${userName || "—"}`,
      `Date: ${new Date().toLocaleDateString()}`,
      `Change type: ${typeLabel}`,
      `Scenario: ${s.label}`,
      `Method: ${s.method}`,
      ``,
      `Verification Steps:`,
      ...s.steps.map((st, i) => {
        const done = checked[`${scenario}_${st.id}`];
        const txt = getStepText(scenario, st.id, st.text);
        return `${done ? "[x]" : "[ ]"} ${i + 1}. ${txt}`;
      }),
      ``,
      `Progress: ${completedCount}/${totalCount} steps completed`,
      notes ? `\nNotes:\n${notes}` : "",
    ];
    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const reset = () => {
    setChangeType(null);
    setScenario(null);
    setChecked(allStepKeys());
    setNotes("");
    setRepName("");
    setTicketId("");
    setUserName("");
    setOpenRoadblock(null);
    setEditingStep(null);
  };

  return (
    <div style={{ fontFamily: "var(--font-sans)", maxWidth: 680, margin: "0 auto", padding: "1.5rem 1rem 3rem" }}>

      <div style={{ marginBottom: "1.5rem" }}>
        <p style={{ fontSize: 20, fontWeight: 500, margin: "0 0 4px", color: "var(--color-text-primary)" }}>Phone number update</p>
        <p style={{ fontSize: 14, color: "var(--color-text-secondary)", margin: 0 }}>Verification checklist — follow each step before making any changes</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: "1.5rem" }}>
        {[
          { id: "repName", label: "Rep name", val: repName, set: setRepName },
          { id: "ticketId", label: "Ticket / case ID", val: ticketId, set: setTicketId },
          { id: "userName", label: "User name", val: userName, set: setUserName },
        ].map(f => (
          <div key={f.id}>
            <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>{f.label}</label>
            <input value={f.val} onChange={e => f.set(e.target.value)} placeholder="—" style={{ width: "100%", boxSizing: "border-box", fontSize: 14 }} />
          </div>
        ))}
      </div>

      {/* Step 1: Change type */}
      <div style={{ marginBottom: "1.5rem" }}>
        <p style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>
          Step 1 — What type of change is this?
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {[
            { key: "typo", label: "Obvious typo", desc: "e.g. one digit is clearly wrong", color: "#1D9E75", bg: "#E1F5EE" },
            { key: "full", label: "Complete number change", desc: "Entirely new number", color: "#185FA5", bg: "#E6F1FB" },
          ].map(opt => (
            <button key={opt.key} onClick={() => handleChangeType(opt.key)} style={{
              textAlign: "left", padding: "10px 14px",
              borderRadius: "var(--border-radius-md)",
              border: changeType === opt.key ? `2px solid ${opt.color}` : "0.5px solid var(--color-border-tertiary)",
              background: changeType === opt.key ? opt.bg : "var(--color-background-primary)",
              cursor: "pointer",
            }}>
              <p style={{ fontSize: 13, fontWeight: 500, margin: 0, color: changeType === opt.key ? opt.color : "var(--color-text-primary)" }}>{opt.label}</p>
              <p style={{ fontSize: 12, margin: "2px 0 0", color: "var(--color-text-secondary)" }}>{opt.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Step 2: Scenario */}
      {changeType && (
        <div style={{ marginBottom: "1.5rem" }}>
          <p style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Step 2 — Select the scenario
          </p>
          <div style={{ display: "grid", gridTemplateColumns: changeType === "typo" ? "1fr 1fr" : "1fr 1fr", gap: 8 }}>
            {Object.entries(scenarioMap).map(([key, val]) => (
              <button key={key} onClick={() => setScenario(key)} style={{
                textAlign: "left", padding: "10px 14px",
                borderRadius: "var(--border-radius-md)",
                border: scenario === key ? `2px solid ${val.color}` : "0.5px solid var(--color-border-tertiary)",
                background: scenario === key ? val.bg : "var(--color-background-primary)",
                cursor: "pointer",
              }}>
                <p style={{ fontSize: 13, fontWeight: 500, margin: 0, color: scenario === key ? val.color : "var(--color-text-primary)" }}>{val.label}</p>
                <p style={{ fontSize: 12, margin: "2px 0 0", color: "var(--color-text-secondary)" }}>{val.method}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Checklist */}
      {s && (
        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <p style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-secondary)", margin: 0, textTransform: "uppercase", letterSpacing: "0.04em" }}>Verification steps</p>
            <span style={{ fontSize: 13, color: completedCount === totalCount ? "#1D9E75" : "var(--color-text-secondary)", fontWeight: 500 }}>
              {completedCount}/{totalCount} complete
            </span>
          </div>
          <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", overflow: "hidden" }}>
            {s.steps.map((st, i) => {
              const key = `${scenario}_${st.id}`;
              const done = checked[key];
              const isEditing = editingStep === key;
              const text = getStepText(scenario, st.id, st.text);
              return (
                <div key={st.id} style={{
                  display: "flex", alignItems: "flex-start", gap: 12,
                  padding: "12px 16px",
                  borderBottom: i < s.steps.length - 1 ? "0.5px solid var(--color-border-tertiary)" : "none",
                  background: done ? "var(--color-background-secondary)" : "var(--color-background-primary)",
                  transition: "background 0.15s",
                }}>
                  <input type="checkbox" checked={done} onChange={() => toggle(key)}
                    style={{ marginTop: 3, flexShrink: 0, cursor: "pointer", width: 16, height: 16 }} />
                  <div style={{ flex: 1 }}>
                    {isEditing ? (
                      <textarea autoFocus value={text}
                        onChange={e => setStepEdits(p => ({ ...p, [key]: e.target.value }))}
                        onBlur={() => setEditingStep(null)}
                        style={{ width: "100%", fontSize: 14, padding: "4px 6px", borderRadius: 4, border: "0.5px solid var(--color-border-secondary)", resize: "vertical", minHeight: 60, fontFamily: "var(--font-sans)", boxSizing: "border-box" }} />
                    ) : (
                      <p style={{ margin: 0, fontSize: 14, color: done ? "var(--color-text-secondary)" : "var(--color-text-primary)", textDecoration: done ? "line-through" : "none", cursor: "text" }}
                        onDoubleClick={() => setEditingStep(key)} title="Double-click to edit">
                        <span style={{ color: "var(--color-text-secondary)", marginRight: 6, fontWeight: 500 }}>{i + 1}.</span>
                        {text}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <p style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 6 }}>Double-click any step to edit it for this session.</p>
        </div>
      )}

      {/* Roadblocks */}
      <div style={{ marginBottom: "1.5rem" }}>
        <p style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>Roadblocks & edge cases</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {ROADBLOCKS.map(rb => (
            <div key={rb.id} style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", overflow: "hidden" }}>
              <button onClick={() => setOpenRoadblock(openRoadblock === rb.id ? null : rb.id)}
                style={{ width: "100%", textAlign: "left", padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--color-background-primary)", border: "none", cursor: "pointer" }}>
                <span style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)" }}>{rb.title}</span>
                <span style={{ fontSize: 16, color: "var(--color-text-secondary)", transform: openRoadblock === rb.id ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>▾</span>
              </button>
              {openRoadblock === rb.id && (
                <div style={{ padding: "0 14px 14px", background: "var(--color-background-secondary)" }}>
                  <p style={{ fontSize: 14, color: "var(--color-text-primary)", margin: 0, whiteSpace: "pre-line", lineHeight: 1.6 }}>{rb.content}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div style={{ marginBottom: "1.5rem" }}>
        <label style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-secondary)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>Notes</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="Any additional context, observations, or follow-up items..."
          style={{ width: "100%", minHeight: 80, fontSize: 14, padding: "10px 12px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-tertiary)", fontFamily: "var(--font-sans)", resize: "vertical", boxSizing: "border-box", background: "var(--color-background-primary)", color: "var(--color-text-primary)" }} />
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={handleCopy} disabled={!scenario}
          style={{ flex: 1, padding: "10px 0", fontSize: 14, fontWeight: 500, borderRadius: "var(--border-radius-md)", cursor: scenario ? "pointer" : "not-allowed", opacity: scenario ? 1 : 0.4, background: copied ? "#E1F5EE" : "var(--color-background-primary)", color: copied ? "#1D9E75" : "var(--color-text-primary)", border: `0.5px solid ${copied ? "#1D9E75" : "var(--color-border-secondary)"}` }}>
          {copied ? "Copied to clipboard" : "Copy for ticket / CRM"}
        </button>
        <button onClick={reset}
          style={{ padding: "10px 20px", fontSize: 14, borderRadius: "var(--border-radius-md)", cursor: "pointer", background: "var(--color-background-primary)", color: "var(--color-text-secondary)", border: "0.5px solid var(--color-border-tertiary)" }}>
          Reset
        </button>
      </div>
    </div>
  );
}