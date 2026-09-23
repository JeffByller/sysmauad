/**
 * Utilitários para formatação e validação de telefones, WhatsApp e documentos no Sysmauad.
 */

// Conjunto oficial dos 67 DDDs cadastrados pela Anatel no Brasil
export const VALID_BR_DDDS = new Set([
  // SP
  '11', '12', '13', '14', '15', '16', '17', '18', '19',
  // RJ / ES
  '21', '22', '24', '27', '28',
  // MG
  '31', '32', '33', '34', '35', '37', '38',
  // PR / SC
  '41', '42', '43', '44', '45', '46', '47', '48', '49',
  // RS
  '51', '53', '54', '55',
  // DF / GO / TO / MT / MS / AC / RO
  '61', '62', '63', '64', '65', '66', '67', '68', '69',
  // BA / SE
  '71', '73', '74', '75', '77', '79',
  // PE / AL / PB / RN / CE / PI
  '81', '82', '83', '84', '85', '86', '87', '88', '89',
  // PA / AM / RR / AP / MA
  '91', '92', '93', '94', '95', '96', '97', '98', '99'
]);

/**
 * Limpa qualquer caractere não numérico e trata código de país DDI 55
 */
export const cleanPhoneDigits = (value: string): string => {
  if (!value) return '';
  let digits = value.replace(/\D/g, '');
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) {
    digits = digits.slice(2);
  }
  return digits.slice(0, 11);
};

/**
 * Formata telefone/celular dinamicamente com máscara (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
 * Impede estritamente digitar mais do que 11 dígitos numéricos.
 */
export const formatPhone = (value: string): string => {
  const digits = cleanPhoneDigits(value);
  if (!digits) return '';

  if (digits.length <= 2) {
    return `(${digits}`;
  }
  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
};

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  isComplete: boolean;
}

/**
 * Valida se o número de WhatsApp / Celular é válido:
 * - Não pode ser vazio
 * - Deve conter entre 10 e 11 dígitos numéricos (DDD + número)
 * - Não permite números com todos dígitos repetidos (ex: 11111111111)
 * - DDD deve ser um código de área oficial brasileiro existente
 * - Celular com 11 dígitos obrigatoriamente inicia com 9 após o DDD
 * - Telefone com 10 dígitos não pode iniciar com 0 ou 1 após o DDD
 */
export const validatePhone = (value: string): ValidationResult => {
  const digits = cleanPhoneDigits(value);

  if (!digits) {
    return { isValid: false, isComplete: false, error: 'O WhatsApp / Celular é obrigatório.' };
  }

  if (digits.length < 10) {
    return {
      isValid: false,
      isComplete: false,
      error: `Número incompleto (${digits.length}/11 dígitos). Digite DDD + número (ex: (81) 99532-9560).`
    };
  }

  if (digits.length > 11) {
    return { isValid: false, isComplete: false, error: 'O número não pode exceder 11 dígitos.' };
  }

  // Verifica se todos os números são repetidos (ex: 00000000000, 99999999999)
  if (/^(\d)\1+$/.test(digits)) {
    return { isValid: false, isComplete: true, error: 'Número de telefone inválido (todos os dígitos repetidos).' };
  }

  // Validação do DDD
  const ddd = digits.slice(0, 2);
  if (!VALID_BR_DDDS.has(ddd)) {
    return { isValid: false, isComplete: true, error: `DDD "${ddd}" inválido. Informe um DDD brasileiro válido.` };
  }

  // Celular (11 dígitos): o 3º caractere deve ser 9
  if (digits.length === 11 && digits[2] !== '9') {
    return {
      isValid: false,
      isComplete: true,
      error: 'Celular de 11 dígitos deve iniciar com o dígito 9 após o DDD.'
    };
  }

  // Fixo (10 dígitos): não pode iniciar com 0 ou 1
  if (digits.length === 10 && (digits[2] === '0' || digits[2] === '1')) {
    return {
      isValid: false,
      isComplete: true,
      error: 'Telefone fixo após o DDD não pode iniciar com 0 ou 1.'
    };
  }

  return { isValid: true, isComplete: true };
};

/**
 * Formata CPF ou CNPJ limitando e aplicando pontuação padrão
 */
export const formatCnpjCpf = (value: string): string => {
  const digits = (value || '').replace(/\D/g, '').slice(0, 14);
  if (!digits) return '';

  if (digits.length <= 11) {
    // CPF: 000.000.000-00
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  } else {
    // CNPJ: 00.000.000/0001-00
    if (digits.length <= 12) {
      return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
    }
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
  }
};
