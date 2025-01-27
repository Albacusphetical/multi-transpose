import TransposeMatrixItem from "./TransposeMatrixItem.jsx";

const TransposeMatrix = ({index, transposes}) => {
    const transposesInputEl = document.getElementById("transposes-input")

    return (
        <div
            className={"transpose-matrix-container"}
            onMouseOver={() => {
                transposesInputEl.focus()
            }}
        >
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