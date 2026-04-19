import { Ficha } from "../../../components/Ficha"
import { FICHAS } from "../../../data/fichas"
import { IUsers } from "../../../interface/users"

export const PagePrintTablero = () => {
    return <>
        {
            <div className="print-content-fichas-content">
                <div className={`print-content-fichas tablero`}>
                    {
                        (new Array(7 * 7)).fill(1).map((_) => {
                            return (
                                <Ficha
                                    {...FICHAS[0]}
                                    user={IUsers.Alianza}
                                    variation={FICHAS[0].variations[0]}
                                />
                            )
                        })
                    }

                </div>
            </div>
        }
    </>
}