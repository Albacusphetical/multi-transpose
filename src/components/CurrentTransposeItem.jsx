import BlankTransposeMatrixItem from "./BlankTransposeMatrixItem.jsx";
import TransposeMatrixItem from "./TransposeMatrixItem.jsx";

function CurrentTransposeItem({data}) {
    if (data?.selectedIndex === undefined || data?.transposes === undefined) return <BlankTransposeMatrixItem/>

    const transpose = data.transposes[data.selectedIndex];

    return (
        transpose !== undefined
            ?
            <TransposeMatrixItem index={data.selectedIndex} transpose={transpose} selected={true} />
            :
            <BlankTransposeMatrixItem/>
    )
}

export default CurrentTransposeItem;