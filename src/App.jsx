import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'


function App() {
  const [tree, setTree] = useState(null);
  // Track expanded/collapsed state for nodes by their unique path
  const [expanded, setExpanded] = useState({});

  // Import JSON
  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      setTree(JSON.parse(evt.target.result));
    };
    reader.readAsText(file);
  };

  // Export JSON
  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(tree, null, 2));
    const link = document.createElement("a");
    link.href = dataStr;
    link.download = "tree.json";
    link.click();
  };

  // Add Node/Terminal
  const addOption = (parent, type) => {
    const newOption =
      type === "Node"
        ? { title: "", image: "", question_for_options: "", options: [] }
        : { title: "", image: "", link: "" };
    parent.options.push(newOption);
    setTree({ ...tree });
  };

  // Delete option from parent
  const deleteOption = (parent, idx) => {
    if (!parent || !Array.isArray(parent.options)) return;
    parent.options.splice(idx, 1);
    setTree({ ...tree });
  };


  // Helper to get a unique path for each node
  const getNodePath = (parent, idx, path = "") => {
    if (!parent && idx === null) return "root";
    return path ? `${path}.${idx}` : `${idx}`;
  };

  // Toggle expanded/collapsed state for a node
  const toggleExpanded = (path) => {
    setExpanded((prev) => {
      const current = prev[path];
      // If undefined, treat as expanded, so toggle to collapsed
      return { ...prev, [path]: current === undefined ? false : !current };
    });
  };

  // Render Node/Terminal recursively
  const renderNode = (node, parent = null, idx = null, path = "root") => {
    if (!node) return null;
    if (node.options) {
      // Node
      const nodePath = getNodePath(parent, idx, path);
  const isExpanded = expanded[nodePath] !== false;

      return (
        <div style={{ border: "2px solid #7e7e7eff", margin: 1, padding: 8, position: "relative" }}>
          {parent && (
            <button
              style={{ position: "absolute", top: 0, right: 0, background: "#ff4d4f", color: "#fff", border: "none", borderRadius: "4px", padding: "2px 4px", cursor: "pointer" }}
              title="Delete"
              onClick={() => deleteOption(parent, idx)}
            >
              ✕
            </button>
          )}
          <div style={{ direction: "rtl" }}>
            <label htmlFor="title">כותרת</label>
            <input
              name="title"
              placeholder="כותרת"
              value={node.title}
              style={{ direction: "rtl", width: "100px" }}
              onChange={(e) => { node.title = e.target.value; setTree({ ...tree }); }}
            />
          </div>
          <div style={{ direction: "rtl" }}>
            <label htmlFor="image">תמונה</label>
            <input
              name="image"
              placeholder="URL לתמונה"
              value={node.image}
              onChange={(e) => { node.image = e.target.value; setTree({ ...tree }); }}
            />
          </div>
          <div style={{ direction: "rtl" }}>
            <label htmlFor="question_for_options">שאלה</label>
            <input
              name="question_for_options"  
              placeholder="שאלה"
              style={{ direction: "rtl", width: "300px" }}
              value={node.question_for_options}
              onChange={(e) => { node.question_for_options = e.target.value; setTree({ ...tree }); }}
            />
          </div>
          <div>
            <button onClick={() => addOption(node, "Node")}>Add Option</button>
            <button style={{ backgroundColor: "#004cff", color: "#fff" }} onClick={() => addOption(node, "Terminal")}>Add Link</button>
          </div>
          {/* Children area with toggle and indicator */}
          <div style={{ marginTop: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <button
                style={{ background: isExpanded ? "#eee" : "#ccc", color: "#333", border: "none", borderRadius: "4px", padding: "2px 8px", cursor: "pointer" }}
                title={isExpanded ? "Hide children" : "Show children"}
                onClick={() => toggleExpanded(nodePath)}
              >
                {isExpanded ? "Hide Children" : "Show Children"}
              </button>
              {/* Indicator if children are hidden */}
              {!isExpanded && node.options.length > 0 && (
                <span style={{ background: "#ffc107", color: "#333", borderRadius: "8px", padding: "2px 8px", fontSize: "0.9em" }}>
                  {node.options.length} hidden
                </span>
              )}
            </div>
            {isExpanded && (
              <div style={{ marginLeft: 16, display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {node.options.map((opt, i) => (
                  <div key={i}>{renderNode(opt, node, i, nodePath)}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    } else {
      // Terminal
      return (
        <div style={{ border: "2px solid #004cff", margin: 8, padding: 8, position: "relative" }}>
          {parent && (
            <button
              style={{ position: "absolute", top: 0, right: 0, background: "#ff4d4f", color: "#fff", border: "none", borderRadius: "4px", padding: "2px 4px", cursor: "pointer" }}
              title="Delete"
              onClick={() => deleteOption(parent, idx)}
            >
              ✕
            </button>
          )}
          <div style={{ direction: "rtl" }}>
            <label htmlFor="title">כותרת</label>
            <input
              name='title'
              placeholder="כותרת"
              style={{ direction: "rtl", width: "100px" }}
              value={node.title}
              onChange={(e) => { node.title = e.target.value; setTree({ ...tree }); }}
            />
          </div>
          <div style={{ direction: "rtl" }}>
            <label htmlFor="image">תמונה</label>
            <input
              name='image'
              placeholder="URL לתמונה"
              style={{ direction: "ltr", width: "200px" }}
              value={node.image}
              onChange={(e) => { node.image = e.target.value; setTree({ ...tree }); }}
            />
          </div>
          <div style={{ direction: "rtl" }}>
            <label htmlFor="link">קישור</label>
            <input
              name='link'
              placeholder="קישור לקטגוריה או מוצר"
              style={{ direction: "ltr", width: "200px" }}
              value={node.link}
              onChange={(e) => { node.link = e.target.value; setTree({ ...tree }); }}
            />
          </div>
        </div>
      );
    }
  };

  return (
    <div style={{ fontFamily: "sans-serif", padding: 16, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <div>
        <button onClick={() => setTree({ title: "", image: "", question_for_options: "", options: [] })}>
          New Tree
        </button>
        <input type="file" accept="application/json" onChange={handleImport} />
        <button onClick={handleExport} disabled={!tree}>Export JSON</button>
      </div>
      <div style={{ marginTop: 16, flex: 1 }}>
        {tree ? renderNode(tree, null, null) : <div>No tree loaded. Create or import one.</div>}
      </div>
      <footer>
        <strong>JSON Preview:</strong>
        <pre style={{ color: "#fff", fontFamily: "monospace", textAlign: "left", whiteSpace: "pre-wrap", wordBreak: "break-word", overflow: "auto", background: "#000", border: "1px solid #ddd", padding: "8px", marginTop: "8px" }}>
          {tree ? JSON.stringify(tree, null, 2) : "No tree loaded."}
        </pre>
      </footer>
    </div>
  );
}

export default App;