import type { IAction } from "./action";
import type { IPowers } from "./powers";

export type IFichaAction = 1 | 0

export interface IFicha {
    power: IPowers,
    action: IAction
    quantity?:number,
    variations: [
        [IFichaAction, IFichaAction, IFichaAction],
        [IFichaAction, 0, IFichaAction],
        [IFichaAction, IFichaAction, IFichaAction]
    ][]
    decription: string,
}
