import { downloadAsImage } from "../utils/export-image/downloadAsImage.ts";
import React, { useState } from "react";
import { Sigma } from "sigma";

interface SaveSnapshotProps {
  renderer: Sigma; // Sigma renderer instance
}

/**
 * SaveSnapshot Component
 * Renders a form to save the network graph snapshot with customizable options.
 */
const SaveSnapshot: React.FC<SaveSnapshotProps> = ({ renderer }) => {
  const [filename, setFilename] = useState("graph");
  const [format, setFormat] = useState<"png" | "jpeg">("png");
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");
  const [width, setWidth] = useState<number | undefined>(undefined);
  const [height, setHeight] = useState<number | undefined>(undefined);
  const [resetCameraState, setResetCameraState] = useState(false);
  const [layers, setLayers] = useState<string[]>(["edges", "nodes", "edgeLabels", "labels"]);

  const handleSaveSnapshot = () => {
    if (!renderer) {
      console.error("Renderer is not defined.");
      return;
    }

    //const downloadAsImage = (renderer as any).downloadAsImage; // Ensure this is correctly typed if implemented.

    /**if (typeof downloadAsImage !== "function") {
      console.error("downloadAsImage function not found on renderer.");
      return;
    }**/

    downloadAsImage(renderer, {
      layers,
      format,
      fileName: filename,
      backgroundColor,
      width: width || undefined,
      height: height || undefined,
      cameraState: resetCameraState ? { x: 0.5, y: 0.5, angle: 0, ratio: 1 } : undefined,
    });
  };

  const toggleLayer = (layer: string) => {
    setLayers((prev) =>
      prev.includes(layer) ? prev.filter((l) => l !== layer) : [...prev, layer]
    );
  };

  return (
    <div
      style={{
        position: "absolute",
	bottom: "1rem", // Position at the bottom
        right: "1rem", // Position at the left
        padding: "1rem",
        background: "#ffffff99",
        borderRadius: "5px",
        boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)",
        zIndex: 1000,
      }}
    >
      <h4>Layers to save</h4>
      {["edges", "nodes", "edgeLabels", "labels"].map((layer) => (
        <div key={layer}>
          <input
            type="checkbox"
            id={`layer-${layer}`}
            checked={layers.includes(layer)}
            onChange={() => toggleLayer(layer)}
          />
          <label htmlFor={`layer-${layer}`}>{layer.charAt(0).toUpperCase() + layer.slice(1)}</label>
        </div>
      ))}

      <h4>Dimensions</h4>
      <div style={{ marginBottom: "5px" }}>
        <label>Height</label>
        <input
          type="number"
          value={height || ""}
          onChange={(e) => setHeight(Number(e.target.value) || undefined)}
          placeholder="Viewport height"
        />
      </div>
      <div style={{ marginBottom: "5px" }}>
        <label>Width</label>
        <input
          type="number"
          value={width || ""}
          onChange={(e) => setWidth(Number(e.target.value) || undefined)}
          placeholder="Viewport width"
        />
      </div>

      <h4>Additional Options</h4>
      <div style={{ marginBottom: "5px" }}>
        <label>File name</label>
        <input
          type="text"
          value={filename}
          onChange={(e) => setFilename(e.target.value)}
        />
      </div>
      <div style={{ marginBottom: "5px" }}>
        <label>Format</label>
        <select value={format} onChange={(e) => setFormat(e.target.value as "png" | "jpeg")}>
          <option value="png">PNG</option>
          <option value="jpeg">JPEG</option>
        </select>
      </div>
      <div style={{ marginBottom: "5px" }}>
        <label>Background color</label>
        <input
          type="color"
          value={backgroundColor}
          onChange={(e) => setBackgroundColor(e.target.value)}
        />
      </div>
      <div>
        <input
          type="checkbox"
          id="reset-camera-state"
          checked={resetCameraState}
          onChange={(e) => setResetCameraState(e.target.checked)}
        />
        <label htmlFor="reset-camera-state">Reset camera state</label>
      </div>
      <br />
      <button
        onClick={handleSaveSnapshot}
        style={{
          padding: "0.5rem 1rem",
          background: "#007BFF",
          color: "#fff",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
        }}
      >
        Save Image Snapshot
      </button>
    </div>
  );
};

export default SaveSnapshot;

