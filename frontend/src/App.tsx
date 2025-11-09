/**
 * App.tsx
 *
 * Main application component with routing.
 * Routes:
 * - / - Home page (landing + learning flow)
 * - /graph - Full-screen graph view
 */

import { Route, Routes } from "react-router-dom";
import { GraphNodePage } from "./pages/GraphNodePage";
import { GraphPage } from "./pages/GraphPage";
import { HomePage } from "./pages/HomePage";

/**
 * Main App Component with Routing
 */
export const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/graph" element={<GraphPage />} />
      <Route path="/graph/:nodeId" element={<GraphNodePage />} />
    </Routes>
  );
};
