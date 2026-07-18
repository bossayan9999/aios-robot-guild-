import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { agents, providers } from "./data";
import type {
  AgentId,
  AuthStatus,
  DeploymentHealth,
  DeviceDiagnostics,
  ForgeProfile,
  KnowledgeHit,
  Mission,
  MissionEvent,
  ReleaseCenterStatus,
  ReleaseEvent,
  ReleaseProposal,
  SecurityLabStatus,
} from "./types";
import {
  startAuthentication,
  startRegistration,
} from "@simplewebauthn/browser";
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser";
import { CCNANetworkLab } from "./CCNANetworkLab";
import { GuildCommandCenter } from "./GuildCommandCenter";
import { ForgeGrowthCenter } from "./ForgeGrowthCenter";

const RobotFactory = lazy(() =>
  import("./RobotFactory").then((module) => ({ default: module.RobotFactory })),
);

type Tab =
  | "guild"
  | "quest"
  | "missions"
  | "studio"
  | "forge"
  | "devices"
  | "network"
  | "lab"
  | "ops"
  | "updates"
  | "models"
  | "knowledge"
  | "settings";
type Theme = "mission" | "warm" | "slate";
type CopilotMessage = {
  role: "user" | "copilot";
  text: string;
  citations?: KnowledgeHit[];
};
type PasskeySummary = {
  id: string;
  name: string;
  device_type: string;
  backed_up: number;
  created_at: string;
  last_used_at?: string;
};
const UI_BUILD = "2026.07.18-hall2";

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  onresult:
    | ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void)
    | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

const demoEvents: MissionEvent[] = [
  {
    agent: "router",
    event_type: "scope",
    message: "Repository URL validated and public metadata collected.",
    progress: 20,
  },
  {
    agent: "planner",
    event_type: "plan",
    message: "Read-only checks mapped. No write action is authorized.",
    progress: 40,
  },
  {
    agent: "builder",
    event_type: "inventory",
    message: "Root files and project signals recorded as evidence.",
    progress: 60,
  },
  {
    agent: "tester",
    event_type: "quality",
    message: "Security and build-readiness checks summarized.",
    progress: 80,
  },
  {
    agent: "reviewer",
    event_type: "gate",
    message: "Human review required before implementation work.",
    progress: 100,
  },
];

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const requestId = response.headers.get("X-Request-ID");
    throw new Error(
      `${body.error || body.detail || `Request failed (${response.status})`}${requestId ? ` • Request ${requestId}` : ""}`,
    );
  }
  return body as T;
}

