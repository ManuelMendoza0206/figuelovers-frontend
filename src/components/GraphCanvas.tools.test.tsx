import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { EDITOR_EVENTS } from '../lib/editorEvents';
import { GraphCanvas } from './GraphCanvas';

/**
 * Modos del lienzo y sus atajos.
 *
 * La interaccion a probar es "apretar tecla / apretar boton y ver que el
 * lienzo cambio de modo", no el clic sobre el paneo (eso depende de la
 * medicion interna de React Flow y en jsdom no es confiable). El modo
 * activo se observa por el hint del HUD, que es justamente la promesa que
 * se le hace al usuario en pantalla.
 */

const hintDe = (texto: string) => () =>
  screen.queryByText(new RegExp(texto), { exact: false });

afterEach(() => {
  cleanup();
});

describe('GraphCanvas - modos de herramienta', () => {
  it('expone los cuatro modos y activa Añadir desde la barra', () => {
    render(<GraphCanvas />);

    expect(screen.getByRole('button', { name: /Modo interactuar/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Modo conectar/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Modo añadir/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Modo eliminar/ })).toBeTruthy();

    // El boton dice con que tecla se activa.
    expect(screen.getByRole('button', { name: /Modo añadir/ }).getAttribute('aria-label')).toContain('E');

    const botonAdd = screen.getByRole('button', { name: /Modo añadir/ });
    fireEvent.click(botonAdd);

    expect(botonAdd.getAttribute('aria-pressed')).toBe('true');
    expect(hintDe('clic en el lienzo para crear una estrella')()).toBeTruthy();
    // Quitar el modo interactuar del HUD: solo puede haber UN hint.
    expect(hintDe('mueve, selecciona y edita')()).toBeNull();
  });

  it('cambia de modo con q, w, e y p', () => {
    render(<GraphCanvas />);

    fireEvent.keyDown(document.body, { key: 'w' });
    expect(hintDe('arrastra de un nodo a otro')()).toBeTruthy();

    fireEvent.keyDown(document.body, { key: 'e' });
    expect(hintDe('clic en el lienzo para crear una estrella')()).toBeTruthy();

    fireEvent.keyDown(document.body, { key: 'p' });
    expect(hintDe('clic en una estrella o conexión')()).toBeTruthy();

    fireEvent.keyDown(document.body, { key: 'q' });
    expect(hintDe('mueve, selecciona y edita')()).toBeTruthy();
  });

  it('ignora los atajos mientras el usuario escribe en un campo', () => {
    render(<GraphCanvas />);

    const campo = document.createElement('input');
    document.body.appendChild(campo);

    fireEvent.keyDown(campo, { key: 'p' });

    expect(hintDe('clic en una estrella o conexión')()).toBeNull();
    expect(hintDe('mueve, selecciona y edita')()).toBeTruthy();

    campo.remove();
  });

  it('pide ayuda con h y limpiar todo con o (eventos de edicion)', () => {
    render(<GraphCanvas />);

    const eventos: string[] = [];
    const registrar = (evento: Event) => eventos.push(evento.type);
    window.addEventListener(EDITOR_EVENTS.openHelp, registrar);
    window.addEventListener(EDITOR_EVENTS.requestClear, registrar);

    fireEvent.keyDown(document.body, { key: 'h' });
    fireEvent.keyDown(document.body, { key: 'o' });

    window.removeEventListener(EDITOR_EVENTS.openHelp, registrar);
    window.removeEventListener(EDITOR_EVENTS.requestClear, registrar);

    expect(eventos).toEqual([EDITOR_EVENTS.openHelp, EDITOR_EVENTS.requestClear]);
  });
});
