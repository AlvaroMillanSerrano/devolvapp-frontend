import assert from 'node:assert/strict'
import test from 'node:test'
import { contarBolsasSinVerificar, obtenerNombreCiudadano } from '../app/utils/recogida.js'

test('counts bags that do not have a result yet', () => {
  const bags = [
    { resultado: null },
    { resultado: 'ACEPTADA' },
    { resultado: undefined },
    { resultado: 'NO_ENCONTRADA' },
  ]

  assert.equal(contarBolsasSinVerificar(bags), 2)
})

test('returns zero when every bag is verified or the collection has no bags', () => {
  assert.equal(contarBolsasSinVerificar([{ resultado: 'ACEPTADA' }, { resultado: 'DISCREPANCIA' }]), 0)
  assert.equal(contarBolsasSinVerificar([]), 0)
})

test('reports an invalid collection response instead of hiding missing bags', () => {
  assert.throws(
    () => contarBolsasSinVerificar(undefined),
    { name: 'TypeError', message: 'La respuesta de recogida debe incluir bolsas como una lista' },
  )
})

test('returns the citizen name from backend objects or mock strings without exposing phone', () => {
  assert.equal(obtenerNombreCiudadano({ nombre: 'Ana Pérez', telefono: '600123123' }), 'Ana Pérez')
  assert.equal(obtenerNombreCiudadano('Ana Pérez'), 'Ana Pérez')
  assert.equal(obtenerNombreCiudadano(undefined), '—')
})
