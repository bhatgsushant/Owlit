import React from "react";
import { Routes, Route } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import Home from "@/pages/Home";
import Dashboard from "@/pages/Dashboard";
import ScanReceipt from "@/pages/ScanReceipt";
import Documents from "@/pages/Documents";
import Insights from "@/pages/Insights";
import Investment from "@/pages/Investment";
import QnA from "@/pages/QnA";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout currentPageName="Home"><Home /></Layout>} />
      <Route path="/home" element={<Layout currentPageName="Home"><Home /></Layout>} />
      <Route path="/dashboard" element={<Layout currentPageName="Dashboard"><Dashboard /></Layout>} />
      <Route path="/scan" element={<ScanReceipt />} />
      <Route path="/documents" element={<Layout currentPageName="Documents"><Documents /></Layout>} />
      <Route path="/insights" element={<Layout currentPageName="Insights"><Insights /></Layout>} />
      <Route path="/investment" element={<Layout currentPageName="Investment"><Investment /></Layout>} />
      <Route path="/qna" element={<Layout currentPageName="QnA"><QnA /></Layout>} />
    </Routes>
  );
}
