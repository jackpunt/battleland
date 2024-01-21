import { Constructor } from "@thegraid/common-lib";
import { GamePlay as GamePlayLib, Hex, TP } from "@thegraid/hexlib";
import { BatlHex, BatlMap } from "./battle-hex";


export class GamePlay extends GamePlayLib {
  override hexMap: BatlMap<Hex & BatlHex> = new BatlMap(TP.hexRad, true, BatlHex as Constructor<Hex>);
}
