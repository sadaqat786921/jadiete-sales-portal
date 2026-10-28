import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/Layout';
import MyDay from './pages/MyDay';
import { Login, Welcome } from './pages/Auth';
import EnquiryDetail from './pages/EnquiryRecord';
import Pipeline from './pages/Pipeline';
import Calendar from './pages/Calendar';
import { Customers, CustomerDetail } from './pages/Customers';
import Quotes from './pages/Quotes';
import WonJobs from './pages/WonJobs';
import Messages from './pages/Messages';
import Performance from './pages/Performance';
import Settings from './pages/Settings';

// Sales portal: one salesperson's own customers, from new enquiry to Won, then following the job.
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/welcome/:step" element={<Welcome />} />
      <Route element={<AppLayout />}>
        <Route path="/" element={<MyDay />} />
        <Route path="/pipeline" element={<Pipeline />} />
        <Route path="/enquiries/:id" element={<EnquiryDetail />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/customers/:id" element={<CustomerDetail />} />
        <Route path="/quotes" element={<Quotes />} />
        <Route path="/won" element={<WonJobs />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/performance" element={<Performance />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
