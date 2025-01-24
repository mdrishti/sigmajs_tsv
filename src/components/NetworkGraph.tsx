import React, { useState, useEffect } from "react";
import { animateNodes } from "sigma/utils";
import Graph from "graphology";
import { cropToLargestConnectedComponent } from "graphology-components";
import forceAtlas2 from "graphology-layout-forceatlas2";
import FA2Layout from "graphology-layout-forceatlas2/worker";
import { circular } from "graphology-layout";
import { PlainObject } from "sigma/types";
import Sigma from "sigma";
import SaveSnapshot from "./SaveSnapshot";


type TSVRow = Record<string, string>;

const parseTSV = (tsvData: string): { rows: TSVRow[]; headers: string[] } => {
  const [headerLine, ...rows] = tsvData.trim().split("\n");
  const headers = headerLine.split("\t");

  const parsedRows = rows.map((row) => {
    const values = row.split("\t");
    return Object.fromEntries(headers.map((header, i) => [header, values[i]]));
  });

  return { rows: parsedRows, headers };
};



const createGraphFromTSV = (
  data: TSVRow[],
  headers: string[],
  selectedNodeTypes: string[]
): Graph => {
  const graph = new Graph();
  const nodeDegrees: Record<string, number> = {};

  data.forEach((row) => {
    // Extract nodes for the current row
    const nodesInRow = headers.map((col) => {
      const rawValue = row[col];
      return rawValue ? rawValue.replace(/^<|>$/g, "") : null; // Remove angle brackets, handle nulls
    });

    // Add nodes
    nodesInRow.forEach((node, index) => {
      if (!node) return; // Skip empty nodes
      const nodeType = headers[index];

      if (selectedNodeTypes.includes(nodeType)) {
        if (!graph.hasNode(node)) {

	let label;

          // Check if the node contains XMLSchema
          if (node.includes("XMLSchema")) {
            // Extract the content between double quotes
            const match = node.match(/"([^"]+)"/);
            label = match ? match[1] : node; // Use matched content or fallback to the raw value
             graph.addNode(node, {
              label: `${label}`, // Node label with its type
              nodeType: nodeType, // Type based on column
             });
          } else {
            // Extract the label from the URL (content after the last "/")
            label = node.split("/").pop() || node;
            graph.addNode(node, {
             label: `${label}`, // Node label with its type
             fullUrl: node, // Store the full URL for double-click functionality
             nodeType: nodeType, // Type based on column
            });
          }


          // Initialize degree tracking
          nodeDegrees[node] = 0;
        }
      }
    });

    // Add edges
    for (let i = 0; i < nodesInRow.length; i++) {
      for (let j = i + 1; j < nodesInRow.length; j++) {
        const source = nodesInRow[i];
        const target = nodesInRow[j];

        if (source && target && source !== target) {
          // Add edge if both nodes exist and no duplicate edge exists
          if (graph.hasNode(source) && graph.hasNode(target) && !graph.hasEdge(source, target)) {
            graph.addEdge(source, target, { weight: 1 });

            // Increment degrees for source and target
            nodeDegrees[source]++;
            nodeDegrees[target]++;
          }
        }
      }
    }
  });

  return graph;
};



