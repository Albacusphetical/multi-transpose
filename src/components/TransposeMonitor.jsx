import PrevTransposeItem from "./PrevTransposeItem.jsx"
import CurrentTransposeItem from "./CurrentTransposeItem.jsx"
import NextTransposeItem from "./NextTransposeItem.jsx"

function TransposeMonitor({data}) {
    return (
        <span className={"transposes-monitor transpose-matrix-content"}>
            <PrevTransposeItem data={data}/>
            <CurrentTransposeItem data={data}/>
            <NextTransposeItem data={data}/>
        </span>
    )
}

export default TransposeMonitor;