export type HeartReportMetrics = {
  asOf: string;
  periodStart: string;
  excludedAccounts: number;
  excludedInstalls: number;
  externalAccountsTotal: number;
  happiness: { responses28d: number; positive28d: number };
  engagement: {
    activeUsers7d: number;
    previousActiveUsers7d: number;
    activitiesCreated7d: number;
    activitiesCompleted7d: number;
    aiActors7d: number;
    aiRequests7d: number;
  };
  adoption: {
    newAccounts7d: number;
    previousNewAccounts7d: number;
    activatedNewAccounts28d: number;
    newAccounts28d: number;
  };
  retention: { eligibleUsers28d: number; returnedUsers7d: number };
  taskSuccess: {
    activitiesCreated28d: number;
    activitiesCompletedWithin7d: number;
    aiRequests28d: number;
    aiSuccessfulRequests28d: number;
  };
};

export type HeartReportAuthUser = { id: string; email: string | null };
export type HeartReportInstallIdentity = { userId: string | null; installId: string };

export function resolveHeartReportExclusions(input: {
  users: HeartReportAuthUser[];
  identities: HeartReportInstallIdentity[];
  founderEmails: string[];
}): { userIds: string[]; installIds: string[] } {
  const founderEmails = new Set(input.founderEmails.map((email) => email.trim().toLowerCase()).filter(Boolean));
  const initialUserIds = new Set<string>();

  for (const user of input.users) {
    const email = (user.email ?? '').trim().toLowerCase();
    const isFounder = founderEmails.has(email);
    const isAutomated = email.startsWith('onboarding-test-') && email.endsWith('@kwilt.app') ||
      email.startsWith('kwilt-budget-e2e-') && email.endsWith('@kwilt.app');
    if (isFounder || isAutomated) initialUserIds.add(user.id);
  }

  const initialInstallIds = new Set(
    input.identities
      .filter((identity) => identity.userId && initialUserIds.has(identity.userId))
      .map((identity) => identity.installId),
  );
  const userIds = new Set(initialUserIds);
  for (const identity of input.identities) {
    if (initialInstallIds.has(identity.installId) && identity.userId) userIds.add(identity.userId);
  }

  const installIds = new Set(initialInstallIds);
  for (const identity of input.identities) {
    if (identity.userId && userIds.has(identity.userId)) installIds.add(identity.installId);
  }

  return {
    userIds: Array.from(userIds).sort(),
    installIds: Array.from(installIds).sort(),
  };
}

export type HeartStatus = 'healthy' | 'watch' | 'concern' | 'insufficient_data';

export type HeartDimension = {
  name: 'Happiness' | 'Engagement' | 'Adoption' | 'Retention' | 'Task success';
  status: HeartStatus;
  primaryLabel: string;
  primaryValue: number | null;
  primarySuffix: string;
  summary: string;
  evidence: string[];
};

export type HeartReport = {
  metrics: HeartReportMetrics;
  dimensions: {
    happiness: HeartDimension;
    engagement: HeartDimension;
    adoption: HeartDimension;
    retention: HeartDimension;
    taskSuccess: HeartDimension;
  };
  overall: {
    status: 'healthy' | 'watch' | 'concern' | 'too_early';
    headline: string;
    summary: string;
  };
};

function percentage(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return Math.round((numerator / denominator) * 100);
}

function signedDelta(current: number, previous: number): string {
  const delta = current - previous;
  return delta > 0 ? `+${delta}` : String(delta);
}

function statusLabel(status: HeartStatus): string {
  switch (status) {
    case 'healthy':
      return 'Healthy';
    case 'watch':
      return 'Watch';
    case 'concern':
      return 'Concern';
    case 'insufficient_data':
      return 'Not measurable yet';
  }
}

