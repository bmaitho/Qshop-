// src/context/UserContext.jsx
import React, { createContext, useContext, useState } from 'react';
import { mockProducts } from './mockData';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [userProfile, setUserProfile] = useState({
    id: 1,
    name: "John Doe",
    email: "john@example.com",
    phone: "+254123456789",
    location: "Main Campus",
    joinedDate: "January 2024",
    listings: mockProducts,
    following: 45,
    followers: 89
  });

  const value = {
    userProfile,
    updateProfile: (updates) => {
      setUserProfile(prev => ({ ...prev, ...updates }));
    }
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};