import { Ficha } from "../../../components/Ficha"
import { FICHAS } from "../../../data/fichas"
import { IUsers } from "../../../interface/users"

export const PagePrintBack = () => {
    return <>
        {
            <div className={`print-content-fichas back`}>
                {
                    Object.values(IUsers).map((user) => {
                        return <>
                            {
                                FICHAS.map((e, i) => {
                                    return <>

                                        {(new Array(e.quantity ?? 1))?.fill(1)?.map((_, j) => {
                                            return <>
                                                {
                                                    e.variations.map((v, k) => {
                                                        return <>
                                                            <Ficha
                                                                key={`${i}-${j}-${k}`}
                                                                variation={v}
                                                                user={user}
                                                                back={true}
                                                                {...e}
                                                            />
                                                        </>
                                                    })
                                                }
                                            </>
                                        })}
                                    </>
                                })
                            }
                        </>
                    })
                }

            </div>
        }
    </>
}