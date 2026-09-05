import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './index.css';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <ToastContainer position="bottom-right" theme="dark" autoClose={3200} newestOnTop toastStyle={{ background:'#17120D', color:'#EBE4D1', border:'1px solid #463A31' }} />
    </BrowserRouter>
  </React.StrictMode>
);
