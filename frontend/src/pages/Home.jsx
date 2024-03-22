import React from 'react';
import { Link } from 'react-router-dom';
import '../App.css'

const Home = () => {
  return (
    <div>
      <h2>Welcome to the Home Page</h2>
      <p>This is the landing page of your application.</p>
      <button><Link to={'/register'}>Register</Link></button>
      <button><Link to={'/login'}>Login</Link></button>
    </div>
  );
}

export default Home;
