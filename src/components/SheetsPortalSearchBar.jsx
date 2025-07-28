import React, { useState, useEffect, useRef } from "react";
import { InputGroup, Button, TagInput, Collapse, Card } from "@blueprintjs/core";
import debounce from "lodash.debounce";

const SheetsPortalSearchBar = ({ onSearch }) => {
    const [expanded, setExpanded] = useState(false);
    const [titleQuery, setTitleQuery] = useState("");
    const [labels, setLabels] = useState([]);
    const [trelloName, setTrelloName] = useState("");

    const titleRef = useRef("");
    const labelsRef = useRef([]);
    const trelloRef = useRef("");

    const debouncedSearch = useRef(
        debounce(() => {
            const title = titleRef.current.trim();
            const label = labelsRef.current.map(l => l.trim()).filter(Boolean);
            const trello = trelloRef.current.trim();

            onSearch({ title, label, trello });
        }, 2000)
    ).current;

    useEffect(() => {
        titleRef.current = titleQuery;
        labelsRef.current = labels;
        trelloRef.current = trelloName;
        debouncedSearch();

        return () => {
            debouncedSearch.cancel();
        };
    }, [titleQuery, labels, trelloName]);

    return (
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Button
                icon={expanded ? "chevron-up" : "search"}
                minimal
                onClick={() => setExpanded(!expanded)}
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
                        padding: 8,
                    }}
                >
                    <InputGroup
                        leftIcon="document"
                        placeholder="Search title"
                        value={titleQuery}
                        onChange={(e) => setTitleQuery(e.target.value)}
                        small
                    />
                    <TagInput
                        values={labels}
                        onChange={setLabels}
                        inputProps={{ placeholder: "Labels..." }}
                        tagProps={{ minimal: true }}
                        fill={false}
                        small
                    />
                    <InputGroup
                        leftIcon="user"
                        placeholder="Trello name"
                        value={trelloName}
                        onChange={(e) => setTrelloName(e.target.value)}
                        small
                    />
                </Card>
            </Collapse>
        </div>
    );
};

export default SheetsPortalSearchBar;
