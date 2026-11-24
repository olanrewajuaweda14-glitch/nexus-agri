import { Bird, Egg, Fish, PawPrint } from 'lucide-react';
import type { SpeciesId } from '../lib/livestock';

/** Lucide has no goat, sheep, pig or cow, so those share the paw print. */
export function SpeciesIcon({ species, className = 'h-5 w-5' }: { species?: SpeciesId; className?: string }) {
  const I = species === 'layer' ? Egg : species === 'broiler' ? Bird : species === 'catfish' ? Fish : PawPrint;
  return <I className={className} aria-hidden />;
}
