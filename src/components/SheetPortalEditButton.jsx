import {Button} from "@blueprintjs/core";

const SheetPortalEditButton = ({onClick = () => {}, small = false, mainIcon = true, ...props}) => {
    return (
        <Button
            className={"sheets-portal-icon-button"}
            icon={mainIcon ? "document-share" : "edit"}
            small={small}
            minimal
            onClick={onClick}
            {...props}
        />
    )
}

export default SheetPortalEditButton