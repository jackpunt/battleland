import { DragInfo } from "@thegraid/easeljs-lib";
import { Container, DisplayObject, Stage } from "@thegraid/easeljs-module";
import { GamePlay, Hex2, HexCont, HexShape, LegalMark, Player, TP, Table } from "@thegraid/hexlib";

export class BatlTable extends Table {
  constructor(stage: Stage) {
    super(stage);
    this.initialVis = true;
  }
  override makeRecycleHex(row?: number | undefined, col?: number | undefined): Hex2 {
    return undefined as any as Hex2;
  }

  override bgXYWH(x0 = -1, y0 = .5, w0 = 10, h0 = 1, dw = 0, dh = 0) {
    return super.bgXYWH(x0, y0, w0, h0, dw, dh);
  }

  override get panelHeight() { return 13 / 3 - .2; }
  // override get panelOffset() { return 13.3; }

  override layoutTable(gamePlay: GamePlay): void {
    //   TODO: use hexlib@1.0.12, see also gameSetup.initialize TP.nHexes
    TP.nHexes = 11.3; // <-- feeds into: panelOffset = TP.nHexes+2
    super.layoutTable(gamePlay);
    this.layoutTurnlog(9, -16);
  }

  layoutTurnlog(rowy = 4, colx = -12) {
    // TODO: super.layoutTurnlog(rowy, colx);
    const parent = this.scaleCont;
    this.setToRowCol(this.turnLog, rowy, colx);
    this.setToRowCol(this.textLog, rowy, colx);
    this.textLog.y += this.turnLog.height(Player.allPlayers.length + 1); // allow room for 1 line per player

    parent.addChild(this.turnLog, this.textLog);
    parent.stage.update();
  }

  // use resaCont because we have tilted hexCont...
  override setToRowCol(cont: Container, row = 0, col = 0, hexCont = this.hexMap.mapCont.resaCont) {
    // super.setToRowCol(cont, row, col, this.hexMap.mapCont.resaCont);
    if (!cont.parent) this.scaleCont.addChild(cont); // localToLocal requires being on stage
    //if (cont.parent === hexCont) debugger;
    const hexC = this.hexMap.centerHex;
    const { x, y, dxdc, dydr } = hexC.xywh();
    const xx = x + (col - hexC.col) * dxdc;
    const yy = y + (row - hexC.row) * dydr;
    hexCont.localToLocal(xx, yy, cont.parent, cont);
    if (cont.parent === hexCont) {
      cont.x = xx; cont.y = yy;
    }
  }
  /** override to ignore markCont, get directly from mapCont.hexCont */
  hexUnderObj1(dragObj: DisplayObject, legalOnly = true ) {
    const hexCont = this.hexMap.mapCont.hexCont;
    const pt = dragObj.parent.localToLocal(dragObj.x, dragObj.y, hexCont);
    const hexc = hexCont.getObjectUnderPoint(pt.x, pt.y, 1);
    if (hexc instanceof HexCont) return hexc.hex2;
    return undefined;
  }

  /** augment HexInspector to highlight the Hex: */
  addInspectorMark(qShape: DisplayObject) {
    const qMark = new HexShape(TP.hexRad / 2); // a bit smaller
    qMark.paint("rgba(150,50,50,.3)"); // light pink, transparent
    qMark.visible = false;
    qShape.parent.addChild(qMark);
    const dragFunc = (qShape: DisplayObject, ctx?: DragInfo) => {
      const hex = this.hexUnderObj1(qShape, false);  // just check hexCont!
      if (hex) {
        // move qMark to location of hex:
        hex.cont.parent.localToLocal(hex.x, hex.y, qMark.parent, qMark);
        qMark.visible = true;
      } else {
        qMark.visible = false;
      }
    }
    const dragData = this.dragger.getDragData(qShape);
    dragData.dragfunc = dragFunc;
  }

  override enableHexInspector(qY?: number, cont = this.undoCont): void {
    cont.y += 100; cont.x += 40;
    /* TODO: const qShape = */ super.enableHexInspector(qY, cont);
    const qShape = cont.getChildAt(cont.numChildren - 1);
    this.addInspectorMark(qShape);
  }
}
