export type ClassifierCandidateRow = {
  pending: boolean;
  direction: string;
  budget_id: string | null;
  budget_match_source: string | null;
  budget_assignment_source: string | null;
  budget_assignment_governed: boolean;
  money_meaning: string | null;
  hasAllocation: boolean;
};

export function isMoneyClassifierCandidate(row: ClassifierCandidateRow): boolean {
  return row.direction === 'outflow'
    && row.budget_id == null
    && row.budget_match_source == null
    && row.budget_assignment_source == null
    && row.budget_assignment_governed === false
    && !row.hasAllocation
    && (row.money_meaning == null || row.money_meaning === 'unknown');
}