export function buildHeartReport(metrics: HeartReportMetrics): HeartReport {
  const happinessRate = percentage(metrics.happiness.positive28d, metrics.happiness.responses28d);
  const happinessStatus: HeartStatus = metrics.happiness.responses28d < 5
    ? 'insufficient_data'
    : (happinessRate ?? 0) >= 70
      ? 'healthy'
      : (happinessRate ?? 0) >= 50
        ? 'watch'
        : 'concern';

  const engagementStatus: HeartStatus = metrics.engagement.activeUsers7d === 0
    ? 'concern'
    : metrics.engagement.activeUsers7d >= metrics.engagement.previousActiveUsers7d
      ? 'healthy'
      : 'watch';

  const activationRate = percentage(
    metrics.adoption.activatedNewAccounts28d,
    metrics.adoption.newAccounts28d,
  );
  const adoptionStatus: HeartStatus = metrics.adoption.newAccounts7d === 0
    ? 'concern'
    : (activationRate ?? 0) >= 30
      ? 'healthy'
      : 'watch';

  const returnRate = percentage(metrics.retention.returnedUsers7d, metrics.retention.eligibleUsers28d);
  const retentionStatus: HeartStatus = metrics.retention.eligibleUsers28d < 3
    ? 'insufficient_data'
    : (returnRate ?? 0) >= 40
      ? 'healthy'
      : (returnRate ?? 0) > 0
        ? 'watch'
        : 'concern';

  const completionRate = percentage(
    metrics.taskSuccess.activitiesCompletedWithin7d,
    metrics.taskSuccess.activitiesCreated28d,
  );
  const aiSuccessRate = percentage(
    metrics.taskSuccess.aiSuccessfulRequests28d,
    metrics.taskSuccess.aiRequests28d,
  );
  const taskSuccessStatus: HeartStatus = completionRate === null
    ? 'insufficient_data'
    : completionRate >= 60 && (aiSuccessRate === null || aiSuccessRate >= 95)
      ? 'healthy'
      : completionRate >= 30 && (aiSuccessRate === null || aiSuccessRate >= 85)
        ? 'watch'
        : 'concern';

  const dimensions = {
    happiness: {
      name: 'Happiness' as const,
      status: happinessStatus,
      primaryLabel: 'Positive Chapter feedback (28d)',
      primaryValue: happinessRate,
      primarySuffix: '%' as const,
      summary: happinessStatus === 'insufficient_data'
        ? 'Not enough direct sentiment exists to judge whether people feel helped and understood.'
        : `${happinessRate}% of recent Chapter feedback was positive.`,
      evidence: [
        `${metrics.happiness.responses28d} feedback response${metrics.happiness.responses28d === 1 ? '' : 's'} in 28 days`,
        'Minimum sample for a directional Happiness signal: 5 responses',
      ],
    },
    engagement: {
      name: 'Engagement' as const,
      status: engagementStatus,
      primaryLabel: 'Meaningfully active users (7d)',
      primaryValue: metrics.engagement.activeUsers7d,
      primarySuffix: metrics.engagement.activeUsers7d === 1 ? ' user' : ' users',
      summary: `${metrics.engagement.activeUsers7d} ${metrics.engagement.activeUsers7d === 1 ? 'person' : 'people'} changed a life-architecture object this week (${signedDelta(metrics.engagement.activeUsers7d, metrics.engagement.previousActiveUsers7d)} vs prior week).`,
      evidence: [
        `${metrics.engagement.activitiesCreated7d} Activities created`,
        `${metrics.engagement.activitiesCompleted7d} Activities completed`,
        `${metrics.engagement.aiRequests7d} AI requests from ${metrics.engagement.aiActors7d} install${metrics.engagement.aiActors7d === 1 ? '' : 's'}`,
      ],
    },
    adoption: {
      name: 'Adoption' as const,
      status: adoptionStatus,
      primaryLabel: 'Reached Arc → Goal → Activity within 7 days',
      primaryValue: activationRate,
      primarySuffix: '%' as const,
      summary: `${metrics.adoption.newAccounts7d} new external accounts this week (${signedDelta(metrics.adoption.newAccounts7d, metrics.adoption.previousNewAccounts7d)} vs prior week).`,
      evidence: [
        activationRate === null
          ? 'No 28-day signup cohort exists for activation measurement'
          : `${activationRate}% of 28-day signups reached Arc → Goal → Activity within 7 days`,
        `${metrics.adoption.activatedNewAccounts28d} activated of ${metrics.adoption.newAccounts28d} new accounts`,
      ],
    },
    retention: {
      name: 'Retention' as const,
      status: retentionStatus,
      primaryLabel: 'Returned after prior-period use',
      primaryValue: returnRate,
      primarySuffix: '%' as const,
      summary: returnRate === null
        ? 'No eligible prior-period cohort exists yet.'
        : `${metrics.retention.returnedUsers7d} of ${metrics.retention.eligibleUsers28d} recently active people returned this week.`,
      evidence: [
        'Eligible users had a meaningful event 8–28 days ago',
        'A return requires another meaningful event in the last 7 days',
      ],
    },
    taskSuccess: {
      name: 'Task success' as const,
      status: taskSuccessStatus,
      primaryLabel: 'Activities completed within 7 days',
      primaryValue: completionRate,
      primarySuffix: '%' as const,
      summary: completionRate === null
        ? 'No recent Activity cohort exists for completion measurement.'
        : `${metrics.taskSuccess.activitiesCompletedWithin7d} of ${metrics.taskSuccess.activitiesCreated28d} recent Activities were completed within 7 days.`,
      evidence: [
        aiSuccessRate === null
          ? 'No AI requests in the 28-day window'
          : `${aiSuccessRate}% AI request technical success rate`,
        'Completion is treated as evidence of carrying intention into action, not as productivity volume',
      ],
    },
  };

  const dimensionValues = Object.values(dimensions);
  const concernCount = dimensionValues.filter((dimension) => dimension.status === 'concern').length;
  const tooEarly = metrics.externalAccountsTotal < 50 ||
    metrics.engagement.activeUsers7d < 5 ||
    happinessStatus === 'insufficient_data';

  const overall = tooEarly
    ? {
        status: 'too_early' as const,
        headline: 'Too early to declare product success',
        summary: 'Kwilt has real external behavior, but the active cohort and direct sentiment sample are still too small for a reliable success verdict.',
      }
    : concernCount >= 2
      ? {
          status: 'concern' as const,
          headline: 'Product success is at risk',
          summary: 'At least two HEART dimensions are below the current operating threshold.',
        }
      : dimensionValues.every((dimension) => dimension.status === 'healthy')
        ? {
            status: 'healthy' as const,
            headline: 'HEART signals are healthy',
            summary: 'Every measurable HEART dimension is meeting the current operating threshold.',
          }
        : {
            status: 'watch' as const,
            headline: 'Some success signals need attention',
            summary: 'Kwilt is creating value, but at least one HEART dimension is not yet healthy.',
          };

  return { metrics, dimensions, overall };
}

