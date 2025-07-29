import React, { useState, useEffect, useRef } from "react";
import { InputGroup, Button, TagInput, Collapse, Card } from "@blueprintjs/core";
import debounce from "lodash.debounce";

const SheetsPortalSearchBar = ({ onSearch, style = {} }) => {
    const [expanded, setExpanded] = useState(false);
    const [titleQuery, setTitleQuery] = useState("");
    const [labels, setLabels] = useState([]);
    const [trelloName, setTrelloName] = useState("");

    const debouncedSearch = React.useMemo(() => {
        return debounce((title, label, trello) => {
            onSearch({ title, label, trello });
        }, 800)
    }, [onSearch])

    useEffect(() => {
        debouncedSearch.cancel();
        debouncedSearch(titleQuery.trim(), labels.map(l => l.trim()).filter(Boolean), trelloName.trim());

        return () => {
            debouncedSearch.cancel();
        };
    }, [titleQuery, labels, trelloName, debouncedSearch]);

    return (
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Button
                icon={expanded ? "chevron-up" : "search"}
                minimal
                onClick={() => setExpanded(!expanded)}
                style={style}
            />

            <Collapse isOpen={expanded}>
                <Card
                    elevation={0}
                    style={{
                        display: "flex",
                        gap: "8px",
                        alignItems: "center",
                        flexWrap: "wrap",
                        marginTop: 8,
                        marginBottom: 1,
                        padding: 8
                    }}
                >
                    <InputGroup
                        leftIcon="draw"
                        placeholder="Search title"
                        value={titleQuery}
                        onChange={(e) => setTitleQuery(e.target.value)}
                    />
                    <TagInput
                        leftIcon={"tag"}
                        values={labels}
                        onChange={setLabels}
                        inputProps={{ placeholder: "Labels..." }}
                        fill={false}
                    />
                    <InputGroup
                        leftIcon="user"
                        placeholder="Trello name"
                        value={trelloName}
                        onChange={(e) => setTrelloName(e.target.value)}
                    />
                </Card>
            </Collapse>
        </div>
    );
};

export default SheetsPortalSearchBar;
