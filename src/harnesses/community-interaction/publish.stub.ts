export function publishStubAction(): never {
  throw new Error("Publish is blocked in Gaia Operator MVP-1. Public writes in Operator workflows require direct human interaction.");
}
