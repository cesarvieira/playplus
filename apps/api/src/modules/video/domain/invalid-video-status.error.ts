export class InvalidVideoStatusError extends Error {
  constructor(message = 'Status de vídeo inválido para esta operação') {
    super(message);
    this.name = 'InvalidVideoStatusError';
  }
}
