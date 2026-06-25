export function shouldClearCareerClubForLeagueChange(previousLeague, nextLeague) {
  return previousLeague !== undefined && previousLeague !== nextLeague;
}

export function shouldLoadClubsForLeague(league) {
  return Boolean(String(league || '').trim());
}
