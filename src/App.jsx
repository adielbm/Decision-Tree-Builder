import { useState, useEffect } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'


function App() {
  // Helper functions for localStorage
  const saveTreeToStorage = (treeData) => {
    try {
      localStorage.setItem('decision-tree-data', JSON.stringify(treeData));
    } catch (error) {
      console.error('Failed to save tree to localStorage:', error);
    }
  };

  const loadTreeFromStorage = () => {
    try {
      const saved = localStorage.getItem('decision-tree-data');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Validate the parsed data has the expected structure
        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      }
    } catch (error) {
      console.error('Failed to load tree from localStorage:', error);
    }
    // Return default tree if no saved data or error
    return { title: "", image: "", question_for_options: "", options: [] };
  };

  const [tree, setTree] = useState(loadTreeFromStorage);
  // Track expanded/collapsed state for nodes by their unique path
  const [expanded, setExpanded] = useState({});
  const [activeTab, setActiveTab] = useState('edit-tree');

  // Autosave tree to localStorage whenever it changes
  useEffect(() => {
    if (tree) {
      saveTreeToStorage(tree);
    }
  }, [tree]);

  // Convert tree to Mermaid flowchart syntax
  function jsonToMermaid(data) {
    let mermaid = 'flowchart TD\n';
    
    let nodeId = 0;
    const nodes = [];
    const edges = [];
    const nodeClasses = [];

    // Helper function to sanitize text for Mermaid
    function sanitize(text) {
      return text.replace(/"/g, '#quot;').replace(/\n/g, ' ');
    }

    // Helper function to generate unique node ID
    function getNodeId() {
      return `node${nodeId++}`;
    }

    // Recursive function to process nodes
    function processNode(item, parentId = null) {
      const currentId = getNodeId();

      // Check if this is a link node
      if (item.link) {
        // Link node (blue circle)
        nodes.push(`${currentId}(("${sanitize(item.title)}"))`);
        nodeClasses.push(`class ${currentId} terminalStyle`);
        if (parentId) {
          edges.push(`${parentId} --> ${currentId}`);
        }
        return currentId;
      }

      // Check if this has a question
      if (item.question_for_options && item.question_for_options.trim() !== '') {
        // Create option node first
        nodes.push(`${currentId}["${sanitize(item.title)}"]`);
        nodeClasses.push(`class ${currentId} optionStyle`);
        if (parentId) {
          edges.push(`${parentId} --> ${currentId}`);
        }

        // Create question node
        const questionId = getNodeId();
        nodes.push(`${questionId}{"${sanitize(item.question_for_options)}"}`);
        nodeClasses.push(`class ${questionId} questionStyle`);
        edges.push(`${currentId} --> ${questionId}`);

        // Process children from question node
        if (item.options && item.options.length > 0) {
          item.options.forEach(child => {
            processNode(child, questionId);
          });
        }
      } else {
        // Just an option node without question
        nodes.push(`${currentId}["${sanitize(item.title)}"]`);
        nodeClasses.push(`class ${currentId} optionStyle`);
        if (parentId) {
          edges.push(`${parentId} --> ${currentId}`);
        }

        // Process children directly
        if (item.options && item.options.length > 0) {
          item.options.forEach(child => {
            processNode(child, currentId);
          });
        }
      }

      return currentId;
    }

    // Start processing from root
    processNode(data);

    // Build the complete Mermaid diagram
    mermaid += '    ' + nodes.join('\n    ') + '\n\n';
    mermaid += '    ' + edges.join('\n    ') + '\n\n';
    
    // colors constants
    const COLOR_LINK = '#d9efffff';
    const COLOR_OPTION = '#eaffdfff';
    const COLOR_QUESTION = '#f7bbe2ff'; 
    const COLOR_QUESTION_STROKE = '#a20092ff';
    const COLOR_TERMINAL_STROKE = '#00478dff';
    const COLOR_OPTION_STROKE = '#3e8e00ff';  



    // Add styling definitions
    mermaid += `    classDef terminalStyle fill:${COLOR_LINK},stroke:${COLOR_TERMINAL_STROKE},stroke-width:2px,color:#000\n`;
    mermaid += `    classDef optionStyle fill:${COLOR_OPTION},stroke:${COLOR_OPTION_STROKE},stroke-width:2px,color:#000\n`;
    mermaid += `    classDef questionStyle fill:${COLOR_QUESTION},stroke:${COLOR_QUESTION_STROKE},stroke-width:2px,color:#000\n`;

    // Add class assignments
    mermaid += '    ' + nodeClasses.join('\n    ') + '\n';

    return mermaid;
  }



  // Convert tree to Graphviz DOT notation
  const convertTreeToGraphviz = (node, nodeId = 'root', parentId = null) => {
    if (!node) return '';

    let dotCode = '';
    let connections = '';

    // Escape text for DOT notation
    const escapeText = (text) => {
      if (!text) return 'Untitled';
      return text.replace(/"/g, '\\"').replace(/\n/g, '\\n').substring(0, 30) + (text.length > 30 ? '...' : '');
    };

    if (node.options) {
      // This is a decision node
      const questionText = node.question_for_options?.trim();
      if (questionText) {
        // Questions use diamond shape with purple styling
        const nodeLabel = escapeText(questionText);
        dotCode += `    ${nodeId} [label="${nodeLabel}", shape=diamond, style=filled, fillcolor="#e1bee7", color="#7b1fa2", fontcolor=black];\n`;

        // Add connection from parent if exists
        if (parentId) {
          connections += `    ${parentId} -> ${nodeId};\n`;
        }

        // Process children - create intermediate option nodes
        node.options.forEach((option, index) => {
          const optionNodeId = `${nodeId}_opt_${index}`;
          const optionLabel = escapeText(option.title);
          dotCode += `    ${optionNodeId} [label="${optionLabel}", shape=box, style=filled, fillcolor="#ffe0b2", color="#f57c00", fontcolor=black];\n`;
          connections += `    ${nodeId} -> ${optionNodeId};\n`;

          // Then create child node
          const childId = `${nodeId}_${index}`;
          const childResult = convertTreeToGraphviz(option, childId, optionNodeId);
          dotCode += childResult.nodes;
          connections += childResult.connections;
        });
      } else {
        // Skip this node if no question - connect parent directly to children
        node.options.forEach((option, index) => {
          const optionNodeId = `${nodeId}_opt_${index}`;
          const optionLabel = escapeText(option.title);
          dotCode += `    ${optionNodeId} [label="${optionLabel}", shape=box, style=filled, fillcolor="#ffe0b2", color="#f57c00", fontcolor=black];\n`;

          if (parentId) {
            connections += `    ${parentId} -> ${optionNodeId};\n`;
          }

          // Then create child node
          const childId = `${nodeId}_${index}`;
          const childResult = convertTreeToGraphviz(option, childId, optionNodeId);
          dotCode += childResult.nodes;
          connections += childResult.connections;
        });
      }
    } else {
      // This is a terminal node - use ellipse shape with blue styling
      const nodeLabel = escapeText(node.title);
      dotCode += `    ${nodeId} [label="${nodeLabel}", shape=ellipse, style=filled, fillcolor="#bbdefb", color="#1976d2", fontcolor=black];\n`;

      // Add connection from parent if exists
      if (parentId) {
        connections += `    ${parentId} -> ${nodeId};\n`;
      }
    }

    return {
      nodes: dotCode,
      connections: connections
    };
  };

  // Generate complete Graphviz DOT diagram
  const generateGraphvizDiagram = () => {
    if (!tree) return '';

    const result = convertTreeToGraphviz(tree);
    return `digraph DecisionTree {\n    rankdir=TB;\n    node [fontname="Arial"];\n    edge [fontname="Arial"];\n\n${result.nodes}\n${result.connections}}`;
  };




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
    // show a confirmation dialog
    if (!window.confirm("Are you sure you want to delete this option?")) return;
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
              style={{ direction: "rtl", width: "250px" }}
              onChange={(e) => { node.title = e.target.value; setTree({ ...tree }); }}
            />
          </div>
          {/* <div style={{ direction: "rtl" }}>
            <label htmlFor="image">תמונה</label>
            <input
              name="image"
              placeholder="URL לתמונה"
              value={node.image}
              onChange={(e) => { node.image = e.target.value; setTree({ ...tree }); }}
            />
          </div> */}
          <div style={{ direction: "rtl" }}>
            <label htmlFor="question_for_options">שאלה</label>
            <input
              name="question_for_options"
              placeholder="שאלה"
              style={{ direction: "rtl", width: "250px" }}
              value={node.question_for_options}
              onChange={(e) => { node.question_for_options = e.target.value; setTree({ ...tree }); }}
            />
          </div>
          <div style={{ display: "flex", gap: "8px", marginTop: "8px", alignItems: "center" }}>
            <button
              onClick={() => addOption(node, "Node")}
              style={{
                padding: "4px",
                border: "2px solid #28a745",
                borderRadius: "6px",
                background: "#fff",
                color: "#28a745",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "500",
                transition: "all 0.3s ease"
              }}
            >
              Add Option
            </button>
            <button
              onClick={() => addOption(node, "Terminal")}
              style={{
                padding: "4px",
                border: "2px solid #007acc",
                borderRadius: "6px",
                background: "#fff",
                color: "#007acc",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "500",
                transition: "all 0.3s ease"
              }}
            >
              Add Link
            </button>
            <button
              style={{
                padding: "4px",
                border: "2px solid #6c757d",
                borderRadius: "6px",
                background: !isExpanded ? "#d49339ff" : "#fff",
                color: !isExpanded ? "#fff" : "#6c757d",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "500",
                transition: "all 0.3s ease"
              }}
              title={isExpanded ? "Hide children" : "Show children"}
              onClick={() => toggleExpanded(nodePath)}
            >
              {isExpanded
                ? "Hide Children"
                : `Show Children${node.options.length > 0 ? ` (${node.options.length})` : ''}`
              }
            </button>
          </div>
          {/* Children area */}
          <div style={{ marginTop: 8 }}>
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
              style={{ direction: "rtl", width: "200px" }}
              value={node.title}
              onChange={(e) => { node.title = e.target.value; setTree({ ...tree }); }}
            />
          </div>
          {/* <div style={{ direction: "rtl" }}>
            <label htmlFor="image">תמונה</label>
            <input
              name='image'
              placeholder="URL לתמונה"
              style={{ direction: "ltr", width: "200px" }}
              value={node.image}
              onChange={(e) => { node.image = e.target.value; setTree({ ...tree }); }}
            />
          </div> */}
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

  const tabs = [
    { id: 'edit-tree', label: 'Edit Tree' },
    { id: 'json-code', label: 'JSON Code' },
    { id: 'json-tree', label: 'JSON Tree' },
    { id: 'mermaid-code', label: 'Mermaid Code' },
    { id: 'graphviz-code', label: 'Graphviz Code' }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'edit-tree':
        return (
          <div style={{ flex: 1, width: "95vw", maxWidth: "95vw" }}>
            {renderNode(tree, null, null)}
          </div>
        );

      case 'json-code':
        const jsonCode = tree ? JSON.stringify(tree, null, 2) : "No tree loaded.";

        const copyJsonToClipboard = () => {
          navigator.clipboard.writeText(jsonCode).then(() => {
            alert('JSON code copied to clipboard!');
          }).catch(err => {
            console.error('Failed to copy: ', err);
            alert('Failed to copy code to clipboard');
          });
        };

        return (
          <div style={{ flex: 1, width: "95vw", maxWidth: "95vw" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <strong>JSON Code:</strong>
              <button
                onClick={copyJsonToClipboard}
                disabled={!tree}
                style={{
                  padding: "6px 12px",
                  border: "2px solid #28a745",
                  borderRadius: "4px",
                  background: tree ? "#28a745" : "#f8f9fa",
                  color: tree ? "#fff" : "#6c757d",
                  cursor: tree ? "pointer" : "not-allowed",
                  fontSize: "14px",
                  fontWeight: "500",
                  opacity: tree ? 1 : 0.6
                }}
              >
                📋 Copy JSON
              </button>
            </div>
            <pre style={{
              color: "#fff",
              fontFamily: "monospace",
              textAlign: "left",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              overflow: "auto",
              background: "#000",
              border: "1px solid #ddd",
              padding: "16px",
              marginTop: "8px",
              height: "calc(100vh - 200px)",
              width: "95vw",
              maxWidth: "95vw",
              boxSizing: "border-box"
            }}>
              {jsonCode}
            </pre>
          </div>
        );

      case 'json-tree':
        const jsonCodeForTree = tree ? JSON.stringify(tree, null, 2) : "No tree loaded.";

        const sendToJsonCrack = () => {
          const iframe = document.getElementById("jsoncrackEmbed");
          if (iframe && tree) {
            const json = JSON.stringify(tree);
            const options = {
              theme: "light",
              direction: "RIGHT"
            };

            iframe.contentWindow.postMessage({
              json,
              options
            }, "*");
          }
        };

        return (
          <div style={{ flex: 1, width: "95vw", maxWidth: "95vw" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <strong>JSON Tree Visualizer:</strong>
              <button
                onClick={sendToJsonCrack}
                disabled={!tree}
                style={{
                  padding: "6px 12px",
                  border: "2px solid #007acc",
                  borderRadius: "4px",
                  background: tree ? "#007acc" : "#f8f9fa",
                  color: tree ? "#fff" : "#6c757d",
                  cursor: tree ? "pointer" : "not-allowed",
                  fontSize: "14px",
                  fontWeight: "500",
                  opacity: tree ? 1 : 0.6
                }}
              >
                🔄 Update Visualizer
              </button>
            </div>
            {tree ? (
              <iframe
                id="jsoncrackEmbed"
                src="https://jsoncrack.com/widget"
                style={{
                  width: "95vw",
                  maxWidth: "95vw",
                  height: "calc(100vh - 250px)",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  background: "#fff"
                }}
                title="JSON Crack Visualizer"
                onLoad={sendToJsonCrack}
              />
            ) : (
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "calc(100vh - 250px)",
                border: "1px solid #ddd",
                borderRadius: "4px",
                background: "#f8f9fa",
                color: "#6c757d",
                fontSize: "18px"
              }}>
                No tree data to visualize. Create or import a tree first.
              </div>
            )}
          </div>
        );

      case 'mermaid-code':
        const mermaidCode = tree ? jsonToMermaid(tree) : "No tree loaded.";

        const copyToClipboard = () => {
          navigator.clipboard.writeText(mermaidCode).then(() => {
            alert('Mermaid code copied to clipboard!');
          }).catch(err => {
            console.error('Failed to copy: ', err);
            alert('Failed to copy code to clipboard');
          });
        };

        return (
          <div style={{ flex: 1, width: "95vw", maxWidth: "95vw" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <strong>Mermaid Code:</strong>
              <button
                onClick={copyToClipboard}
                disabled={!tree}
                style={{
                  padding: "6px 12px",
                  border: "2px solid #28a745",
                  borderRadius: "4px",
                  background: tree ? "#28a745" : "#f8f9fa",
                  color: tree ? "#fff" : "#6c757d",
                  cursor: tree ? "pointer" : "not-allowed",
                  fontSize: "14px",
                  fontWeight: "500",
                  opacity: tree ? 1 : 0.6
                }}
              >
                📋 Copy Code
              </button>
              {/* link to Mermaid.live */}
              <a
                href={`https://mermaid.live`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: "6px 12px",
                  border: "2px solid #d2d2d2ff",
                  borderRadius: "4px",
                  background: "#E00A5F",
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "500",
                  textDecoration: "none",
                  display: "inline-block"
                }}
              >
                Mermaid.live
              </a>
            </div>
            <pre style={{
              color: "#fff",
              fontFamily: "monospace",
              textAlign: "left",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              overflow: "auto",
              background: "#2d2d2d",
              border: "1px solid #ddd",
              padding: "16px",
              marginTop: "8px",
              height: "calc(100vh - 250px)",
              width: "95vw",
              maxWidth: "95vw",
              boxSizing: "border-box"
            }}>
              {mermaidCode}
            </pre>
          </div>
        );

      case 'graphviz-code':
        const graphvizCode = tree ? generateGraphvizDiagram() : "No tree loaded.";

        const copyGraphvizToClipboard = () => {
          navigator.clipboard.writeText(graphvizCode).then(() => {
            alert('Graphviz code copied to clipboard!');
          }).catch(err => {
            console.error('Failed to copy: ', err);
            alert('Failed to copy code to clipboard');
          });
        };

        return (
          <div style={{ flex: 1, width: "95vw", maxWidth: "95vw" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <strong>Graphviz Code:</strong>
              <button
                onClick={copyGraphvizToClipboard}
                disabled={!tree}
                style={{
                  padding: "6px 12px",
                  border: "2px solid #28a745",
                  borderRadius: "4px",
                  background: tree ? "#28a745" : "#f8f9fa",
                  color: tree ? "#fff" : "#6c757d",
                  cursor: tree ? "pointer" : "not-allowed",
                  fontSize: "14px",
                  fontWeight: "500",
                  opacity: tree ? 1 : 0.6
                }}
              >
                📋 Copy Code
              </button>
              {/* link to GraphvizOnline */}
              <a
                href={`https://dreampuf.github.io/GraphvizOnline/?engine=fdp`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: "6px 12px",
                  border: "2px solid #d2d2d2ff",
                  borderRadius: "4px",
                  background: "#007acc",
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "500",
                  textDecoration: "none",
                  display: "inline-block"
                }}
              >
                GraphvizOnline
              </a>
            </div>
            <pre style={{
              color: "#fff",
              fontFamily: "monospace",
              textAlign: "left",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              overflow: "auto",
              background: "#2d2d2d",
              border: "1px solid #ddd",
              padding: "16px",
              marginTop: "8px",
              height: "calc(100vh - 250px)",
              width: "95vw",
              maxWidth: "95vw",
              boxSizing: "border-box"
            }}>
              {graphvizCode}
            </pre>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div style={{ fontFamily: "sans-serif", padding: 16, minHeight: "100vh", display: "flex", flexDirection: "column", width: "95vw", maxWidth: "95vw" }}>
      {/* Tab Navigation and Action Buttons */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottom: "2px solid #ddd",
        marginBottom: 16,
        width: "95vw"
      }}>
        {/* Tab Buttons */}
        <div style={{ display: "flex" }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "12px 24px",
                border: "none",
                borderBottom: activeTab === tab.id ? "3px solid #007acc" : "3px solid transparent",
                background: activeTab === tab.id ? "#f0f8ff" : "transparent",
                color: activeTab === tab.id ? "#007acc" : "#333",
                cursor: "pointer",
                fontSize: "16px",
                fontWeight: activeTab === tab.id ? "bold" : "normal",
                transition: "all 0.3s ease"
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <label
            style={{
              padding: "8px 16px",
              border: "2px solid #28a745",
              borderRadius: "6px",
              background: "#28a745",
              color: "#fff",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
              transition: "all 0.3s ease",
              display: "inline-block"
            }}
          >
            Import JSON
            <input
              type="file"
              accept="application/json"
              onChange={handleImport}
              style={{ display: "none" }}
            />
          </label>

          <button
            onClick={handleExport}
            disabled={!tree || (tree.title === "" && tree.options.length === 0)}
            style={{
              padding: "8px 16px",
              border: "2px solid #007acc",
              borderRadius: "6px",
              background: (tree && (tree.title !== "" || tree.options.length > 0)) ? "#007acc" : "#f8f9fa",
              color: (tree && (tree.title !== "" || tree.options.length > 0)) ? "#fff" : "#6c757d",
              cursor: (tree && (tree.title !== "" || tree.options.length > 0)) ? "pointer" : "not-allowed",
              fontSize: "14px",
              fontWeight: "500",
              transition: "all 0.3s ease",
              opacity: (tree && (tree.title !== "" || tree.options.length > 0)) ? 1 : 0.6
            }}
          >
            Export JSON
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", width: "95vw", maxWidth: "95vw" }}>
        {renderTabContent()}
      </div>
    </div>
  );
}

export default App;