//const visualizeGraph = (graph: Graph, headers: string[], container: HTMLElement) => {
const visualizeGraph = (graph: Graph, headers: string[]) => {
  cropToLargestConnectedComponent(graph);
  


  const COLORS = headers.reduce((acc, header, index) => {
    const colors = ["#FA5A3D", "#5A75DB", "#FFD700", "#8A2BE2", "#00A676", "#FF6F61"];
    acc[header] = colors[index % colors.length];
    return acc;
  }, {} as Record<string, string>);

  graph.forEachNode((node, attributes) => {
    const nodeType = attributes.nodeType as string;
    const color = COLORS[nodeType] || "#000000";
    graph.setNodeAttribute(node, "color", color);
  });

  const degrees = graph.nodes().map((node) => graph.degree(node));
  const minDegree = Math.min(...degrees);
  const maxDegree = Math.max(...degrees);
  const minSize = 5,
    maxSize = 20;

  graph.forEachNode((node) => {
    const degree = graph.degree(node);
    const size = minSize + ((degree - minDegree) / (maxDegree - minDegree)) * (maxSize - minSize);
    graph.setNodeAttribute(node, "size", size);
  });

  circular.assign(graph);
//  const settings = forceAtlas2.inferSettings(graph);
//  forceAtlas2.assign(graph, { settings, iterations: 600 });
  
  // Retrieve some useful DOM elements:
  const container = document.getElementById("sigma-container") as HTMLElement;
  if (!container) throw new Error("Sigma container not found.");

  const FA2Button = document.getElementById("forceatlas2") as HTMLElement;
  const FA2StopLabel = document.getElementById("forceatlas2-stop-label") as HTMLElement;
  const FA2StartLabel = document.getElementById("forceatlas2-start-label") as HTMLElement;

  const randomButton = document.getElementById("random") as HTMLElement;

  const circularButton = document.getElementById("circular") as HTMLElement;

  /** FA2 LAYOUT **/
  /* This example shows how to use the force atlas 2 layout in a web worker */

  // Graphology provides a easy to use implementation of Force Atlas 2 in a web worker
  const sensibleSettings = forceAtlas2.inferSettings(graph);
  const fa2Layout = new FA2Layout(graph, {
    settings: sensibleSettings,
  });

  // A button to trigger the layout start/stop actions

  // A variable is used to toggle state between start and stop
  let cancelCurrentAnimation: (() => void) | null = null;

  // correlate start/stop actions with state management
  function stopFA2() {
    fa2Layout.stop();
    FA2StartLabel.style.display = "flex";
    FA2StopLabel.style.display = "none";
  }
  function startFA2() {
    if (cancelCurrentAnimation) cancelCurrentAnimation();
    fa2Layout.start();
    FA2StartLabel.style.display = "none";
    FA2StopLabel.style.display = "flex";
  }

  // the main toggle function
  function toggleFA2Layout() {
    if (fa2Layout.isRunning()) {
      stopFA2();
    } else {
      startFA2();
    }
  }
  // bind method to the forceatlas2 button
  FA2Button.addEventListener("click", toggleFA2Layout);

  /** RANDOM LAYOUT **/
  /* Layout can be handled manually by setting nodes x and y attributes */
  /* This random layout has been coded to show how to manipulate positions directly in the graph instance */
  /* Alternatively a random layout algo exists in graphology: https://github.com/graphology/graphology-layout#random  */
  function randomLayout() {
    // stop fa2 if running
    if (fa2Layout.isRunning()) stopFA2();
    if (cancelCurrentAnimation) cancelCurrentAnimation();

    // to keep positions scale uniform between layouts, we first calculate positions extents
    const xExtents = { min: 0, max: 0 };
    const yExtents = { min: 0, max: 0 };
    graph.forEachNode((_node, attributes) => {
      xExtents.min = Math.min(attributes.x, xExtents.min);
      xExtents.max = Math.max(attributes.x, xExtents.max);
      yExtents.min = Math.min(attributes.y, yExtents.min);
      yExtents.max = Math.max(attributes.y, yExtents.max);
    });
    const randomPositions: PlainObject<PlainObject<number>> = {};
    graph.forEachNode((node) => {
      // create random positions respecting position extents
      randomPositions[node] = {
        x: Math.random() * (xExtents.max - xExtents.min),
        y: Math.random() * (yExtents.max - yExtents.min),
      };
    });
    // use sigma animation to update new positions
    cancelCurrentAnimation = animateNodes(graph, randomPositions, { duration: 2000 });
  }

  // bind method to the random button
  randomButton.addEventListener("click", randomLayout);

  /** CIRCULAR LAYOUT **/
  /* This example shows how to use an existing deterministic graphology layout */
  function circularLayout() {
    // stop fa2 if running
    if (fa2Layout.isRunning()) stopFA2();
    if (cancelCurrentAnimation) cancelCurrentAnimation();

    //since we want to use animations we need to process positions before applying them through animateNodes
    const circularPositions = circular(graph, { scale: 100 });
    //In other context, it's possible to apply the position directly we : circular.assign(graph, {scale:100})
    cancelCurrentAnimation = animateNodes(graph, circularPositions, { duration: 2000, easing: "linear" });
  }

  // bind method to the random button
  circularButton.addEventListener("click", circularLayout);


  const renderer = new Sigma(graph, container);

  // Enable enhanced dragging behavior
  enableEnhancedDragging(graph, renderer);

  renderer.on("doubleClickNode", ({ node }) => {
    const fullUrl = graph.getNodeAttribute(node, "fullUrl");
    if (fullUrl) {
      window.open(fullUrl, "_blank");
    }
  });

  return renderer;
};

