/**
 * ASTRAVERSA Ω — Celestial Body Renderer
 *
 * Dispatches rendering to the appropriate component based on body type.
 */

import type { CelestialBody } from '../universe/CelestialBody';
import { CelestialBodyType } from '../universe/CelestialBody';
import { StarRenderer } from './StarRenderer';
import { PlanetRenderer } from './PlanetRenderer';
import { OrbitRenderer } from './OrbitRenderer';

interface CelestialBodyRendererProps {
  body: CelestialBody;
  isSelected: boolean;
  onClick: () => void;
}

export function CelestialBodyRenderer({ body, isSelected, onClick }: CelestialBodyRendererProps) {
  return (
    <>
      {body.type === CelestialBodyType.STAR && (
        <StarRenderer body={body} isSelected={isSelected} onClick={onClick} />
      )}
      {body.type === CelestialBodyType.PLANET && (
        <>
          <OrbitRenderer body={body} isSelected={isSelected} />
          <PlanetRenderer body={body} isSelected={isSelected} onClick={onClick} />
        </>
      )}
    </>
  );
}
