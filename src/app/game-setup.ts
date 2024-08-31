import { Params } from '@angular/router';
import { C, Constructor } from '@thegraid/common-lib';
import { AliasLoader, GamePlay, GameSetup as GameSetupLib, Hex, Meeple, Player, Scenario as Scenario0, TP, Tile } from '@thegraid/hexlib';
import { BatlTable } from './batl-table';
import { BatlHex, BatlMap } from './battle-hex';

// type Params = {[key: string]: any;}; // until hexlib supplies
export interface Scenario extends Scenario0 {

};

export class GS {
  static hexk = .3;
  static transp = 'rgba(0,0,0,0)';
  static bgHexColor = C.BLACK;
  static blkHexColor = GS.transp;
  static exitDir = -1;
}

/** initialize & reset & startup the application/game. */
export class GameSetup extends GameSetupLib {

  override initialize(canvasId: string, qParams = []): void {
    // BatlHex uses NsTopo, size 7.
    TP.useEwTopo = false;
    TP.nHexes = 7;
    super.initialize(canvasId);
    return;
  }

  /** Include .gif images for terrainNames: */
  override loadImagesThenStartup(qParams: Params = {}) {
    const loader = AliasLoader.loader ?? (AliasLoader.loader = new AliasLoader());
    loader.imageArgs.ext = 'gif';
    const names = Object.values(BatlMap.terrainNames);
    const names_i = names.map(name => `${name}_i`);
    loader.fnames = names.concat(names_i).concat(['Recycle']);
    super.loadImagesThenStartup(qParams);    // loader.loadImages(() => this.startup(qParams));
  }

  override startup(qParams?: { [key: string]: any; } | undefined): void {
    const hexC = BatlHex as Constructor<Hex>;
    this.hexMap = new BatlMap<Hex & BatlHex>(TP.hexRad, true, hexC);
    this.nPlayers = Math.min(TP.maxPlayers, qParams?.['n'] ? Number.parseInt(qParams?.['n']) : 2);
    const scenario = { turn: 0, Aname: 'defaultScenario' };

    Tile.allTiles = [];
    Meeple.allMeeples = [];
    Player.allPlayers = [];
    this.table = new BatlTable(this.stage);        // EventDispatcher, ScaleCont, GUI-Player
    // Inject Table into GamePlay & make allPlayers:
    const gamePlay = new GamePlay(this, scenario) // hexMap, players, fillBag, gStats, mouse/keyboard->GamePlay
    this.gamePlay = gamePlay;

    this.startScenario(scenario); // ==> table.layoutTable(gamePlay)
  }

}
