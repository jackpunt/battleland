import { C, Constructor, F, RC, stime } from "@thegraid/common-lib";
import { CenterText } from "@thegraid/easeljs-lib";
import { Bitmap, Container, Text } from "@thegraid/easeljs-module";
import { AliasLoader, H, Hex, Hex2, HexDir, HexMap, MapCont, NamedContainer, NsDir, TP, Topo, TopoNS } from "@thegraid/hexlib";

type TerrId = 'U' | 'N' | 'M' | 'P' | 'D' | 'W' | 'H' | 'T' | 'B' | 'J' | 'S';
type Hazard = 'plains' | 'tree' | 'bog' | 'slope' | 'bramble' | 'sand' | 'dune' | 'cliff' | 'drift' | 'volcano';

type MoveId = 1 | 2 | 3 | 4; // [Block, Arch, Arrow, Triple-Arrow]; ['f' | 'c' | 'o' | 'p']
type Exits = { [key in NsDir]?: MoveId };

class TG {
  /** detail of hazards each hex on the [hex-19/district] battlemaps */
  static hazards = {
    p: 'plains', v: 'volcano',
    t: 'tree', b: 'bog', s: 'slope', r: 'bramble',
    a: 'sand', d: 'dune', c: 'cliff', f: 'drift',
  };
  // edge Hazard is Capitalized on the beneficial side,
  // lowercase is deficit on adjacent Hex.
  // that is: Wall, Slope, Cliff appear on the higher hex.
  static edgeHazards = { n: 'none', d: "dune-", D: 'dune+', c: "cliff-", C: 'cliff+', s: "slope-", S: 'slope+', w: "wall-", W: 'wall+', r: "river" };
  /** r0[1..3], r1[0..4], r2[0..4],r3[0..4], r4[2] */
  static hazHex19: {
    U: ['d', 'p', 'p',
      'p', 'd', 'p', 'd', 'p',
      'p', 'p', 'p', 'p', 'p',
      'd', 'd', 'd', 'p', 'd',
      'p',
    ],
    // volcano, cliff, slopes; Note: off-dist edges may also be 'S' (elevation 2, 1)
    N: ['pnnnSSS2', 'pnnSSnn2', 'pnnsnns',
      'pnsnssn1', 'psnsSSn', 'psnnsns', 'pnsnnsn', 'pnnnSSS2',
      'pssnsnn0', 'pscsnsn', 'vSSSSCS', 'pnnssns', 'psnnsnn1',
      'pSSSsnS1', 'pnsnscs', 'psnsSSS', 'pscsnns', 'pSnnSCS2',
      'psnnnnn',
    ],
    M: ['p', 'p', 'p',
      'p', 'p', 'b', 'p', 'p',
      'p', 'b', 'p', 'b', 'p',
      'p', 'b', 'p', 'p', 'p',
      'p',
    ],
    P: ['p', 'p', 'p',
      'p', 'p', 'p', 'p', 'p',
      'p', 'p', 'p', 'p', 'p',
      'p', 'p', 'p', 'p', 'p',
      'p',
    ],
    D: ['p', 's', 's',
      'p', 'pnddnnn', 'snnnnDn', 'snnDDnn', 's',
      'pnnnddn', 'pncnndn', 'snnDCCD', 'pdnnnnd', 'pnnnnnd',
      'sDDDDCn', 'pnnnnnd', 'pcnnnnn', 'p', 'p',
      'p',
    ],
    W: ['p', 'p', 't',
      'p', 'p', 'p', 'p', 'p',
      'p', 't', 'p', 't', 'p',
      'p', 'p', 'p', 'p', 'p',
      'p',
    ],
    H: ['p', 'p', 't',
      'p', 'p', 'p', 'p', 'p',
      'p', 't', 'p', 't', 'p',
      'p', 'p', 'p', 'p', 'p',
      'p',
    ],
    T: ['pnnwwnn', 'pnnwnnn', 'pnnnwwn',
      'pnwnnnn', 'tWnwnWW', 'tWWnwnW', 'tWWWnwn', 'pnnnnwn',
      'pnnwnnn', 'tWnwnWW', 'tWWWWWW', 'tnWWWnw', 'pnnnnww',
      'pnwnnnn', 'pwwnnnn', 'twnWWWn', 'pwnnnnw', 'pnnnnnw',
      'pwnnnnn',
    ],
    B: ['p', 'p', 'p',
      'p', 'r', 'r', 'p', 'r',
      'p', 'p', 'p', 'r', 'p',
      'b', 'p', 'p', 'p', 'p',
      'r',
    ],
    J: ['r', 'p', 'p',
      't', 'p', 'p', 'p', 'r',
      'p', 'r', 'r', 'p', 't',
      'p', 'p', 't', 'r', 'p',
      'p',
    ],
    S: ['b', 'p', 'p',
      'p', 't', 'p', 't', 'p',
      'p', 'p', 'p', 'p', 'p',
      'b', 't', 'b', 'p', 'b',
      'p',
    ],

  }
  static transp = 'rgba(0,0,0,0)'; // transparent
  static hl = C.BLACK;
  static cl = C.BLACK;
  static tl = 0.02;
  static ic = C.grey;
  static x0 = -.3;
  static image = false; // false to clearly see [r,c]
}

