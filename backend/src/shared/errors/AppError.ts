export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'No autorizado') {
    super(401, message, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Acceso denegado') {
    super(403, message, 'FORBIDDEN');
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Recurso') {
    super(404, `${resource} no encontrado`, 'NOT_FOUND');
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(422, message, 'VALIDATION_ERROR');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message, 'CONFLICT');
  }
}

export class CreditLimitError extends AppError {
  constructor() {
    super(402, 'Límite de crédito excedido', 'CREDIT_LIMIT_EXCEEDED');
  }
}

export class CompanyPendingError extends AppError {
  constructor() {
    super(403, 'Su empresa está pendiente de aprobación por Aritth', 'COMPANY_PENDING');
  }
}

export class CompanySuspendedError extends AppError {
  constructor() {
    super(403, 'Su empresa ha sido suspendida. Contacte a ventas@aritth.com', 'COMPANY_SUSPENDED');
  }
}
