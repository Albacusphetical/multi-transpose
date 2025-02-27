import BlankTransposeMatrixItem from "./BlankTransposeMatrixItem.jsx";
import TransposeMatrixItem from "./TransposeMatrixItem.jsx";
import {useEffect} from "react";

function PrevTransposeItem({data}) {
    if (data?.selectedIndex === undefined || data?.transposes === undefined) return <BlankTransposeMatrixItem/>

    const index = (data.selectedIndex + data.transposes.length - 1) % data.transposes.length;
    const transpose = data.transposes[index];

    return (
        <span style={{color: "black"}}>
            {index !== data.selectedIndex && transpose !== undefined
                ?
                <TransposeMatrixItem index={index} transpose={transpose} selected={false} />
                :
                <BlankTransposeMatrixItem/>
            }
        </span>
    )
}

export default PrevTransposeItem;