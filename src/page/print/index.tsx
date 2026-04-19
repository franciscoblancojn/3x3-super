import { PagePrintBack } from "./back"
import { PagePrintFront } from "./front"

export const PagePrint = () => {
    return <>
        <PagePrintFront/>
        <PagePrintBack/>
    </>
}