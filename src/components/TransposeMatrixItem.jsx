import {Card, Tooltip} from "@blueprintjs/core";
import {emit} from "@tauri-apps/api/event";

const TransposeMatrixItem = ({ transpose, index, selected = false, showSelectedToolTip = false}) => {
    const translucentIndexColor = selected ? 255 : 0;

    const selectIndexHandler = (selected_index) => {
        emit("backend_event", {selected_index})
    }

    const ToolTipIfSelected = ({selected, children}) => {
        return (
            showSelectedToolTip && selected
                ?
                <Tooltip content={"Before playing, this must be your transpose!"}>
                    {children}
                </Tooltip>
                :
                children
        )
    }

    return (
        <ToolTipIfSelected selected={selected}>
            <Card
                id={`transpose-matrix-item-${index}`}
                className={"transpose-matrix-item"}
                style={{
                    backgroundColor: selected ? "green" : null,
                    color: selected ? "white" : null,
                }}
                interactive={true}
                compact={true}
                onClick={() => selectIndexHandler(index)}
            >
                <span
                    className={"transpose-matrix-index"}
                    style={{
                        color: `rgba(${translucentIndexColor}, ${translucentIndexColor}, ${translucentIndexColor}, 0.5)`
                    }}
                >
                    {index + 1}
                </span>
                <span>{transpose === 0 ? "0" : transpose > 0 ? `+${transpose}` : `${transpose}`}</span>
            </Card>
        </ToolTipIfSelected>
    );
};

export default TransposeMatrixItem;