export function App() {
  const [tab, setTab] = useState<Tab>("guild");
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem("aios-theme") as Theme) || "mission",
  );
  const [activeAgent, setActiveAgent] = useState<AgentId | null>("router");
  const [progress, setProgress] = useState(0);
  const [xp, setXp] = useState(() =>
    Number(localStorage.getItem("aios-xp") || 120),
  );
  const [auth, setAuth] = useState<AuthStatus | null>(null);
  const [authMode, setAuthMode] = useState<"setup" | "login">("login");
  const [authError, setAuthError] = useState("");
  const [demoMode, setDemoMode] = useState(false);
  const [mission, setMission] = useState<Mission | null>(null);
  const [events, setEvents] = useState<MissionEvent[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [goal, setGoal] = useState(
    "Inspect repository health and collect evidence",
  );
  const [repository, setRepository] = useState(
    "https://github.com/bossayan9999/aios-robot-guild-",
  );
  const [modelSearch, setModelSearch] = useState("");
  const [knowledgeQuery, setKnowledgeQuery] = useState("repository readiness");
  const [knowledgeHits, setKnowledgeHits] = useState<KnowledgeHit[]>([]);
  const [toast, setToast] = useState("");
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [copilotQuestion, setCopilotQuestion] = useState("");
  const [copilotMessages, setCopilotMessages] = useState<CopilotMessage[]>([
    {
      role: "copilot",
      text: "I am Forge, your developer Copilot. I can explain missions, models, safe terminal checks, and the next build step.",
    },
  ]);
  const [copilotBusy, setCopilotBusy] = useState(false);
  const [copilotListening, setCopilotListening] = useState(false);
  const [copilotVoice, setCopilotVoice] = useState(false);
  const [forgeProfile, setForgeProfile] = useState<ForgeProfile | null>(null);
  const [terminalStatus, setTerminalStatus] = useState("Not connected");
  const [pairCode, setPairCode] = useState("");
  const [terminalToken, setTerminalToken] = useState("");
  const [terminalCommand, setTerminalCommand] = useState("git status --short");
  const [terminalOutput, setTerminalOutput] = useState(
    "Pair the local companion before running an approved command.",
  );
  const [deviceDiagnostics, setDeviceDiagnostics] =
    useState<DeviceDiagnostics | null>(null);
  const [deviceScanning, setDeviceScanning] = useState(false);
  const [labStatus, setLabStatus] = useState<SecurityLabStatus | null>(null);
  const [labDuration, setLabDuration] = useState(30);
  const [labAuthorized, setLabAuthorized] = useState(false);
  const [labBusy, setLabBusy] = useState(false);
  const [deploymentHealth, setDeploymentHealth] =
    useState<DeploymentHealth | null>(null);
  const [deploymentError, setDeploymentError] = useState("");
  const [deploymentChecking, setDeploymentChecking] = useState(false);
  const [passkeys, setPasskeys] = useState<PasskeySummary[]>([]);
  const [releaseStatus, setReleaseStatus] =
    useState<ReleaseCenterStatus | null>(null);
  const [releases, setReleases] = useState<ReleaseProposal[]>([]);
  const [selectedRelease, setSelectedRelease] =
    useState<ReleaseProposal | null>(null);
  const [releaseEvents, setReleaseEvents] = useState<ReleaseEvent[]>([]);
  const [releaseTitle, setReleaseTitle] = useState("Next Robot Guild upgrade");
  const [releaseGoal, setReleaseGoal] = useState(
    "Improve the web app with the smallest safe, tested and reversible change.",
  );

  const level = Math.floor(xp / 250) + 1;
  const xpInLevel = xp % 250;
  const filteredProviders = useMemo(
    () =>
      providers.filter((p) =>
        `${p[0]} ${p[1]}`.toLowerCase().includes(modelSearch.toLowerCase()),
      ),
    [modelSearch],
  );

  useEffect(() => {
    api<AuthStatus>("/api/auth/status")
      .then((status) => {
        setAuth(status);
        setAuthMode(status.setup_required ? "setup" : "login");
      })
      .catch(() => setAuth({ authenticated: false, setup_required: false }));
  }, []);
  useEffect(() => {
    checkDeployment();
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("aios-theme", theme);
  }, [theme]);
  useEffect(() => {
    localStorage.setItem("aios-xp", String(xp));
  }, [xp]);
  useEffect(() => {
    if (
      (auth?.authenticated || demoMode) &&
      (tab === "missions" || tab === "forge")
    )
      loadMissions();
  }, [tab, auth?.authenticated, demoMode]);
  useEffect(() => {
    if (auth?.authenticated && tab === "settings") loadPasskeys();
  }, [tab, auth?.authenticated]);
  useEffect(() => {
    if (auth?.authenticated && tab === "updates") loadReleaseCenter();
  }, [tab, auth?.authenticated]);
  useEffect(() => {
    if (auth?.authenticated) loadForgeProfile();
  }, [auth?.authenticated]);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };
  async function checkDeployment() {
    setDeploymentChecking(true);
    setDeploymentError("");
    try {
      const response = await fetch(
        `/api/health?ui_build=${encodeURIComponent(UI_BUILD)}&t=${Date.now()}`,
        { cache: "no-store" },
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.error || `Health check failed (${response.status})`,
        );
      setDeploymentHealth({
        ...result,
        request_id: response.headers.get("X-Request-ID") || undefined,
      });
    } catch (error) {
      setDeploymentError(
        error instanceof Error ? error.message : "Deployment check failed",
      );
    } finally {
      setDeploymentChecking(false);
    }
  }
  async function authenticate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthError("");
    const form = new FormData(event.currentTarget);
    try {
      await api(`/api/auth/${authMode}`, {
        method: "POST",
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
        }),
      });
      setAuth(await api<AuthStatus>("/api/auth/status"));
      notify("Secure vault unlocked");
    } catch (error) {
      setAuthError(
        error instanceof Error ? error.message : "Authentication failed",
      );
    }
  }
  async function loginWithPasskey() {
    setAuthError("");
    try {
      const options = await api<PublicKeyCredentialRequestOptionsJSON>(
        "/api/passkeys/auth/options",
        { method: "POST" },
      );
      const response = await startAuthentication({ optionsJSON: options });
      await api("/api/passkeys/auth/verify", {
        method: "POST",
        body: JSON.stringify({ challenge: options.challenge, response }),
      });
      setAuth(await api<AuthStatus>("/api/auth/status"));
      notify("Passkey accepted • vault unlocked");
    } catch (error) {
      setAuthError(
        error instanceof Error ? error.message : "Passkey sign-in failed",
      );
    }
  }
  async function loadPasskeys() {
    try {
      const result = await api<{ passkeys: PasskeySummary[] }>("/api/passkeys");
      setPasskeys(result.passkeys);
    } catch {
      setPasskeys([]);
    }
  }
  async function loadForgeProfile() {
    try {
      setForgeProfile(await api<ForgeProfile>("/api/copilot/profile"));
    } catch {
      setForgeProfile(null);
    }
  }
  async function addPasskey() {
    if (!window.PublicKeyCredential)
      return notify("Passkeys are not supported by this browser");
    try {
      const options = await api<PublicKeyCredentialCreationOptionsJSON>(
        "/api/passkeys/register/options",
        { method: "POST" },
      );
      const response = await startRegistration({ optionsJSON: options });
      await api("/api/passkeys/register/verify", {
        method: "POST",
        body: JSON.stringify({
          challenge: options.challenge,
          name: "Primary device",
          response,
        }),
      });
      await loadPasskeys();
      notify("Passkey added securely");
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Passkey registration failed",
      );
    }
  }
  async function deletePasskey(id: string) {
    if (!window.confirm("Remove this passkey from AIOS Robot Guild?")) return;
    try {
      await api(`/api/passkeys/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      await loadPasskeys();
      notify("Passkey removed");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Passkey removal failed");
    }
  }
  async function loadReleaseCenter() {
    try {
      const [status, list] = await Promise.all([
        api<ReleaseCenterStatus>("/api/releases/status"),
        api<{ releases: ReleaseProposal[] }>("/api/releases"),
      ]);
      setReleaseStatus(status);
      setReleases(list.releases);
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Update Center unavailable",
      );
    }
  }
  async function selectRelease(item: ReleaseProposal) {
    setSelectedRelease(item);
    try {
      const result = await api<{
        proposal: ReleaseProposal;
        events: ReleaseEvent[];
      }>(`/api/releases/${item.id}`);
      setSelectedRelease(result.proposal);
      setReleaseEvents(result.events);
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Release evidence unavailable",
      );
    }
  }
  async function createReleaseProposal(event: React.FormEvent) {
    event.preventDefault();
    try {
      const result = await api<{
        proposal: ReleaseProposal;
        events: ReleaseEvent[];
      }>("/api/releases", {
        method: "POST",
        body: JSON.stringify({ title: releaseTitle, goal: releaseGoal }),
      });
      setSelectedRelease(result.proposal);
      setReleaseEvents(result.events);
      await loadReleaseCenter();
      notify("Release plan created • approval required");
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Release proposal failed",
      );
    }
  }
  async function decideRelease(decision: "approved" | "rejected") {
    if (
      !selectedRelease ||
      !window.confirm(
        `${decision === "approved" ? "Approve" : "Reject"} this release plan?\n\nNo code will be changed by this approval.`,
      )
    )
      return;
    try {
      const result = await api<{ proposal: ReleaseProposal; message: string }>(
        `/api/releases/${selectedRelease.id}/approval`,
        { method: "POST", body: JSON.stringify({ decision }) },
      );
      setSelectedRelease(result.proposal);
      await selectRelease(result.proposal);
      await loadReleaseCenter();
      notify(result.message);
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Release decision failed",
      );
    }
  }
  async function loadMissions() {
    if (demoMode) {
      setMissions(mission ? [mission] : []);
      return;
    }
    try {
      const data = await api<{ missions: Mission[] }>("/api/missions");
      setMissions(data.missions);
    } catch {
      /* signed-out state handles this */
    }
  }
  async function createMission() {
    if (!goal.trim() || !repository.trim())
      return notify("Enter a goal and repository URL");
    setProgress(5);
    setEvents([]);
    if (demoMode) {
      setMission({
        id: `DEMO-${Date.now().toString().slice(-5)}`,
        title: goal,
        repository,
        status: "awaiting_approval",
        plan: "1. Validate the public repository.\n2. Collect read-only metadata.\n3. Inspect project signals.\n4. Summarize evidence.\n5. Stop for human review.",
      });
      setProgress(10);
      return notify("Demo plan created");
    }
    try {
      const data = await api<{ mission: Mission; events: MissionEvent[] }>(
        "/api/missions",
        { method: "POST", body: JSON.stringify({ title: goal, repository }) },
      );
      setMission(data.mission);
      setEvents(data.events);
      setProgress(10);
      notify("Plan created—approval required");
    } catch (error) {
      setProgress(0);
      notify(
        error instanceof Error ? error.message : "Mission creation failed",
      );
    }
  }
  async function approveMission(decision: "approved" | "rejected") {
    if (!mission) return;
    if (demoMode) {
      const updated = { ...mission, status: decision };
      setMission(updated);
      if (decision === "approved") runDemo(updated);
      else notify("Mission rejected safely");
      return;
    }
    try {
      const data = await api<{ mission: Mission }>(
        `/api/missions/${mission.id}/approval`,
        { method: "POST", body: JSON.stringify({ decision }) },
      );
      setMission(data.mission);
      if (decision === "approved") await runMission();
      else notify("Mission rejected");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Approval failed");
    }
  }
  async function verifyMission(decision: "completed" | "revision_requested") {
    if (!mission || mission.status !== "review_required") return;
    if (!window.confirm(decision === "completed"
      ? "Verify this evidence and complete the mission?\n\nThis awards 300 XP and 25 Guild Tokens."
      : "Request a revision?\n\nNo XP or tokens will be awarded.")) return;
    if (demoMode) {
      setMission({ ...mission, status: decision });
      if (decision === "completed") {
        setXp((value) => value + 300);
        notify("+300 XP • +25 GT • Owner-verified mission");
      } else notify("Revision requested • no reward awarded");
      return;
    }
    try {
      const data = await api<{ mission: Mission; events: MissionEvent[]; reward: { xp: number; guild_tokens: number } | null }>(
        `/api/missions/${mission.id}/verification`,
        { method: "POST", body: JSON.stringify({ decision }) },
      );
      setMission(data.mission);
      if (data.reward) notify(`+${data.reward.xp} XP • +${data.reward.guild_tokens} GT • Mission verified`);
      else notify("Revision requested • no reward awarded");
      await Promise.all([loadForgeProfile(), loadMissions()]);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Final verification failed");
    }
  }
  function runDemo(base: Mission) {
    setEvents([]);
    demoEvents.forEach((event, index) =>
      window.setTimeout(
        () => {
          setEvents((current) => [...current, event]);
          setActiveAgent(event.agent);
          setProgress(event.progress);
          if (event.progress === 100) {
            setMission({
              ...base,
              status: "review_required",
              result:
                "Demo evidence complete. Connect Cloudflare D1 to run the real public-repository inspection.",
            });
            notify("Evidence ready • owner verification required for rewards");
          }
        },
        650 * (index + 1),
      ),
    );
  }
  function replayVerifiedEvents(
    verifiedMission: Mission,
    verifiedEvents: MissionEvent[],
  ) {
    setEvents([]);
    verifiedEvents.forEach((event, index) =>
      window.setTimeout(
        () => {
          setEvents((current) => [...current, event]);
          setActiveAgent(event.agent);
          setProgress(event.progress);
          if (index === verifiedEvents.length - 1) {
            setMission(verifiedMission);
            notify("Evidence ready • owner verification required for rewards");
          }
        },
        700 * (index + 1),
      ),
    );
  }
  async function runMission() {
    if (!mission) return;
    try {
      const data = await api<{ mission: Mission; events: MissionEvent[] }>(
        `/api/missions/${mission.id}/run`,
        { method: "POST" },
      );
      replayVerifiedEvents(data.mission, data.events);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Mission failed");
    }
  }
  async function logout() {
    if (!demoMode)
      await api("/api/auth/logout", { method: "POST" }).catch(() => null);
    setDemoMode(false);
    setAuth({ authenticated: false, setup_required: false });
  }
  async function changePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (demoMode)
      return notify("Password changes are unavailable in demo mode");
    const form = event.currentTarget;
    const values = new FormData(form);
    const password = String(values.get("newPassword") || "");
    const confirmation = String(values.get("confirmPassword") || "");
    if (password.length < 12) return notify("Use at least 12 characters");
    if (password !== confirmation)
      return notify("The new passwords do not match");
    try {
      await api("/api/auth/password", {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      form.reset();
      notify("Password changed • other sessions signed out");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Password change failed");
    }
  }
  function speakCopilot(text: string) {
    if (!("speechSynthesis" in window))
      return notify("Spoken responses are not supported by this browser");
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(
      text.replace(/\[[^\]]+\]/g, ""),
    );
    utterance.rate = 1;
    utterance.pitch = 0.92;
    utterance.lang = "en-US";
    window.speechSynthesis.speak(utterance);
  }
  function startVoiceQuestion() {
    const browser = window as unknown as {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const Recognition =
      browser.SpeechRecognition || browser.webkitSpeechRecognition;
    if (!Recognition)
      return notify(
        "Voice input is unavailable here. Chrome or Edge is recommended.",
      );
    const recognition = new Recognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const text = event.results[0]?.[0]?.transcript || "";
      setCopilotQuestion(text);
      notify("Voice question captured • review it before sending");
    };
    recognition.onerror = () => notify("Voice input could not be captured");
    recognition.onend = () => setCopilotListening(false);
    setCopilotListening(true);
    recognition.start();
  }
  function appendCopilotAnswer(text: string, citations?: KnowledgeHit[]) {
    setCopilotMessages((current) => [
      ...current,
      { role: "copilot", text, citations },
    ]);
    setCopilotBusy(false);
    if (copilotVoice) speakCopilot(text);
  }
  async function askCopilot(event: React.FormEvent) {
    event.preventDefault();
    const question = copilotQuestion.trim();
    if (!question) return;
    setCopilotMessages((current) => [
      ...current,
      { role: "user", text: question },
    ]);
    setCopilotQuestion("");
    setCopilotBusy(true);
    if (demoMode) {
      const local = question.toLowerCase().includes("terminal")
        ? "Open Developer Studio, download the companion, run it locally, then pair with the one-time code. Only four approved commands are available."
        : question.toLowerCase().includes("model")
          ? "Use AI Models to search providers. Put keys only in Cloudflare encrypted secrets."
          : "I can help turn that request into a scoped quest. Create a plan, review it, approve it, and watch the specialist robots execute verified stages.";
      return window.setTimeout(() => appendCopilotAnswer(local), 350);
    }
    try {
      const result = await api<{ answer: string; citations?: KnowledgeHit[] }>(
        "/api/copilot",
        { method: "POST", body: JSON.stringify({ question }) },
      );
      appendCopilotAnswer(result.answer, result.citations);
    } catch (error) {
      appendCopilotAnswer(
        error instanceof Error ? error.message : "Copilot unavailable.",
      );
    }
  }
  async function checkTerminal() {
    try {
      const response = await fetch("http://127.0.0.1:4317/health");
      if (!response.ok) throw new Error();
      setTerminalStatus("Companion found • pairing required");
    } catch {
      setTerminalStatus("Companion offline • download and run it first");
    }
  }
  async function searchGuildMemory() {
    if (demoMode)
      return notify("Create a real mission to add verified guild memory");
    try {
      const result = await api<{ hits: KnowledgeHit[] }>(
        `/api/knowledge/search?q=${encodeURIComponent(knowledgeQuery)}`,
      );
      setKnowledgeHits(result.hits);
      notify(
        result.hits.length
          ? `${result.hits.length} cited memory result(s)`
          : "No matching verified memory",
      );
    } catch (error) {
      notify(error instanceof Error ? error.message : "Memory search failed");
    }
  }
  async function deleteGuildMemory(hit: KnowledgeHit) {
    if (!window.confirm(`Delete this verified memory?\n\n${hit.title}`)) return;
    try {
      await api(`/api/knowledge/${hit.document_id}`, { method: "DELETE" });
      setKnowledgeHits((current) =>
        current.filter((item) => item.document_id !== hit.document_id),
      );
      notify("Guild memory deleted");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Delete failed");
    }
  }
  function exportGuildMemory() {
    if (!knowledgeHits.length)
      return notify("Search memory before exporting results");
    const payload = JSON.stringify(
      {
        exported_at: new Date().toISOString(),
        query: knowledgeQuery,
        results: knowledgeHits,
      },
      null,
      2,
    );
    const url = URL.createObjectURL(
      new Blob([payload], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "aios-guild-memory.json";
    link.click();
    URL.revokeObjectURL(url);
    notify("Memory results exported");
  }
  async function pairTerminal() {
    try {
      const response = await fetch("http://127.0.0.1:4317/pair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: pairCode }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setTerminalToken(data.token);
      setTerminalStatus("Paired securely");
      notify("Local terminal paired");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Pairing failed");
    }
  }
  async function scanDesktop() {
    if (!terminalToken)
      return notify("Pair the local companion before scanning");
    setDeviceScanning(true);
    try {
      const response = await fetch("http://127.0.0.1:4317/diagnostics", {
        headers: { Authorization: `Bearer ${terminalToken}` },
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Desktop scan failed");
      setDeviceDiagnostics(result);
      setTerminalStatus("Paired securely • device online");
      notify(`Desktop Doctor: ${result.summary}`);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Desktop scan failed");
    } finally {
      setDeviceScanning(false);
    }
  }
  function explainDeviceReport() {
    if (!deviceDiagnostics) return notify("Run Desktop Doctor first");
    const findings =
      deviceDiagnostics.checks
        .filter((check) => check.status !== "pass")
        .map((check) => `${check.label}: ${check.detail}`)
        .join("; ") || "No warnings or failures.";
    setCopilotQuestion(
      `Create a minimal fast-fix plan for this Desktop Doctor report. Coordinate the specialist agents, propose only the smallest project-scoped change, show validation and rollback, and stop for my single approval before execution. Do not claim the computer was changed. Summary: ${deviceDiagnostics.summary}. Findings: ${findings}`,
    );
    setCopilotOpen(true);
  }
  async function runTerminalCommand() {
    if (!terminalToken) return notify("Pair the companion first");
    if (
      !window.confirm(`Run this approved local command?\n\n${terminalCommand}`)
    )
      return;
    setTerminalOutput("Running approved command…");
    try {
      const response = await fetch("http://127.0.0.1:4317/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${terminalToken}`,
        },
        body: JSON.stringify({ command: terminalCommand }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setTerminalOutput(
        `$ ${data.command}\nExit ${data.exitCode}\n\n${data.output || "(no output)"}`,
      );
    } catch (error) {
      setTerminalOutput(
        error instanceof Error ? error.message : "Command failed",
      );
    }
  }
  async function refreshLab() {
    if (!terminalToken) return notify("Pair the latest local companion first");
    try {
      const response = await fetch("http://127.0.0.1:4317/lab/status", {
        headers: { Authorization: `Bearer ${terminalToken}` },
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setLabStatus(result);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Lab status unavailable");
    }
  }
  async function startLab() {
    if (!terminalToken) return notify("Pair the latest local companion first");
    if (!labAuthorized)
      return notify("Confirm ownership of this local training lab");
    if (
      !window.confirm(
        `Create the isolated local training lab for ${labDuration} minutes?\n\nOnly the bundled target is allowed. External network access is blocked.`,
      )
    )
      return;
    setLabBusy(true);
    try {
      const response = await fetch("http://127.0.0.1:4317/lab/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${terminalToken}`,
        },
        body: JSON.stringify({
          approved: true,
          authorization: "I OWN THIS LOCAL LAB",
          durationMinutes: labDuration,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setLabStatus(result);
      notify("Authorized lab started • automatic cleanup armed");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Lab start failed");
    } finally {
      setLabBusy(false);
    }
  }
  async function destroyLab() {
    if (!terminalToken) return notify("Pair the companion first");
    if (!window.confirm("Destroy all containers and temporary lab data now?"))
      return;
    setLabBusy(true);
    try {
      const response = await fetch("http://127.0.0.1:4317/lab/destroy", {
        method: "POST",
        headers: { Authorization: `Bearer ${terminalToken}` },
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setLabStatus(result);
      notify("Lab destroyed and cleaned");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Lab cleanup failed");
    } finally {
      setLabBusy(false);
    }
  }

  const unlocked = auth?.authenticated || demoMode;
  const forgeGrowth: ForgeProfile = forgeProfile || {
    level,
    xp,
    next_level_xp: Math.max(0, 250 - xpInLevel),
    verified_missions: mission?.status === "completed" ? 1 : 0,
    memory_records: knowledgeHits.length,
    recorded_handoffs: events.length,
    skills: agents
      .slice(0, Math.min(level, agents.length))
      .map((agent) => agent.skill),
    specialists: agents.map((agent, index) => ({
      id: agent.id,
      name: agent.name,
      role: [
        "Requirements & Systems Architect",
        "Solution & Source Intelligence Engineer",
        "Full-Stack & Evidence Engineer",
        "Quality & Verification Engineer",
        "Release & Intelligence Review Engineer",
      ][index],
      xp: mission?.status === "completed" ? 100 : 0,
      level: 1,
      rank: "Apprentice" as const,
      completed_missions: mission?.status === "completed" ? 1 : 0,
      skills: [agent.skill],
      disciplines: [
        ["Product Discovery", "UX Requirements", "OSINT Authorization"],
        ["Solution Architecture", "Source Intelligence", "Threat Modeling"],
        ["Frontend Engineering", "Backend & API", "Cloud Integration"],
        ["QA Automation", "AppSec Verification", "Site Reliability"],
        ["Code Review", "Intelligence Validation", "Release Management"],
      ][index],
    })),
    guild_tokens: mission?.status === "completed" ? 25 : 0,
    tool_badges:
      mission?.status === "completed" ? ["Mission Ledger"] : [],
  };
  return (
    <div className="app-shell">
      {!unlocked && (
        <div className="auth-overlay">
          <form className="auth-card" onSubmit={authenticate}>
            <div className="crest">A</div>
            <p className="kicker">PRIVATE GUILD ACCESS</p>
            <h1>
              {authMode === "setup"
                ? "Create the owner vault"
                : "Enter Robot Guild"}
            </h1>
            <p>
              {authMode === "setup"
                ? "Claim the first secure owner account."
                : "Sign in to continue your missions."}
            </p>
            <label>
              Email
              <input
                name="email"
                type="email"
                required
                autoComplete="username webauthn"
              />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                minLength={10}
                required
                autoComplete={
                  authMode === "setup" ? "new-password" : "current-password"
                }
              />
            </label>
            <button className="primary" type="submit">
              {authMode === "setup" ? "Create secure vault" : "Sign in"}
            </button>
            {authMode === "login" && (
              <button
                type="button"
                className="passkey-button"
                onClick={loginWithPasskey}
              >
                Sign in with a passkey
              </button>
            )}
            {authError && <p className="error">{authError}</p>}
            <div className="auth-divider">
              <span>or</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setDemoMode(true);
                notify("Demo mode: data stays in this browser");
              }}
            >
              Explore demo mode
            </button>
            <small>API keys are never entered in this browser.</small>
          </form>
        </div>
      )}

      <aside className="sidebar">
        <div className="brand">
          <div className="crest">A</div>
          <div>
            <b>AIOS</b>
            <span>Robot Guild</span>
          </div>
        </div>
        <Nav
          label="Robot Guild"
          icon="⚔"
          active={tab === "guild"}
          onClick={() => setTab("guild")}
        />
        <Nav
          label="Health Quest"
          icon="🛡"
          active={tab === "quest"}
          onClick={() => setTab("quest")}
        />
        <Nav
          label="Mission History"
          icon="📜"
          active={tab === "missions"}
          onClick={() => setTab("missions")}
        />
        <Nav
          label="Developer Studio"
          icon="⌘"
          active={tab === "studio"}
          onClick={() => setTab("studio")}
        />
        <Nav
          label="Forge Growth"
          icon="✦"
          active={tab === "forge"}
          onClick={() => setTab("forge")}
        />
        <Nav
          label="Devices"
          icon="▣"
          active={tab === "devices"}
          onClick={() => setTab("devices")}
        />
        <Nav
          label="CCNA Network"
          icon="⌁"
          active={tab === "network"}
          onClick={() => setTab("network")}
        />
        <Nav
          label="Security Lab"
          icon="⬡"
          active={tab === "lab"}
          onClick={() => setTab("lab")}
        />
        <p className="nav-title">SYSTEM</p>
        <Nav
          label="Deployment"
          icon="◌"
          active={tab === "ops"}
          onClick={() => setTab("ops")}
        />
        <Nav
          label="Update Center"
          icon="↻"
          active={tab === "updates"}
          onClick={() => setTab("updates")}
        />
        <Nav
          label="AI Models"
          icon="✦"
          active={tab === "models"}
          onClick={() => setTab("models")}
        />
        <Nav
          label="Knowledge"
          icon="◈"
          active={tab === "knowledge"}
          onClick={() => setTab("knowledge")}
        />
        <Nav
          label="Settings"
          icon="⚙"
          active={tab === "settings"}
          onClick={() => setTab("settings")}
        />
        <div className="profile">
          <div className="level">{level}</div>
          <div>
            <b>Guild Owner</b>
            <small>
              Level {level} • {xp} XP
            </small>
          </div>
        </div>
      </aside>

      <main>
        <header>
          <div>
            <p className="kicker">
              AIOS SOFTWARE FACTORY • RECONSTRUCTED SOURCE
            </p>
            <h1>
              {tab === "guild"
                ? "Your agent guild, alive."
                : tab === "quest"
                  ? "Repository Health Quest"
                  : tab === "studio"
                    ? "Developer Studio"
                    : tab === "forge"
                      ? "Forge Growth Center"
                    : tab === "devices"
                      ? "Device Command Center"
                      : tab === "network"
                        ? "CCNA Network Guild"
                        : tab === "lab"
                          ? "Authorized Security Lab"
                          : tab === "ops"
                            ? "Deployment Control Center"
                            : tab === "updates"
                              ? "Update Center"
                              : tab === "models"
                                ? "AI Model Hub"
                                : tab === "missions"
                                  ? "Mission Archive"
                                  : tab === "knowledge"
                                    ? "Verified Knowledge"
                                    : "Guild Settings"}
            </h1>
          </div>
          <div className="header-actions">
            <span className="online">
              ● {demoMode ? "DEMO" : "BACKEND"} ONLINE
            </span>
            <button onClick={logout}>Log out</button>
          </div>
        </header>

        {tab === "guild" && (
          <GuildCommandCenter
            agents={agents}
            activeAgent={activeAgent}
            progress={progress}
            xp={xp}
            level={level}
            xpInLevel={xpInLevel}
            mission={mission}
            events={events}
            backendOnline={Boolean(deploymentHealth?.ok)}
            demoMode={demoMode}
            onNavigate={setTab}
            onSelectAgent={(id) => {
              setActiveAgent(id);
              notify(
                `${agents.find((agent) => agent.id === id)?.name} selected`,
              );
            }}
            factory={
              <Suspense
                fallback={
                  <div className="factory-loading">
                    Powering up the 3D robot guild district…
                  </div>
                }
              >
                <RobotFactory
                  activeAgent={activeAgent}
                  progress={progress}
                  missionStatus={mission?.status}
                  guildLevel={forgeGrowth.level}
                  guildTokens={forgeGrowth.guild_tokens}
                  onSelect={(id) => {
                    setActiveAgent(id);
                    notify(
                      `${agents.find((agent) => agent.id === id)?.name} selected`,
                    );
                  }}
                />
              </Suspense>
            }
          />
        )}

        {tab === "quest" && (
          <section className="quest-layout">
            <article className="panel-card quest-form">
              <p className="kicker">NEW CHALLENGE</p>
              <h2>Inspect a public GitHub repository</h2>
              <label>
                Quest goal
                <textarea
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                />
              </label>
              <label>
                Repository URL
                <input
                  value={repository}
                  onChange={(e) => setRepository(e.target.value)}
                />
              </label>
              <p className="muted">
                This quest performs read-only public-source checks. It does not
                clone, edit, merge, or deploy code.
              </p>
              <button className="primary" onClick={createMission}>
                Create safe plan
              </button>
              <div className="skill-chain">
                <p className="kicker">PARTY SKILL COMBINATION</p>
                {agents.map((agent, index) => (
                  <span
                    key={agent.id}
                    className={progress >= index * 20 ? "ready" : ""}
                  >
                    {agent.icon} {agent.skill}
                    {index < agents.length - 1 ? "  →" : ""}
                  </span>
                ))}
              </div>
            </article>
            <article className="panel-card mission-console">
              <div className="console-head">
                <div>
                  <p className="kicker">
                    MISSION {mission?.id || "NOT CREATED"}
                  </p>
                  <h2>{mission?.status.replaceAll("_", " ") || "Waiting"}</h2>
                </div>
                <div className="orb">{progress}%</div>
              </div>
              <pre>
                {mission?.plan || "Create a mission to generate the plan."}
              </pre>
              {mission?.status === "awaiting_approval" && (
                <div className="actions">
                  <button onClick={() => approveMission("rejected")}>
                    Reject
                  </button>
                  <button
                    className="primary"
                    onClick={() => approveMission("approved")}
                  >
                    Approve and run
                  </button>
                </div>
              )}
              {mission?.status === "review_required" && (
                <div className="verification-gate">
                  <div><b>Final owner verification</b><small>Review the evidence. Rewards remain locked until you confirm the mission is complete.</small></div>
                  <div className="actions"><button onClick={() => verifyMission("revision_requested")}>Request revision</button><button className="primary" onClick={() => verifyMission("completed")}>Verify completion</button></div>
                </div>
              )}
              <div className="event-list">
                {events.map((event, index) => (
                  <div className="event" key={`${event.agent}-${index}`}>
                    <span>
                      {agents.find((a) => a.id === event.agent)?.icon}
                    </span>
                    <div>
                      <b>
                        {event.agent} • {event.event_type}
                      </b>
                      <p>{event.message}</p>
                      {event.evidence && <code>{event.evidence}</code>}
                    </div>
                    <strong>{event.progress}%</strong>
                  </div>
                ))}
              </div>
              {mission?.result && (
                <div className="result">
                  <b>Engineer review</b>
                  <p>{mission.result}</p>
                </div>
              )}
            </article>
          </section>
        )}

        {tab === "missions" && (
          <section className="panel-card">
            <div className="section-head">
              <div>
                <p className="kicker">SAVED RUNS</p>
                <h2>Mission history</h2>
              </div>
              <button onClick={loadMissions}>Refresh</button>
            </div>
            <div className="mission-list">
              {missions.length ? (
                missions.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setMission(item);
                      setTab("quest");
                    }}
                  >
                    <span>
                      <b>{item.title}</b>
                      <small>{item.repository}</small>
                    </span>
                    <em>{item.status.replaceAll("_", " ")}</em>
                  </button>
                ))
              ) : (
                <p className="empty">No saved missions yet.</p>
              )}
            </div>
          </section>
        )}

        {tab === "studio" && (
          <section className="studio-grid">
            <article className="panel-card copilot-profile">
              <div className="copilot-avatar">
                <span>⌘</span>
                <i />
              </div>
              <p className="kicker">
                DEVELOPER AI SPECIALIST • LEVEL {forgeGrowth.level}
              </p>
              <h2>Forge Copilot</h2>
              <p>
                Forge converts your idea into a scoped plan, coordinates the
                robot party, explains results, and keeps terminal actions behind
                your approval.
              </p>
              <div className="forge-growth">
                <div><b>{forgeGrowth.xp}</b><small>VERIFIED XP</small></div>
                <div><b>{forgeGrowth.verified_missions}</b><small>MISSIONS</small></div>
                <div><b>{forgeGrowth.memory_records}</b><small>MEMORIES</small></div>
              </div>
              <div className="xp-track"><span style={{ width: `${Math.min(100, Math.max(4, (forgeGrowth.xp % 300) / 3))}%` }} /></div>
              <button className="primary" onClick={() => setCopilotOpen(true)}>
                Talk to Forge
              </button>
              <div className="specialties">
                {forgeGrowth.skills.map((skill) => <span key={skill}>✓ {skill}</span>)}
              </div>
            </article>
            <article className="panel-card terminal-card">
              <div className="section-head">
                <div>
                  <p className="kicker">LOCALHOST COMPANION</p>
                  <h2>Guarded terminal</h2>
                </div>
                <span className="online">{terminalStatus}</span>
              </div>
              <p className="muted">
                The website cannot access your computer directly. Run the local
                companion, pair it, then approve one allowlisted command at a
                time.
              </p>
              <div className="tool-actions">
                <a href="/aios-terminal-companion.mjs" download>
                  Download companion
                </a>
                <button onClick={checkTerminal}>Check connection</button>
              </div>
              <label>
                One-time pairing code
                <input
                  value={pairCode}
                  onChange={(event) => setPairCode(event.target.value)}
                  placeholder="Shown in your terminal"
                />
              </label>
              <button onClick={pairTerminal}>Pair localhost</button>
              <label>
                Approved command
                <select
                  value={terminalCommand}
                  onChange={(event) => setTerminalCommand(event.target.value)}
                >
                  <option>pwd</option>
                  <option>git status --short</option>
                  <option>npm run lint</option>
                  <option>npm test</option>
                </select>
              </label>
              <button className="primary" onClick={runTerminalCommand}>
                Review and run
              </button>
              <pre>{terminalOutput}</pre>
            </article>
            <article className="panel-card tools-card">
              <p className="kicker">DEVELOPER PORTALS</p>
              <h2>Open your tools</h2>
              <div className="tool-grid">
                <ToolLink
                  name="Visual Studio Code"
                  note="Edit the source locally"
                  href="https://code.visualstudio.com/download"
                  icon="⌨"
                />
                <ToolLink
                  name="GitHub Desktop"
                  note="Commit and push safely"
                  href="https://desktop.github.com/"
                  icon="◉"
                />
                <ToolLink
                  name="GitHub Repository"
                  note="Open Robot Guild source"
                  href="https://github.com/bossayan9999/aios-robot-guild-"
                  icon="◆"
                />
                <ToolLink
                  name="Cloudflare"
                  note="D1, Workers, logs, secrets"
                  href="https://dash.cloudflare.com/"
                  icon="☁"
                />
              </div>
            </article>
            <article className="panel-card">
              <p className="kicker">SECURITY CONTRACT</p>
              <h2>What Forge may do</h2>
              <ul>
                <li>Explain and create a plan</li>
                <li>Search approved public sources</li>
                <li>Request a human decision</li>
                <li>Run only an allowlisted local check</li>
                <li>Record evidence and stop</li>
              </ul>
              <div className="notice">
                Forge cannot silently install software, read arbitrary files,
                run unrestricted commands, merge, push, or deploy.
              </div>
            </article>
          </section>
        )}

        {tab === "forge" && (
          <ForgeGrowthCenter
            profile={forgeGrowth}
            missions={missions}
            onTalk={() => setCopilotOpen(true)}
            onQuest={() => setTab("quest")}
            onKnowledge={() => setTab("knowledge")}
            onSandbox={() => setTab("lab")}
            onStudio={() => setTab("studio")}
            onRelease={() => setTab("updates")}
            onRefresh={() => {
              void loadForgeProfile();
              void loadMissions();
              notify("Forge profile refreshed");
            }}
          />
        )}

        {tab === "devices" && (
          <section className="device-grid">
            <article className="panel-card">
              <div className="device-hero">
                <div>
                  <p className="kicker">LOCAL DEVICE • READ-ONLY DIAGNOSTICS</p>
                  <h2>Desktop Doctor</h2>
                  <p>
                    Inspect runtime, Git, project and capacity signals without
                    exposing your computer or changing files.
                  </p>
                </div>
                <div className="device-orb">▣</div>
              </div>
              <div className="device-actions">
                <a
                  className="button-link"
                  href="/aios-terminal-companion.mjs"
                  download
                >
                  Download latest companion
                </a>
                <button onClick={checkTerminal}>Detect desktop</button>
              </div>
              {!terminalToken && (
                <div className="device-pair">
                  <input
                    value={pairCode}
                    onChange={(event) => setPairCode(event.target.value)}
                    placeholder="One-time code shown by companion"
                  />
                  <button onClick={pairTerminal}>Pair</button>
                </div>
              )}
              <button
                className="primary"
                disabled={deviceScanning || !terminalToken}
                onClick={scanDesktop}
              >
                {deviceScanning ? "Scanning safely…" : "Run Desktop Doctor"}
              </button>
              {deviceDiagnostics ? (
                <>
                  <div className="device-facts">
                    <div>
                      <small>Device</small>
                      <b>{deviceDiagnostics.device.name}</b>
                      <span>
                        {deviceDiagnostics.device.platform} •{" "}
                        {deviceDiagnostics.device.arch}
                      </span>
                    </div>
                    <div>
                      <small>Project branch</small>
                      <b>{deviceDiagnostics.project.branch || "Unavailable"}</b>
                      <span>
                        {deviceDiagnostics.project.clean
                          ? "Clean working tree"
                          : "Review local changes"}
                      </span>
                    </div>
                    <div>
                      <small>Runtime</small>
                      <b>Node {deviceDiagnostics.tools.node}</b>
                      <span>
                        {deviceDiagnostics.tools.git || "Git unavailable"}
                      </span>
                    </div>
                  </div>
                  <div className="doctor-checks">
                    {deviceDiagnostics.checks.map((check) => (
                      <div
                        key={check.id}
                        className={`doctor-check ${check.status}`}
                      >
                        <i>
                          {check.status === "pass"
                            ? "✓"
                            : check.status === "warn"
                              ? "!"
                              : "×"}
                        </i>
                        <div>
                          <b>{check.label}</b>
                          <small>{check.detail}</small>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="device-actions">
                    <button onClick={explainDeviceReport}>
                      Ask Forge to explain
                    </button>
                    <button
                      onClick={() => {
                        const url = URL.createObjectURL(
                          new Blob(
                            [JSON.stringify(deviceDiagnostics, null, 2)],
                            { type: "application/json" },
                          ),
                        );
                        const link = document.createElement("a");
                        link.href = url;
                        link.download = "aios-desktop-doctor.json";
                        link.click();
                        URL.revokeObjectURL(url);
                      }}
                    >
                      Export report
                    </button>
                  </div>
                </>
              ) : (
                <div className="device-offline">
                  Pair the latest local companion, then run a read-only scan.
                </div>
              )}
            </article>
            <aside>
              <article className="panel-card">
                <p className="kicker">CURRENT SAFETY BOUNDARY</p>
                <h2>Local approval required</h2>
                <ul>
                  <li>Companion binds only to 127.0.0.1</li>
                  <li>One-time pairing code and memory-only token</li>
                  <li>No inbound internet connection</li>
                  <li>No arbitrary shell or file browsing</li>
                  <li>Every command still requires confirmation</li>
                </ul>
              </article>
              <article className="panel-card device-boundary">
                <p className="kicker">REMOTE DEVICE CONTROL</p>
                <h2>Locked for now</h2>
                <p>
                  Phone-to-desktop control will unlock only after device
                  identity, revocation, encrypted outbound pairing, audit logs
                  and isolated worktrees are implemented and tested.
                </p>
              </article>
            </aside>
          </section>
        )}

        {tab === "updates" && (
          <section className="update-layout">
            <article className="panel-card">
              <div className="section-head">
                <div>
                  <p className="kicker">OWNER-GATED RELEASE CONTROL</p>
                  <h2>Turn a goal into a safe release</h2>
                </div>
                <button onClick={loadReleaseCenter}>Refresh</button>
              </div>
              <div className="connection-strip">
                <span
                  className={
                    releaseStatus?.github_connected ? "connected" : "waiting"
                  }
                >
                  GitHub App •{" "}
                  {releaseStatus?.github_connected ? "ready" : "not connected"}
                </span>
                <span
                  className={
                    releaseStatus?.cloudflare_connected
                      ? "connected"
                      : "waiting"
                  }
                >
                  Cloudflare •{" "}
                  {releaseStatus?.cloudflare_connected
                    ? "online"
                    : "unavailable"}
                </span>
                <span>Build • {releaseStatus?.build || UI_BUILD}</span>
              </div>
              <form className="release-form" onSubmit={createReleaseProposal}>
                <label>
                  Release title
                  <input
                    value={releaseTitle}
                    onChange={(event) => setReleaseTitle(event.target.value)}
                    minLength={3}
                    maxLength={120}
                    required
                  />
                </label>
                <label>
                  Improvement goal
                  <textarea
                    value={releaseGoal}
                    onChange={(event) => setReleaseGoal(event.target.value)}
                    minLength={10}
                    maxLength={2000}
                    required
                  />
                </label>
                <button className="primary" type="submit">
                  Create release plan
                </button>
              </form>
              <div className="release-pipeline">
                {[
                  "Goal",
                  "Plan",
                  "Branch / PR",
                  "Tests",
                  "Owner approval",
                  "Cloudflare",
                ].map((stage, index) => (
                  <div key={stage} className={index < 2 ? "ready" : ""}>
                    <i>{index + 1}</i>
                    <span>{stage}</span>
                  </div>
                ))}
              </div>
              <div className="notice">
                Version 1 stores proposals, decisions and evidence. It never
                edits GitHub or deploys production. Branch/PR execution unlocks
                only after a repository-scoped GitHub App is configured and
                tested.
              </div>
            </article>
            <aside>
              <article className="panel-card">
                <p className="kicker">RELEASE QUEUE</p>
                <h2>Durable proposals</h2>
                <div className="release-list">
                  {releases.length ? (
                    releases.map((item) => (
                      <button
                        key={item.id}
                        className={
                          selectedRelease?.id === item.id ? "active" : ""
                        }
                        onClick={() => selectRelease(item)}
                      >
                        <span>
                          <b>{item.title}</b>
                          <small>
                            {item.id} •{" "}
                            {new Date(item.created_at).toLocaleString()}
                          </small>
                        </span>
                        <em>{item.status.replaceAll("_", " ")}</em>
                      </button>
                    ))
                  ) : (
                    <p className="muted">No release proposals yet.</p>
                  )}
                </div>
              </article>
              {selectedRelease && (
                <article className="panel-card release-evidence">
                  <p className="kicker">RELEASE {selectedRelease.id}</p>
                  <h2>{selectedRelease.title}</h2>
                  <p>{selectedRelease.goal}</p>
                  <pre>{selectedRelease.plan}</pre>
                  <div className="release-events">
                    {releaseEvents.map((item) => (
                      <div key={item.id}>
                        <b>
                          {item.stage} • {item.event_type.replaceAll("_", " ")}
                        </b>
                        <p>{item.message}</p>
                      </div>
                    ))}
                  </div>
                  {selectedRelease.status === "planned" && (
                    <div className="actions">
                      <button onClick={() => decideRelease("rejected")}>
                        Reject
                      </button>
                      <button
                        className="primary"
                        onClick={() => decideRelease("approved")}
                      >
                        Approve plan
                      </button>
                    </div>
                  )}
                  {selectedRelease.status === "approved_waiting_connection" && (
                    <div className="notice">
                      Approved and paused safely. Connect a repository-scoped
                      GitHub App before enabling branch or pull-request
                      creation.
                    </div>
                  )}
                </article>
              )}
            </aside>
          </section>
        )}

        {tab === "models" && (
          <section className="panel-card">
            <div className="section-head">
              <div>
                <p className="kicker">SECURE PROVIDER DIRECTORY</p>
                <h2>Find an AI model provider</h2>
              </div>
              <input
                className="search"
                placeholder="Search OpenRouter, Gemini, local…"
                value={modelSearch}
                onChange={(e) => setModelSearch(e.target.value)}
              />
            </div>
            <div className="provider-grid">
              {filteredProviders.map((provider) => (
                <article key={provider[0]}>
                  <div className="provider-icon">✦</div>
                  <h3>{provider[0]}</h3>
                  <p>{provider[1]}</p>
                  <div>
                    <a href={provider[2]} target="_blank" rel="noreferrer">
                      Models ↗
                    </a>
                    <a href={provider[3]} target="_blank" rel="noreferrer">
                      Get key ↗
                    </a>
                  </div>
                </article>
              ))}
            </div>
            <div className="notice">
              Keys belong in Cloudflare encrypted secrets—never browser storage,
              source code, screenshots, or chat.
            </div>
          </section>
        )}

        {tab === "knowledge" && (
          <section className="knowledge-grid">
            <article className="panel-card">
              <div className="section-head">
                <div>
                  <p className="kicker">GUILD MEMORY • RAG FOUNDATION</p>
                  <h2>Search verified mission evidence</h2>
                </div>
                <button onClick={exportGuildMemory}>Export results</button>
              </div>
              <p>
                Completed quests become owner-only knowledge. Forge retrieves
                relevant evidence and cites its source; retrieved text is never
                trusted as an instruction.
              </p>
              <div className="knowledge-search">
                <input
                  value={knowledgeQuery}
                  onChange={(event) => setKnowledgeQuery(event.target.value)}
                  placeholder="Search decisions, repositories, tests…"
                  onKeyDown={(event) => {
                    if (event.key === "Enter") searchGuildMemory();
                  }}
                />
                <button className="primary" onClick={searchGuildMemory}>
                  Search memory
                </button>
              </div>
              <div className="citation-list">
                {knowledgeHits.length ? (
                  knowledgeHits.map((hit, index) => (
                    <article key={hit.id}>
                      <div>
                        <span>[K{index + 1}]</span>
                        <b>{hit.title}</b>
                        <em>{hit.trust_state.replaceAll("_", " ")}</em>
                      </div>
                      <p>
                        {hit.content.slice(0, 420)}
                        {hit.content.length > 420 ? "…" : ""}
                      </p>
                      <footer>
                        <code>{hit.source_uri}</code>
                        <button
                          className="danger-small"
                          onClick={() => deleteGuildMemory(hit)}
                        >
                          Delete
                        </button>
                      </footer>
                    </article>
                  ))
                ) : (
                  <p className="empty">
                    Run a Repository Health Quest, then search its verified
                    evidence here.
                  </p>
                )}
              </div>
            </article>
            <aside>
              <article className="panel-card">
                <p className="kicker">MEMORY CONTRACT</p>
                <h2>Evidence, not silent retraining</h2>
                <ul>
                  <li>Owner-scoped retrieval</li>
                  <li>Source and trust label on every result</li>
                  <li>Mission evidence saved only after the approved run</li>
                  <li>Insufficient evidence must be stated</li>
                  <li>Owner-controlled export and deletion</li>
                </ul>
              </article>
              <article className="panel-card">
                <p className="kicker">UNLOCKED SKILLS</p>
                <div className="skills vertical">
                  {agents.map((a, i) => (
                    <span key={a.id} className={level > i ? "unlocked" : ""}>
                      {level > i ? "✓" : "○"} {a.skill}
                    </span>
                  ))}
                </div>
              </article>
            </aside>
          </section>
        )}

        {tab === "settings" && (
          <section className="settings-grid">
            <article className="panel-card">
              <p className="kicker">APPEARANCE</p>
              <h2>Theme</h2>
              <div className="theme-options">
                <button onClick={() => setTheme("mission")}>
                  Mission dark
                </button>
                <button onClick={() => setTheme("warm")}>Warm paper</button>
                <button onClick={() => setTheme("slate")}>Slate blue</button>
              </div>
            </article>
            <article className="panel-card">
              <p className="kicker">OWNER SECURITY</p>
              <h2>Change password</h2>
              <p>
                Set a new password from this trusted signed-in device. Every
                other session will be signed out.
              </p>
              <form className="password-form" onSubmit={changePassword}>
                <label>
                  New password
                  <input
                    name="newPassword"
                    type="password"
                    minLength={12}
                    maxLength={128}
                    required
                    autoComplete="new-password"
                    placeholder="12 characters or more"
                  />
                </label>
                <label>
                  Confirm new password
                  <input
                    name="confirmPassword"
                    type="password"
                    minLength={12}
                    maxLength={128}
                    required
                    autoComplete="new-password"
                  />
                </label>
                <button className="primary" type="submit" disabled={demoMode}>
                  Change password and rotate sessions
                </button>
              </form>
              <small className="security-note">
                The password is sent only to the authenticated Worker and stored
                as a salted hash.
              </small>
            </article>
            <article className="panel-card">
              <p className="kicker">PASSKEYS</p>
              <h2>Passwordless sign-in</h2>
              <p>
                Use your phone, fingerprint, face, Windows Hello, or security
                key. Passkeys are bound to this HTTPS domain.
              </p>
              <button className="primary" onClick={addPasskey}>
                Add a passkey
              </button>
              <div className="passkey-list">
                {passkeys.length ? (
                  passkeys.map((item) => (
                    <div key={item.id}>
                      <span>
                        <b>{item.name}</b>
                        <small>
                          {item.device_type.replaceAll("_", " ")} •{" "}
                          {item.backed_up ? "synced backup" : "device-bound"}
                        </small>
                      </span>
                      <button
                        type="button"
                        onClick={() => deletePasskey(item.id)}
                      >
                        Remove
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="muted">
                    No passkeys registered yet. Keep your password as a recovery
                    method.
                  </p>
                )}
              </div>
            </article>
            <article className="panel-card">
              <p className="kicker">AI CONNECTIONS</p>
              <h2>Models and tools</h2>
              <p>
                Search providers, open official key pages, then store
                credentials only as Cloudflare secrets.
              </p>
              <div className="tool-actions">
                <button onClick={() => setTab("models")}>
                  Search AI models
                </button>
                <button onClick={() => setTab("studio")}>
                  Open Developer Studio
                </button>
              </div>
            </article>
            <article className="panel-card">
              <p className="kicker">SECURITY</p>
              <h2>Backend rules</h2>
              <ul>
                <li>D1-backed owner login and passkeys</li>
                <li>HTTP-only session cookie</li>
                <li>Server-side provider secrets</li>
                <li>Explicit human approval</li>
                <li>Read-only GitHub inspection</li>
              </ul>
            </article>
            <article className="panel-card">
              <p className="kicker">RECOMMENDED NEXT TOOLS</p>
              <h2>Backend capability stack</h2>
              <ul>
                <li>Cloudflare Queues for durable agent jobs</li>
                <li>Vectorize for cited knowledge retrieval</li>
                <li>GitHub App with repository-scoped permissions</li>
                <li>Sentry or Workers Logs for errors</li>
                <li>Stripe only when SaaS billing is ready</li>
              </ul>
            </article>
          </section>
        )}
      </main>
      <button
        className={`copilot-fab ${copilotBusy ? "thinking" : ""}`}
        onClick={() => setCopilotOpen((value) => !value)}
        aria-label="Open Forge Copilot"
      >
        <span>⌘</span>
        <i />
      </button>
      {copilotOpen && (
        <aside className="copilot-drawer">
          <div className="section-head">
            <div>
              <p className="kicker">FORGE COPILOT • LEVEL {forgeGrowth.level}</p>
              <h2>Developer specialist</h2>
            </div>
            <button onClick={() => setCopilotOpen(false)}>×</button>
          </div>
          <div className="copilot-presence">
            <div
              className={`copilot-mini-face ${copilotBusy ? "thinking" : copilotListening ? "listening" : ""}`}
            >
              <span>⌘</span>
              <i />
            </div>
            <span>
              <b>
                {copilotBusy
                  ? "Forge is analyzing…"
                  : copilotListening
                    ? "Listening to your question…"
                    : "Forge is ready"}
              </b>
              <small>{forgeGrowth.xp} verified XP • {forgeGrowth.memory_records} cited memories</small>
            </span>
            <button
              type="button"
              className={copilotVoice ? "voice-on" : ""}
              onClick={() => {
                setCopilotVoice((value) => !value);
                window.speechSynthesis?.cancel();
              }}
            >
              {copilotVoice ? "🔊 Voice on" : "🔇 Voice off"}
            </button>
          </div>
          <div className="copilot-quick-prompts">
            <button
              onClick={() =>
                setCopilotQuestion(
                  "What should we build next based on the current roadmap?",
                )
              }
            >
              Next upgrade
            </button>
            <button
              onClick={() =>
                setCopilotQuestion(
                  "Explain the active mission and its evidence in simple steps.",
                )
              }
            >
              Explain mission
            </button>
            <button
              onClick={() =>
                setCopilotQuestion(
                  "Check the security boundaries and suggest the safest improvement.",
                )
              }
            >
              Security check
            </button>
          </div>
          <div className="copilot-chat" aria-live="polite">
            {copilotMessages.map((message, index) => (
              <div key={index} className={`chat-message ${message.role}`}>
                <b>{message.role === "copilot" ? "Forge" : "You"}</b>
                <p>{message.text}</p>
                {message.role === "copilot" && (
                  <button
                    className="message-listen"
                    type="button"
                    onClick={() => speakCopilot(message.text)}
                  >
                    ◖ Listen
                  </button>
                )}
                {message.citations?.length ? (
                  <div className="chat-citations">
                    {message.citations.map((citation, citationIndex) => (
                      <span key={citation.id}>
                        [K{citationIndex + 1}] {citation.title}
                        <small>{citation.source_uri}</small>
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
            {copilotBusy && (
              <div className="forge-typing">
                <i />
                <i />
                <i />
                <span>Coordinating the guild…</span>
              </div>
            )}
          </div>
          <form onSubmit={askCopilot}>
            <div className="copilot-compose">
              <textarea
                value={copilotQuestion}
                onChange={(event) => setCopilotQuestion(event.target.value)}
                placeholder="Ask about architecture, models, tests, or your next quest…"
              />
              <button
                type="button"
                className={copilotListening ? "listening" : ""}
                onClick={startVoiceQuestion}
                aria-label="Speak a question"
              >
                {copilotListening ? "●" : "🎙"}
              </button>
            </div>
            <button className="primary" type="submit" disabled={copilotBusy}>
              {copilotBusy ? "Forge is working…" : "Send to Forge"}
            </button>
            <small className="voice-privacy">
              Microphone access requires your browser permission. Captured text
              is shown for review before sending.
            </small>
          </form>
        </aside>
      )}
      {toast && <div className="toast">{toast}</div>}
      {tab === "network" && (
        <CCNANetworkLab
          onEarnXp={(amount) => {
            setXp((value) => value + amount);
            notify(`+${amount} Network XP • quest complete`);
          }}
        />
      )}
      {tab === "lab" && (
        <SecurityLab
          status={labStatus}
          duration={labDuration}
          authorized={labAuthorized}
          busy={labBusy}
          onDuration={setLabDuration}
          onAuthorized={setLabAuthorized}
          onRefresh={refreshLab}
          onStart={startLab}
          onDestroy={destroyLab}
          onLesson={() => {
            setCopilotQuestion(
              "Teach me a defensive web-security exercise for the Authorized Security Lab. Use only the bundled local target, explain the risk, evidence, secure fix, verification, and cleanup. Do not target external systems.",
            );
            setCopilotOpen(true);
          }}
        />
      )}
      {tab === "ops" && (
        <DeploymentCenter
          health={deploymentHealth}
          error={deploymentError}
          checking={deploymentChecking}
          uiBuild={UI_BUILD}
          onRefresh={checkDeployment}
        />
      )}
    </div>
  );
}

function SecurityLab({
  status,
  duration,
  authorized,
  busy,
  onDuration,
  onAuthorized,
  onRefresh,
  onStart,
  onDestroy,
  onLesson,
}: {
  status: SecurityLabStatus | null;
  duration: number;
  authorized: boolean;
  busy: boolean;
  onDuration: (value: number) => void;
  onAuthorized: (value: boolean) => void;
  onRefresh: () => void;
  onStart: () => void;
  onDestroy: () => void;
  onLesson: () => void;
}) {
  return (
    <section className="lab-overlay">
      <div className="lab-grid">
        <article className="panel-card">
          <p className="kicker">PERMANENT CONTROL • DISPOSABLE EXERCISES</p>
          <h2>Defensive Cyber Range</h2>
          <p>
            Learn to find and fix web-app weaknesses inside a private Docker
            network. The only target is the bundled training app; unrelated
            domains and IP addresses are never accepted.
          </p>
          <div className="lab-status">
            <div>
              <small>Engine</small>
              <b>
                {status?.dockerReady
                  ? `Docker ${status.dockerVersion}`
                  : "Check required"}
              </b>
            </div>
            <div>
              <small>Session</small>
              <b>{status?.active ? "ACTIVE" : "Stopped"}</b>
            </div>
            <div>
              <small>External network</small>
              <b>{status?.externalNetwork || "Blocked by design"}</b>
            </div>
            <div>
              <small>Auto-destroy</small>
              <b>
                {status?.expiresAt
                  ? new Date(status.expiresAt).toLocaleTimeString()
                  : "Armed on start"}
              </b>
            </div>
          </div>
          <div className="lab-form">
            <label>
              Exercise limit
              <select
                value={duration}
                onChange={(event) => onDuration(Number(event.target.value))}
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={60}>60 minutes</option>
                <option value={120}>120 minutes</option>
              </select>
            </label>
            <label className="lab-approval">
              <input
                type="checkbox"
                checked={authorized}
                onChange={(event) => onAuthorized(event.target.checked)}
              />
              <span>
                I confirm that I own and authorize this local training lab. I
                will use only the bundled allowlisted target.
              </span>
            </label>
            <div className="device-actions">
              <button onClick={onRefresh}>Check Docker and status</button>
              <button
                className="primary"
                disabled={busy || Boolean(status?.active)}
                onClick={onStart}
              >
                {busy ? "Working…" : "Preview, approve and start"}
              </button>
              <button disabled={busy || !status?.active} onClick={onDestroy}>
                Destroy now
              </button>
            </div>
          </div>
          {status?.active && (
            <div className="notice lab-safe">
              Training target:{" "}
              <a href="http://127.0.0.1:3001" target="_blank" rel="noreferrer">
                http://127.0.0.1:3001 ↗
              </a>
              . Kali and the target share only the internal lab network.
            </div>
          )}
        </article>
        <aside>
          <article className="panel-card lab-safe">
            <p className="kicker">FORGE CYBER COACH</p>
            <h2>Learn, inspect, repair</h2>
            <ul>
              <li>Explains weaknesses and safe evidence</li>
              <li>Suggests the smallest secure-code fix</li>
              <li>Shows validation and rollback steps</li>
              <li>Waits for your approval before action</li>
              <li>Records the exercise in the audit log</li>
            </ul>
            <button onClick={onLesson}>Ask Forge for a lesson</button>
          </article>
          <article className="panel-card lab-danger">
            <p className="kicker">HARD BOUNDARIES</p>
            <h2>Outside the lab is denied</h2>
            <ul>
              <li>No host filesystem or production secrets mounted</li>
              <li>No external target input</li>
              <li>No internet egress from lab containers</li>
              <li>CPU, memory, process and time limits</li>
              <li>No silent commands or persistence</li>
            </ul>
          </article>
          <article className="panel-card">
            <p className="kicker">AUDIT LOG</p>
            <div className="lab-audit">
              {status?.audit.length ? (
                [...status.audit].reverse().map((entry, index) => (
                  <div key={index}>
                    <time>
                      {entry.at
                        ? new Date(entry.at).toLocaleString()
                        : "Unknown"}
                    </time>
                    <b>{entry.action.replaceAll("_", " ")}</b>
                  </div>
                ))
              ) : (
                <p className="empty">No lab actions recorded yet.</p>
              )}
            </div>
          </article>
        </aside>
      </div>
    </section>
  );
}

function DeploymentCenter({
  health,
  error,
  checking,
  uiBuild,
  onRefresh,
}: {
  health: DeploymentHealth | null;
  error: string;
  checking: boolean;
  uiBuild: string;
  onRefresh: () => void;
}) {
  const matched = Boolean(health && health.build === uiBuild);
  return (
    <section className="ops-overlay">
      <div className="ops-grid">
        <article className="panel-card">
          <div className="section-head">
            <div>
              <p className="kicker">LIVE RELEASE VERIFICATION</p>
              <h2>
                {error
                  ? "Health check failed"
                  : matched
                    ? "Release synchronized"
                    : health
                      ? "Deployment mismatch"
                      : "Checking deployment"}
              </h2>
            </div>
            <span
              className={`ops-badge ${error ? "fail" : matched ? "pass" : "warn"}`}
            >
              {error ? "ERROR" : matched ? "PASS" : "REVIEW"}
            </span>
          </div>
          <p>
            The UI and Worker must report the same build identifier. A mismatch
            means GitHub or Cloudflare is serving an older release.
          </p>
          <div className="ops-facts">
            <div>
              <small>UI build</small>
              <code>{uiBuild}</code>
            </div>
            <div>
              <small>Worker build</small>
              <code>{health?.build || "Unavailable"}</code>
            </div>
            <div>
              <small>API version</small>
              <b>{health?.version || "Unavailable"}</b>
            </div>
            <div>
              <small>Checked</small>
              <b>
                {health?.checked_at
                  ? new Date(health.checked_at).toLocaleString()
                  : "Not yet"}
              </b>
            </div>
          </div>
          {error && <div className="notice ops-error">{error}</div>}
          {health && !matched && (
            <div className="notice ops-warning">
              Cloudflare is serving a different backend build. Redeploy the
              latest GitHub main commit, then refresh this check.
            </div>
          )}
          <div className="device-actions">
            <button className="primary" disabled={checking} onClick={onRefresh}>
              {checking ? "Checking…" : "Run live check"}
            </button>
            <a
              className="button-link"
              href="https://dash.cloudflare.com/"
              target="_blank"
              rel="noreferrer"
            >
              Open Cloudflare ↗
            </a>
            <a
              className="button-link"
              href="https://github.com/bossayan9999/aios-robot-guild-/commits/main"
              target="_blank"
              rel="noreferrer"
            >
              View GitHub commits ↗
            </a>
          </div>
        </article>
        <aside>
          <article className="panel-card">
            <p className="kicker">SERVICE CHECKS</p>
            <div className="doctor-checks">
              <div className={`doctor-check ${health?.ok ? "pass" : "fail"}`}>
                <i>{health?.ok ? "✓" : "×"}</i>
                <div>
                  <b>Worker API</b>
                  <small>
                    {health?.ok
                      ? "Health endpoint responded"
                      : "No healthy response"}
                  </small>
                </div>
              </div>
              <div
                className={`doctor-check ${health?.checks?.assets === "pass" ? "pass" : "warn"}`}
              >
                <i>{health?.checks?.assets === "pass" ? "✓" : "!"}</i>
                <div>
                  <b>Static assets</b>
                  <small>{health?.checks?.assets || "Unknown"}</small>
                </div>
              </div>
              <div className={`doctor-check ${matched ? "pass" : "warn"}`}>
                <i>{matched ? "✓" : "!"}</i>
                <div>
                  <b>Version contract</b>
                  <small>
                    {matched
                      ? "UI and Worker match"
                      : "Redeployment may be required"}
                  </small>
                </div>
              </div>
            </div>
          </article>
          <article className="panel-card">
            <p className="kicker">SUPPORT EVIDENCE</p>
            <h2>Request ID</h2>
            <code className="ops-request">
              {health?.request_id || "Generated after a successful check"}
            </code>
            <p className="muted">
              Copy this ID when reporting an error so logs can be correlated
              without exposing secrets.
            </p>
          </article>
          <article className="panel-card">
            <p className="kicker">RELEASE CHECKLIST</p>
            <ol>
              <li>Tests and build pass</li>
              <li>GitHub main contains the release</li>
              <li>Cloudflare deployment is active</li>
              <li>UI and Worker build IDs match</li>
              <li>Authenticated smoke test passes</li>
              <li>Rollback version is recorded</li>
            </ol>
          </article>
        </aside>
      </div>
    </section>
  );
}

function Nav({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button className={`nav ${active ? "active" : ""}`} onClick={onClick}>
      <span>{icon}</span>
      {label}
    </button>
  );
}

function ToolLink({
  name,
  note,
  href,
  icon,
}: {
  name: string;
  note: string;
  href: string;
  icon: string;
}) {
  return (
    <a href={href} target="_blank" rel="noreferrer">
      <span>{icon}</span>
      <div>
        <b>{name}</b>
        <small>{note}</small>
      </div>
      <em>↗</em>
    </a>
  );
}
