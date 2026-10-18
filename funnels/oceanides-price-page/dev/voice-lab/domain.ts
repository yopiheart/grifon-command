import { randomUUID } from 'node:crypto';
import { RATE, checkLocation, findRate } from '../../src/lib/rates';
import type { CriticalDetails, DispatchDecision, LabSnapshot, ToolEntry } from '../../src/voice-lab/contracts';

const detailKeys = ['name', 'contact', 'city', 'address', 'problem', 'access', 'preferredTime'] as const;
const string = (value: unknown, max = 300) => typeof value === 'string' ? value.trim().slice(0, max) : '';

export class VoiceDomain {
  constructor(public state: LabSnapshot, private readonly now = Date.now) {}

  snapshot(): LabSnapshot { return structuredClone(this.state); }

  automationStopped() { return ['declined', 'human_needed', 'failed'].includes(this.state.requestStatus); }

  private terminalResult() {
    if (!this.automationStopped()) return null;
    return { ok: false, error: this.state.requestStatus === 'declined' ? 'caller_declined' : this.state.requestStatus === 'human_needed' ? 'human_review_required' : 'workflow_failed', status: this.state.requestStatus, owner: this.state.owner, nextStep: this.state.nextStep };
  }

  transcript(role: 'caller' | 'assistant' | 'system', text: string) {
    const entry = { id: randomUUID(), role, text: text.slice(0, 6000), at: this.now() };
    this.state.transcript.push(entry);
    return entry;
  }

  private invalidate() {
    this.state.detailsConfirmed = false;
    this.state.acceptedVersion = null;
    this.state.dispatch = { version: this.state.dispatch.version + 1, decision: 'pending', pricePhp: null, slot: '', conditions: '' };
    this.state.requestStatus = 'collecting';
    this.state.nextStep = 'Caller must verify the revised details before Neil/Zam checks dispatch.';
  }

  updateDetails(input: Partial<CriticalDetails>) {
    const terminal = this.terminalResult();
    if (terminal) return terminal;
    const updates: Partial<CriticalDetails> = {};
    for (const key of detailKeys) {
      if (typeof input[key] === 'string') updates[key] = string(input[key]);
    }
    if (detailKeys.some(key => updates[key] !== undefined && updates[key] !== this.state.details[key])) {
      this.state.details = { ...this.state.details, ...updates };
      this.invalidate();
    }
    return { ok: true, details: { ...this.state.details }, needsReadback: true };
  }

  confirmDetails(confirmed: unknown) {
    const terminal = this.terminalResult();
    if (terminal) return terminal;
    if (confirmed !== true) return { ok: false, error: 'caller_confirmation_required' };
    const missing = detailKeys.filter(key => !this.state.details[key]);
    if (missing.length) return { ok: false, error: 'missing_details', missing };
    this.state.detailsConfirmed = true;
    return { ok: true, details: { ...this.state.details } };
  }

  lookupRate(city: string) {
    const terminal = this.terminalResult();
    if (terminal) return terminal;
    if (checkLocation(city)?.kind !== 'mm') {
      this.humanRequest('Location needs human review outside the Metro Manila pilot.');
      return { ok: false, eligible: false, nextStep: this.state.nextStep, owner: this.state.owner };
    }
    return { ok: true, eligible: true, rate: findRate(city), service: 'Household septic-tank siphoning', capacity: RATE.load, finalTotalRequiresDispatch: true };
  }

  requestService() {
    const terminal = this.terminalResult();
    if (terminal) return terminal;
    if (checkLocation(this.state.details.city)?.kind !== 'mm') {
      this.humanRequest('Location needs human review outside the Metro Manila pilot.');
      return { ok: false, error: 'outside_pilot', owner: this.state.owner };
    }
    if (!this.state.detailsConfirmed) return { ok: false, error: 'caller_detail_confirmation_required', details: { ...this.state.details } };
    if (['awaiting_dispatch', 'dispatch_approved', 'booked'].includes(this.state.requestStatus)) return { ok: true, status: this.state.requestStatus, dispatch: { ...this.state.dispatch } };
    this.state.requestStatus = 'awaiting_dispatch';
    this.state.nextStep = 'Neil/Zam must check the final price and crew slot with Boss Jay. No callback ETA is promised.';
    return { ok: true, status: 'awaiting_dispatch', owner: this.state.owner, confirmedBooking: false };
  }

