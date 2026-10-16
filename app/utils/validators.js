/**
 * Validaciones de formulario en cliente. Son solo una ayuda de UX:
 * el backend (Spring, Bean Validation) debe repetirlas siempre.
 */

const DNI_LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE'

/** HU-01.01 · DNI (8 dígitos + letra) o NIE (X/Y/Z + 7 dígitos + letra) con letra de control. */
export function isValidDniNie(value) {
  const v = String(value ?? '').toUpperCase().replace(/[\s-]/g, '')
  const match = /^([XYZ]\d{7}|\d{8})([A-Z])$/.exec(v)
  if (!match) return false
  const numeric = match[1].replace('X', '0').replace('Y', '1').replace('Z', '2')
  return DNI_LETTERS[Number(numeric) % 23] === match[2]
}

export const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value ?? '').trim())

/** Teléfono español: 9 dígitos empezando por 6, 7, 8 o 9 (opcional +34). */
export const isValidPhoneES = (value) => /^(\+34|0034)?[6789]\d{8}$/.test(String(value ?? '').replace(/[\s-]/g, ''))

export const isValidPostalCodeES = (value) => /^(0[1-9]|[1-4]\d|5[0-2])\d{3}$/.test(String(value ?? '').trim())

/** Contraseña: mínimo 8 caracteres, al menos una letra y un número. */
export const isStrongPassword = (value) => /^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(String(value ?? ''))

/** HU-05.03 · IBAN con dígitos de control (mod 97). Acepta espacios. */
export function isValidIban(value) {
  const iban = String(value ?? '').toUpperCase().replace(/\s/g, '')
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(iban)) return false
  if (iban.startsWith('ES') && iban.length !== 24) return false
  const rearranged = iban.slice(4) + iban.slice(0, 4)
  const expanded = rearranged.replace(/[A-Z]/g, (ch) => String(ch.charCodeAt(0) - 55))
  let remainder = 0
  for (const digit of expanded) remainder = (remainder * 10 + Number(digit)) % 97
  return remainder === 1
}

/** Formatea el IBAN en bloques de 4 mientras se escribe ("ES912100..." -> "ES91 2100 ..."). */
export function formatIbanInput(value) {
  let raw = String(value ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (raw.length > 0 && !/^[A-Z]/.test(raw)) raw = `ES${raw}`
  return raw.slice(0, 24).replace(/(.{4})/g, '$1 ').trim()
}
