import { C, Constructor, F, RC, stime } from "@thegraid/common-lib";
import { CenterText } from "@thegraid/easeljs-lib";
import { Bitmap, Text } from "@thegraid/easeljs-module";
import { AliasLoader, H, Hex, Hex2, HexDir, HexMap, NsDir, TP, Topo, TopoNS } from "@thegraid/hexlib";

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

  /** rcText always visible */
  override showText(vis = this.rcText.visible): void {
    this.rcText.visible = vis;
    this.cont.updateCache();
  }

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

  /** utility for makeAllDistricts; make hex0 at RC */
  override calcInitialHex(): RC {
    // suitable for makeMetaHexes
    const offs = Math.ceil(this.nh + this.mh * 1.5);
    return { row: offs, col: offs } // row,col to be non-negative
  }

  /**
   * Make the center district, then make (mh-1) rings other meta-hex districts.
   * @param mh order [number of 'rings'] of meta-hexes (2 or 3 for this game) [TP.mHexes]
   * @param nh size ['rings' in each meta-hex] of meta-hex (1..6) [TP.nHexes]
   */
  override makeAllDistricts(nh = TP.nHexes, mh = TP.mHexes) {
    this.setSize(nh, mh);
    this.setSize(nh = 3, mh = 2);
    let district = 0;
    let rc0 = this.calcInitialHex();
    const dirs = this.linkDirs;
    // do metaRing = 0
    const hexAry = this.makeMetaHex(nh, district++, rc0); // Central District [0]
    console.log(stime(this, `.centerHex(${0}, ${0})`), rc0, 0, 'center');

    let mrc0: RC = rc0;
    // step (nh, dir) until
    for (let metaRing = 1; metaRing < mh; metaRing++) {
      // step in dir4 to initial mrc1 (W or WS of rc0)
      const dir4 = dirs[4], dir3 = dirs[(4 + 5) % 6]; // ring starts at 'dist' from center
      const dL = nh, dS = (nh - 1);
      mrc0 = this.forRCsOnLine(dL, mrc0, dir4); // step (WS) by dist
      mrc0 = this.forRCsOnLine(dS, mrc0, dir3); // step (S) to center of 0-th metaHex
      console.log(stime(this, `.dir4(${dir4}, ${-1})`), mrc0, dL, dS);


      // step from mrc1 to make line of metatRing metaHex-es along each dir.
      dirs.forEach((dirL, nd) => {
        for (let nhc = 1; nhc <= metaRing; nhc++) { // < metaRing?
          const dirS = dirs[(nd + 5) % 6];       // dirs[dir-1]
          const mrc10 = { ...mrc0 };             // for log
          mrc0 = this.forRCsOnLine(dL, mrc0, dirL);
          console.log(stime(this, `.dirs.forEach(${dirL}, ${nd})`), mrc10, dL, dirL, mrc0);
          mrc0 = this.forRCsOnLine(dS, mrc0, dirS);
          console.log(stime(this, `.dirs.forEach(${dirL}, ${nd})`), mrc10, dS, dirS, mrc0);
          const hexAry2 = this.makeMetaHex(nh, district++, mrc0);
          hexAry.concat(...hexAry2);
        }
      })
    }
    this.hexAry = hexAry;
    this.mapCont.hexCont && this.mapCont.centerContainers()
    return hexAry;
  }

  /** like nextHex, but uses nextRowCol, so does not assume/require existing hex.links
   *
   * approx: { row: rc.row + n * dr, col: rc.col + n * dc };
   *
   * but accounts for each even/odd row offset.
   */
  override radialRC(rc: RC, n = 1, dir = this.linkDirs[4]) {
    for (let ring = 1; ring <= n; ring++) {
      rc = this.nextRowCol(rc, dir);
    }
    return rc;
  }

  /**
   * Apply f(rc, dir) to each of 'n' lines of RCs on nth ring.
   * Step from centerHex by dirs[4], do a line for each dir in dirs.
   *
   * - if topoEW: step to W; make lines going NE, E, SE, SW, W, NW
   * - if topoNS: step to WS; make lines going N, EN, ES, S, WS, WN
   * @param rc0 center of rings
   * @param n ring number
   * @param dirs [this.linkDirs] each topo dirs in [clockwise] order.
   * @param f (RC, dir) => void
   * @return the *next* RC on the final line (so can easily spiral)
   */
  override ringWalk(rc0: RC, n: number, dirs = this.linkDirs, f: (rc: RC, dir: HexDir) => void) {
    let rc: RC = this.radialRC(rc0, n, dirs[4]);
    // TODO: proceed from [last/given] rc0! requires rc = f(rc, dir) => RC
    dirs.forEach(dir => {
      rc = this.forRCsOnLine(n, rc, dir, (rc) => {
        f(rc, dir);
        return rc;
      });
    });
    return rc;
  }

  /** make a district of order nh, at rc(row, col)
   *
   * addHex for center hex and each of nh 'rings' hexes.
   * @param nh order of the metaHex/district
   * @param district identifying number of district
   * @param rc location of center Hex
   * @return array containing all the added Hexes
   */
  override makeMetaHex(nh: number, district: number,  rc: RC): T[] {
    let hexAry = Array<Hex>(), rc0 = {...rc};
    hexAry.push(this.addHex(rc.row, rc.col, district)) // The *center* hex of district
    // let rc: RC = this.radialRC(rc0, n, dirs[4]);
    for (let ring = 1; ring < nh; ring++) {
      rc = this.ringWalk(rc0, ring, this.linkDirs, (rc, dir) => {
        // place 'ring' hexes along each axis-line:
        return this.newHexesOnLine(ring, rc, dir, district, hexAry)
      });
    }
    if (hexAry[0] instanceof Hex2) {
      let hex2Ary = hexAry as Hex2[]
      let dcolor = district == 0 ? HexMap.distColor[0] : this.pickColor(hex2Ary)
      hex2Ary.forEach((hex, n) => hex.setHexColor((n == 0) ? C.PURPLE : dcolor)); // C.PURPLE
    }
    return hexAry as T[];
  }

  // OR override makeAllDistricts(...)
  makeDistrictRect(nh: number, district: number, mr: number, mc: number): T[] {
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