export class BatlHex extends Hex2 {
  terrId: TerrId = 'B'; // assume BLACK until assigned.
  topDir: NsDir = 'N';  // assume 'N' until assigned.
  exits: Exits;
  hexid: Text;          // contains canonical serial number, and indicates top of BattleMap.
  _hexid = 0;
  terrText = new CenterText('');

  constructor(map: HexMap<Hex2>, row: number, col: number, name?: string) {
    super(map, row, col, name);
    this.distText.y = 10 * TP.hexRad / 60;
    this.terrText.text = ``;
    this.cont.addChild(this.terrText);
  }

  get color() { return this.hexShape.colorn; }

  addImage() {
    const name = this.terrText.text;         // 'Brush' or whatever;
    const img_name = (this.terrText.y > this.hexid.y) ? `${name}_i` : `${name}`;
    const bm = AliasLoader.loader.getBitmap(img_name, 1.93 * TP.hexRad); // offset and scaled.
    if (bm.image) {
      bm.name = name;
      bm.rotation = this.terrText.rotation;
      this.terrText.visible = false;
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

  override mapCont: MapCont & { hexContR: NamedContainer };
  override addToMapCont(hexC?: Constructor<T> | undefined): this {
    const mapCont = this.mapCont;
    const rv = super.addToMapCont(hexC);
    const hexContR = mapCont.hexContR = new NamedContainer('hexContR');
    const ndx = mapCont.getChildIndex(mapCont.hexCont);
    mapCont.addChildAt(hexContR, ndx); // insert empty/blank Container above hexCont
    return rv;
  }

  /** utility for makeAllDistricts; make hex0 at RC */
  override calculateRC0(): RC {
    const offs = Math.ceil(this.nh + this.mh * 1.5);
    return { row: 3, col: 3 } // row,col to be non-negative
  }

  override makeAllHexes(nh = TP.nHexes, mh = TP.mHexes, rc0: RC): T[] {
    this.setSize(nh = 3, mh = 1);
    return this.makeMetaHexRect(5, 5, this.nh, rc0, true);
  }
  metaStep(rc: RC, nd: number, dirs = this.linkDirs): RC {
    const dL = this.nh, dS = dL - 1;
    const dirL = dirs[nd], dirS = dirs[(nd - 1) % 6]; // ring starts at 'dist' from center
    rc = this.forRCsOnLine(dL, rc, dirL); // step (WS) by dist
    rc = this.forRCsOnLine(dS, rc, dirS); // step (S) to center of 0-th metaHex
    return rc;
  }
  makeMetaHexRect(nr = 10, nc = 15, nh = 3, rc0: RC = { row: 0, col: 0 }, rotp = true) {
    let hexAry: T[] = [], district = 0, ds = 2, rl0 = rc0, rc = rc0;
    // let rowMin: number | undefined = undefined;
    let mrow = nr, mcol = nc, rl = (3 * nh - 1); // nh:rl 2->5; 3->8; 4->11;
    for (let r = 0; r < mrow; r++) {
      const dsr = (r % 2 === 0) ? 4 : 3;      // alternate WS & ES, every 2 rows
      district = r * 20, rc = rl0 = this.metaStep(rl0, dsr);
      // if (r === (4 * nh)) rc = rl0 = this.metaStep(rc, ds); // skip right in 4*nh rows
      for (let c = 1; c < mcol ; c++) {
        // if ((district !== 0) && (district !== ((mrow-1) * 20 + mcol - 2)))
        {
          hexAry = hexAry.concat(this.makeMetaHex(nh, district, rc, { row: mrow, col: mcol }));
          // if (rowMin === undefined) rowMin = rc.row;  // the first, top-left row value;
        }
        const dsc = ds ?? (((c % rl) === (rl - rl)) ? ds - 1 : ds); // [disabled] bump row
        district += 1; rc = this.metaStep(rc, dsc);
      }
    }
    if (rotp) this.rotateHexCont(nh); // need to fix hexUnderPoint() before can use this.
    return hexAry;
  }

  /** rotateHexCont; to align MetaHex row to horizontal. */
  rotateHexCont(nh: number) {
    // TODO: offset regX/Y to centerHex
    const { x, y } = this.xywh, cont = this.mapCont.hexCont;
    // cont.regX = -x, cont.regY = -y;
    cont.rotation = this.rotate(nh);
    // cont.regX = 0, cont.regY = 0;
  }

  /** cache hexCont and show the bitmap rotated on hexContR. */ // TODO: remove hexContR
  rotateHexContR(nh: number) {
    const hexCont = this.mapCont.hexCont, hexContR = this.mapCont.hexContR;
    const { x, y, width, height } = hexCont.getBounds();
    hexCont.cache(x, y, width, height); // cache hexCont (bounded by bgr)
    const cacheString = hexCont.bitmapCache.getCacheDataURL(); // TODO: put cache image on mapCont.hexContR
    const cacheBitmap = new Bitmap(cacheString);
    hexContR.addChild(cacheBitmap);
    hexContR.regX = width / 2;
    hexContR.regY = height / 2;
    this.mapCont.hexContR.rotation = this.rotate(nh);
    hexCont.visible = false;
    hexCont.setBounds(x, y, width, height);
  }

  /** return adjacent Angle, given SAS */
  rotate(nh: number) {
    const A = 60 * Math.PI / 180, sinA = Math.sin(A), cosA = Math.cos(A);
    const b = nh, c = 2 * nh - 1;
    const a = Math.sqrt(b * b + c * c - 2 * cosA * b * c);
    const B = Math.asin(sinA * b / a);
    // const B = this.calcSAS(b, c, A);
    // const Bdeg = B * 180 / Math.PI;
    return (Math.PI / 2 - B - A) * 180 / Math.PI; // <-- negative rotation
    // 1: 30, 2: 10.893, 3: 6.587, 4: 4.715; 5: 3.67
  }
  // for sides a, b, c; law of sines: a/sin(α = opp-a) = b/sin(β = opp-b) = c/sin(γ = opp-b)
  // a^2 = b^2 + c^2 −2bc * cos(α)
  // B = asin(sin(α) * b / a)
  /**
   *
   * @param b short side
   * @param c longer side
   * @param A angle between them (radians)
   * @return angle opposite b
   */
  calcSAS(b: number, c: number, A: number) {
    const a = Math.sqrt(b * b + c * c - 2 * b * c * Math.cos(A));
    // assert: b < c
    const B = Math.asin(Math.sin(A) * b / a)
    return B;
  }

  override update(): void {
    super.update();
  }

  // OR override makeAllDistricts(...)
  makeDistrictRect(nh: number, district: number, rc0: RC): T[] {
    const nr = TP.nHexes, nc = nr + 6;
    const hexAry = this.makeMetaHexRect(nr, nc, 1);
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

  /** set color, terrText, and top-mark on hex, based on Id
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
      // position label [terrText]
      const ldir = H.dirRevNS[topDir];
      hex.edgePoint(ldir, .6, hex.terrText);
      hex.terrText.rotation = textRot[ldir];
      hex.terrText.font = F.fontSpec((22) * TP.hexRad / 60);
      hex.terrText.text = tname;
      hex.terrText.visible = true;
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


// <T extends Hex & BatlMap<Hex & BatlHex>> extends HexMap<T>
class MetaHex<T extends Hex> extends Container {
  hexAry: Hex[] = [];

  constructor(public hexMap: HexMap<T>) {
    super();
  }

  addHexes(nh: number, district: number,  rc: RC) {
    const hexMap = this.hexMap;
    const hexAry = this.hexAry;
    hexAry.push(hexMap.addHex(rc.row, rc.col, district)) // The *center* hex of district
    for (let ring = 1; ring < nh; ring++) {
      rc = hexMap.nextRowCol(rc, hexMap.linkDirs[4]);
      // place 'ring' of hexes, addHex along each line:
      rc = hexMap.ringWalk(rc, ring, hexMap.linkDirs, (rc, dir) => {
        hexAry.push(hexMap.addHex(rc.row, rc.col, district));
        return hexMap.nextRowCol(rc, dir);
      });
    }
    hexMap.setDistrictAndPaint(hexAry as T[], district);
    return hexAry as T[];

  }
}
