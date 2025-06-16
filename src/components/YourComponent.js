import React, { useState, useEffect } from "react";

const YourComponent = ({ isOpen, onClose }) => {
  const [blurBackground, setBlurBackground] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setBlurBackground(true);

      // Auto close the modal after 5 seconds
      const timer = setTimeout(() => {
        onClose(); // Close the modal after 5 seconds
      }, 5000);

      return () => clearTimeout(timer); // Clear timer if the modal closes early
    } else {
      setBlurBackground(false); // Reset blur when modal closes
    }
  }, [isOpen, onClose]);

  return (
    <div style={{ position: "relative" }}>
      {/* Apply blur effect when modal is open */}
      <div style={{ filter: blurBackground ? "blur(5px)" : "none", transition: "filter 0.3s ease" }}>
        {/* Your button here */}
      </div>

      {/* Modal */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            backgroundColor: "#fff",
            padding: "20px",
            borderRadius: "10px",
            boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.3)",
            zIndex: 1000,
            textAlign: "center",
          }}
        >
          
          <h3>Every challenge you face is just another opportunity to show your brilliance!</h3>
          <img src="/Waiting.png" alt="Upload" style={{ width: '800px', height: '300px', marginRight: '10px' }} />
          <button onClick={onClose}>Close</button>
        </div>
      )}

      {/* Overlay for background blur */}
      {blurBackground && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0, 0, 0, 0.3)",
            zIndex: 999,
          }}
        />
      )}
    </div>
  );
};

export default YourComponent;

