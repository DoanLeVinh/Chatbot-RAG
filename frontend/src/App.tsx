import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ChatApp from './web-chat/ChatApp';
import AdminApp from './web-admin/AdminApp';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin/*" element={<AdminApp />} />
        <Route path="/*" element={<ChatApp />} />
      </Routes>
    </BrowserRouter>
  );
}
