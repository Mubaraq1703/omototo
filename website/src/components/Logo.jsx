import React from 'react';

const Logo = () => {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    }}>
      <div style={{
        width: '40px',
        height: '40px',
        backgroundColor: 'var(--primary-green)',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontWeight: 'bold',
        fontSize: '20px'
      }}>
        O
      </div>
      <span style={{ 
        fontSize: '1.8rem', 
        fontWeight: '700', 
        color: 'var(--primary-green)' 
      }}>
        Omototo
      </span>
    </div>
  );
};

export default Logo;