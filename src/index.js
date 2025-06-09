import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import Signup from './pages/Signup';
import ResetPassword from './pages/ResetPassword';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
const path = window.location.pathname;
root.render(
  <React.StrictMode>
    {path.startsWith('/signup') ? (
      <Signup />
    ) : path.startsWith('/reset-password') ? (
      <ResetPassword />
    ) : (
      <App />
    )}
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