const enableEnhancedDragging = (graph: Graph, renderer: Sigma) => {
  let draggedNode: string | null = null;
  let isDragging = false;

  const delta = 6;
  let startX: number;
  let startY: number;
  let allowClick = true;

  // On mouse down on a node
  renderer.on("downNode", (event) => {
    isDragging = true;
    draggedNode = event.node;
    graph.setNodeAttribute(draggedNode, "highlighted", true);
  });

  // On mouse move, update the dragged node's position
  renderer.getMouseCaptor().on("mousemovebody", (event) => {
    if (!isDragging || !draggedNode) return;

    const pos = renderer.viewportToGraph(event);

    graph.setNodeAttribute(draggedNode, "x", pos.x);
    graph.setNodeAttribute(draggedNode, "y", pos.y);

    // Prevent default Sigma camera movement
    event.preventSigmaDefault();
    event.original.preventDefault();
    event.original.stopPropagation();
  });

  // On mouse down, store the start position
  renderer.getMouseCaptor().on("mousedown", (event) => {
    startX = event.original.pageX;
    startY = event.original.pageY;
    if (!renderer.getCustomBBox()) renderer.setCustomBBox(renderer.getBBox());
  });

  // On mouse up, reset dragging state and highlight
  renderer.getMouseCaptor().on("mouseup", (event) => {
    if (draggedNode) {
      graph.removeNodeAttribute(draggedNode, "highlighted");

      const diffX = Math.abs(event.original.pageX - startX);
      const diffY = Math.abs(event.original.pageY - startY);

      allowClick = diffX < delta && diffY < delta;

      isDragging = false;
      draggedNode = null;
    }
  });

  // On node click, open associated URL if not dragging
  renderer.on("clickNode", ({ node }) => {
    if (!graph.getNodeAttribute(node, "hidden") && allowClick) {
      const pageURL = graph.getNodeAttribute(node, "pageURL");
      if (pageURL) window.open(pageURL, "_blank");
    }
  });
};

