/**
 * Selectores agregados de Reportes → tab General (src/store/selectors.js).
 *
 * Estado armado a mano (no el seed de demo) para que los números esperados
 * sean exactos: dos semanas completas (2026-08-03 lunes … 2026-08-16
 * domingo), un cliente con un turno ocasional en cada semana (mismo cliente,
 * para probar nuevo→recurrente) y un turno fijo los miércoles.
 */
import { describe, expect, it } from 'vitest';
import { rootReducer } from '../reducer.js';
import { createEmptyState } from '../schema.js';
import * as actions from '../actions.js';
import {
  selectOcupacionPorDiaSemana,
  selectDistribucionTurnosPorDia,
  selectFijosVsOcasionalesPorSemana,
  selectNuevosVsRecurrentesPorSemana,
} from '../selectors.js';

const DESDE = '2026-08-03'; // lunes
const HASTA = '2026-08-16'; // domingo — dos semanas exactas

function construirEstado() {
  let state = createEmptyState();
  state = {
    ...state,
    config: { ...state.config, operacion: { ...state.config.operacion, slots: ['18:00', '19:00', '20:00'] } },
  };

  state = rootReducer(state, actions.createCancha({ id: 'can1', nombre: 'Cancha 1', activa: true }));
  state = rootReducer(state, actions.createClient({ id: 'cli1', nombre: 'Ana' }));

  // Ocasional, semana 1 (lunes 03/08) — mismo cliente en las dos semanas.
  state = rootReducer(
    state,
    actions.createBooking({
      id: 'bkg1', fecha: '2026-08-03', hora: '18:00', canchaId: 'can1',
      clienteId: 'cli1', clienteNombre: 'Ana', estado: 'reservado', precioCancha: 10000,
    })
  );
  // Ocasional, semana 2 (lunes 10/08) — mismo cliente: acá tiene que contar recurrente.
  state = rootReducer(
    state,
    actions.createBooking({
      id: 'bkg2', fecha: '2026-08-10', hora: '19:00', canchaId: 'can1',
      clienteId: 'cli1', clienteNombre: 'Ana', estado: 'reservado', precioCancha: 10000,
    })
  );

  // Turno fijo los miércoles (día ISO 3), vigente para todo el rango de prueba.
  state = rootReducer(
    state,
    actions.createTurnoFijo({
      id: 'tf1', equipoNombre: 'Equipo X', diaSemana: 3, hora: '20:00', canchaId: 'can1',
      vigenteDesde: '2026-08-01',
    })
  );

  return state;
}

describe('selectOcupacionPorDiaSemana', () => {
  it('agrupa ocupados/capacidad por día de semana sobre el rango completo', () => {
    const state = construirEstado();
    const porDia = selectOcupacionPorDiaSemana(state, DESDE, HASTA);

    const lunes = porDia.find((d) => d.dia === 1);
    const miercoles = porDia.find((d) => d.dia === 3);
    const martes = porDia.find((d) => d.dia === 2);

    // 2 lunes en el rango × 3 slots × 1 cancha = 6 de capacidad; 2 turnos ocupados.
    expect(lunes.capacidad).toBe(6);
    expect(lunes.ocupados).toBe(2);
    expect(lunes.pct).toBe(33);

    // El turno fijo proyecta una instancia cada miércoles del rango.
    expect(miercoles.ocupados).toBe(2);

    // Un día sin ningún turno tiene 0 ocupados pero SIGUE teniendo capacidad.
    expect(martes.ocupados).toBe(0);
    expect(martes.capacidad).toBe(6);
  });

  it('con `canchaId`, acota ocupados Y capacidad a esa cancha', () => {
    const state = construirEstado();
    const conFiltro = selectOcupacionPorDiaSemana(state, DESDE, HASTA, 'can1');
    const sinFiltro = selectOcupacionPorDiaSemana(state, DESDE, HASTA);
    // Una sola cancha activa: filtrar por ella da lo mismo que no filtrar.
    expect(conFiltro).toEqual(sinFiltro);

    const otraCancha = selectOcupacionPorDiaSemana(state, DESDE, HASTA, 'no_existe');
    expect(otraCancha.every((d) => d.ocupados === 0)).toBe(true);
  });
});

describe('selectDistribucionTurnosPorDia', () => {
  it('los porcentajes están relativos al total de turnos del rango, no a la capacidad', () => {
    const state = construirEstado();
    const dist = selectDistribucionTurnosPorDia(state, DESDE, HASTA);
    const total = dist.reduce((acc, d) => acc + d.cantidad, 0);
    expect(total).toBe(4); // 2 ocasionales + 2 instancias del fijo

    const lunes = dist.find((d) => d.dia === 1);
    expect(lunes.cantidad).toBe(2);
    expect(lunes.pct).toBe(50);
  });
});

describe('selectFijosVsOcasionalesPorSemana', () => {
  it('separa fijos (origenFijoId) de ocasionales, semana por semana', () => {
    const state = construirEstado();
    const semanas = selectFijosVsOcasionalesPorSemana(state, DESDE, HASTA);
    expect(semanas).toHaveLength(2);
    expect(semanas[0]).toMatchObject({ semanaInicio: '2026-08-03', fijos: 1, ocasionales: 1 });
    expect(semanas[1]).toMatchObject({ semanaInicio: '2026-08-10', fijos: 1, ocasionales: 1 });
  });
});

describe('selectNuevosVsRecurrentesPorSemana', () => {
  it('"nuevo" es por el primer turno de SIEMPRE del cliente, no por el rango elegido', () => {
    const state = construirEstado();
    const semanas = selectNuevosVsRecurrentesPorSemana(state, DESDE, HASTA);
    expect(semanas).toHaveLength(2);
    // Semana 1: primer turno de Ana en la vida → nueva.
    expect(semanas[0]).toMatchObject({ semanaInicio: '2026-08-03', nuevos: 1, recurrentes: 0 });
    // Semana 2: mismo cliente, ya no es su primera vez → recurrente.
    expect(semanas[1]).toMatchObject({ semanaInicio: '2026-08-10', nuevos: 0, recurrentes: 1 });
  });

  it('un turno sin `clienteId` enlazado no cuenta ni como nuevo ni como recurrente', () => {
    const state = construirEstado();
    // El turno fijo de este estado no tiene clienteId — no debería aportar
    // ningún conteo extra más allá del cliente Ana ya cubierto arriba.
    const semanas = selectNuevosVsRecurrentesPorSemana(state, DESDE, HASTA);
    const totalContado = semanas.reduce((acc, s) => acc + s.nuevos + s.recurrentes, 0);
    expect(totalContado).toBe(2); // las 2 apariciones de Ana, nada del fijo
  });
});
