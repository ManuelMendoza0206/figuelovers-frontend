import { RefreshCw, Sparkles, Star } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { BackButton } from '../components/BackButton';
import { ConstellationPreview } from '../components/ConstellationPreview';
import { Button } from '../ui';
import type { ConstellationCard } from '../utils/constellationCatalog';
import {
  loadConstellationCatalog,
  resetConstellationCatalogCache,
} from '../utils/constellationCatalog';
import { graphPayloadToFlow } from '../utils/graphFile';
import {
  createConstellationProject,
  findConstellationProject,
} from '../utils/projectStorage';

/**
 * Galeria de constelaciones famosas.
 *
 * Cada tarjeta es una plantilla de GRAFO (forma fija) que se copia a un
 * proyecto propio al abrirla. El catalogo es 100% estatico: ver
 * public/constellations/index.json para agregar una nueva.
 *
 * Resiliencia a proposito: si UN archivo del catalogo esta mal, esa
 * tarjeta muestra su error y el resto de la galeria sigue andando. Solo
 * el indice caido es un fallo de pantalla completa.
 */
const ConstellationsPage: React.FC = () => {
  const navigate = useNavigate();

  const [cards, setCards] = useState<ConstellationCard[] | null>(null);
  const [indexError, setIndexError] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);

  /**
   * Intentos de carga: 0 al montar, +1 por cada "Reintentar".
   *
   * El catálogo es un sistema externo (archivos estáticos pedidos por
   * fetch), así que la carga vive en un efecto que reacciona a esto. Los
   * setState van dentro de los callbacks de la promesa, nunca en el
   * cuerpo sincrónico del efecto.
   */
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    let active = true;

    void loadConstellationCatalog()
      .then((list) => {
        if (active) setCards(list);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setIndexError(
          error instanceof Error
            ? error.message
            : 'No se pudo cargar el catálogo de constelaciones.'
        );
      });

    return () => {
      active = false;
    };
  }, [loadAttempt]);

  /** Copia local de cada plantilla que ya tiene proyecto en el navegador. */
  const existingByCard = useMemo(() => {
    const map = new Map<string, string>();

    (cards ?? []).forEach((card) => {
      const existing = findConstellationProject(card.id);
      if (existing) map.set(card.id, existing.id);
    });

    return map;
  }, [cards]);

  /**
   * Abrir = COPIAR la plantilla a un proyecto propio. Editar o borrar ese
   * proyecto no toca jamás el archivo original de la carpeta pública.
   */
  const openConstellation = useCallback(
    (card: ConstellationCard) => {
      if (!card.graph) return;

      setOpeningId(card.id);
      try {
        const { nodes, edges } = graphPayloadToFlow(card.graph.graph);
        const project = createConstellationProject(card.id, card.name, nodes, edges);
        navigate(`/galaxy/${project.id}`);
      } finally {
        setOpeningId(null);
      }
    },
    [navigate]
  );

  const handleRetry = () => {
    // Saca de la cache tambien los archivos: tras un error de red, el
    // reintento tiene que volver a pedirlos.
    resetConstellationCatalogCache();
    setIndexError(null);
    setCards(null);
    setLoadAttempt((current) => current + 1);
  };

  return (
    <div className="relative min-h-0 flex-1 overflow-y-auto bg-void-deep">
      <div className="absolute bottom-5 right-6 z-20">
        <BackButton to="/dashboard" />
      </div>

      <div className="mx-auto max-w-6xl px-6 py-10">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow text-[10px]">Catálogo estelar</p>
            <h1 className="mt-2 font-display text-3xl font-extrabold text-ink">
              Constelaciones
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-ink-muted">
              Cinco figuras del cielo real listas para trabajar. Al abrirlas se copian a
              un proyecto propio con la <strong className="text-ink">forma fija</strong>:
              renombrar estrellas y editar pesos o direcciones está permitido, cambiar la
              forma no. Después corré Johnson, Asignación, Norwest o Árboles sobre ellas
              como con cualquier grafo.
            </p>
          </div>

          {(indexError || cards) && (
            <Button variant="secondary" size="sm" onClick={handleRetry}>
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              Reintentar
            </Button>
          )}
        </header>

        {indexError ? (
          <p
            role="alert"
            className="mt-8 rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-ink"
          >
            {indexError}
          </p>
        ) : !cards ? (
          <div
            className="mt-16 flex items-center justify-center gap-3 text-ink-muted"
            role="status"
          >
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-brand" />
            <span className="font-mono text-xs tracking-[0.16em]">cargando catálogo…</span>
          </div>
        ) : cards.length === 0 ? (
          <p className="mt-8 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-ink-muted">
            Todavía no hay constelaciones publicadas en el catálogo.
          </p>
        ) : (
          <ul className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {cards.map((card) => {
              const existingProjectId = existingByCard.get(card.id);
              const starCount = card.graph ? card.graph.graph.nodes.length : card.stars;

              return (
                <li key={card.id}>
                  <article
                    aria-label={`Constelación ${card.name}`}
                    className="glass-panel flex h-full flex-col rounded-2xl p-5"
                  >
                    <div className="relative flex h-40 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-[#050a17]">
                      {card.graph ? (
                        <ConstellationPreview graph={card.graph} className="h-full w-full p-3" />
                      ) : (
                        <p
                          role="alert"
                          className="px-4 text-center text-xs text-[#ffb09a]"
                        >
                          {card.error ?? 'No se pudo cargar esta constelación.'}
                        </p>
                      )}
                    </div>

                    <h2 className="mt-4 flex items-center gap-2 font-display text-lg font-bold text-ink">
                      <Sparkles className="h-4 w-4 text-brand" aria-hidden="true" />
                      {card.name}
                    </h2>

                    <p className="mt-1 flex items-center gap-1.5 text-[11px] text-ink-subtle">
                      <Star className="h-3 w-3 text-mission" aria-hidden="true" />
                      {starCount} {starCount === 1 ? 'estrella' : 'estrellas'}
                    </p>

                    <p className="mt-3 flex-1 text-sm leading-relaxed text-ink-muted">
                      {card.description}
                    </p>

                    {/* Solo hay acciones si hay algo que abrir: una tarjeta
                        con el archivo roto explica su error arriba y no
                        promete un botón que no va a servir. */}
                    {(existingProjectId || card.graph) && (
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        {existingProjectId ? (
                          <>
                            <Button
                              size="sm"
                              onClick={() => navigate(`/galaxy/${existingProjectId}`)}
                              title={`Continuar el proyecto de ${card.name} que ya tenés`}
                            >
                              Continuar
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={!card.graph || openingId === card.id}
                              onClick={() => openConstellation(card)}
                              title={`Abrir una copia nueva de ${card.name} sin tocar la anterior`}
                            >
                              Crear copia nueva
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            disabled={openingId === card.id}
                            onClick={() => openConstellation(card)}
                          >
                            Abrir constelación
                          </Button>
                        )}
                      </div>
                    )}
                  </article>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ConstellationsPage;
