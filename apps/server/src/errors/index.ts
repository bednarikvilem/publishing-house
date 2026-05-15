export type ErrorDetails = Record<string, unknown>;

export class HttpError extends Error {
    constructor(
        public readonly code: string,
        public readonly status: number,
        public readonly details?: ErrorDetails,
    ) {
        super(code);
        this.name = "HttpError";
    }
}

export class BadRequestError extends HttpError {
    constructor(code: string, details?: ErrorDetails) {
        super(code, 400, details);
    }
}

export class UnauthorizedError extends HttpError {
    constructor(code = "UNAUTHORIZED", details?: ErrorDetails) {
        super(code, 401, details);
    }
}

export class ForbiddenError extends HttpError {
    constructor(code = "FORBIDDEN", details?: ErrorDetails) {
        super(code, 403, details);
    }
}

export class NotFoundError extends HttpError {
    constructor(code: string, details?: ErrorDetails) {
        super(code, 404, details);
    }
}

export class ConflictError extends HttpError {
    constructor(code: string, details?: ErrorDetails) {
        super(code, 409, details);
    }
}

export class UnprocessableError extends HttpError {
    constructor(code: string, details?: ErrorDetails) {
        super(code, 422, details);
    }
}
