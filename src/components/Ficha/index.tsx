import type { IFicha } from "../../interface/ficha"
import { IPowers } from "../../interface/powers"
import { IUsersColors, type IUsers } from "../../interface/users"

import "./style.css"

export interface FichaProps extends IFicha {
    user: IUsers
    variation: IFicha['variations'][number]
    back?: boolean
    useImg?: boolean
}

export const Ficha = ({ useImg = false, power, variation, user, back = false }: FichaProps) => {
    const USERS = import.meta.glob('/src/assets/users/*.svg', {
        as: 'raw',
        eager: true,
        import: 'default'
    });
    const getImg = (svg: any) => {
        return useImg ? `<img src="data:image/svg+xml;utf8,${encodeURIComponent(`${svg}`.replaceAll("currentColor",IUsersColors[user]))}"/>` : svg;
    }
    const USER_ITEM = USERS[`/src/assets/users/${user}.svg`];
    const USERS_SVG = getImg(USER_ITEM);


    const BACK_ITEM = USERS[`/src/assets/users/Back.svg`];
    const BACK_SVG = getImg(BACK_ITEM);

    const PROWERS = import.meta.glob('/src/assets/powers/*.svg', {
        as: 'raw',
        eager: true,
        import: 'default'
    });
    const PROWER_ITEM = PROWERS[`/src/assets/powers/${power}.svg`];
    const PROWER_SVG = getImg(PROWER_ITEM);


    return <>
        <div
            className="ficha"
            style={{ color: IUsersColors[user] }}
        >
            {
                variation.map((row, i) => {
                    return <>
                        {
                            row.map((x, j) => {
                                if (i == 1 && j == 1) {
                                    if (back) {
                                        return <div
                                            className="ficha-user"
                                            dangerouslySetInnerHTML={{ __html: BACK_SVG }}
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