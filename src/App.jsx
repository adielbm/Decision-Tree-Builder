import { useState, useEffect } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import mermaid from 'mermaid'


function App() {

  // colors constants
  const COLOR_LINK = '#d9efffff';
  const COLOR_OPTION = '#ebffdfff';
  const COLOR_QUESTION = '#ffd1efff';
  const COLOR_INTERNAL_LINK = '#ffe1c4ff';
  
  const COLOR_QUESTION_STROKE = '#d10081ff';
  const COLOR_LINK_STROKE = '#006ddaff';
  const COLOR_OPTION_STROKE = '#4aac00ff';
  const COLOR_INTERNAL_LINK_STROKE = '#e05624ff';


  // Helper function to generate unique node IDs
  const generateNodeId = () => {
    const id = nextNodeId;
    setNextNodeId(prev => prev + 1);
    return id;
  };

  // Helper function to find the highest existing node ID in the tree
  const getHighestNodeId = (node) => {
    if (!node) return 0;
    let maxId = 0;

    // Check current node ID
    if (typeof node.id === 'number') {
      maxId = Math.max(maxId, node.id);
    }

    // Check children recursively
    if (node.options && Array.isArray(node.options)) {
      node.options.forEach(child => {
        maxId = Math.max(maxId, getHighestNodeId(child));
      });
    }

    return maxId;
  };

  // Helper function to ensure all nodes have IDs
  const ensureNodeIds = (node, idCounter = { value: 1 }) => {
    let nodeId;
    
    // Always assign an ID if missing or not a number
    if (!node.id || typeof node.id !== 'number') {
      nodeId = idCounter.value;
      idCounter.value++;
    } else {
      nodeId = node.id;
      // Update counter to be higher than existing ID
      idCounter.value = Math.max(idCounter.value, node.id + 1);
    }

    // Create new object with id first, then all other properties
    const { id, ...rest } = node;
    const newNode = { id: nodeId, ...rest };
    
    // Process children if they exist
    if (newNode.options && Array.isArray(newNode.options)) {
      newNode.options = newNode.options.map(child => ensureNodeIds(child, idCounter));
    }
    
    return newNode;
  };

  // Helper function to collect all nodes with their IDs and titles
  const collectAllNodes = (node, nodes = []) => {
    if (node && node.id) {
      nodes.push({
        id: node.id,
        title: node.title || 'Untitled Node',
        type: node.type || (node.options ? 'Node' : node.link !== undefined ? 'Terminal' : 'Internal Link')
      });
    }
    if (node.options) {
      node.options.forEach(child => collectAllNodes(child, nodes));
    }
    return nodes;
  };

  // Function to force assign IDs to all nodes
  const forceAssignIds = () => {
    const idCounter = { value: 1 };
    const updatedTree = ensureNodeIds({ ...tree }, idCounter);
    setTree(updatedTree);
    setNextNodeId(idCounter.value);
  };

  // Function to jump to and focus on a target node
  const jumpToNode = (targetNodeId) => {
    if (!targetNodeId) return;
    
    // First switch to edit-tree tab if not already there
    if (activeTab !== 'edit-tree') {
      setActiveTab('edit-tree');
    }
    
    // Use setTimeout to ensure tab content is rendered
    setTimeout(() => {
      const targetElement = document.querySelector(`[data-node-id="${targetNodeId}"]`);
      if (targetElement) {
        // Scroll to the target element with smooth behavior
        targetElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center',
          inline: 'nearest' 
        });
        
        // Add focus highlight
        setFocusedNodeId(parseInt(targetNodeId));
        
        // Remove focus highlight after 3 seconds
        setTimeout(() => {
          setFocusedNodeId(null);
        }, 3000);
      } else {
        console.warn(`Target node with ID ${targetNodeId} not found in DOM`);
      }
    }, 100);
  };

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
          const idCounter = { value: 1 };
          return ensureNodeIds(parsed, idCounter);
        }
      }
    } catch (error) {
      console.error('Failed to load tree from localStorage:', error);
    }
    // Return default tree if no saved data or error
    return { id: 1, title: "", image: "", question_for_options: "", options: [] };
  };

  const [tree, setTree] = useState(loadTreeFromStorage);
  const [nextNodeId, setNextNodeId] = useState(2); // Start from 2 since root is 1
  // Track expanded/collapsed state for nodes by their unique path
  const [expanded, setExpanded] = useState({});
  const [activeTab, setActiveTab] = useState('edit-tree');
  const [mermaidContent, setMermaidContent] = useState(null);
  const [focusedNodeId, setFocusedNodeId] = useState(null);

  // Initialize nextNodeId based on existing tree data and ensure all nodes have IDs
  useEffect(() => {
    if (tree) {
      // First ensure all nodes have IDs
      const updatedTree = ensureNodeIds({ ...tree });
      if (JSON.stringify(updatedTree) !== JSON.stringify(tree)) {
        setTree(updatedTree);
      }
      const highestId = getHighestNodeId(updatedTree);
      setNextNodeId(highestId + 1);
    }
  }, []); // Only run once on component mount

  // Autosave tree to localStorage whenever it changes
  useEffect(() => {
    if (tree) {
      saveTreeToStorage(tree);
    }
  }, [tree]);

  // Initialize mermaid configuration
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose',
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
        curve: 'basis'
      }
    });
  }, []);

  // Update mermaid content when switching to mermaid-preview tab or when tree changes
  useEffect(() => {
    const renderMermaidPreview = async () => {
      if (!tree) {
        return (
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
            No tree data to preview. Create or import a tree first.
          </div>
        );
      }

      try {
        const mermaidCode = jsonToMermaid(tree);
        const { svg } = await mermaid.render('mermaidPreview', mermaidCode);
        return (
          <div 
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "flex-start",
              padding: "16px",
              height: "calc(100vh - 250px)",
              overflow: "auto",
              border: "1px solid #ddd",
              borderRadius: "4px",
              background: "#fff"
            }}
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        );
      } catch (error) {
        console.error('Error rendering Mermaid diagram:', error);
        return (
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "calc(100vh - 250px)",
            border: "1px solid #ddd",
            borderRadius: "4px",
            background: "#f8f9fa",
            color: "#dc3545",
            fontSize: "16px",
            flexDirection: "column",
            padding: "20px",
            textAlign: "center"
          }}>
            <div style={{ marginBottom: "10px" }}>❌ Error rendering Mermaid diagram</div>
            <div style={{ fontSize: "14px", color: "#6c757d" }}>{error.message}</div>
          </div>
        );
      }
    };

    if (activeTab === 'mermaid-preview') {
      renderMermaidPreview().then(setMermaidContent);
    }
  }, [activeTab, tree]);

  // Convert tree to Mermaid flowchart syntax
  function jsonToMermaid(data) {
    let mermaid = 'flowchart RL\n';

    let nodeId = 0;
    const nodes = [];
    const edges = [];
    const nodeClasses = [];
    const nodeIdMapping = new Map(); // Map node.id to mermaid node id
    const internalLinkEdges = []; // Store internal link edges separately

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

      // Store mapping for this node
      if (item.id) {
        nodeIdMapping.set(item.id, currentId);
      }

      // Check if this is an internal link node
      if (item.type === 'internal_link') {
        // Internal Link node (orange diamond)
        nodes.push(`${currentId}{{${sanitize(item.title)}}}`);
        nodeClasses.push(`class ${currentId} internalLinkStyle`);
        if (parentId) {
          edges.push(`${parentId} --> ${currentId}`);
        }
        // Store internal link edge for later processing
        if (item.target_node_id) {
          internalLinkEdges.push({ from: currentId, to: item.target_node_id });
        }
        return currentId;
      }

      // Check if this is a link node
      if (item.link !== undefined) {
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

    // Process internal link edges
    internalLinkEdges.forEach(linkEdge => {
      const targetNodeId = parseInt(linkEdge.to); // Convert string to number
      const targetMermaidId = nodeIdMapping.get(targetNodeId);
      if (targetMermaidId) {
        edges.push(`${linkEdge.from} -.-> ${targetMermaidId}`);
      } else {
        console.warn(`Internal link target node ID ${linkEdge.to} not found in nodeIdMapping`);
      }
    });

    // Build the complete Mermaid diagram
    mermaid += '    ' + nodes.join('\n    ') + '\n\n';
    mermaid += '    ' + edges.join('\n    ') + '\n\n';




    // Add styling definitions
    mermaid += `    classDef terminalStyle fill:${COLOR_LINK},stroke:${COLOR_LINK_STROKE},stroke-width:2px,color:#000\n`;
    mermaid += `    classDef optionStyle fill:${COLOR_OPTION},stroke:${COLOR_OPTION_STROKE},stroke-width:2px,color:#000\n`;
    mermaid += `    classDef questionStyle fill:${COLOR_QUESTION},stroke:${COLOR_QUESTION_STROKE},stroke-width:2px,color:#000\n`;
    mermaid += `    classDef internalLinkStyle fill:${COLOR_INTERNAL_LINK},stroke:${COLOR_INTERNAL_LINK_STROKE},stroke-width:2px,color:#000\n`;

    // Add class assignments
    mermaid += '    ' + nodeClasses.join('\n    ') + '\n';

    return mermaid;
  }




  // Import JSON
  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const importedData = JSON.parse(evt.target.result);

        // Ensure all imported nodes have IDs
        const idCounter = { value: 1 };
        const fixedData = ensureNodeIds({ ...importedData }, idCounter);

        // Update the next node ID counter
        setNextNodeId(idCounter.value);

        // Set the fixed tree
        setTree(fixedData);

        console.log('Imported JSON successfully with IDs assigned');
        console.log('Fixed data structure:', JSON.stringify(fixedData, null, 2));
      } catch (error) {
        console.error('Failed to import JSON:', error);
        alert('Failed to import JSON file. Please check the file format.');
      }
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
    const nodeId = generateNodeId();
    const newOption =
      type === "Node"
        ? { id: nodeId, title: "", image: "", question_for_options: "", options: [] }
        : type === "Terminal"
          ? { id: nodeId, title: "", image: "", link: "" }
          : { id: nodeId, title: "", target_node_id: "", type: "internal_link" };
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
  const renderNode = (node, parent = null, idx = null, path = "root", rootTree = tree) => {
    if (!node) return null;
    if (node.options) {
      // Node
      const nodePath = getNodePath(parent, idx, path);
      const isExpanded = expanded[nodePath] !== false;

      return (
        <div 
          data-node-id={node.id}
          style={{ 
            border: `2px solid ${COLOR_OPTION_STROKE}`, 
            background: `${COLOR_OPTION}`, 
            margin: 1, 
            padding: 8, 
            position: "relative",
            boxShadow: focusedNodeId === node.id ? "0 0 20px 4px rgba(0, 122, 204, 0.6)" : "none",
            transition: "box-shadow 0.3s ease"
          }}>
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
                border: `2px solid ${COLOR_OPTION_STROKE}`,
                borderRadius: "6px",
                background: "#fff",
                color: COLOR_OPTION_STROKE,
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "500",
                transition: "all 0.3s ease"
              }}
            >
              + Option
            </button>
            <button
              onClick={() => addOption(node, "Terminal")}
              style={{
                padding: "4px",
                border: `2px solid ${COLOR_LINK_STROKE}`,
                borderRadius: "6px",
                background: "#fff",
                color: COLOR_LINK_STROKE,
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "500",
                transition: "all 0.3s ease"
              }}
            >
              + Link
            </button>
            <button
              onClick={() => addOption(node, "InternalLink")}
              style={{
                padding: "4px",
                border: `2px solid ${COLOR_INTERNAL_LINK_STROKE}`,
                borderRadius: "6px",
                background: "#fff",
                color: COLOR_INTERNAL_LINK_STROKE,
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "500",
                transition: "all 0.3s ease"
              }}
            >
              + In-Link
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
                  <div key={i}>{renderNode(opt, node, i, nodePath, rootTree)}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    } else if (node.type === 'internal_link') {
      // Internal Link
      const availableNodes = collectAllNodes(rootTree)
        .filter(n => n.id !== node.id && n.type === 'Node'); // Only show Option nodes

      return (
        <div 
          data-node-id={node.id}
          style={{ 
            border: `2px solid ${COLOR_INTERNAL_LINK_STROKE}`, 
            background: `${COLOR_INTERNAL_LINK}`, 
            margin: 8, 
            padding: 8, 
            position: "relative",
            boxShadow: focusedNodeId === node.id ? "0 0 20px 4px rgba(224, 86, 36, 0.6)" : "none",
            transition: "box-shadow 0.3s ease"
          }}>
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
          <div style={{ direction: "rtl" }}>
            <label htmlFor="target_node_id">קישור לצומת</label>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <select
                name='target_node_id'
                style={{ direction: "rtl", width: "200px", padding: "4px" }}
                value={node.target_node_id || ''}
                onChange={(e) => { node.target_node_id = e.target.value; setTree({ ...tree }); }}
              >
                <option value="">בחר צומת...</option>
                {availableNodes.map(nodeOption => (
                  <option key={nodeOption.id} value={nodeOption.id}>
                    {nodeOption.title}
                  </option>
                ))}
              </select>
              <button
                onClick={() => jumpToNode(node.target_node_id)}
                disabled={!node.target_node_id}
                style={{
                  padding: "4px 8px",
                  border: "2px solid #007acc",
                  borderRadius: "4px",
                  background: node.target_node_id ? "#007acc" : "#f8f9fa",
                  color: node.target_node_id ? "#fff" : "#6c757d",
                  cursor: node.target_node_id ? "pointer" : "not-allowed",
                  fontSize: "12px",
                  fontWeight: "500",
                  opacity: node.target_node_id ? 1 : 0.6
                }}
                title="קפוץ לצומת היעד"
              >
                🔗 קפיצה
              </button>
            </div>
          </div>
        </div>
      );
    } else {
      // Terminal
      return (
        <div 
          data-node-id={node.id}
          style={{ 
            border: `2px solid ${COLOR_LINK_STROKE}`, 
            background: `${COLOR_LINK}`, 
            margin: 8, 
            padding: 8, 
            position: "relative",
            boxShadow: focusedNodeId === node.id ? "0 0 20px 4px rgba(0, 109, 218, 0.6)" : "none",
            transition: "box-shadow 0.3s ease"
          }}>
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
    { id: 'mermaid-preview', label: 'Mermaid Preview' },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'edit-tree':
        return (
          <div style={{ flex: 1, width: "95vw", maxWidth: "95vw" }}>
            {renderNode(tree, null, null, "root", tree)}
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

      case 'mermaid-preview':
        const refreshMermaidPreview = async () => {
          if (!tree) {
            const noTreeContent = (
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
                No tree data to preview. Create or import a tree first.
              </div>
            );
            setMermaidContent(noTreeContent);
            return;
          }

          try {
            const mermaidCode = jsonToMermaid(tree);
            const { svg } = await mermaid.render('mermaidPreviewRefresh', mermaidCode);
            const svgContent = (
              <div 
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "flex-start",
                  padding: "16px",
                  height: "calc(100vh - 250px)",
                  overflow: "auto",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  background: "#fff"
                }}
                dangerouslySetInnerHTML={{ __html: svg }}
              />
            );
            setMermaidContent(svgContent);
          } catch (error) {
            console.error('Error rendering Mermaid diagram:', error);
            const errorContent = (
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "calc(100vh - 250px)",
                border: "1px solid #ddd",
                borderRadius: "4px",
                background: "#f8f9fa",
                color: "#dc3545",
                fontSize: "16px",
                flexDirection: "column",
                padding: "20px",
                textAlign: "center"
              }}>
                <div style={{ marginBottom: "10px" }}>❌ Error rendering Mermaid diagram</div>
                <div style={{ fontSize: "14px", color: "#6c757d" }}>{error.message}</div>
              </div>
            );
            setMermaidContent(errorContent);
          }
        };

        return (
          <div style={{ flex: 1, width: "95vw", maxWidth: "95vw" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <strong>Mermaid Preview:</strong>
              <button
                onClick={refreshMermaidPreview}
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
                🔄 Refresh Preview
              </button>
            </div>
            {mermaidContent}
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