export function publishStubAction(): never {
  throw new Error("Publish is blocked in MVP-1. All public writes require direct human interaction.");
}
