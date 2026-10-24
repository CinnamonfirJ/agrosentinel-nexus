export function AlertDiff({ alert }: { alert: any }) {
  try {
    if (!alert.old_plan) return null;
    const old = JSON.parse(alert.old_plan),
      update = JSON.parse(alert.new_plan || "{}"),
      plan = update.result || update;
    return (
      <div className="plan-diff">
        <div>
          <small>PREVIOUS PLAN · INVALIDATED</small>
          <p>{old.verdict}</p>
        </div>
        <div>
          <small>CURRENT STATUS · CHANGED</small>
          <p>
            {plan.verdict ||
              "Updated analysis is queued. Do not apply the previous plan."}
          </p>
          {(update.scan_id || update.pending_scan_id) && (
            <a
              className="text-button"
              href={"/field?scan=" + (update.scan_id || update.pending_scan_id)}
            >
              View updated analysis ↗
            </a>
          )}
        </div>
      </div>
    );
  } catch {
    return (
      <p>
        Plan details could not be read. Open the affected scan to review it.
      </p>
    );
  }
}