const NetworkGraph: React.FC = () => {
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [selectedNodeTypes, setSelectedNodeTypes] = useState<string[]>([]);
  const [graph, setGraph] = useState<Graph | null>(null);
  const [renderer, setRenderer] = useState<Sigma | null>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      setFileContent(e.target?.result as string);

      // Reset all states when a new file is uploaded
      setHeaders([]);
      setSelectedNodeTypes([]);
      setGraph(null);

      // Clear the previous graph renderer
      if (renderer) {
        renderer.kill();
        setRenderer(null);
      }
    };
    reader.readAsText(file);
  };


  useEffect(() => {
    if (!fileContent) return;

    const { rows, headers: fileHeaders } = parseTSV(fileContent);
    setHeaders(fileHeaders);
    setGraph(null);
  }, [fileContent]);

  const handleNodeTypeSelection = () => {
    if (!fileContent || selectedNodeTypes.length === 0) return;

    const { rows } = parseTSV(fileContent);
    const newGraph = createGraphFromTSV(rows, headers, selectedNodeTypes);

    setGraph(newGraph);
  };

  useEffect(() => {
    if (!graph) return;
    let renderer: Sigma | null = null;
    //const container = document.getElementById("sigma-container") as HTMLElement;
    //if (!container) throw new Error("Sigma container not found.");

    if (renderer) renderer.kill();
    renderer = visualizeGraph(graph, headers);
    //const newRenderer = visualizeGraph(graph, headers);
    setRenderer(renderer);
  }, [graph, headers]);

  const handleNodeTypeChange = (event: React.ChangeEvent<HTMLInputElement>, nodeType: string) => {
    if (event.target.checked) {
      setSelectedNodeTypes((prev) => [...prev, nodeType]);
    } else {
      setSelectedNodeTypes((prev) => prev.filter((type) => type !== nodeType));
    }
  };

  return (
    <div>
      <div
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          zIndex: 1000,
          backgroundColor: "#ffffff",
          padding: "10px",
          border: "1px solid #ddd",
          borderRadius: "4px",
          boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)",
        }}
      >
        <label style={{ display: "block", marginBottom: "5px" }}>Upload a TSV File:</label>
        <input
          type="file"
          accept=".tsv"
          onChange={handleFileUpload}
          style={{
            cursor: "pointer",
            padding: "5px",
          }}
        />
         {headers.length > 0 && (
          <div>
            <label style={{ fontWeight: "bold", marginBottom: "5px", display: "block" }}>
              Select Node Types:
            </label>
            {headers.map((header) => (
              <div key={header}>
                <input
                  type="checkbox"
                  id={header}
                  onChange={(e) => handleNodeTypeChange(e, header)}
                />
                <label htmlFor={header} style={{ marginLeft: "5px" }}>
                  {header}
                </label>
              </div>
            ))}
            <button
              onClick={handleNodeTypeSelection}
              style={{
                marginTop: "10px",
                padding: "5px 10px",
                backgroundColor: "#007BFF",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Plot Selected Nodes
            </button>
          </div>
        )}
      </div>
      <div id="sigma-container" style={{ width: "100vw", height: "100vh", position: "fixed", top: 0, left: 0, backgroundColor: "#f0f0f0" }}></div>
     {renderer && <SaveSnapshot renderer={renderer} />}

      <div id="buttons" style={{ position: "absolute", right: '1em', top: '1em', display: 'flex' }}>
        <button id="random" style={{ marginRight: '1em', display: 'inline-block', textAlign: 'center', background: 'white', outline: 'none', border: '1px solid dimgrey', borderRadius: '2px', cursor: 'pointer' }}>
          <span style={{ height: '100%', display: 'flex', alignItems: 'center' }}><img src="/GiPerspectiveDiceSixFaces.svg" alt="Random" style={{ height: '2em' }} />random</span>
        </button>
        <button id="forceatlas2" style={{ marginRight: '1em', display: 'inline-block', textAlign: 'center', background: 'white', outline: 'none', border: '1px solid dimgrey', borderRadius: '2px', cursor: 'pointer' }}>
          <span style={{ height: '100%', display: 'flex', alignItems: 'center' }}>
            <img id="forceatlas2-start-label" src="/BiPlay.svg" alt="Start Force Atlas 2" style={{ height: '2em' }} />
            <img id="forceatlas2-stop-label" src="/BiPause.svg" alt="Stop Force Atlas 2" style={{ display: 'none', height: '2em' }} />
            Force Atlas 2
          </span>
        </button>
        <button id="circular" style={{ marginRight: '1em', display: 'inline-block', textAlign: 'center', background: 'white', outline: 'none', border: '1px solid dimgrey', borderRadius: '2px', cursor: 'pointer' }}>
          <span style={{ height: '100%', display: 'flex', alignItems: 'center' }}><img src="/BiLoaderCircle.svg" alt="Circular" style={{ height: '2em' }} />circular</span>
        </button>
      </div>
    </div>
  );
};

export default NetworkGraph;

  
