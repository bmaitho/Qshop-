import React from "react";
import { Link } from "react-router-dom";
import { FaUserPlus, FaSignInAlt } from "react-icons/fa";
import Slideshow from "./Slideshow";

const LandingPage = () => {
  return (
    <div className="flex flex-col md:flex-row h-screen bg-[#0D2B20] text-white items-center justify-center p-6">
      {/* Left Section */}
      <div className="flex flex-col items-center justify-center text-center w-full md:w-[40%] p-8 animate-fadeIn">
        <h1 className="text-5xl font-extrabold text-[#E7C65F] mb-6 drop-shadow-lg font-playfair leading-tight">
          <span className="bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">
            Welcome to UniHive
          </span>
        </h1>
        <p className="text-lg text-[#F5F5F5] mb-6 leading-relaxed font-opensans tracking-wide">
          Your one-stop marketplace for students! <br />
          Buy, sell, and save within your campus.
        </p>
        <div className="space-x-0 md:space-x-10 flex flex-col md:flex-row gap-4">
          {/* Sign Up Button */}
          <Link
            to="/signup"
            className="flex items-center gap-2 border border-[#E7C65F] text-[#E7C65F] px-6 py-3 rounded-lg font-semibold bg-transparent hover:bg-[#E7C65F] hover:text-[#0D2B20] transition transform hover:scale-105 shadow-md"
          >
            <FaUserPlus /> Sign Up
          </Link>
          {/* Login Button */}
          <Link
            to="/login"
            className="flex items-center gap-2 border border-[#E7C65F] text-[#E7C65F] px-6 py-3 rounded-lg font-semibold bg-transparent hover:bg-[#E7C65F] hover:text-[#0D2B20] transition transform hover:scale-105 shadow-md"
          >
            <FaSignInAlt /> Login
          </Link>
        </div>
      </div>

      {/* Responsive Divider */}
      <div className="w-3/4 h-[2px] bg-[#E7C65F] my-6 md:my-0 md:w-[2px] md:h-[80%] md:mx-16 shadow-lg"></div>

      {/* Right Section - Slideshow */}
      <div className="flex justify-center items-center w-full md:w-[40%]">
        <Slideshow />
      </div>
    </div>
  );
};

export default LandingPage;
