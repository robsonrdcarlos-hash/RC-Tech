export function formatDocument(value: string, tipo: 'PF' | 'PJ'): string {
  const clean = value.replace(/\D/g, '')
  if (tipo === 'PF') {
    // CPF: 000.000.000-00 (11 digitos)
    const limited = clean.slice(0, 11)
    return limited
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
  } else {
    // CNPJ: 00.000.000/0000-00 (14 digitos)
    const limited = clean.slice(0, 14)
    return limited
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
  }
}

export function formatPhone(value: string): string {
  const clean = value.replace(/\D/g, '').slice(0, 11)
  if (clean.length <= 10) {
    // (11) 1234-5678
    return clean
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d{1,4})$/, '$1-$2')
  }
  // (11) 91234-5678
  return clean
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d{1,4})$/, '$1-$2')
}

export function formatCEP(value: string): string {
  const clean = value.replace(/\D/g, '').slice(0, 8)
  return clean.replace(/(\d{5})(\d{1,3})$/, '$1-$2')
}