function valueLabel(dimension: HeartDimension): string {
  return dimension.primaryValue === null
    ? '—'
    : `${dimension.primaryValue}${dimension.primarySuffix}`;
}

function dateLabel(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'America/Denver',
  }).format(new Date(iso));
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function renderHeartReportText(report: HeartReport): string {
  const { metrics, dimensions, overall } = report;
  const lines = [
    `Kwilt weekly Google HEART report — ${dateLabel(metrics.asOf)}`,
    '',
    overall.headline,
    overall.summary,
    '',
  ];

  for (const dimension of Object.values(dimensions)) {
    lines.push(`${dimension.name}: ${statusLabel(dimension.status)} — ${dimension.primaryLabel}: ${valueLabel(dimension)}`);
    lines.push(dimension.summary);
    for (const evidence of dimension.evidence) lines.push(`- ${evidence}`);
    lines.push('');
  }

  lines.push(`External accounts measured: ${metrics.externalAccountsTotal}`);
  lines.push(`Founder/test data excluded: ${metrics.excludedAccounts} accounts, ${metrics.excludedInstalls} installs`);
  lines.push('HEART is reported dimension by dimension; Kwilt does not collapse identity work into a vanity score.');
  return lines.join('\n');
}

export function renderHeartReportHtml(report: HeartReport): string {
  const { metrics, dimensions, overall } = report;
  const colors: Record<HeartStatus, string> = {
    healthy: '#137333',
    watch: '#9a6700',
    concern: '#b3261e',
    insufficient_data: '#5f6368',
  };
  const cards = Object.values(dimensions).map((dimension) => `
    <section style="border:1px solid #e5e7eb;border-radius:14px;padding:18px;margin:0 0 12px;background:#fff">
      <div style="color:${colors[dimension.status]};font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em">${escapeHtml(statusLabel(dimension.status))}</div>
      <h2 style="font-size:20px;margin:6px 0 4px;color:#111827">${escapeHtml(dimension.name)}</h2>
      <div style="font-size:28px;font-weight:700;color:#111827">${escapeHtml(valueLabel(dimension))}</div>
      <div style="font-size:13px;color:#6b7280;margin-bottom:10px">${escapeHtml(dimension.primaryLabel)}</div>
      <p style="font-size:15px;line-height:1.5;color:#374151">${escapeHtml(dimension.summary)}</p>
      <ul style="padding-left:20px;color:#4b5563;font-size:14px;line-height:1.5">${dimension.evidence.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
    </section>`).join('');

  return `<!doctype html>
  <html><body style="margin:0;background:#f6f7f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
    <main style="max-width:640px;margin:0 auto;padding:28px 18px">
      <div style="font-size:13px;color:#6b7280">Kwilt · Weekly Google HEART · ${escapeHtml(dateLabel(metrics.asOf))}</div>
      <h1 style="font-size:28px;line-height:1.2;color:#111827;margin:8px 0">${escapeHtml(overall.headline)}</h1>
      <p style="font-size:16px;line-height:1.55;color:#374151;margin:0 0 22px">${escapeHtml(overall.summary)}</p>
      ${cards}
      <p style="font-size:12px;line-height:1.5;color:#6b7280;margin-top:20px">
        External accounts measured: ${metrics.externalAccountsTotal}. Founder/test data excluded: ${metrics.excludedAccounts} accounts and ${metrics.excludedInstalls} installs.<br>
        HEART is reported dimension by dimension; Kwilt does not collapse identity work into a vanity score.
      </p>
    </main>
  </body></html>`;
}
