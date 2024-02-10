import TransposeMatrixItem from "./TransposeMatrixItem.jsx";

const TransposeMatrix = ({index, transposes}) => {
    return (
        <div className={"transpose-matrix-container"}>
            {transposes.length < 1
                ?
                <span className={"transpose-matrix-empty"}>
                    Waiting for transposes...
                </span>
                :
                <span className={"transpose-matrix-content"}>
                    {transposes.map((transpose, i) => (
                        <TransposeMatrixItem
                            index={i}
                            transpose={transpose}
                            selected={index === i}
                            showSelectedToolTip={true}
                        />
                    ))}
                </span>
            }
        </div>
    )
}

export default TransposeMatrix;