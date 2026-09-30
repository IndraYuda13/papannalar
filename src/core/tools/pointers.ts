// Ownership is local; pointer moves never wait on a network or storage roundtrip.
export class PointerOwnership {
  private readonly owners = new Map<number, string>();
  claim(id: number, objectId: string, width: number, height: number) {
    if (
      !Number.isInteger(id) ||
      !objectId ||
      !Number.isFinite(width) ||
      !Number.isFinite(height) ||
      width > 80 ||
      height > 80 ||
      this.owners.has(id) ||
      [...this.owners.values()].includes(objectId)
    )
      return false;
    this.owners.set(id, objectId);
    return true;
  }
  release(id: number) {
    const object = this.owners.get(id);
    this.owners.delete(id);
    return object;
  }
}
