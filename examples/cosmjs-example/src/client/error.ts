export class ExtensionInstallError extends Error {
  constructor() {
    super();
    this.name = 'ExtensionInstallError';
    Object.setPrototypeOf(this, ExtensionInstallError.prototype);
  }
}

export class GetAccountError extends Error {
  constructor() {
    super();
    this.name = 'GetAccountError';
    Object.setPrototypeOf(this, GetAccountError.prototype);
  }
}

export class SignError extends Error {
  constructor() {
    super();
    this.name = 'SignError';
    Object.setPrototypeOf(this, SignError.prototype);
  }
}

export class MobileConnectError extends Error {
  constructor() {
    super();
    this.name = 'MobileConnectError';
    Object.setPrototypeOf(this, MobileConnectError.prototype);
  }
}
