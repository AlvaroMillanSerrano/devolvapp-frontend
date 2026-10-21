import assert from 'node:assert/strict'
import test from 'node:test'
import { combinarUsuario, usuarioAForm } from '../app/utils/usuario.js'

test('maps the updated server user back to the edit fields', () => {
  assert.deepEqual(
    usuarioAForm({
      nombrePila: 'María',
      apellidos: 'García López',
      email: 'maria@example.com',
      telefono: null,
    }),
    {
      nombre: 'María',
      apellidos: 'García López',
      email: 'maria@example.com',
      telefono: '',
    },
  )
})

test('preserves current form values when an update response omits fields', () => {
  const submitted = {
    nombre: 'María',
    apellidos: 'García López',
    email: 'maria@example.com',
    telefono: '600123123',
  }

  assert.deepEqual(usuarioAForm({ id: 42 }, submitted), submitted)
})

test('merges a partial update without dropping the address from the user detail', () => {
  const current = {
    nombrePila: 'María',
    apellidos: 'García López',
    direccion: { tipoVia: 'Calle', nombreVia: 'Granada', numero: '10', codigoPostal: '29005' },
  }

  assert.deepEqual(combinarUsuario(current, { email: 'maria@example.com' }), {
    ...current,
    email: 'maria@example.com',
  })
  assert.deepEqual(combinarUsuario(current, { direccion: { numero: '12' } }).direccion, {
    ...current.direccion,
    numero: '12',
  })
})
