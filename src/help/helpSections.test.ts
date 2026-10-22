import { describe, expect, it } from 'vitest';

import { getHelpSection, HELP_SECTIONS } from './helpSections';

describe('helpSections', () => {
  it('mapea cada ruta del layout a su guía', () => {
    expect(getHelpSection('/editor').id).toBe('editor');
    expect(getHelpSection('/galaxy/proyecto-1').id).toBe('editor');
    expect(getHelpSection('/constellations').id).toBe('constellations');
    expect(getHelpSection('/johnson').id).toBe('johnson');
    expect(getHelpSection('/assignment').id).toBe('assignment');
    expect(getHelpSection('/northwest').id).toBe('northwest');
    expect(getHelpSection('/trees').id).toBe('trees');
    expect(getHelpSection('/sort').id).toBe('sort');
  });

  it('tolera barras finales y rutas desconocidas', () => {
    expect(getHelpSection('/sort/').id).toBe('sort');
    expect(getHelpSection('/ruta-desconocida').id).toBe('editor');
  });

  it('todas las guías tienen pasos, controles y una etiqueta para el botón', () => {
    for (const section of Object.values(HELP_SECTIONS)) {
      expect(section.steps.length).toBeGreaterThan(0);
      expect(section.controls.length).toBeGreaterThan(0);
      expect(section.fabLabel.length).toBeGreaterThan(0);
    }
  });

  it('la guía de sort aclara que la zona ordenada de inserción todavía puede moverse', () => {
    const notes = HELP_SECTIONS.sort.notes?.join(' ') ?? '';

    expect(notes).toContain('en inserción todavía puede correrse');
  });
});
