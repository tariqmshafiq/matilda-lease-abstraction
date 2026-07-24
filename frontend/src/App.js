import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import History from "./pages/History";
import Review from "./pages/Review";
import ExportData from "./pages/ExportData";
import GetStarted from "./pages/GetStarted";
import "./App.css";

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/history" element={<History />} />
          <Route path="/review/:id" element={<Review />} />
          <Route path="/export" element={<ExportData />} />
          <Route path="/get-started" element={<GetStarted />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