  dispatch(input: { decision: DispatchDecision['decision']; pricePhp?: number; slot?: string; conditions?: string }) {
    const terminal = this.terminalResult();
    if (terminal) return terminal;
    if (!['awaiting_dispatch', 'dispatch_approved', 'booked'].includes(this.state.requestStatus)) return { ok: false, error: 'service_request_required' };
    if (input.decision === 'approved' && (!Number.isFinite(input.pricePhp) || Number(input.pricePhp) <= 0 || !string(input.slot))) return { ok: false, error: 'positive_final_price_and_slot_required' };
    this.state.acceptedVersion = null;
    this.state.dispatch = { version: this.state.dispatch.version + 1, decision: input.decision, pricePhp: input.decision === 'approved' ? Number(input.pricePhp) : null, slot: input.decision === 'approved' ? string(input.slot) : '', conditions: string(input.conditions) };
    this.state.requestStatus = input.decision === 'approved' ? 'dispatch_approved' : input.decision === 'rejected' ? 'human_needed' : 'awaiting_dispatch';
    this.state.nextStep = input.decision === 'approved' ? 'Read back the dispatch-approved final price, slot and conditions; obtain explicit customer acceptance of this version.' : 'Neil/Zam must arrange a suitable option with Boss Jay. No booking or ETA is confirmed.';
    return { ok: true, simulatedStaffAction: true, dispatch: { ...this.state.dispatch }, status: this.state.requestStatus };
  }

  customerAccept(version: unknown, explicit: unknown) {
    const terminal = this.terminalResult();
    if (terminal) return terminal;
    if (explicit !== true || this.state.requestStatus !== 'dispatch_approved' || version !== this.state.dispatch.version || !this.state.detailsConfirmed) return { ok: false, error: 'current_dispatch_approval_and_explicit_customer_acceptance_required' };
    this.state.acceptedVersion = this.state.dispatch.version;
    this.state.requestStatus = 'booked';
    this.state.nextStep = 'Simulated booking accepted. Neil/Zam owns the real-world follow-through; no production booking was made.';
    return { ok: true, status: 'booked', simulated: true, dispatch: { ...this.state.dispatch } };
  }

  humanRequest(reason = 'Caller requested a human.') {
    const terminal = this.terminalResult();
    if (terminal) return terminal;
    this.state.requestStatus = 'human_needed';
    this.state.acceptedVersion = null;
    this.state.nextStep = `Neil/Zam: ${reason} Callback request recorded locally. No transfer or callback time is confirmed.`;
    return { ok: true, status: 'human_needed', owner: this.state.owner, transferred: false, eta: null };
  }

  decline() {
    this.state.requestStatus = 'declined';
    this.state.acceptedVersion = null;
    this.state.nextStep = 'Caller declined. Stop selling and do not follow up in this session.';
    return { ok: true, status: 'declined' };
  }

  failure() {
    const terminal = this.terminalResult();
    if (terminal) return terminal;
    if (this.state.requestStatus === 'booked') return { ok: false, error: 'simulated_tool_failure', owner: this.state.owner };
    this.state.requestStatus = 'failed';
    this.state.acceptedVersion = null;
    this.state.nextStep = 'Neil/Zam must review the failed operation. No transfer, booking or callback ETA is confirmed.';
    return { ok: false, error: 'simulated_tool_failure', owner: this.state.owner };
  }

