import React from 'react'
import ReactDOM from 'react-dom/client'
import MasterController from './MasterController' // <--- Pointing to the new name

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MasterController />
  </React.StrictMode>,
)