import type { IFicha } from "../../interface/ficha"
import { IPowers } from "../../interface/powers"
import { IUsersColors, type IUsers } from "../../interface/users"

import "./style.css"

export interface FichaProps extends IFicha {
    user: IUsers
    variation: IFicha['variations'][number]
    back?:boolean
}

export const Ficha = ({ action, power, variation, user,back=false }: FichaProps) => {
    const USERS = import.meta.glob('/src/assets/users/*.svg', {
        as: 'raw',
        eager: true,
        import: 'default'
    });
    const USERS_SVG = USERS[`/src/assets/users/${user}.svg`];
    const Back = USERS[`/src/assets/users/Back.svg`];

    const PROWERS = import.meta.glob('/src/assets/powers/*.svg', {
        as: 'raw',
        eager: true,
        import: 'default'
    });
    const PROWER_SVG = PROWERS[`/src/assets/powers/${power}.svg`];


    return <>
        <div
            className="ficha"
            style={{color:IUsersColors[user]}}
        >
            {
                variation.map((row, i) => {
                    return <>
                        {
                            row.map((x, j) => {
                                if (i == 1 && j == 1) {
                                    if(back){
                                    return <div
                                        className="ficha-user"
                                        dangerouslySetInnerHTML={{ __html: Back }}
                                    >
                                    </div>
                                    }
                                    return <div
                                        className="ficha-user"
                                        dangerouslySetInnerHTML={{ __html: USERS_SVG }}
                                    >
                                    </div>
                                }
                                if (x == 0 || back) {
                                    return <div
                                        className="ficha-efecto"
                                    >

                                    </div>
                                }
                                const giro = [
                                    IPowers.Eliminacion_Simple,
                                    IPowers.Eliminacion_Linea,
                                    IPowers.Corredor,
                                ].includes(power) ? `deg-${i}-${j}` : ""
                                return <div
                                    className={`ficha-efecto ${giro}`}
                                    dangerouslySetInnerHTML={{ __html: PROWER_SVG }}
                                >

                                </div>
                            })
                        }
                    </>
                })
            }
        </div>
    </>
}