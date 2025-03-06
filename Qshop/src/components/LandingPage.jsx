import React from "react";
import { Link } from "react-router-dom";
import Slideshow from "./Slideshow";
import SignUp from "./auth/SignUp"; 

const LandingPage = () => {
  return (
    <div className="flex flex-col md:flex-row h-screen bg-[#0D2B20] text-white">
      {/* Left Section - Website Info & Slideshow */}
      <div className="flex flex-col justify-center items-center text-center h-full w-full md:w-1/2 px-10 py-16 md:px-20 animate-fadeIn rounded-r-3xl">
        <h1 className="text-5xl font-extrabold text-[#E7C65F] mb-6 font-playfair leading-tight">
          Welcome to UniHive
        </h1>
        <p className="text-lg text-gray-300 font-opensans leading-relaxed">
          Your one-stop marketplace for students! <br />
          Buy, sell, and save within your campus.
        </p>
        
        {/* Slideshow at the bottom */}
        <div className="relative w-full max-w-md h-50 md:h-70 mx-auto rounded-lg overflow-hidden shadow-xl mt-8">
          <Slideshow />
        </div>
      </div>

      {/* Right Section - Signup Component */}
      <div className="flex flex-col justify-center items-center w-full md:w-1/2 bg-white p-8 md:p-16 rounded-l-3xl shadow-2xl">
        <div className="w-full max-w-md">
          <SignUp />
          
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
