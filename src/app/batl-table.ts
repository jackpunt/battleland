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

  override layoutTurnlog(rowy = 9, colx = -16) {
    super.layoutTurnlog(rowy, colx);
  }

  override bgXYWH(x0 = 0, y0 = .5, w0 = 8, h0 = 2, dw = 4, dh = -2) {
    return super.bgXYWH(x0, y0, w0, h0, dw, dh);
  }

  override get panelHeight() { return 13 / 3 - .2; }
  override get panelOffset() { return 13; }

  override setPanelLocs(): number[][] {
    const cc = this.hexMap.centerHex.col; // shift right due to rotation:
    return super.setPanelLocs().map(([r, c, d]) => [r, c < cc ? c + 1 : c + 4, d]);
  }

  // use resaCont because we have tilted hexCont...
  override setToRowCol(cont: Container, row = 0, col = 0, hexCont = this.hexMap.mapCont.resaCont) {
    super.setToRowCol(cont, row, col, this.hexMap.mapCont.resaCont);
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

  override enableHexInspector(qY?: number, cont = this.undoCont) {
    cont.y += 100; cont.x += 40;
    const qShape = super.enableHexInspector(qY, cont);
    this.addInspectorMark(qShape);
    return qShape;
  }
}
