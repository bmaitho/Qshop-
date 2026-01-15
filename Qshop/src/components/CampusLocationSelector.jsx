import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';
import { Input } from "@/components/ui/input";

const CampusLocationSelector = ({ 
  value, 
  onChange, 
  campusLocations, 
  error,
  disabled = false 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredLocations, setFilteredLocations] = useState([]);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  // Popular schools to show at the top (most commonly used)
  const popularSchools = [
    'University of Nairobi',
    'Jomo Kenyatta University of Agriculture & Technology',
    'Strathmore University',
    'Kenyatta University',
    'Moi University',
    'Egerton University',
    'Technical University of Kenya',
    'United States International University-Africa',
    'Mount Kenya University',
    'Daystar University',
    'Kenya Methodist University',
    'Multimedia University of Kenya'
  ];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter locations based on search query
  useEffect(() => {
    if (!campusLocations || campusLocations.length === 0) {
      setFilteredLocations([]);
      return;
    }

    if (!searchQuery.trim()) {
      // When no search query, show popular schools first, then all others
      const popular = campusLocations.filter(loc => 
        popularSchools.includes(loc.name)
      );
      const others = campusLocations.filter(loc => 
        !popularSchools.includes(loc.name)
      );
      
      // Sort popular schools by the order in popularSchools array
      const sortedPopular = popular.sort((a, b) => {
        return popularSchools.indexOf(a.name) - popularSchools.indexOf(b.name);
      });
      
      // Sort other schools alphabetically
      const sortedOthers = others.sort((a, b) => 
        a.name.localeCompare(b.name)
      );
      
      setFilteredLocations([...sortedPopular, ...sortedOthers]);
    } else {
      // Filter based on search query
      const query = searchQuery.toLowerCase();
      const filtered = campusLocations.filter(loc =>
        loc.name.toLowerCase().includes(query)
      );
      
      // Sort filtered results: popular matches first, then others
      const popularMatches = filtered.filter(loc => 
        popularSchools.includes(loc.name)
      );
      const otherMatches = filtered.filter(loc => 
        !popularSchools.includes(loc.name)
      );
      
      setFilteredLocations([...popularMatches, ...otherMatches]);
    }
  }, [searchQuery, campusLocations]);

  const handleSelect = (location) => {
    onChange({
      target: {
        name: 'campusLocation',
        value: location.name
      }
    });
    // Also update the campusLocationId
    if (onChange.setFormData) {
      onChange.setFormData(prev => ({
        ...prev,
        campusLocation: location.name,
        campusLocationId: location.id
      }));
    }
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange({
      target: {
        name: 'campusLocation',
        value: ''
      }
    });
    setSearchQuery('');
  };

  const displayValue = value || 'Select your school/college';

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Selected value display / trigger */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`
          flex items-center justify-between w-full px-3 py-2 
          text-left border rounded-md cursor-pointer
          transition-colors duration-200
          ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white hover:border-primary'}
          ${error ? 'border-red-500' : 'border-gray-300'}
          ${isOpen ? 'border-primary ring-2 ring-primary/20' : ''}
        `}
      >
        <span className={value ? 'text-gray-900' : 'text-gray-400'}>
          {displayValue}
        </span>
        <div className="flex items-center gap-1">
          {value && !disabled && (
            <button
              onClick={handleClear}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              type="button"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          )}
          <ChevronDown 
            className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </div>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-96 overflow-hidden">
          {/* Search input */}
          <div className="sticky top-0 p-2 bg-white border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                ref={inputRef}
                type="text"
                placeholder="Search for your school..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-2 w-full text-gray-900 placeholder:text-gray-400"
                autoFocus
              />
            </div>
          </div>

          {/* School list */}
          <div className="overflow-y-auto max-h-80">
            {filteredLocations.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500">
                {searchQuery ? 'No schools found matching your search' : 'No schools available'}
              </div>
            ) : (
              <>
                {/* Show "Popular" label only when not searching */}
                {!searchQuery && filteredLocations.some(loc => popularSchools.includes(loc.name)) && (
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 bg-gray-50 sticky top-0">
                    Popular Schools
                  </div>
                )}
                
                {filteredLocations.map((location, index) => {
                  const isPopular = popularSchools.includes(location.name);
                  const isFirstNonPopular = !searchQuery && 
                    index > 0 && 
                    !isPopular && 
                    popularSchools.includes(filteredLocations[index - 1]?.name);

                  return (
                    <React.Fragment key={location.id}>
                      {/* Show "All Schools" divider when transitioning from popular to others */}
                      {isFirstNonPopular && (
                        <div className="px-3 py-2 text-xs font-semibold text-gray-500 bg-gray-50 border-t border-gray-200">
                          All Schools
                        </div>
                      )}
                      
                      <div
                        onClick={() => handleSelect(location)}
                        className={`
                          px-4 py-2.5 cursor-pointer transition-colors
                          hover:bg-primary/5
                          ${value === location.name ? 'bg-primary/10 text-primary font-medium' : 'text-gray-700'}
                          ${isPopular && !searchQuery ? 'font-medium' : ''}
                        `}
                      >
                        <div className="flex items-center justify-between">
                          <span>{location.name}</span>
                          {value === location.name && (
                            <span className="text-primary text-sm">✓</span>
                          )}
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}
              </>
            )}
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

export default CampusLocationSelector;