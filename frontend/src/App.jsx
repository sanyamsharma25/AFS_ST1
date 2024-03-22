import React from 'react';
import Home from './pages/Home';
import Register from './pages/Register';
import Login from './pages/Login';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

/** auth middleware */
// import { AuthorizeUser, ProtectRoute } from './middleware/auth';

/** root routes */
const router = createBrowserRouter([
    {
        path : '/',
        element : <Home></Home>
    },
    {
        path : '/register',
        element : <Register></Register>
    },
    {
        path : '/login',
        element : <Login></Login>
    },
    
])

export default function App() {
  return (
    <main>
        <RouterProvider router={router}></RouterProvider>
    </main>
  )
};
