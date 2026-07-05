export class OperatorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class TaskValidationError extends OperatorError {
  constructor(message: string, public errors?: any) {
    super(message);
  }
}

export class PolicyViolationError extends OperatorError {
  constructor(message: string, public riskLevel: string, public policyDetail?: string) {
    super(message);
  }
}

export class BlockedSessionError extends OperatorError {
  constructor(
    message: string,
    public blockType: string,
    public url?: string,
    public screenshotPath?: string
  ) {
    super(message);
  }
}

export class ToolFailureError extends OperatorError {
  constructor(message: string, public originalError?: any) {
    super(message);
  }
}

export class ConfigurationError extends OperatorError {
  constructor(message: string) {
    super(message);
  }
}
