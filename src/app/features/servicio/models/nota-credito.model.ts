export interface NotaCreditoData {
  numero: string;
  estado: string;
  hash: string;
  xml: string | null;
  cdr: string | null;
  pdfTicket: string | null;
  pdfA4: string | null;
}

export function notaCreditoDataFromJson(json: Record<string, unknown>): NotaCreditoData {
  return {
    numero: String(json['numero'] ?? ''),
    estado: String(json['estado'] ?? ''),
    hash: String(json['hash'] ?? ''),
    xml: (json['xml'] as string | null) ?? null,
    cdr: (json['cdr'] as string | null) ?? null,
    pdfTicket: (json['pdf_ticket'] as string | null) ?? null,
    pdfA4: (json['pdf_a4'] as string | null) ?? null,
  };
}