  tool(name: string, input: Record<string, unknown>): ToolEntry {
    let result: unknown;
    switch (name) {
      case 'lookup_rate': result = this.lookupRate(string(input.city) || this.state.details.city); break;
      case 'update_details': result = this.updateDetails(input); break;
      case 'confirm_details': result = this.confirmDetails(input.confirmed); break;
      case 'create_service_request': result = this.requestService(); break;
      case 'get_dispatch': result = { ok: true, dispatch: { ...this.state.dispatch }, status: this.state.requestStatus }; break;
      case 'accept_booking': result = this.customerAccept(input.version, input.explicit); break;
      case 'human_callback': result = this.humanRequest(string(input.reason) || undefined); break;
      case 'decline': result = this.decline(); break;
      case 'fail_tool': result = this.failure(); break;
      default: result = { ok: false, error: 'unknown_tool' };
    }
    const entry = { id: randomUUID(), name, input: structuredClone(input), result, at: this.now(), ok: Boolean((result as { ok?: boolean }).ok) };
    this.state.toolLog.push(entry);
    return entry;
  }

  scriptedTurn(text: string): { reply: string; tool?: ToolEntry } {
    const normal = text.toLowerCase().trim();
    if (this.state.requestStatus === 'declined') return { reply: 'Understood. This scripted session has stopped selling and will not follow up.' };
    if (/^(no thanks|stop|do not call|not interested|i decline)[.!]*$/.test(normal)) return { tool: this.tool('decline', {}), reply: 'Understood. No further selling or follow-up in this session.' };
    if (this.automationStopped()) return { reply: `${this.state.nextStep} Automated qualification is stopped; begin a new test session to test another flow.` };
    const correction = text.match(/^(name|contact|city|address|problem|access|preferred time):\s*(.+)$/i);
    if (correction) {
      const key = correction[1].toLowerCase() === 'preferred time' ? 'preferredTime' : correction[1].toLowerCase();
      const tool = this.tool('update_details', { [key]: correction[2] });
      return { tool, reply: `Updated details: ${JSON.stringify(this.state.details)}. Please verify them using Confirm details. Any previous approval is invalidated.` };
    }
    if (normal === 'confirm details') return { tool: this.tool('confirm_details', { confirmed: true }), reply: `Caller detail confirmation recorded for: ${JSON.stringify(this.state.details)}. This does not accept a booking.` };
    if (normal === 'submit request') {
      const tool = this.tool('create_service_request', {});
      return { tool, reply: this.state.nextStep };
    }
    if (normal === 'fail tool') return { tool: this.tool('fail_tool', {}), reply: this.state.nextStep };
    if (normal.includes('person') || normal.includes('human')) return { tool: this.tool('human_callback', {}), reply: this.state.nextStep };
    if (normal.includes('discount') || normal.includes('expensive')) {
      const tool = this.tool('lookup_rate', { city: this.state.details.city });
      return { tool, reply: checkLocation(this.state.details.city)?.kind === 'mm' ? 'The confirmed Metro Manila household rate is PHP 5,000 per truckload, up to 4,000 liters per load. No discount or final job total is approved. Neil/Zam must confirm the total and crew slot.' : this.state.nextStep };
    }
    if (normal.includes('rate') || normal.includes('price') || normal.includes('how much')) {
      const tool = this.tool('lookup_rate', { city: this.state.details.city });
      return { tool, reply: checkLocation(this.state.details.city)?.kind === 'mm' ? 'PHP 5,000 per truckload, up to 4,000 liters per load, for household siphoning in Metro Manila. The final total and schedule require Neil/Zam dispatch approval and your acceptance.' : 'This address is outside the Metro Manila pilot. Neil/Zam must review it; this lab cannot quote it.' };
    }
    if (normal.includes('wait') || normal.includes('moment')) return { reply: 'Take your time. This is a scripted text simulation; pacing and speech recognition require an approved live test.' };
    return { reply: 'Scripted mock: arbitrary language is not interpreted. Use a scenario line, a field correction such as City: Pasig, Confirm details, Submit request, Fail tool, No thanks, or the explicit controls.' };
  }
}
