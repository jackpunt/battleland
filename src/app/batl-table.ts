import { Hex2, Table } from "@thegraid/hexlib";

export class BatlTable extends Table {

  override makeRecycleHex(row?: number | undefined, col?: number | undefined): Hex2 {
    const rhex = super.makeRecycleHex(0, 0);
    rhex.cont.visible = false;
    return rhex;
  }
}
