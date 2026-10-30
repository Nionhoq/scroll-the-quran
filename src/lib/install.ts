export type InstallVisibility = {
  visits: number;
  dismissed: boolean;
  installed: boolean;
  standalone: boolean;
  isIOS: boolean;
  canPrompt: boolean;
};

export function canShowInstallCard({
  visits,
  dismissed,
  installed,
  standalone,
  isIOS,
  canPrompt,
}: InstallVisibility): boolean {
  return visits >= 2 && !dismissed && !installed && !standalone && (isIOS || canPrompt);
}
