
export class TimeoutError extends Error {
    constructor(message) {
        super(message);
        this.reason = 'ETIMEOUT';
    }
}

export class RaceConditionError extends Error {
    constructor(message) {
        super(message);
        this.reason = 'ERACECONDITION';
    }
}
