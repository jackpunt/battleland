import { Hex2, Table } from "@thegraid/hexlib";

export class BatlTable extends Table {

  override makeRecycleHex(row?: number | undefined, col?: number | undefined): Hex2 {
    return undefined as any as Hex2;
  }
}
