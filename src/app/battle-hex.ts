import { C, Constructor, F, RC, stime } from "@thegraid/common-lib";
import { CenterText } from "@thegraid/easeljs-lib";
import { Bitmap, Text } from "@thegraid/easeljs-module";
import { AliasLoader, H, Hex, Hex2, HexMap, HexShape, NsDir, TP } from "@thegraid/hexlib";
import { GS } from "./game-setup";

type TerrId = 'U' | 'N' | 'M' | 'P' | 'D' | 'W' | 'H' | 'T' | 'B' | 'J' | 'S';
type HexId = 'tree' | 'bog' | 'slope' | 'bramble' | 'sand' | 'dune' | 'cliff';
type MoveId = 1 | 2 | 3 | 4; // [Block, Arch, Arrow, Triple-Arrow]; ['f' | 'c' | 'o' | 'p']
type Exits = { [key in NsDir]?: MoveId };

class TG {
  static transp = 'rgba(0,0,0,0)'; // transparent
  static hl = C.BLACK;
  static cl = C.BLACK;
  static tl = 0.02;
  static ic = C.grey;
  static x0 = -.3;
  static image = true;
}

export class BatlHex extends Hex2 {
  terrId: TerrId = 'B'; // assume BLACK until assigned.
  topDir: NsDir = 'N';  // assume 'N' until assigned.
  exits: Exits;
  hexid: Text;          // contains canonical serial number, and indicates top of BattleMap.
  _hexid = 0;

  get color() { return this.hexShape.colorn; }

  /** rcText always visible */
  override showText(vis = this.rcText.visible): void {
    this.rcText.visible = vis;
    this.cont.updateCache();
  }

  addImage() {
    const name = this.distText.text;         // 'Brush' or whatever;
    const img_name = (this.distText.y > this.hexid.y) ? `${name}_i` : `${name}`;
    const bm = AliasLoader.loader.getBitmap(img_name, 1.93 * TP.hexRad); // offset and scaled.
    if (bm.image) {
      bm.name = name;
      bm.rotation = this.distText.rotation;
      this.distText.visible = false;
    }
    this.cont.addChild(bm as Bitmap);
    this.cont.updateCache();
  }
}

export class BatlMap<T extends Hex & BatlHex> extends HexMap<T> {
  constructor(radius = TP.hexRad, addToMapCont: boolean, hexC: Constructor<Hex>) {
    super(radius, addToMapCont, hexC);
    console.log(stime(this, `.constructor: BatlMap constructor:`), hexC.name)
  }

  // OR override makeAllDistricts(...)
  override makeDistrict(nh: number, district: number, mr: number, mc: number): T[] {
    const nr = TP.nHexes, nc = nr + 6;
    const hexAry = this.makeRect(nr, nc, 1);
    this.labelHexes(hexAry);
    return hexAry
  }

  labelHexes(hexAry: T[]) {
    // let sn = 1; .slice(sn, sn + 1) + sn
    let hexid = 1;
    this.asHex2Map.forEachHex((hex: BatlHex) => {
      hex._hexid = hexid++;
      const terrId = this.terrIds[Math.round(Math.random()*this.terrIds.length)];
      this.setTerrain(hex, terrId, 'N');
    })
  }

  /** set color, distText, and top-mark on hex, based on Id
   * @param id the designated TerrId
   * @param ring identifies which ring is being placed, < 0 for edge strips.
   * @param topDir identifies edge at top of BattleMap
   */
  setTerrain(hex: BatlHex, id: TerrId, topDir: NsDir = 'N') {
    const color = this.terrainColor[id], tname = BatlMap.terrainNames[id] ?? 'Black';
    // console.log(stime(this, '.labelHexes'), { k: ring, id, color, hexType, hexid: hex?.Aname, hex });
    if (hex === undefined) debugger;
    hex.hexShape.paint(color);
    if (hex.terrId === 'B') {      // do += only once!
      hex.terrId = id;
      hex.topDir = topDir;
      const textRot = { N: 0, S: 0, EN: 60, ES: -60, WN: -60, WS: 60 };
      const hid = hex._hexid;
      const hexid = hex.hexid = new CenterText(`${hid}`, F.fontSpec(16 * TP.hexRad / 60));
      hexid.rotation = textRot[topDir];
      hex.edgePoint(topDir, .8, hexid);
      hex.cont.addChild(hexid);
      // position label [distText]
      const ldir = H.dirRevNS[topDir];
      hex.edgePoint(ldir, .6, hex.distText);
      hex.distText.rotation = textRot[ldir];
      hex.distText.font = F.fontSpec((22) * TP.hexRad / 60);
      hex.distText.text = tname;
      hex.distText.visible = true;
      if (TG.image) hex.addImage();
    }
  }

  static terrainNames: {[key in TerrId]?: string} = {
    P: 'Plains', J: 'Jungle', B: 'Brush', M: 'Marsh', S: 'Swamp', D: 'Desert',
    U: 'Tundra', T: 'Tower', W: 'Woods', H: 'Hills', N: 'Mountains',
  }

  terrainColorOrig = {
    P: 'gold', J: 'limegreen', B: '#BACD32', M: 'peru', S: 'skyblue', D: 'darkorange', //'#FFA200',
    U: '#D0D0F0', T: '#E0E0D0', W: '#DDD88A', H: 'saddlebrown', N: '#FF343C', // redbrown, transparent
  }
  terrainColor = this.terrainColorOrig;

  tsize = 133; // hexes on Titan board; scale up to ~376
  terrNums: { [key in TerrId]?: number } = { M: 15, J: 10, P: 15, B: 55, S: 7, D: 7, W: 6, T: 6, H: 6, U: 3, N: 3 };
  terrIds = Object.keys(this.terrNums).map((tid) => {
    const n = this.terrNums[tid as TerrId];
    const rv = new Array(n);
    rv.fill(tid, 0, n);
    return rv;
  }).flat().concat(new Array(this.tsize).fill('P', 0, this.tsize)).splice(0, this.tsize);
}
