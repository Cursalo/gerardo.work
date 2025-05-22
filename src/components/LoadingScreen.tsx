import React from 'react';

const LoadingScreen = () => {
  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#ffffff',
      zIndex: 1000
    }}>
      <div style={{
        textAlign: 'center'
      }}>
        <h2>Loading World...</h2>
        <div style={{
          width: '50px',
          height: '50px',
          border: '5px solid #f3f3f3',
          borderTop: '5px solid #4dffa9',
          borderRadius: '50%',
          margin: '20px auto',
          animation: 'spin 1s linear infinite'
        }} />
      </div>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default LoadingScreen; 