export class HttpError extends Error {
    constructor(
        public readonly code: string,
        public readonly status: number,
    ) {
        super(code);
        this.name = "HttpError";
    }
}

export class BadRequestError extends HttpError {
    constructor(code: string) {
        super(code, 400);
    }
}

export class UnauthorizedError extends HttpError {
    constructor(code = "UNAUTHORIZED") {
        super(code, 401);
    }
}

export class ForbiddenError extends HttpError {
    constructor(code = "FORBIDDEN") {
        super(code, 403);
    }
}

export class NotFoundError extends HttpError {
    constructor(code: string) {
        super(code, 404);
    }
}

export class ConflictError extends HttpError {
    constructor(code: string) {
        super(code, 409);
    }
}

export class UnprocessableError extends HttpError {
    constructor(code: string) {
        super(code, 422);
    }
}
