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
import AskAI from "@/pages/AskAI";
import DocumentPage from "@/pages/DocumentPage";
import Login from "@/pages/Login";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { AuthProvider } from "@/context/AuthContext"; // ✅ wrap app in AuthProvider

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Layout currentPageName="Home"><Home /></Layout>} />
        <Route path="/home" element={<Layout currentPageName="Home"><Home /></Layout>} />
        <Route path="/login" element={<Login />} />

        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Layout currentPageName="Dashboard"><Dashboard /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/scan"
          element={
            <ProtectedRoute>
              <Layout currentPageName="Scan Receipt"><ScanReceipt /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/documents"
          element={
            <ProtectedRoute>
              <Layout currentPageName="Documents"><Documents /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/insights"
          element={
            <ProtectedRoute>
              <Layout currentPageName="Insights"><Insights /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/investment"
          element={
            <ProtectedRoute>
              <Layout currentPageName="Investment"><Investment /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/qna"
          element={
            <ProtectedRoute>
              <Layout currentPageName="QnA"><QnA /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/ask-ai"
          element={
            <ProtectedRoute>
              <Layout currentPageName="Ask AI"><AskAI /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/document-preview"
          element={
            <ProtectedRoute>
              <DocumentPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </AuthProvider>
  );
}
